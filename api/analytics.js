import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

const responseCache = new Map();
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_SIZE = 200;

function cacheKeyFor(userId, req) {
  const q = req.query || {};
  return JSON.stringify({
    u: userId,
    a: q.apartmentIds || null,
    s: q.startDate || null,
    e: q.endDate || null,
    act: q.action || null,
    t: q.type || null,
    tb: q.trendBins || null,
  });
}

function getCached(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  if (responseCache.size > CACHE_MAX_SIZE) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

function occurrencesInPeriod(rule, periodStart, periodEnd) {
  const ruleStart = new Date(rule.date);
  const ruleEnd = rule.recurringUntil ? new Date(rule.recurringUntil) : null;
  const today = new Date();

  let effEnd = periodEnd;
  if (today < effEnd) effEnd = today;
  if (ruleEnd && ruleEnd < effEnd) effEnd = ruleEnd;
  if (ruleStart > effEnd) return 0;

  const stepMonths = rule.recurringPeriod === 'yearly' ? 12 : 1;
  const cursor = new Date(ruleStart);
  let count = 0;
  let iterations = 0;
  const MAX_ITERATIONS = 1200;
  while (cursor <= effEnd && iterations < MAX_ITERATIONS) {
    if (cursor >= periodStart) count++;
    cursor.setMonth(cursor.getMonth() + stepMonths);
    iterations++;
  }
  return count;
}

// Bookings are stored at NOON UTC (see api/bookings.js), so a date-only range
// end like '2026-10-11' must compare against the FULL final day (23:59:59.999),
// not midnight — otherwise check-ins on the last day of any period get dropped
// and revenue/nights/occupancy are undercounted.
function inclusiveEndOfDay(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str)
    ? new Date(`${str}T23:59:59.999Z`)
    : new Date(str);
}

const DAY_MS = 1000 * 60 * 60 * 24;

const gregKeyOf = (d) => d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function dayIndex(d) {
  return Math.floor(d.getTime() / DAY_MS);
}

// Number of slept nights of a booking staying [startDate, endDate) that fall
// inside [winStart, winEnd] (both window bounds inclusive as whole days).
// Bookings are stored at NOON UTC (see api/bookings.js) and window bounds are
// UTC midnight / 23:59:59.999 of their last day, so whole-day indices are
// exact. A booking occupies calendar days [dayIndex(start) .. dayIndex(end)-1].
// This is what stops "This Month" from crediting a stay that merely touches
// the window — e.g. Aug 25 → Sep 3 viewed in September now counts just the
// nights that physically belong to September.
function nightsInWindow(startDate, endDate, winStart, winEnd) {
  const loStart = winStart ? dayIndex(winStart) : Number.NEGATIVE_INFINITY;
  const hiEnd = winEnd ? dayIndex(winEnd) : Number.POSITIVE_INFINITY;
  const lo = Math.max(dayIndex(startDate), loStart);
  const hi = Math.min(dayIndex(endDate) - 1, hiEnd);
  return Math.max(0, hi - lo + 1);
}

// Caled-month windows covered by a queried gregorian range, keyed by the same
// 'Sep 2026' label the trend chart already uses. Used to scope the gregorian
// trend axis to the period (mirroring the hijri pre-fill) and to distribute
// each booking's revenue across the months it actually stays in.
function gregorianMonthWindows(rangeStart, rangeEnd) {
  const windows = [];
  const cursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1));
  const endDay = dayIndex(rangeEnd);
  for (let i = 0; i < 1200; i++) {
    if (dayIndex(cursor) > endDay) break;
    const next = new Date(cursor.getTime());
    next.setUTCMonth(next.getUTCMonth() + 1);
    windows.push({
      key: gregKeyOf(cursor),
      start: new Date(cursor.getTime()),
      end: new Date(next.getTime() - 1),
    });
    cursor.setTime(next.getTime());
  }
  return windows;
}

function expenseContributionInPeriod(e, periodStart, periodEnd) {
  const amount = Number(e.amount || 0);
  if (amount <= 0) return 0;

  if (!e.isRecurring) {
    const d = new Date(e.date);
    return (d >= periodStart && d <= periodEnd) ? amount : 0;
  }

  return amount * occurrencesInPeriod(e, periodStart, periodEnd);
}

// ---- Umm al-Qura Hijri month binning (read-only, in-memory) ----
// Matches the client lib (src/lib/hijriCalendar.js): same locale + UTC so
// the 12 monthly windows align exactly with the Gregorian-equivalent range
// the client derives for a selected Hijri year (1 Muharram → 29/30 Dhu
// al-Hijjah). No DB fields are touched — every conversion happens here.
const HIJRI_MONTH_NAMES = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC'
});

function hijriParts(d) {
  const parts = hijriFmt.formatToParts(d);
  let hYear = 0, hMonth = 0, hDay = 0;
  for (const p of parts) {
    if (p.type === 'year') hYear = parseInt(p.value, 10);
    if (p.type === 'month') hMonth = parseInt(p.value, 10);
    if (p.type === 'day') hDay = parseInt(p.value, 10);
  }
  return { year: hYear, month: hMonth, day: hDay };
}

// Gregorian day-window of each Hijri month present inside [rangeStart, rangeEnd].
// Walks day-by-day (UTC) recording the first day of every month it encounters;
// a full Hijri year yields exactly indices 1..12 in order.
function hijriMonthWindows(rangeStart, rangeEnd) {
  const windows = [];
  const cursor = new Date(rangeStart.getTime());
  const endMs = rangeEnd.getTime();
  let currentMonth = null;

  for (let i = 0; i < 380; i++) {
    const h = hijriParts(cursor);
    if (h.month >= 1 && h.month <= 12) {
      if (currentMonth !== h.month) {
        if (currentMonth !== null) {
          const prev = windows.find(w => w.index === currentMonth);
          if (prev) prev.end = new Date(cursor.getTime() - 86400000);
        }
        currentMonth = h.month;
        windows.push({ index: h.month, start: new Date(cursor.getTime()), end: null });
      }
    }
    if (cursor.getTime() >= endMs) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (currentMonth !== null) {
    const last = windows.find(w => w.index === currentMonth);
    if (last && !last.end) last.end = new Date(rangeEnd.getTime());
  }
  return windows;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { apartmentIds, startDate, endDate, action, type } = req.query;
  const hijriTrend = req.query.trendBins === 'hijri';
  const targetUserId = user.adminId || user.userId;

  const _cacheKey = cacheKeyFor(targetUserId, req);
  const _cached = getCached(_cacheKey);
  if (_cached) {
    return res.status(200).json(_cached);
  }

  if (action === 'breakdown') {
    try {
      const filter = { userId: targetUserId };
      if (apartmentIds) {
        filter.apartmentId = { in: apartmentIds.split(',') };
      }
      if (startDate && endDate) {
        filter.AND = [
          { startDate: { lte: inclusiveEndOfDay(endDate) } },
          { endDate: { gte: new Date(startDate) } }
        ];
      }

      let periodDays = 30;
      if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        periodDays = Math.max(1, Math.floor(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1);
      }

      const rangeStart = startDate ? new Date(startDate) : null;
      const rangeEnd = endDate ? new Date(endDate) : null;

      if (type === 'revenue' || type === 'occupancy' || type === 'nights') {
        const bookings = await prisma.booking.findMany({
          where: filter,
          select: {
            totalPrice: true, pricePerNight: true, startDate: true, endDate: true,
            apartment: { select: { id: true, name: true } }
          }
        });

        let totalRev = 0;
        const aptMap = {};

        bookings.forEach(b => {
          if (!b.apartment) return;
          const s = new Date(b.startDate);
          const e = new Date(b.endDate);
          const fullNights = Math.max(1, Math.ceil(Math.abs(e - s) / DAY_MS));
          const inWindow = nightsInWindow(s, e, rangeStart, rangeEnd);
          if (inWindow <= 0) return;
          const share = inWindow / fullNights;
          const nights = inWindow;
          const rev = (b.totalPrice !== null ? Number(b.totalPrice) : (Number(b.pricePerNight) * fullNights)) * share;

          if (!aptMap[b.apartment.id]) {
            aptMap[b.apartment.id] = { id: b.apartment.id, name: b.apartment.name, revenue: 0, count: 0, nights: 0, availableNights: periodDays };
          }

          aptMap[b.apartment.id].revenue += rev;
          aptMap[b.apartment.id].count += 1;
          aptMap[b.apartment.id].nights += nights;
          totalRev += rev;
        });

        const allApts = await prisma.apartment.findMany({
          where: apartmentIds ? { id: { in: apartmentIds.split(',') } } : { userId: targetUserId },
          select: { id: true, name: true }
        });

        allApts.forEach(a => {
          if (!aptMap[a.id]) {
            aptMap[a.id] = { id: a.id, name: a.name, revenue: 0, count: 0, nights: 0, availableNights: periodDays };
          }
        });

        let results = Object.values(aptMap).map(a => ({
          ...a,
          percentage: totalRev > 0 ? ((a.revenue / totalRev) * 100).toFixed(1) : 0,
          occupancy: ((a.nights / a.availableNights) * 100).toFixed(1)
        }));

        if (type === 'revenue') {
          results.sort((a, b) => b.revenue - a.revenue);
        } else {
          results.sort((a, b) => b.nights - a.nights);
        }

        const _payload = { data: results };
        setCached(_cacheKey, _payload);
        return res.status(200).json(_payload);
      }

      if (type === 'profit') {
        const bookings = await prisma.booking.findMany({
          where: filter,
          select: {
            totalPrice: true, pricePerNight: true, startDate: true, endDate: true,
            apartment: { select: { id: true, cleaningFeePerStay: true, platformFeeType: true, platformFee: true } }
          }
        });

        let rev = 0;
        let platform = 0;
        let cleaning = 0;

        bookings.forEach(b => {
          const s = new Date(b.startDate);
          const e = new Date(b.endDate);
          const fullNights = Math.max(1, Math.ceil(Math.abs(e - s) / DAY_MS));
          const inWindow = nightsInWindow(s, e, rangeStart, rangeEnd);
          if (inWindow <= 0) return;
          const share = inWindow / fullNights;
          const r = (b.totalPrice !== null ? Number(b.totalPrice) : (Number(b.pricePerNight) * fullNights)) * share;
          rev += r;

          const apt = b.apartment;
          if (apt) {
            if (apt.cleaningFeePerStay) cleaning += Number(apt.cleaningFeePerStay) * share;
            if (apt.platformFee) {
              if (apt.platformFeeType === 'percentage') platform += (r * (Number(apt.platformFee) / 100));
              else platform += Number(apt.platformFee) * share;
            }
          }
        });

        const filteredAptSet = apartmentIds ? new Set(apartmentIds.split(',')) : null;

        const expenseSelect = {
          id: true,
          amount: true,
          isRecurring: true,
          recurringPeriod: true,
          date: true,
          category: true,
          scope: true,
          apartmentId: true,
        };

        const allExpenses = await prisma.expense.findMany({
          where: { userId: targetUserId },
          select: expenseSelect,
        });

        const catBucket = {
          rent: 0, staff: 0, maintenance: 0, marketing: 0,
          licenses: 0, supplies: 0, insurance: 0, utilities: 0,
          zakat: 0, other: 0,
        };

        for (const e of allExpenses) {
          const amount = Number(e.amount || 0);
          if (amount <= 0) continue;
          if (e.scope === 'unit') {
            if (!e.apartmentId) continue;
            if (filteredAptSet && !filteredAptSet.has(e.apartmentId)) continue;
          }
          const contribution = expenseContributionInPeriod(e, rangeStart || new Date(0), rangeEnd || new Date());
          if (contribution <= 0) continue;
          const cat = catBucket[e.category] != null ? e.category : 'other';
          catBucket[cat] += contribution;
        }

        const generalAndOther =
          catBucket.marketing + catBucket.licenses + catBucket.supplies +
          catBucket.insurance + catBucket.utilities + catBucket.zakat + catBucket.other;

        const _profitPayload = {
          data: [
            { category: 'إجمالي الإيرادات',       amount: rev,               type: 'income'  },
            { category: 'تكاليف الإيجار',         amount: catBucket.rent,    type: 'expense' },
            { category: 'رسوم المنصات',           amount: platform,          type: 'expense' },
            { category: 'رسوم التنظيف',           amount: cleaning,          type: 'expense' },
            { category: 'رواتب الموظفين',         amount: catBucket.staff,   type: 'expense' },
            { category: 'تكاليف الصيانة',         amount: catBucket.maintenance, type: 'expense' },
            { category: 'مصروفات عامة وأخرى',     amount: generalAndOther,   type: 'expense' },
          ]
        };
        setCached(_cacheKey, _profitPayload);
        return res.status(200).json(_profitPayload);
      }

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error fetching breakdown' });
    }
  }

  try {
    const filter = { userId: targetUserId };

    if (apartmentIds) {
      filter.apartmentId = { in: apartmentIds.split(',') };
    }

    if (startDate && endDate) {
      filter.AND = [
        { startDate: { lte: inclusiveEndOfDay(endDate) } },
        { endDate: { gte: new Date(startDate) } }
      ];
    }

    const bookings = await prisma.booking.findMany({
      where: filter,
      select: {
        id: true,
        source: true,
        pricePerNight: true,
        totalPrice: true,
        startDate: true,
        endDate: true,
        apartment: {
          select: {
            id: true,
            cleaningFeePerStay: true,
            platformFeeType: true,
            platformFee: true,
          }
        }
      }
    });

    const allApartments = await prisma.apartment.findMany({
      where: { userId: targetUserId },
      select: { id: true }
    });

    const rangeStart = startDate ? new Date(startDate) : null;
    const rangeEnd = endDate ? new Date(endDate) : null;
    let periodDays = 30;
    if (rangeStart && rangeEnd) {
      periodDays = Math.max(1, Math.floor(Math.abs(rangeStart - rangeEnd) / (1000 * 60 * 60 * 24)) + 1);
    }

    const filteredAptCount = apartmentIds ? apartmentIds.split(',').length : allApartments.length;
    const totalAvailableNights = filteredAptCount * periodDays;

    let totalRevenue = 0;
    let totalNights = 0;
    let totalExpenses = 0;
    const sourceCounts = {};
    const dailyTrendMap = {};

    // Hijri month windows present inside the queried range. Used both to scope
    // the trend pre-fill (so "This Month" / "Current Quarter" don't render a
    // full 12-month Muharram→Dhul-Hijjah axis) and to prorate table expenses
    // per hijri month below.
    const hijriWindows = hijriTrend && rangeStart && rangeEnd
      ? hijriMonthWindows(rangeStart, rangeEnd)
      : null;

    if (hijriWindows) {
      // Only the months spanned by the requested range: 1 for a month chip,
      // 3 for a quarter chip, 12 for a year chip — matching how the gregorian
      // mode buckets months inside the selected period.
      for (const w of hijriWindows) {
        dailyTrendMap[`h${w.index}`] = {
          name: HIJRI_MONTH_NAMES[w.index - 1],
          hijriIndex: w.index,
          revenue: 0,
          expenses: 0
        };
      }
    } else if (hijriTrend) {
      // No time range ('all' chip) — keep the continuous 12-month axis.
      for (let i = 1; i <= 12; i++) {
        dailyTrendMap[`h${i}`] = { name: HIJRI_MONTH_NAMES[i - 1], hijriIndex: i, revenue: 0, expenses: 0 };
      }
    }

    // Gregorian month windows inside the queried range — pre-fill the same
    // way so the trend axis only shows months the period actually touches.
    const gregorianWindows = (!hijriTrend && rangeStart && rangeEnd)
      ? gregorianMonthWindows(rangeStart, rangeEnd)
      : null;

    if (gregorianWindows) {
      for (const w of gregorianWindows) {
        dailyTrendMap[w.key] = { name: w.key, revenue: 0, expenses: 0 };
      }
    }
    const aptStats = {};

    let contributingCount = 0;

    bookings.forEach(booking => {
      const s = new Date(booking.startDate);
      const e = new Date(booking.endDate);
      const fullNights = Math.max(1, Math.ceil(Math.abs(e - s) / DAY_MS));
      // Only the nights that physically fall inside the queried period count
      // (bookings are stored at noon UTC). A stay that merely touches the
      // window — e.g. Aug 25 → Sep 3 when viewing September — now contributes
      // just its in-period share of nights and revenue instead of the whole
      // stay, so "This Month" no longer reports more than is actually in it.
      const inWindow = nightsInWindow(s, e, rangeStart, rangeEnd);
      if (inWindow <= 0) return;
      const share = inWindow / fullNights;
      const nights = inWindow;
      const fullRevenue = booking.totalPrice !== null ? Number(booking.totalPrice) : (Number(booking.pricePerNight) * fullNights);
      const revenue = fullRevenue * share;

      totalNights += nights;
      totalRevenue += revenue;

      if (booking.apartment) {
        const aptId = booking.apartment.id;
        if (!aptStats[aptId]) {
          aptStats[aptId] = { id: aptId, name: booking.apartment.name, revenue: 0, nights: 0 };
        }
        aptStats[aptId].revenue += revenue;
        aptStats[aptId].nights += nights;
      }

      let fullExpenses = 0;
      const apt = booking.apartment;
      if (apt) {
        if (apt.cleaningFeePerStay) fullExpenses += Number(apt.cleaningFeePerStay);

        if (apt.platformFee) {
          if (apt.platformFeeType === 'percentage') {
            fullExpenses += (fullRevenue * (Number(apt.platformFee) / 100));
          } else {
            fullExpenses += Number(apt.platformFee);
          }
        }
      }
      const bookingExpenses = fullExpenses * share;
      totalExpenses += bookingExpenses;

      // Attribute revenue/expenses to every month window the stay overlaps,
      // so the trend bars sum to the same prorated totals as the KPI cards.
      const windows = hijriWindows || gregorianWindows;
      if (windows) {
        for (const w of windows) {
          const inW = nightsInWindow(s, e, w.start, w.end);
          if (inW <= 0) continue;
          const shareW = inW / fullNights;
          const key = hijriTrend ? `h${w.index}` : w.key;
          if (!dailyTrendMap[key]) {
            dailyTrendMap[key] = { name: hijriTrend ? HIJRI_MONTH_NAMES[w.index - 1] : w.key, revenue: 0, expenses: 0 };
          }
          dailyTrendMap[key].revenue += fullRevenue * shareW;
          dailyTrendMap[key].expenses += fullExpenses * shareW;
        }
      } else {
        const dateKey = hijriTrend
          ? `h${hijriParts(s).month}`
          : gregKeyOf(s);
        if (!dailyTrendMap[dateKey]) {
          dailyTrendMap[dateKey] = { name: dateKey, revenue: 0, expenses: 0 };
        }
        dailyTrendMap[dateKey].revenue += revenue;
        dailyTrendMap[dateKey].expenses += bookingExpenses;
      }

      sourceCounts[booking.source] = (sourceCounts[booking.source] || 0) + 1;
      contributingCount++;
    });

    const expenseSelect = {
      id: true,
      amount: true,
      isRecurring: true,
      recurringPeriod: true,
      date: true,
      category: true,
      scope: true,
      apartmentId: true,
    };

    const allExpenses = await prisma.expense.findMany({
      where: { userId: targetUserId },
      select: expenseSelect,
    });

    const totalAptCount = allApartments.length > 0 ? allApartments.length : 1;
    const globalRatio = filteredAptCount / totalAptCount;
    const filteredAptSet = apartmentIds ? new Set(apartmentIds.split(',')) : null;

    let expenseTableTotal = 0;

    const expenseContribs = new Map();
    const MONTH_ABBR = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };

    for (const e of allExpenses) {
      const amount = Number(e.amount || 0);
      if (amount <= 0) continue;

      let scopeRatio = 1;
      if (e.scope === 'unit') {
        if (!e.apartmentId) continue;
        if (filteredAptSet && !filteredAptSet.has(e.apartmentId)) continue;
        scopeRatio = 1;
      } else {
        scopeRatio = globalRatio;
      }

      const totalContribution = expenseContributionInPeriod(e, rangeStart || new Date(0), rangeEnd || new Date()) * scopeRatio;
      expenseTableTotal += totalContribution;

      if (hijriWindows) {
        for (const w of hijriWindows) {
          const monthContribution = expenseContributionInPeriod(e, w.start, w.end) * scopeRatio;
          if (monthContribution > 0 && dailyTrendMap[`h${w.index}`]) {
            dailyTrendMap[`h${w.index}`].expenses += monthContribution;
          }
        }
      } else if (gregorianWindows) {
        for (const w of gregorianWindows) {
          const monthContribution = expenseContributionInPeriod(e, w.start, w.end) * scopeRatio;
          if (monthContribution > 0) {
            dailyTrendMap[w.key].expenses += monthContribution;
          }
        }
      } else {
        const trendKeys = Object.keys(dailyTrendMap);
        for (const key of trendKeys) {
          const parts = key.split(' ');
          if (parts.length !== 2) continue;
          const m = MONTH_ABBR[parts[0]];
          const y = parseInt(parts[1], 10);
          if (m === undefined || Number.isNaN(y)) continue;
          const monthStart = new Date(y, m, 1);
          const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
          const monthContribution = expenseContributionInPeriod(e, monthStart, monthEnd) * scopeRatio;
          if (monthContribution > 0) {
            dailyTrendMap[key].expenses += monthContribution;
          }
        }
      }

      const eid = e.id;
      if (!expenseContribs.has(eid)) {
        expenseContribs.set(eid, {
          id: eid,
          amount: amount,
          isRecurring: e.isRecurring,
          recurringPeriod: e.recurringPeriod,
          date: e.date,
          category: e.category,
          scope: e.scope,
          apartmentId: e.apartmentId,
          scopeRatio: scopeRatio,
        });
      }
    }
    totalExpenses += expenseTableTotal;

    const dailyTrend = hijriTrend
      ? Object.values(dailyTrendMap).sort((a, b) => a.hijriIndex - b.hijriIndex)
      : Object.values(dailyTrendMap).sort((a, b) => new Date(a.name) - new Date(b.name));

    const netProfit = totalRevenue - totalExpenses;
    const occupancyRate = totalAvailableNights > 0 ? (totalNights / totalAvailableNights) * 100 : 0;

    const topUnits = Object.values(aptStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    const filteredAptList = apartmentIds
      ? allApartments.filter(a => apartmentIds.split(',').includes(a.id))
      : allApartments;

    let globalPeriodTotal = 0;
    const pnlStart = rangeStart || new Date(0);
    const pnlEnd = rangeEnd || new Date();
    for (const e of allExpenses) {
      if (e.scope !== 'global') continue;
      globalPeriodTotal += expenseContributionInPeriod(e, pnlStart, pnlEnd);
    }
    const globalSharePerUnit = filteredAptList.length > 0
      ? globalPeriodTotal / filteredAptList.length
      : 0;

    const expenseContribsByApt = new Map();
    for (const [, ec] of expenseContribs) {
      if (ec.scope === 'unit' && ec.apartmentId) {
        if (!expenseContribsByApt.has(ec.apartmentId)) {
          expenseContribsByApt.set(ec.apartmentId, []);
        }
        expenseContribsByApt.get(ec.apartmentId).push(ec);
      }
    }

    let perUnitPnL = filteredAptList.map(apt => {
      const revenue = aptStats[apt.id]?.revenue || 0;
      const nights = aptStats[apt.id]?.nights || 0;

      let directExpenses = 0;
      const unitExpenses = expenseContribsByApt.get(apt.id) || [];
      for (const ec of unitExpenses) {
        directExpenses += expenseContributionInPeriod(ec, pnlStart, pnlEnd) * ec.scopeRatio;
      }

      const totalUnitExpenses = directExpenses + globalSharePerUnit;
      const netProfit = revenue - totalUnitExpenses;
      const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : null;
      const occupancyPct = periodDays > 0 ? (nights / periodDays) * 100 : 0;

      return {
        id: apt.id,
        name: apt.name,
        revenue,
        nights,
        directExpenses,
        globalShare: globalSharePerUnit,
        totalExpenses: totalUnitExpenses,
        netProfit,
        marginPct,
        occupancyPct,
      };
    }).sort((a, b) => b.netProfit - a.netProfit);

    const _mainPayload = {
      totalRevenue,
      totalExpenses,
      netProfit,
      totalNights,
      occupancyRate,
      sourceCounts,
      count: contributingCount,
      dailyTrend,
      topUnits,
      perUnitPnL,
    };
    setCached(_cacheKey, _mainPayload);
    res.status(200).json(_mainPayload);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
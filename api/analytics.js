import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

/**
 * Number of calendar months a date range spans (inclusive of both endpoints'
 * months). July 1 → July 31 = 1. July 15 → Sep 20 = 3. Same math as
 * expenseUtils.js — both files must agree.
 */
function calendarMonthsInRange(start, end) {
  if (end < start) return 0;
  return (end.getFullYear() - start.getFullYear()) * 12 +
         (end.getMonth() - start.getMonth()) + 1;
}

/**
 * How much a single Expense row contributes to a given period. Recurring
 * rules count by calendar unit (1 monthly rule × 1 month = amount), not
 * by days. Yearly rules spread evenly across 12 months. Non-recurring
 * count only if their date falls in range.
 */
function expenseContributionInPeriod(e, periodStart, periodEnd) {
  const amount = Number(e.amount || 0);
  if (amount <= 0) return 0;

  if (!e.isRecurring) {
    const d = new Date(e.date);
    return (d >= periodStart && d <= periodEnd) ? amount : 0;
  }

  const ruleStart = new Date(e.date);
  const ruleEnd = e.recurringUntil ? new Date(e.recurringUntil) : null;
  if (ruleEnd && ruleEnd < periodStart) return 0;
  if (ruleStart > periodEnd) return 0;

  const effStart = ruleStart > periodStart ? ruleStart : periodStart;
  const effEnd = ruleEnd && ruleEnd < periodEnd ? ruleEnd : periodEnd;
  const months = Math.max(0, calendarMonthsInRange(effStart, effEnd));

  if (e.recurringPeriod === 'yearly') return (amount / 12) * months;
  return amount * months;
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

  const targetUserId = user.adminId || user.userId;

  if (action === 'breakdown') {
    try {
      const filter = { userId: targetUserId };
      if (apartmentIds) {
          filter.apartmentId = { in: apartmentIds.split(',') };
      }
      if (startDate && endDate) {
          filter.AND = [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(startDate) } }
          ];
      }

      // Default period
      let periodDays = 30;
      if (startDate && endDate) {
          const s = new Date(startDate);
          const e = new Date(endDate);
          periodDays = Math.max(1, Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
      }

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
          const nights = Math.max(1, Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
          const rev = b.totalPrice !== null ? Number(b.totalPrice) : (Number(b.pricePerNight) * nights);

          if (!aptMap[b.apartment.id]) {
            aptMap[b.apartment.id] = { id: b.apartment.id, name: b.apartment.name, revenue: 0, count: 0, nights: 0, availableNights: periodDays };
          }

          aptMap[b.apartment.id].revenue += rev;
          aptMap[b.apartment.id].count += 1;
          aptMap[b.apartment.id].nights += nights;
          totalRev += rev;
        });

        // Add empty apartments that passed filter
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
          results.sort((a,b) => b.revenue - a.revenue);
        } else {
          results.sort((a,b) => b.nights - a.nights);
        }

        return res.status(200).json({ data: results });
      }

      if (type === 'profit') {
         // To build a robust ledger, we need total revenue and categorized expenses
         // We can recalculate or fetch from the same logic used in the main endpoint.
         // For brevity and scalability, we will simulate the categorized ledger calculation based on the same logic.

         // Post-Phase-2b: breakdown reads from Expense table + booking-level
         // variable fees (platform + per-stay cleaning). No more legacy Apartment
         // rentCost / cleaningCost salaried apportionment.

         // Revenue from bookings.
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
            const n = Math.max(1, Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
            const r = b.totalPrice !== null ? Number(b.totalPrice) : (Number(b.pricePerNight) * n);
            rev += r;

            const apt = b.apartment;
            if (apt) {
               if (apt.cleaningFeePerStay) cleaning += Number(apt.cleaningFeePerStay);
               if (apt.platformFee) {
                  if (apt.platformFeeType === 'percentage') platform += (r * (Number(apt.platformFee) / 100));
                  else platform += Number(apt.platformFee);
               }
            }
         });

         // Sum Expense rows per category.
         const rangeStart = startDate ? new Date(startDate) : null;
         const rangeEnd = endDate ? new Date(endDate) : null;
         const filteredAptSet = apartmentIds ? new Set(apartmentIds.split(',')) : null;

         const allExpensesForBreakdown = await prisma.expense.findMany({
            where: { userId: targetUserId }
         });

         const catBucket = {
            rent: 0, staff: 0, maintenance: 0, marketing: 0,
            licenses: 0, supplies: 0, insurance: 0, utilities: 0,
            zakat: 0, other: 0,
         };

         for (const e of allExpensesForBreakdown) {
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

         return res.status(200).json({
            data: [
               { category: 'إجمالي الإيرادات',       amount: rev,               type: 'income'  },
               { category: 'تكاليف الإيجار',         amount: catBucket.rent,    type: 'expense' },
               { category: 'رسوم المنصات',           amount: platform,          type: 'expense' },
               { category: 'رسوم التنظيف',           amount: cleaning,          type: 'expense' },
               { category: 'رواتب الموظفين',         amount: catBucket.staff,   type: 'expense' },
               { category: 'تكاليف الصيانة',         amount: catBucket.maintenance, type: 'expense' },
               { category: 'مصروفات عامة وأخرى',     amount: generalAndOther,   type: 'expense' },
            ]
         });
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
        // Find bookings that overlap with the selected date range
        filter.AND = [
            { startDate: { lte: new Date(endDate) } },
            { endDate: { gte: new Date(startDate) } }
        ];
    }

    // Since SQLite/JS handles dates differently and we need to handle overlapping logic safely
    // with potentially complex filters, fetching the relevant bookings and aggregating in JS
    // is safer and more universally compatible than raw SQL, especially given typical small datasets per user.
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

    // Also get all apartments for the occupancy rate denominator
    const allApartments = await prisma.apartment.findMany({
        where: { userId: targetUserId },
        select: { id: true }
    });

    // Default period for occupancy calculation if no dates provided (assume 30 days)
    let periodDays = 30;
    if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        periodDays = Math.max(1, Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
    }

    // We calculate available days: if apartments are filtered, only count them
    const filteredAptCount = apartmentIds ? apartmentIds.split(',').length : allApartments.length;
    const totalAvailableNights = filteredAptCount * periodDays;

    let totalRevenue = 0;
    let totalNights = 0;
    let totalExpenses = 0;
    const sourceCounts = {};
    const dailyTrendMap = {}; // { 'YYYY-MM': { name: 'YYYY-MM', revenue: 0, expenses: 0 } }
    const aptStats = {};

    bookings.forEach(booking => {
        const s = new Date(booking.startDate);
        const e = new Date(booking.endDate);
        const diffTime = Math.abs(e - s);
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        totalNights += nights;

        // Calculate revenue
        const revenue = booking.totalPrice !== null ? Number(booking.totalPrice) : (Number(booking.pricePerNight) * nights);
        totalRevenue += revenue;

        if (booking.apartment) {
            const aptId = booking.apartment.id;
            if (!aptStats[aptId]) {
                aptStats[aptId] = { id: aptId, name: booking.apartment.name, revenue: 0, nights: 0 };
            }
            aptStats[aptId].revenue += revenue;
            aptStats[aptId].nights += nights;
        }

        const dateStr = new Date(booking.startDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
        if (!dailyTrendMap[dateStr]) {
            dailyTrendMap[dateStr] = { name: dateStr, revenue: 0, expenses: 0 };
        }
        dailyTrendMap[dateStr].revenue += revenue;

        let bookingExpenses = 0;

        // Calculate variable costs per booking — pricing/fees only.
        // Fixed unit costs (rent, salaried cleaning, other) live in Expense
        // table and are summed in the Expense-table block below.
        const apt = booking.apartment;
        if (apt) {
            if (apt.cleaningFeePerStay) bookingExpenses += Number(apt.cleaningFeePerStay);

            if (apt.platformFee) {
                if (apt.platformFeeType === 'percentage') {
                    bookingExpenses += (revenue * (Number(apt.platformFee) / 100));
                } else {
                    bookingExpenses += Number(apt.platformFee);
                }
            }
        }

        totalExpenses += bookingExpenses;
        dailyTrendMap[dateStr].expenses += bookingExpenses;

        sourceCounts[booking.source] = (sourceCounts[booking.source] || 0) + 1;
    });

    // Expense table is the single source of truth for expenses (post-Phase-2b).
    // Read every Expense row, filter by scope and time, and add to the total.
    //   - scope='unit' rows only count if the apartment is in the current filter
    //   - scope='global' rows are apportioned by the filter ratio
    //   - isRecurring rows prorate over the period days
    //   - non-recurring rows count if the date falls in the range
    {
        const allExpenses = await prisma.expense.findMany({
            where: { userId: targetUserId }
        });
        const totalAptCount = allApartments.length > 0 ? allApartments.length : 1;
        const globalRatio = filteredAptCount / totalAptCount;
        const filteredAptSet = apartmentIds ? new Set(apartmentIds.split(',')) : null;
        const rangeStart = startDate ? new Date(startDate) : null;
        const rangeEnd = endDate ? new Date(endDate) : null;

        let expenseTableTotal = 0;
        for (const e of allExpenses) {
            const amount = Number(e.amount || 0);
            if (amount <= 0) continue;

            // Scope filtering
            let scopeRatio = 1;
            if (e.scope === 'unit') {
                if (!e.apartmentId) continue;
                if (filteredAptSet && !filteredAptSet.has(e.apartmentId)) continue;
                scopeRatio = 1;
            } else {
                scopeRatio = globalRatio;
            }

            // Total contribution over the whole period.
            const totalContribution = expenseContributionInPeriod(e, rangeStart || new Date(0), rangeEnd || new Date()) * scopeRatio;
            expenseTableTotal += totalContribution;

            // Distribute into trend chart by computing per-month contribution.
            // dailyTrendMap keys are formatted "MMM YYYY" (via toLocaleDateString
            // with locale en-CA, options month:'short' + year:'numeric'). We need
            // to reconstruct the month bounds from that string to know what
            // period each key represents.
            const MONTH_ABBR = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
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
        totalExpenses += expenseTableTotal;
    }

    // Trend rendering — the Expense-table read above already distributed
    // recurring/global expenses across the trend map.
    const dailyTrend = Object.values(dailyTrendMap).sort((a, b) => new Date(a.name) - new Date(b.name));

    const netProfit = totalRevenue - totalExpenses;
    const occupancyRate = totalAvailableNights > 0 ? (totalNights / totalAvailableNights) * 100 : 0;

    const topUnits = Object.values(aptStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    // Per-unit P&L — always computed post-Phase-2b since Expense table is
    // the single source of truth. Sorted by netProfit desc from the server.
    let perUnitPnL = [];
    {
      // Bring in ALL apartments in scope (including those with zero bookings
      // in the period — they still have rent, cleaning, etc.), and keep only
      // those that pass the current filter.
      const filteredAptList = apartmentIds
        ? allApartments.filter(a => apartmentIds.split(',').includes(a.id))
        : allApartments;

      // Refetch expenses for the P&L computation. We already have them from
      // the main expense loop but not indexed by apartment — a fresh pull
      // with a small scope filter is cheaper than restructuring the earlier
      // loop for one downstream use.
      const allExpensesForPnL = await prisma.expense.findMany({
        where: { userId: targetUserId }
      });

      // Compute total global expenses for the period, to split equally
      // across the filtered units.
      let globalPeriodTotal = 0;
      const rangeStart = startDate ? new Date(startDate) : null;
      const rangeEnd = endDate ? new Date(endDate) : null;
      const pnlStart = rangeStart || new Date(0);
      const pnlEnd = rangeEnd || new Date();
      for (const e of allExpensesForPnL) {
        if (e.scope !== 'global') continue;
        globalPeriodTotal += expenseContributionInPeriod(e, pnlStart, pnlEnd);
      }
      const globalSharePerUnit = filteredAptList.length > 0
        ? globalPeriodTotal / filteredAptList.length
        : 0;

      // Now walk each apartment in scope and compute its P&L.
      perUnitPnL = filteredAptList.map(apt => {
        // Revenue + nights from aptStats (built during booking loop above).
        const revenue = aptStats[apt.id]?.revenue || 0;
        const nights = aptStats[apt.id]?.nights || 0;

        // Direct expenses: scope=unit rows tied to this apartment, in period.
        let directExpenses = 0;
        for (const e of allExpensesForPnL) {
          if (e.scope !== 'unit' || e.apartmentId !== apt.id) continue;
          directExpenses += expenseContributionInPeriod(e, pnlStart, pnlEnd);
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
    }

    res.status(200).json({
      totalRevenue,
      totalExpenses,
      netProfit,
      totalNights,
      occupancyRate,
      sourceCounts,
      count: bookings.length,
      dailyTrend,
      topUnits,
      perUnitPnL,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

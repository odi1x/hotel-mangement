/* global process */
/**
 * Demo tenant seed — full-year dataset.
 *
 * Creates a COMPLETELY SEPARATE tenant ("demo") with a realistic Arabic
 * portfolio: a year of bookings, payments, expenses, maintenance, cleaning and
 * a partner settlement, so every analytics view has something to show.
 *
 * Safe to re-run: the previous demo tenant is deleted first (staff included).
 *
 * Run it against the same database the app uses:
 *   $env:DATABASE_URL = "<paste from Vercel env vars>"
 *   $env:DIRECT_URL  = "<paste from Vercel env vars>"
 *   npm run seed:demo
 */
import bcrypt from 'bcrypt';
import prisma from '../prisma.js';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo1234';
const DAY_MS = 86400000;

if (!process.env.DATABASE_URL) {
  console.error('\nDATABASE_URL is not set. Copy it from Vercel → Settings → Environment Variables first.\n');
  process.exit(1);
}

/** Noon UTC, matching how the API stores booking dates. */
const atNoon = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
};
const days = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const nightsBetween = (from, to) => Math.round((atNoon(to) - atNoon(from)) / DAY_MS);
const roundTo5 = (n) => Math.round(n / 5) * 5;
const round2 = (n) => Math.round(n * 100) / 100;

/** Deterministic RNG so the demo data looks identical on every re-run. */
function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261108);
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;

const FIRST_NAMES = [
  'أحمد', 'سارة', 'خالد', 'منى', 'عبدالرحمن', 'نورة', 'فيصل', 'لمياء', 'عبدالله', 'ريم',
  'سلطان', 'هند', 'يوسف', 'رهف', 'ماجد', 'دانة', 'طارق', 'شهد', 'بدر', 'جواهر',
  'نايف', 'أمل', 'وليد', 'راكان', 'لينا', 'عمر', 'تالا', 'زياد', 'غادة', 'مشعل',
  'لطيفة', 'سلطان', 'عبير', 'مازن', 'دلال', 'تركي', 'نوف', 'سلمان', 'غيداء', 'ولاء',
];
const LAST_NAMES = [
  'الحربي', 'القحطاني', 'الدوسري', 'الشمري', 'الزهراني', 'العتيبي', 'الغامدي', 'المالكي',
  'السبيعي', 'الشثري', 'القرني', 'العنزي', 'الرشيد', 'الجهني', 'الحميد', 'السلمي',
  'المصري', 'الخالدي', 'الضيف', 'الحازمي', 'اليامي', 'القرعاوي', 'المطيري', 'البراك',
];

const randomResident = () => {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  return {
    name: `${first} ${last}`,
    phone: `05${randInt(10000000, 99999999)}`,
    id: String(randInt(1000000000, 1099999999)),
  };
};

const APARTMENTS = [
  { name: 'شقة النخيل ١', type: 'شقة', economicCategory: 'عائلية', basePrice: 450, location: 'حي الملقا', owner: 'شركة النخيل', description: 'شقة عائلية بمدخلين ومطبخ راكب، قريبة من المدارس.', density: 0.72, minNights: 2, maxNights: 6, cleaningFee: 150 },
  { name: 'شقة النخيل ٢', type: 'شقة', economicCategory: 'عائلية', basePrice: 450, location: 'حي الملقا', owner: 'شركة النخيل', description: 'شقة عائلية مطلة على الحديقة مع مواقف خاصة.', density: 0.68, minNights: 2, maxNights: 7, cleaningFee: 150 },
  { name: 'شقة الياسمين ٣', type: 'شقة', economicCategory: 'شهرية', basePrice: 3200, location: 'حي الياسمين', owner: 'شركة النخيل', description: 'شقة شهرية واسعة بثلاث غرف وصالة عائلية.', monthly: true, minNights: 25, maxNights: 30, cleaningFee: 250, platformFee: 8 },
  { name: 'شقة الواحة ٤', type: 'استوديو', economicCategory: 'شهرية', basePrice: 1800, location: 'حي الواحة', owner: 'شركة النخيل', description: 'استوديو مجهز بالكامل مناسب للفردين.', monthly: true, minNights: 20, maxNights: 30, cleaningFee: 200, platformFee: 8 },
  { name: 'شقة الربيع ٥', type: 'شقة', economicCategory: 'عائلية', basePrice: 520, location: 'حي الربيع', owner: 'مؤسسة الربيع', description: 'شقة بأربع غرف ومطبخ راكب، تشطيب جديد.', density: 0.66, minNights: 2, maxNights: 5, cleaningFee: 180 },
  { name: 'شقة السلام ٦', type: 'شقة', economicCategory: 'شهرية', basePrice: 2600, location: 'حي السلام', owner: 'مؤسسة الربيع', description: 'شقة هادئة قريبة من الخدمات والطرق الرئيسية.', monthly: true, minNights: 25, maxNights: 30, cleaningFee: 220, platformFee: 6 },
];

const SOURCES = [
  { value: 'Airbnb', weight: 30 },
  { value: 'Booking.com', weight: 25 },
  { value: 'زيارة مباشرة', weight: 27 },
  { value: 'Public Link', weight: 18 },
];
const weightedSource = () => {
  const total = SOURCES.reduce((s, x) => s + x.weight, 0);
  let roll = rand() * total;
  for (const s of SOURCES) {
    roll -= s.weight;
    if (roll <= 0) return s.value;
  }
  return SOURCES[0].value;
};

const METHODS = ['cash', 'bank_transfer', 'mada', 'stc_pay'];
const PAYMENT_NOTES = ['سداد كامل', 'دفعة مقدمة', 'تحويل بنكي', 'دفع عند الوصول', 'تسوية متبقية'];

function seasonMultiplier(date) {
  const m = date.getUTCMonth();
  if (m === 5 || m === 6) return 1.45;
  if (m === 11) return 1.25;
  if (m === 0) return 1.15;
  if (m === 9 || m === 10) return 1.1;
  return 1;
}

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

async function wipeDemoTenant() {
  const existing = await prisma.user.findUnique({ where: { username: DEMO_USERNAME } });
  if (!existing) return;
  await prisma.user.deleteMany({ where: { adminId: existing.id } });
  await prisma.user.delete({ where: { id: existing.id } });
}

async function main() {
  console.log('› removing previous demo tenant (if any)…');
  await wipeDemoTenant();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log('› creating demo tenant…');
  const admin = await prisma.user.create({
    data: {
      username: DEMO_USERNAME,
      password: passwordHash,
      name: 'مالك تجريبي',
      role: 'admin',
      businessName: 'شقق النخيل للتأجير',
      tourismLicense: 'TL-2026-00128',
      apartmentTypes: 'شقة,استوديو,غرفة',
      bookingSources: 'زيارة مباشرة,Booking.com,Airbnb,Public Link',
      economicCategories: 'عائلية,شهرية',
      locations: 'حي الملقا,حي الياسمين,حي الواحة,حي الربيع,حي السلام',
      generalExpenses: 0,
      partnersRevenueSharingEnabled: true,
      notificationPrefs: {
        push: true,
        categories: { booking: true, cleaning: true, maintenance: true, finance: true, system: true },
      },
    },
  });

  console.log('› creating staff…');
  const cleaner = await prisma.user.create({
    data: {
      username: 'demo.cleaner', password: passwordHash, name: 'أحمد العامل', role: 'staff', adminId: admin.id,
      canBook: false, canEdit: false, canDelete: false, canViewAnalytics: false, canViewSettings: false,
      canViewBalances: false, canViewMaintenance: true, canViewPricing: false, canViewPrices: false,
      canClean: true, canManageCleaningTemplates: false,
    },
  });
  const frontDesk = await prisma.user.create({
    data: {
      username: 'demo.frontdesk', password: passwordHash, name: 'منى الاستقبال', role: 'staff', adminId: admin.id,
      canBook: true, canEdit: true, canDelete: false, canViewAnalytics: false, canViewSettings: false,
      canViewBalances: true, canViewMaintenance: true, canViewPricing: true, canViewPrices: true,
      canClean: false, canManageCleaningTemplates: false,
    },
  });

  console.log('› creating apartments…');
  const apartments = [];
  for (const a of APARTMENTS) {
    apartments.push(await prisma.apartment.create({
      data: {
        userId: admin.id,
        name: a.name,
        type: a.type,
        economicCategory: a.economicCategory,
        basePrice: a.basePrice,
        location: a.location,
        owner: a.owner,
        description: a.description,
        cleaningFeePerStay: a.cleaningFee,
        ...(a.platformFee ? { platformFeeType: 'percentage', platformFee: a.platformFee } : {}),
        isActive: true,
        needsCleaning: false,
      },
    }));
  }

  const created = { bookings: 0, payments: 0 };

  const addPayment = async (bookingId, amount, date, method, type, notes, collectedBy) => {
    await prisma.payment.create({
      data: {
        bookingId,
        userId: admin.id,
        amount: round2(amount),
        date: atNoon(date),
        method,
        type,
        notes,
        collectedBy,
      },
    });
    created.payments += 1;
  };

  const createBooking = async (apartment, start, end, opts = {}) => {
    const resident = opts.resident || randomResident();
    const nights = nightsBetween(start, end);
    const multiplier = opts.multiplier ?? seasonMultiplier(start);
    const isMonthly = nights >= 20;
    const base = Number(apartment.basePrice);

    // Monthly units are priced per MONTH — the nightly rate is derived from it
    // so both pricing modes stay consistent with what the app stores.
    const pricePerNight = isMonthly
      ? roundTo5(base / 30)
      : roundTo5(base * multiplier);
    const total = round2(opts.totalPrice ?? (isMonthly
      ? base * (nights / 30) * multiplier * (nights >= 28 ? 0.95 : 1)
      : nights * pricePerNight));

    const booking = await prisma.booking.create({
      data: {
        userId: admin.id,
        apartmentId: apartment.id,
        residentName: resident.name,
        residentId: resident.id,
        phone: resident.phone,
        address: opts.address || null,
        pricePerNight,
        totalPrice: total,
        pricingMode: isMonthly ? 'total' : 'per_night',
        startDate: atNoon(start),
        endDate: atNoon(end),
        status: opts.status || 'active',
        source: opts.source || weightedSource(),
        notes: opts.notes || null,
        customerRequest: opts.customerRequest || null,
        creatorName: opts.creator || 'مالك تجريبي',
      },
    });
    created.bookings += 1;

    const status = booking.status;
    const method = opts.method || pick(METHODS);
    const collectedBy = opts.collectedBy || (chance(0.4) ? frontDesk.name : 'مالك تجريبي');

    if (status === 'pending') return booking;

    if (status === 'cancelled') {
      if (chance(0.45)) {
        await addPayment(booking.id, total * 0.3, start, method, 'deposit', 'عربون ملغى', collectedBy);
      }
      return booking;
    }

    const roll = rand();
    if (roll < 0.58) {
      await addPayment(booking.id, total, start, method, 'payment', pick(PAYMENT_NOTES), collectedBy);
    } else if (roll < 0.82) {
      await addPayment(booking.id, total * 0.5, new Date(atNoon(start).getTime() - 2 * DAY_MS), method, 'deposit', 'دفعة مقدمة', collectedBy);
      await addPayment(booking.id, total * 0.5, start, method, 'payment', 'سداد الباقي', collectedBy);
    } else if (roll < 0.93) {
      await addPayment(booking.id, total * 0.4, start, method, 'payment', 'دفعة عند الوصول', collectedBy);
    } else if (chance(0.35)) {
      await addPayment(booking.id, -round2(total * 0.15), new Date(atNoon(start).getTime() + DAY_MS), 'cash', 'refund', 'استرداد جزئي', collectedBy);
    }

    if (chance(0.05)) {
      await addPayment(booking.id, -round2(total * 0.1), new Date(atNoon(start).getTime() + DAY_MS), 'cash', 'refund', 'استرداد عن أضرار', collectedBy);
    }

    return booking;
  };

  console.log('› creating the hand-crafted demo story…');
  const today = days(0);
  const storyResident = {
    name: 'أحمد بن عبدالله الحربي', phone: '0551234567', id: '1087654321',
  };

  await createBooking(apartments[0], today, days(3), {
    resident: storyResident,
    status: 'active',
    source: 'زيارة مباشرة',
    notes: 'عندهم طفل صغير، توفير كرسي أطفال.',
    method: 'cash',
    collectedBy: 'مالك تجريبي',
  });

  await createBooking(apartments[1], days(-2), today, {
    resident: { name: 'سارة محمد القحطاني', phone: '0509876543', id: '1098765432' },
    status: 'active',
    source: 'Booking.com',
    notes: 'وصول متأخر بعد منتصف الليل.',
    method: 'bank_transfer',
  });

  console.log('› generating a year of bookings…');
  const windowStart = days(-300);
  const windowEnd = days(160);
  const reserved = {
    0: [[atNoon(today), atNoon(days(3))]],
    1: [[atNoon(days(-2)), atNoon(today)]],
  };

  let pendingBudget = 6;

  for (let idx = 0; idx < apartments.length; idx += 1) {
    const apartment = apartments[idx];
    const profile = APARTMENTS[idx];
    let cursor = new Date(windowStart);

    while (cursor < windowEnd) {
      const length = randInt(profile.minNights, profile.maxNights);
      const start = new Date(cursor);
      const end = new Date(cursor.getTime() + length * DAY_MS);

      const blocked = (reserved[idx] || []).some(([s, e]) => overlaps(start, end, s, e));
      if (blocked) {
        cursor = new Date(cursor.getTime() + DAY_MS);
        continue;
      }

      const shouldBook = profile.monthly ? true : chance(profile.density);
      if (!shouldBook) {
        cursor = new Date(cursor.getTime() + randInt(1, 9) * DAY_MS);
        continue;
      }

      const isPast = end < today;
      let status = 'active';
      if (isPast) {
        if (chance(0.09)) status = 'checked_out_early';
        else if (chance(0.08)) status = 'cancelled';
      } else if (start > today && pendingBudget > 0 && chance(0.16)) {
        status = 'pending';
        pendingBudget -= 1;
      }

      await createBooking(apartment, start, end, {
        status,
        source: weightedSource(),
        multiplier: seasonMultiplier(start),
      });

      const gap = profile.monthly ? randInt(3, 12) : randInt(1, 8);
      cursor = new Date(end.getTime() + gap * DAY_MS);
    }
  }

  console.log('› adding the public request + a few special cases…');
  const findGap = async (apartmentId, minNights) => {
    const existing = await prisma.booking.findMany({
      where: { apartmentId, startDate: { lt: windowEnd }, endDate: { gt: windowStart } },
      select: { startDate: true, endDate: true },
      orderBy: { startDate: 'asc' },
    });
    let cursor = new Date(atNoon(windowStart));
    for (const b of existing) {
      if (b.startDate.getTime() - cursor.getTime() >= minNights * DAY_MS) return cursor;
      if (b.endDate > cursor) cursor = new Date(b.endDate);
    }
    if (new Date(atNoon(windowEnd)).getTime() - cursor.getTime() >= minNights * DAY_MS) return cursor;
    return null;
  };

  const requestStart = await findGap(apartments[2].id, 5);
  if (requestStart) {
    await createBooking(apartments[2], requestStart, new Date(requestStart.getTime() + 4 * DAY_MS), {
      status: 'pending',
      source: 'Public Link',
      resident: { name: 'لمياء عمر المالكي', phone: '0599990000', id: '1022229999' },
      customerRequest: 'أرغب بحجز شقة لثلاثة أشخاص لمدة أسبوع، مع تفضيل الدور الأرضي.',
      notes: 'طلب من رابط الحجز العام.',
    });
  }

  const cancelledStart = await findGap(apartments[4].id, 4);
  if (cancelledStart) {
    await createBooking(apartments[4], cancelledStart, new Date(cancelledStart.getTime() + 3 * DAY_MS), {
      status: 'cancelled',
      source: 'Airbnb',
      notes: 'ألغى الحجز قبل الوصول.',
    });
  }

  console.log('› creating monthly expenses…');
  const expenseTemplates = [
    { title: 'إيجار شقق النخيل — المبلغ الشهري', amount: 6500, category: 'rent' },
    { title: 'رواتب العمالة', amount: 3200, category: 'staff' },
    { title: 'فاتورة كهرباء ومياه', amount: 1180, category: 'utilities' },
    { title: 'صيانة دورية للوحدات', amount: 750, category: 'maintenance' },
    { title: 'حملات تسويقية', amount: 900, category: 'marketing' },
    { title: 'مستلزمات تنظيف', amount: 420, category: 'supplies' },
    { title: 'تجديد تراخيص', amount: 1500, category: 'licenses' },
  ];
  let expenseCount = 0;
  for (let m = 13; m >= 0; m -= 1) {
    for (const t of expenseTemplates) {
      if (t.category === 'marketing' && !chance(0.6)) continue;
      if (t.category === 'licenses' && m !== 7 && m !== 0) continue;
      if (t.category === 'maintenance' && !chance(0.5)) continue;
      const date = new Date();
      date.setMonth(date.getMonth() - m);
      date.setDate(randInt(2, 26));
      await prisma.expense.create({
        data: {
          userId: admin.id,
          title: t.title,
          amount: round2(t.amount * (0.85 + rand() * 0.3)),
          date,
          category: t.category,
          scope: 'global',
          sourceType: 'manual',
        },
      });
      expenseCount += 1;
    }
  }

  console.log('› creating pricing rules…');
  const thisYear = new Date().getUTCFullYear();
  await prisma.pricingRule.create({
    data: {
      userId: admin.id,
      label: 'موسم الصيف',
      startDate: new Date(Date.UTC(thisYear, 5, 1)),
      endDate: new Date(Date.UTC(thisYear, 7, 0)),
      priceMode: 'multiplier',
      value: 1.45,
      priority: 70,
      daysOfWeek: [],
      color: '#f59e0b',
    },
  });
  await prisma.pricingRule.create({
    data: {
      userId: admin.id,
      label: 'عروض نهاية الأسبوع',
      startDate: new Date(Date.UTC(thisYear, 0, 1)),
      endDate: new Date(Date.UTC(thisYear + 1, 0, 1)),
      priceMode: 'multiplier',
      value: 1.2,
      priority: 60,
      daysOfWeek: [5, 6],
      color: '#0ea5e9',
    },
  });
  await prisma.pricingRule.create({
    data: {
      userId: admin.id,
      apartmentId: apartments[3].id,
      label: 'إيجار شهري خاص',
      startDate: new Date(Date.UTC(thisYear, 0, 1)),
      endDate: new Date(Date.UTC(thisYear + 1, 0, 1)),
      priceMode: 'fixed',
      value: 1650,
      priority: 80,
      daysOfWeek: [],
      color: '#10b981',
    },
  });

  console.log('› creating maintenance history…');
  const maintenance = [
    { title: 'تسريب تحت المغسلة', description: 'تسريب مياه من خرطوم الغسيل ويحتاج فني سباكة.', category: 'plumbing', severity: 'urgent', status: 'open', apt: 1, daysAgo: 4, cost: null },
    { title: 'مكيف لا يبرد', description: 'تم تغيير الفلتر لكن التبريد ضعيف ويحتاج معاينة فني.', category: 'hvac', severity: 'normal', status: 'open', apt: 3, daysAgo: 9, cost: null },
    { title: 'عطل سخان الماء', description: 'السخان لا يسخن الماء ويحتاج تبديل عنصر التسخين.', category: 'appliances', severity: 'urgent', status: 'resolved', apt: 0, daysAgo: 38, cost: 420 },
    { title: 'مفتاح كهرباء تالف', description: 'مفتاح الإنارة في غرفة النوم لا يعمل.', category: 'electrical', severity: 'normal', status: 'resolved', apt: 2, daysAgo: 62, cost: 180 },
    { title: 'باب المدخل يحتاج صيانة', description: 'المفصلة تصر عند الإغلاق وتحتاج تشحيم.', category: 'furniture', severity: 'normal', status: 'resolved', apt: 4, daysAgo: 95, cost: 250 },
    { title: 'تنظيف عميق', description: 'تنظيف عميق بعد مغادرة نزيل طويل.', category: 'deep_clean', severity: 'improvement', status: 'resolved', apt: 5, daysAgo: 120, cost: 600 },
  ];
  for (const m of maintenance) {
    await prisma.maintenanceIssue.create({
      data: {
        userId: admin.id,
        apartmentId: apartments[m.apt].id,
        title: m.title,
        description: m.description,
        category: m.category,
        severity: m.severity,
        status: m.status,
        cost: m.cost,
        contractor: m.status === 'resolved' ? 'شركة الصيانة المتعاقدة' : null,
        notes: m.status === 'resolved' ? 'تم الإصلاح واختبار التشغيل.' : null,
        reportedAt: days(-m.daysAgo),
        reportedBy: chance(0.5) ? 'منى الاستقبال' : 'مالك تجريبي',
        reportedById: admin.id,
        resolvedAt: m.status === 'resolved' ? days(-m.daysAgo + 2) : null,
      },
    });
  }

  console.log('› creating cleaning tasks…');
  const checklist = [
    { area: 'bathroom', note: '', checked: false },
    { area: 'kitchen', note: '', checked: false },
    { area: 'bedroom', note: 'تغيير الشراشف', checked: false },
    { area: 'general', note: '', checked: false },
  ];
  await prisma.cleaningTask.create({
    data: {
      userId: admin.id,
      apartmentId: apartments[1].id,
      status: 'pending',
      checklist,
      notes: 'تنظيف بعد مغادرة نزيل اليوم.',
      dueBy: days(0),
      scheduledFor: days(0),
    },
  });
  for (let i = 0; i < 8; i += 1) {
    const aptIdx = i % apartments.length;
    const when = days(-(6 + i * 11));
    await prisma.cleaningTask.create({
      data: {
        userId: admin.id,
        apartmentId: apartments[aptIdx].id,
        status: 'done',
        checklist: checklist.map((c) => ({ ...c, checked: true })),
        cleanerNotes: 'تم تغيير الشراشف وتنعيم الأرضيات.',
        dueBy: when,
        scheduledFor: when,
        startedBy: cleaner.id,
        startedAt: when,
        completedBy: cleaner.id,
        completedAt: when,
      },
    });
  }

  console.log('› creating partner + settlements…');
  const partner = await prisma.partner.create({
    data: {
      userId: admin.id,
      name: 'شركة الإدخال والتشغيل',
      phone: '0500000000',
      email: 'ops@example.com',
      notes: 'تدير التشغيل والصيانة مقابل عمولة على الإيراد.',
      compType: 'percentage_gross',
      percentage: 15,
      apartmentIds: [apartments[4].id, apartments[5].id],
      recurringPeriod: 'monthly',
      status: 'active',
    },
  });

  const settlements = [
    { start: days(-60), end: days(-31), gross: 12400, expenses: 3100, net: 9300, amount: 1395, status: 'paid', memo: 'تسوية الشهر السابق' },
    { start: days(-30), end: days(-1), gross: 11850, expenses: 2950, net: 8900, amount: 1335, status: 'draft', memo: 'تسوية تجريبية للشهر الماضي' },
  ];
  for (const s of settlements) {
    await prisma.settlement.create({
      data: {
        partnerId: partner.id,
        userId: admin.id,
        partnerNameSnap: partner.name,
        compTypeSnap: partner.compType,
        percentageSnap: partner.percentage,
        scopeSnap: partner.apartmentIds,
        periodStart: s.start,
        periodEnd: s.end,
        basisGross: s.gross,
        basisExpenses: s.expenses,
        basisNet: s.net,
        amount: s.amount,
        status: s.status,
        paidAt: s.status === 'paid' ? s.end : null,
        memo: s.memo,
        source: 'auto',
      },
    });
  }

  console.log('\n──────────────────────────────────────────');
  console.log('  Demo tenant ready ✓');
  console.log(`  Username: ${DEMO_USERNAME}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log('──────────────────────────────────────────\n');
  console.log(`  Apartments : ${apartments.length}`);
  console.log(`  Bookings   : ${created.bookings}`);
  console.log(`  Payments   : ${created.payments}`);
  console.log(`  Expenses   : ${expenseCount}`);
  console.log('──────────────────────────────────────────\n');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

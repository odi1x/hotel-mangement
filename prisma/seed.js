/* global process */
/**
 * Demo tenant seed.
 *
 * Creates a COMPLETELY SEPARATE tenant ("demo") with realistic Arabic data so
 * a live demo never touches the real property's records. Safe to re-run: the
 * previous demo tenant is deleted first (its apartments/bookings/payments
 * cascade with it).
 *
 * Run it against the same database the app uses:
 *   $env:DATABASE_URL = "<paste from Vercel env vars>"
 *   $env:DIRECT_URL  = "<paste from Vercel env vars>"
 *   npm run seed:demo
 *
 * The script prints the login credentials when it finishes.
 */
import bcrypt from 'bcrypt';
import prisma from '../prisma.js';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo1234';

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
const nightsBetween = (from, to) => Math.round((atNoon(to) - atNoon(from)) / 86400000);

const APARTMENTS = [
  { name: 'شقة النخيل ١', type: 'شقة', economicCategory: 'عائلية', basePrice: 450, location: 'حي الملقا', description: 'شقة عائلية بمدخلين ومطبخ راكب، قريبة من المدارس.', owner: 'شركة النخيل' },
  { name: 'شقة النخيل ٢', type: 'شقة', economicCategory: 'عائلية', basePrice: 450, location: 'حي الملقا', description: 'شقة عائلية مطلة على الحديقة مع مواقف خاصة.', owner: 'شركة النخيل' },
  { name: 'شقة الياسمين ٣', type: 'شقة', economicCategory: 'شهرية', basePrice: 3200, location: 'حي الياسمين', description: 'شقة شهرية واسعة بثلاث غرف وصالة عائلية.', owner: 'شركة النخيل' },
  { name: 'شقة الواحة ٤', type: 'استوديو', economicCategory: 'شهرية', basePrice: 1800, location: 'حي الواحة', description: 'استوديو مجهز بالكامل مناسب للفردين.', owner: 'شركة النخيل' },
  { name: 'شقة الربيع ٥', type: 'شقة', economicCategory: 'عائلية', basePrice: 520, location: 'حي الربيع', description: 'شقة بأربع غرف ومطبخ راكب، تشطيب جديد.', owner: 'مؤسسة الربيع' },
  { name: 'شقة السلام ٦', type: 'شقة', economicCategory: 'شهرية', basePrice: 2600, location: 'حي السلام', description: 'شقة هادئة قريبة من الخدمات والطرق الرئيسية.', owner: 'مؤسسة الربيع' },
];

const RESIDENTS = [
  { name: 'أحمد بن عبدالله الحربي', phone: '0551234567', id: '1087654321' },
  { name: 'سارة محمد القحطاني', phone: '0509876543', id: '1098765432' },
  { name: 'خالد عبدالعزيز الدوسري', phone: '0533334444', id: '1077778888' },
  { name: 'منى فهد الشمري', phone: '0566667777', id: '1066667777' },
  { name: 'عبدالرحمن يوسف الزهراني', phone: '0544445555', id: '1055554444' },
  { name: 'نورة سعد العتيبي', phone: '0522223333', id: '1044442222' },
  { name: 'فيصل ناصر الغامدي', phone: '0577778888', id: '1033331111' },
  { name: 'لمياء عمر المالكي', phone: '0599990000', id: '1022229999' },
];

async function wipeDemoTenant() {
  const existing = await prisma.user.findUnique({ where: { username: DEMO_USERNAME } });
  if (!existing) return;
  // Staff rows point at the admin through an optional relation (SetNull), so
  // they have to go first — otherwise re-running the seed would hit the
  // unique username constraint.
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
  await prisma.user.create({
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
        isActive: true,
        needsCleaning: false,
      },
    }));
  }

  // Booking plan — deliberately spans every status the UI can show:
  // arriving today, departing today, in-house, upcoming, past, cancelled
  // and a pending request from the public booking link.
  const plan = [
    { apt: 0, res: 0, start: days(0), end: days(3), status: 'active', paid: [0.5], source: 'زيارة مباشرة', notes: 'عندهم طفل صغير، توفير كرسي أطفال.', method: 'cash' },
    { apt: 1, res: 1, start: days(-2), end: days(0), status: 'active', paid: [1], source: 'Booking.com', notes: 'وصول متأخر بعد منتصف الليل.', method: 'bank_transfer' },
    { apt: 2, res: 2, start: days(7), end: days(37), status: 'active', paid: [0.25], source: 'Airbnb', notes: 'سكن شهري.', method: 'mada' },
    { apt: 3, res: 3, start: days(14), end: days(44), status: 'active', paid: [], source: 'Public Link', notes: 'يفضل الدور الأرضي.', method: 'cash' },
    { apt: 4, res: 4, start: days(-20), end: days(-17), status: 'active', paid: [1], source: 'زيارة مباشرة', notes: '', method: 'bank_transfer' },
    { apt: 5, res: 5, start: days(-35), end: days(-5), status: 'active', paid: [1], source: 'Airbnb', notes: '', method: 'stc_pay' },
    { apt: 0, res: 6, start: days(-10), end: days(-6), status: 'cancelled', paid: [], source: 'زيارة مباشرة', notes: 'ألغى الحجز قبل الوصول.', method: 'cash' },
    { apt: 2, res: 7, start: days(3), end: days(6), status: 'pending', paid: [], source: 'Public Link', customerRequest: 'أرغب بحجز شقة لثلاثة أشخاص لمدة أسبوع.', notes: 'طلب من رابط الحجز العام.', method: 'cash' },
  ];

  console.log('› creating bookings + payments…');
  for (const p of plan) {
    const apartment = apartments[p.apt];
    const resident = RESIDENTS[p.res];
    const total = nightsBetween(p.start, p.end) * Number(apartment.basePrice);

    const booking = await prisma.booking.create({
      data: {
        userId: admin.id,
        apartmentId: apartment.id,
        residentName: resident.name,
        residentId: resident.id,
        phone: resident.phone,
        pricePerNight: apartment.basePrice,
        totalPrice: total,
        pricingMode: 'per_night',
        startDate: atNoon(p.start),
        endDate: atNoon(p.end),
        status: p.status,
        source: p.source,
        notes: p.notes,
        customerRequest: p.customerRequest || null,
        creatorName: 'مالك تجريبي',
      },
    });

    for (const ratio of p.paid) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          userId: admin.id,
          amount: Math.round(total * ratio * 100) / 100,
          date: atNoon(p.start),
          method: p.method,
          type: ratio === 1 ? 'payment' : 'deposit',
          notes: ratio === 1 ? 'سداد كامل' : 'دفعة مقدمة عند الوصول',
          collectedBy: 'مالك تجريبي',
        },
      });
    }
  }

  // A refund on the completed stay, so the payment ledger shows a credit row.
  const refundedBooking = await prisma.booking.findFirst({
    where: { userId: admin.id, residentName: RESIDENTS[5].name },
  });
  if (refundedBooking) {
    await prisma.payment.create({
      data: {
        bookingId: refundedBooking.id,
        userId: admin.id,
        amount: 300,
        date: days(-4),
        method: 'cash',
        type: 'refund',
        notes: 'استرداد مبلغ عن أضرار التنظيف',
        collectedBy: 'مالك تجريبي',
      },
    });
  }

  console.log('› creating expenses…');
  const expenses = [
    { title: 'إيجار شقة النخيل ١ — هذا الشهر', amount: 6500, category: 'rent', daysAgo: 12 },
    { title: 'صيانة تكييف شقة النخيل ٢', amount: 750, category: 'maintenance', daysAgo: 9 },
    { title: 'فاتورة كهرباء ومياه', amount: 1180, category: 'utilities', daysAgo: 5 },
    { title: 'رواتب العمالة', amount: 3200, category: 'staff', daysAgo: 3 },
    { title: 'حملات تسويقية', amount: 900, category: 'marketing', daysAgo: 2 },
    { title: 'مستلزمات تنظيف', amount: 420, category: 'supplies', daysAgo: 1 },
  ];
  for (const e of expenses) {
    await prisma.expense.create({
      data: {
        userId: admin.id,
        title: e.title,
        amount: e.amount,
        date: days(-e.daysAgo),
        category: e.category,
        scope: 'global',
        sourceType: 'manual',
      },
    });
  }

  console.log('› creating maintenance + cleaning…');
  await prisma.maintenanceIssue.create({
    data: {
      userId: admin.id,
      apartmentId: apartments[1].id,
      title: 'تسريب تحت المغسلة',
      description: 'تسريب مياه من خرطوم الغسيل ويحتاج فني سباكة.',
      category: 'plumbing',
      severity: 'urgent',
      status: 'open',
      reportedAt: days(-4),
      reportedBy: 'منى الاستقبال',
      reportedById: admin.id,
    },
  });
  await prisma.maintenanceIssue.create({
    data: {
      userId: admin.id,
      apartmentId: apartments[3].id,
      title: 'مكيف لا يبرد',
      description: 'تم تغيير الفلتر لكن التبريد ضعيف ويحتاج معاينة فني.',
      category: 'hvac',
      severity: 'normal',
      status: 'open',
      reportedAt: days(-9),
      reportedBy: 'مالك تجريبي',
      reportedById: admin.id,
    },
  });

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
  await prisma.cleaningTask.create({
    data: {
      userId: admin.id,
      apartmentId: apartments[0].id,
      status: 'done',
      checklist: checklist.map((c) => ({ ...c, checked: true })),
      cleanerNotes: 'تم تغيير الشراشف وتنعيم الأرضيات.',
      dueBy: days(-2),
      scheduledFor: days(-2),
      startedBy: cleaner.id,
      startedAt: days(-2),
      completedBy: cleaner.id,
      completedAt: days(-2),
    },
  });

  console.log('› creating partner…');
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

  await prisma.settlement.create({
    data: {
      partnerId: partner.id,
      userId: admin.id,
      partnerNameSnap: partner.name,
      compTypeSnap: partner.compType,
      percentageSnap: partner.percentage,
      scopeSnap: partner.apartmentIds,
      periodStart: days(-30),
      periodEnd: days(-1),
      basisGross: 12000,
      basisExpenses: 3000,
      basisNet: 9000,
      amount: 1350,
      status: 'draft',
      memo: 'تسوية تجريبية لشهر سابق',
      source: 'auto',
    },
  });

  console.log('\n──────────────────────────────────────────');
  console.log('  Demo tenant ready ✓');
  console.log(`  Username: ${DEMO_USERNAME}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log('──────────────────────────────────────────\n');
  console.log(`  Apartments : ${apartments.length}`);
  console.log(`  Bookings   : ${plan.length}`);
  console.log(`  Expenses   : ${expenses.length}`);
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

/* global process */
import prisma from '../../prisma.js';
import { notify } from '../notify.js';
import { calculateGrossRevenue, calculateExpenses, computePartnerCompensation } from '../admin-resources.js';

const RIYADH_OFFSET_MIN = 180;

function dayStartRiyadh(date) {
  const shifted = new Date(date.getTime() + RIYADH_OFFSET_MIN * 60000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d) - RIYADH_OFFSET_MIN * 60000);
}

function shiftDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function pruneOldNotifications() {
  const cutoff = new Date(Date.now() - 30 * 86400000);
  return prisma.notification.deleteMany({
    where: { isCleared: true, createdAt: { lt: cutoff } },
  });
}

async function overdueCleaningDigest(todayStart, ownerIds) {
  const now = new Date();
  let sent = 0;

  const overdue = await prisma.cleaningTask.findMany({
    where: {
      userId: { in: ownerIds },
      status: 'pending',
      dueBy: { lt: now },
    },
    select: { id: true, userId: true, dueBy: true, apartment: { select: { name: true } } },
  });

  for (const task of overdue) {
    const daysLate = Math.max(1, Math.floor((now - task.dueBy) / 86400000));
    await notify({
      permission: 'canClean',
      ownerId: task.userId,
      includeOwner: true,
      title: 'مهمة تنظيف متأخرة',
      message: `مهمة تنظيف وحدة ${task.apartment?.name || ''} متأخرة ${daysLate} ${daysLate === 1 ? 'يوم' : 'أيام'} عن موعدها.`,
      type: 'warning',
      link: 'cleaning',
      source: 'cron',
      tag: `clean-overdue:${task.id}`,
      push: true,
    });
    sent++;
  }

  const arrivalsTomorrow = await prisma.booking.findMany({
    where: {
      status: 'active',
      startDate: { gte: shiftDays(todayStart, 1), lt: shiftDays(todayStart, 2) },
    },
    select: {
      id: true,
      apartment: { select: { id: true, name: true, userId: true, needsCleaning: true } },
    },
  });

  for (const booking of arrivalsTomorrow) {
    if (!booking.apartment?.needsCleaning) continue;
    const result = await notify({
      permission: 'canClean',
      ownerId: booking.apartment.userId,
      includeOwner: true,
      title: '⚠️ استعجال: تنظيف قبل وصول النزيل',
      message: `وحدة ${booking.apartment.name} تحتاج تنظيف ووصول نزيلها غداً.`,
      type: 'warning',
      link: 'cleaning',
      urgent: true,
      source: 'cron',
      tag: `clean-urgency:${booking.apartment.id}:${shiftDays(todayStart, 1).toISOString().slice(0, 10)}`,
      push: true,
    });
    sent += result.created;
  }

  return sent;
}

async function staleMaintenanceDigest(ownerIds) {
  const cutoff = new Date(Date.now() - 3 * 86400000);
  const issues = await prisma.maintenanceIssue.findMany({
    where: {
      userId: { in: ownerIds },
      status: { not: 'resolved' },
      reportedAt: { lt: cutoff },
      severity: 'urgent',
    },
    select: { id: true, userId: true, title: true, apartment: { select: { name: true } } },
  });

  for (const issue of issues) {
    await notify({
      permission: 'canViewMaintenance',
      ownerId: issue.userId,
      includeOwner: true,
      title: 'بلاغ عاجل لم يُحل بعد 3 أيام',
      message: `"${issue.title}" في وحدة ${issue.apartment?.name || ''} ما زال مفتوحاً.`,
      type: 'warning',
      link: 'maintenance',
      urgent: true,
      source: 'cron',
      tag: `maint-stale:${issue.id}`,
      push: true,
    });
  }

  return issues.length;
}

async function staleRequestsDigest(ownerIds) {
  const cutoff = new Date(Date.now() - 24 * 3600000);
  const requests = await prisma.booking.findMany({
    where: {
      userId: { in: ownerIds },
      status: 'pending',
      source: 'Public Link',
      createdAt: { lt: cutoff },
    },
    select: { id: true, userId: true, residentName: true, createdAt: true },
  });

  for (const request of requests) {
    const hours = Math.floor((Date.now() - request.createdAt) / 3600000);
    await notify({
      permission: 'canBook',
      ownerId: request.userId,
      includeOwner: true,
      title: 'طلب حجز معلّق منذ أكثر من يوم',
      message: `طلب من ${request.residentName || 'نزيل'} لم تتم معالجته منذ ${hours} ساعة.`,
      type: 'warning',
      link: 'requests',
      source: 'cron',
      tag: `request-stale:${request.id}`,
      push: false,
    });
  }

  return requests.length;
}

async function generateMonthlyPartnerSettlements(today) {
  if (today.getDate() > 7) {
    return { skip: true, reason: 'not in first week of month' };
  }

  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  prevMonthStart.setHours(0, 0, 0, 0);
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  prevMonthEnd.setHours(23, 59, 59, 999);

  const owners = await prisma.user.findMany({
    where: { partnersRevenueSharingEnabled: true },
    select: { id: true },
  });

  let created = 0;
  let skipped = 0;

  for (const owner of owners) {
    const partners = await prisma.partner.findMany({
      where: { userId: owner.id, status: 'active', recurringPeriod: 'monthly' },
    });

    for (const partner of partners) {
      const aptIds = partner.apartmentIds.length > 0 ? partner.apartmentIds : [];

      const existing = await prisma.settlement.findFirst({
        where: {
          partnerId: partner.id,
          status: { not: 'void' },
          periodStart: { gte: prevMonthStart, lt: prevMonthEnd },
        },
      });
      if (existing) { skipped++; continue; }

      const { gross } = await calculateGrossRevenue(owner.id, aptIds, prevMonthStart, prevMonthEnd);
      const { total: expenses } = await calculateExpenses(owner.id, aptIds, prevMonthStart, prevMonthEnd);
      const { amount, formulaLabel, basis } = computePartnerCompensation(partner, gross, expenses);

      const settlement = await prisma.settlement.create({
        data: {
          partnerId: partner.id,
          userId: owner.id,
          partnerNameSnap: partner.name,
          compTypeSnap: partner.compType,
          percentageSnap: partner.percentage,
          fixedAmountSnap: partner.fixedAmount,
          scopeSnap: [...partner.apartmentIds],
          periodStart: prevMonthStart,
          periodEnd: prevMonthEnd,
          basisGross: gross,
          basisExpenses: expenses,
          basisNet: basis.net,
          amount,
          currency: 'sar',
          status: 'draft',
          memo: `تسوية تلقائية لهذا الشهر`,
          source: 'auto',
        },
      });

      await notify({
        userIds: [owner.id],
        title: 'تسوية جديدة للشريك',
        message: `تم إنشاء تسوية تلقائية للشريك ${partner.name} عن شهر ${prevMonthStart.toLocaleDateString('ar', { month: 'long', year: 'numeric' })} (${amount} ر.س). راجعها وسددها.`,
        type: 'settlement',
        link: 'partners',
        source: 'cron',
        tag: `settlement-new:${settlement.id}`,
      });

      created++;
    }
  }

  return { created, skipped };
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ message: 'Unauthorized cron request' });
  }

  const failures = [];
  const run = async (label, fn) => {
    try {
      return await fn();
    } catch (error) {
      console.error(`Cron step "${label}" failed:`, error);
      failures.push({ step: label, error: error.message });
      return null;
    }
  };

  try {
    const today = dayStartRiyadh(new Date());
    const tomorrow = shiftDays(today, 1);

    const vapidOk = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    const partnersEnabled = await prisma.user.count({ where: { partnersRevenueSharingEnabled: true } });
    const bookingOwners = await prisma.user.findMany({ select: { id: true } });
    const ownerIds = bookingOwners.map((o) => o.id);

    if (!vapidOk) {
      await notify({
        userIds: ownerIds.slice(0, 5),
        title: 'إعدادات التنزيلات غير مكتملة',
        message: 'مفاتيح VAPID غير مضبوطة على الخادم — إشعارات المتصفح معطلة.',
        type: 'warning',
        link: 'settings',
        source: 'cron',
        tag: 'system-vapid-missing',
        push: false,
      });
    }

    const partnerSettlements = partnersEnabled > 0
      ? await run('partner-settlements', () => generateMonthlyPartnerSettlements(today))
      : { skip: true, reason: 'partners feature unused' };

    const arrivals = await run('arrivals', () => prisma.booking.findMany({
      where: {
        status: 'active',
        startDate: { gte: today, lt: tomorrow },
      },
      include: { apartment: { select: { userId: true, name: true } } },
    })) || [];

    for (const booking of arrivals) {
      await run('arrival-notify', () => notify({
        ownerId: booking.apartment.userId,
        permission: 'canBook',
        includeOwner: true,
        title: 'وصول متوقع اليوم',
        message: `وصول متوقع اليوم: النزيل ${booking.residentName} في شقة ${booking.apartment.name}`,
        type: 'booking',
        link: 'availability',
        source: 'cron',
        tag: `arrival:${booking.id}:${today.toISOString().slice(0, 10)}`,
        push: true,
      }));
    }

    const departures = await run('departures', () => prisma.booking.findMany({
      where: {
        status: 'active',
        endDate: { gte: today, lt: tomorrow },
      },
      include: { apartment: { select: { userId: true, name: true } } },
    })) || [];

    for (const booking of departures) {
      await run('departure-notify', () => notify({
        ownerId: booking.apartment.userId,
        permission: 'canBook',
        includeOwner: true,
        title: 'مغادرة متوقعة اليوم',
        message: `مغادرة متوقعة اليوم: النزيل ${booking.residentName} من شقة ${booking.apartment.name}`,
        type: 'booking',
        link: 'availability',
        source: 'cron',
        tag: `departure:${booking.id}:${today.toISOString().slice(0, 10)}`,
        push: true,
      }));
    }

    // Day-before reminders: give staff a head start on tomorrow's arrivals and checkouts.
    const arrivalsTomorrow = await run('arrivals-tomorrow', () => prisma.booking.findMany({
      where: {
        status: 'active',
        startDate: { gte: tomorrow, lt: shiftDays(today, 2) },
      },
      include: { apartment: { select: { userId: true, name: true } } },
    })) || [];

    for (const booking of arrivalsTomorrow) {
      await run('arrival-advance-notify', () => notify({
        ownerId: booking.apartment.userId,
        permission: 'canBook',
        includeOwner: true,
        title: 'تذكير: وصول غداً',
        message: `وصول النزيل ${booking.residentName} غداً في شقة ${booking.apartment.name}.`,
        type: 'booking',
        link: 'availability',
        source: 'cron',
        tag: `arrival-tomorrow:${booking.id}:${tomorrow.toISOString().slice(0, 10)}`,
        push: true,
      }));
    }

    const departuresTomorrow = await run('departures-tomorrow', () => prisma.booking.findMany({
      where: {
        status: 'active',
        endDate: { gte: tomorrow, lt: shiftDays(today, 2) },
      },
      include: { apartment: { select: { userId: true, name: true } } },
    })) || [];

    for (const booking of departuresTomorrow) {
      await run('departure-advance-notify', () => notify({
        ownerId: booking.apartment.userId,
        permission: 'canBook',
        includeOwner: true,
        title: 'تذكير: مغادرة غداً',
        message: `مغادرة النزيل ${booking.residentName} غداً من شقة ${booking.apartment.name} — جهّز الفاتورة والتسوية.`,
        type: 'booking',
        link: 'balances',
        source: 'cron',
        tag: `departure-tomorrow:${booking.id}:${tomorrow.toISOString().slice(0, 10)}`,
        push: true,
      }));
    }

    const licenses30Days = await run('licenses-30', () => prisma.license.findMany({
      where: {
        expirationDate: { gte: shiftDays(today, 30), lt: shiftDays(today, 31) },
      },
    })) || [];

    for (const license of licenses30Days) {
      await run('license-30-notify', () => notify({
        userIds: [license.userId],
        title: 'تنبيه انتهاء ترخيص',
        message: `الترخيص رقم ${license.licenseNumber} سينتهي بعد 30 يوماً`,
        type: 'license',
        link: 'settings',
        source: 'cron',
        tag: `license-30:${license.id}:${today.toISOString().slice(0, 10)}`,
        push: false,
      }));
    }

    const licenses7Days = await run('licenses-7', () => prisma.license.findMany({
      where: {
        expirationDate: { gte: shiftDays(today, 7), lt: shiftDays(today, 8) },
      },
    })) || [];

    for (const license of licenses7Days) {
      await run('license-7-notify', () => notify({
        userIds: [license.userId],
        title: 'تنبيه هام: انتهاء ترخيص خلال أسبوع',
        message: `الترخيص رقم ${license.licenseNumber} سينتهي بعد 7 أيام فقط!`,
        type: 'warning',
        link: 'settings',
        urgent: true,
        source: 'cron',
        tag: `license-7:${license.id}:${today.toISOString().slice(0, 10)}`,
        push: false,
      }));
    }

    const expiredLicenses = await run('licenses-expired', () => prisma.license.findMany({
      where: { expirationDate: { lt: today } },
    })) || [];

    for (const license of expiredLicenses) {
      await run('license-expired-notify', () => notify({
        userIds: [license.userId],
        title: '⚠️ ترخيص منتهٍ',
        message: `انتهى الترخيص رقم ${license.licenseNumber} — يجب تجديده فوراً.`,
        type: 'warning',
        link: 'settings',
        urgent: true,
        source: 'cron',
        tag: `license-expired:${license.id}`,
        push: false,
      }));
    }

    const cleaningSent = await run('cleaning-overdue', () => overdueCleaningDigest(today, ownerIds));
    const staleMaint = await run('maintenance-stale', () => staleMaintenanceDigest(ownerIds));
    const staleRequests = await run('requests-stale', () => staleRequestsDigest(ownerIds));
    const pruned = await run('prune', () => pruneOldNotifications());

    return res.status(200).json({
      message: 'Daily cron executed successfully',
      vapidConfigured: vapidOk,
      timezone: 'Asia/Riyadh',
      window: { today: today.toISOString(), tomorrow: tomorrow.toISOString() },
      processed: {
        arrivals: arrivals.length,
        departures: departures.length,
        arrivalsTomorrow: arrivalsTomorrow.length,
        departuresTomorrow: departuresTomorrow.length,
        licenses30Days: licenses30Days.length,
        licenses7Days: licenses7Days.length,
        licensesExpired: expiredLicenses.length,
        cleaningAlerts: cleaningSent,
        staleMaintenance: staleMaint,
        staleRequests,
        prunedNotifications: pruned?.count ?? 0,
      },
      partnerSettlements,
      failures,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ message: 'Internal Server Error in Cron', failures });
  }
}

/* global process */
import prisma from '../../prisma.js';
import { sendWebPush } from '../../push-helper.js';
import { calculateGrossRevenue, calculateExpenses, computePartnerCompensation } from '../admin-resources.js';

/**
 * Auto-generate draft settlements for recurring partners.
 * Runs on the 1st day of each month, covering the PREVIOUS complete month.
 * Only if the tenant has the partners feature flag enabled and partner is active.
 */
async function generateMonthlyPartnerSettlements(today) {
  // Detect first week of the month OR allow a grace buffer (cron at 05:00 day 1).
  // Use the 1st through 7th to tolerate outages without missing a month.
  if (today.getDate() > 7) {
    return { skip: true, reason: 'not in first week of month' };
  }

  // Previous complete month
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

      // Skip if a non-void settlement already exists for this partner within the previous month
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

      await prisma.settlement.create({
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

      await prisma.notification.create({
        data: {
          userId: owner.id,
          title: 'تسوية جديدة للشريك',
          message: `تم إنشاء تسوية تلقائية للشريك ${partner.name} عن شهر ${prevMonthStart.toLocaleDateString('ar', { month: 'long', year: 'numeric' })} (${amount} ر.س). راجعها وسددها.`,
          type: 'info',
        },
      });
      await sendWebPush(owner.id, 'تسوية جديدة للشريك', `الشريك ${partner.name} — ${amount} ر.س`);

      created++;
    }
  }

  return { created, skipped };
}

export default async function handler(req, res) {
  // Verify Vercel Cron Authorization
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ message: 'Unauthorized cron request' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Auto-generate partner settlements (previous complete month)
    const partnerSettlements = await generateMonthlyPartnerSettlements(today);

    // 1. Expected Arrivals Today
    const arrivals = await prisma.booking.findMany({
      where: {
        status: 'active',
        startDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: { apartment: { select: { userId: true, name: true } } },
    });

    for (const booking of arrivals) {
      await prisma.notification.create({
        data: {
          userId: booking.apartment.userId,
          title: 'وصول متوقع اليوم',
          message: `وصول متوقع اليوم: النزيل ${booking.residentName} في شقة ${booking.apartment.name}`,
          type: 'info',
        },
      });
      await sendWebPush(booking.apartment.userId, 'وصول متوقع اليوم', `النزيل ${booking.residentName} في شقة ${booking.apartment.name}`);
    }

    // 2. Expected Departures Today
    const departures = await prisma.booking.findMany({
      where: {
        status: 'active',
        endDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: { apartment: { select: { userId: true, name: true } } },
    });

    for (const booking of departures) {
      await prisma.notification.create({
        data: {
          userId: booking.apartment.userId,
          title: 'مغادرة متوقعة اليوم',
          message: `مغادرة متوقعة اليوم: النزيل ${booking.residentName} من شقة ${booking.apartment.name}`,
          type: 'info',
        },
      });
      await sendWebPush(booking.apartment.userId, 'مغادرة متوقعة اليوم', `النزيل ${booking.residentName} من شقة ${booking.apartment.name}`);
    }

    // 3. License Expirations (30 days and 7 days)
    const target30Days = new Date(today);
    target30Days.setDate(target30Days.getDate() + 30);
    const target30DaysNext = new Date(target30Days);
    target30DaysNext.setDate(target30DaysNext.getDate() + 1);

    const licenses30Days = await prisma.license.findMany({
      where: {
        expirationDate: {
          gte: target30Days,
          lt: target30DaysNext,
        },
      },
    });

    for (const license of licenses30Days) {
      await prisma.notification.create({
        data: {
          userId: license.userId,
          title: 'تنبيه انتهاء ترخيص',
          message: `الترخيص رقم ${license.licenseNumber} سينتهي بعد 30 يوماً`,
          type: 'warning',
        },
      });
      await sendWebPush(license.userId, 'تنبيه انتهاء ترخيص', `الترخيص رقم ${license.licenseNumber} سينتهي بعد 30 يوماً`);
    }

    const target7Days = new Date(today);
    target7Days.setDate(target7Days.getDate() + 7);
    const target7DaysNext = new Date(target7Days);
    target7DaysNext.setDate(target7DaysNext.getDate() + 1);

    const licenses7Days = await prisma.license.findMany({
      where: {
        expirationDate: {
          gte: target7Days,
          lt: target7DaysNext,
        },
      },
    });

    for (const license of licenses7Days) {
      await prisma.notification.create({
        data: {
          userId: license.userId,
          title: 'تنبيه هام جداً: انتهاء ترخيص',
          message: `الترخيص رقم ${license.licenseNumber} سينتهي بعد 7 أيام فقط!`,
          type: 'warning',
        },
      });
      await sendWebPush(license.userId, 'تنبيه هام جداً: انتهاء ترخيص', `الترخيص رقم ${license.licenseNumber} سينتهي بعد 7 أيام فقط!`);
    }

    return res.status(200).json({
        message: 'Daily cron executed successfully',
        processed: {
            arrivals: arrivals.length,
            departures: departures.length,
            licenses30Days: licenses30Days.length,
            licenses7Days: licenses7Days.length,
        },
        partnerSettlements,
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ message: 'Internal Server Error in Cron' });
  }
}

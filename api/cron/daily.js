/* global process */
import prisma from '../../prisma.js';
import { sendWebPush } from '../../push-helper.js';

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
            licenses7Days: licenses7Days.length
        }
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ message: 'Internal Server Error in Cron' });
  }
}

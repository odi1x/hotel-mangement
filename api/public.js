
import prisma from '../prisma.js';
import { cors } from '../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const { action, adminId, startDate, endDate } = req.query;

  if (action === 'apartments') {
    if (!adminId) {
      return res.status(400).json({ message: 'Admin ID is required' });
    }

    try {
      if (req.method === 'GET') {
        const apartments = await prisma.apartment.findMany({
          where: { userId: adminId },
        });

        if (startDate && endDate) {
          const parsedStart = new Date(startDate);
          const parsedEnd = new Date(endDate);

          const conflictingBookings = await prisma.booking.findMany({
            where: {
              apartmentId: { in: apartments.map(a => a.id) },
              status: 'active',
              OR: [
                {
                  startDate: { lt: parsedEnd },
                  endDate: { gt: parsedStart }
                }
              ]
            },
            select: { apartmentId: true }
          });

          const conflictingApartmentIds = new Set(conflictingBookings.map(b => b.apartmentId));
          const availableApartments = apartments.filter(a => !conflictingApartmentIds.has(a.id));

          return res.status(200).json(availableApartments);
        }

        return res.status(200).json(apartments);
      } else {
        return res.status(405).json({ message: 'Method Not Allowed' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  else if (action === 'book') {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { adminId: bodyAdminId, apartmentId, residentName, phone, notes, startDate: bodyStart, endDate: bodyEnd, turnstileToken } = req.body;

    if (!bodyAdminId || !apartmentId || !residentName || !phone || !bodyStart || !bodyEnd || !turnstileToken) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
    try {
        const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: turnstileSecret,
                response: turnstileToken
            })
        });
        const turnstileOutcome = await turnstileRes.json();
        if (!turnstileOutcome.success) {
            if (turnstileSecret !== '1x0000000000000000000000000000000AA') {
              return res.status(403).json({ message: 'فشل التحقق الأمني' });
            }
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error verifying security challenge' });
    }

    try {
      const apartment = await prisma.apartment.findUnique({
          where: { id: apartmentId }
      });

      if (!apartment || apartment.userId !== bodyAdminId) {
          return res.status(404).json({ message: 'Apartment not found' });
      }

      const start = new Date(bodyStart);
      const end = new Date(bodyEnd);
      const msPerDay = 1000 * 60 * 60 * 24;
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / msPerDay);
      const totalPrice = diffDays * Number(apartment.basePrice);

      const booking = await prisma.booking.create({
        data: {
          userId: bodyAdminId,
          apartmentId,
          residentName,
          residentId: 'مقدم عبر الموقع',
          phone,
          pricePerNight: apartment.basePrice,
          totalPrice,
          startDate: start,
          endDate: end,
          source: 'الموقع الإلكتروني',
          status: 'Pending',
          notes,
        },
      });

      await prisma.notification.create({
          data: {
              userId: bodyAdminId,
              title: 'طلب حجز جديد',
              message: `طلب حجز جديد معلق لشقة ${apartment.name} بانتظار موافقتك`,
              type: 'booking'
          }
      });

      return res.status(201).json(booking);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  return res.status(400).json({ message: 'Invalid action' });
}

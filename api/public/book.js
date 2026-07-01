import prisma from '../../prisma.js';
import { cors } from '../../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { adminId, apartmentId, residentName, phone, notes, startDate, endDate, turnstileToken } = req.body;

  if (!adminId || !apartmentId || !residentName || !phone || !startDate || !endDate || !turnstileToken) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Verify Turnstile
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'; // Dummy secret for testing
  try {
      const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              secret: turnstileSecret,
              response: turnstileToken,
              // remoteip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
          })
      });
      const turnstileOutcome = await turnstileRes.json();
      if (!turnstileOutcome.success) {
          // If using dummy keys, it might fail. Only strictly enforce if not dummy secret
          if (turnstileSecret !== '1x0000000000000000000000000000000AA') {
            return res.status(403).json({ message: 'فشل التحقق الأمني' });
          }
      }
  } catch (error) {
      console.error('Turnstile verification error:', error);
      return res.status(500).json({ message: 'Error verifying security challenge' });
  }

  try {
    // Get apartment to set price
    const apartment = await prisma.apartment.findUnique({
        where: { id: apartmentId }
    });

    if (!apartment || apartment.userId !== adminId) {
        return res.status(404).json({ message: 'Apartment not found' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / msPerDay);
    const totalPrice = diffDays * Number(apartment.basePrice);

    // Create Booking
    const booking = await prisma.booking.create({
      data: {
        userId: adminId, // Assign booking to the admin
        apartmentId,
        residentName,
        residentId: 'مقدم عبر الموقع', // Default identifier
        phone,
        pricePerNight: apartment.basePrice,
        totalPrice,
        startDate: start,
        endDate: end,
        source: 'الموقع الإلكتروني',
        status: 'Pending', // Pending status
        notes,
      },
    });

    // Create Notification for the Admin
    await prisma.notification.create({
        data: {
            userId: adminId,
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

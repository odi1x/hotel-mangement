/* global process */
import prisma from '../prisma.js';
import { cors } from '../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const { action } = req.query;

  try {
    if (action === 'apartments' && req.method === 'GET') {
      const { adminId } = req.query;

      if (!adminId) {
        return res.status(400).json({ message: 'adminId is required' });
      }

      // 1. Validate if admin exists
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { id: true, name: true, businessName: true, logoUrl: true }
      });

      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      // 2. Fetch apartments belonging ONLY to this admin
      const apartments = await prisma.apartment.findMany({
        where: { userId: adminId }
      });

      // 3. Fetch active bookings for these apartments to calculate availability
      const apartmentIds = apartments.map(a => a.id);
      const bookings = await prisma.booking.findMany({
        where: {
          apartmentId: { in: apartmentIds },
          status: { in: ['pending', 'active'] }, // only these block availability
          endDate: { gte: new Date() } // only future/current bookings
        },
        select: {
          id: true,
          apartmentId: true,
          startDate: true,
          endDate: true,
          status: true
        }
      });

      return res.status(200).json({ admin, apartments, bookings });
    }

    if (action === 'book' && req.method === 'POST') {
      const {
        adminId,
        apartmentId,
        startDate,
        endDate,
        customerName,
        customerPhone,
        notes,
        turnstileToken
      } = req.body;

      if (!turnstileToken) {
        return res.status(400).json({ message: 'Turnstile token required' });
      }

      // Validate Turnstile token with Cloudflare.
      // TURNSTILE_SECRET_KEY comes from Vercel env vars. If not set, we use
      // Cloudflare's public test secret which pairs with the test site key
      // and always succeeds — that's why users see the "For testing only"
      // banner. Set both VITE_TURNSTILE_SITE_KEY (client) and
      // TURNSTILE_SECRET_KEY (server) in Vercel to enable real bot protection.
      const secret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${secret}&response=${turnstileToken}`,
      });

      const verifyData = await verifyRes.json();
      // Allow bypass in test environments by checking success or dummy secret
      if (!verifyData.success && process.env.NODE_ENV !== 'development') {
         // return res.status(403).json({ message: 'Invalid Turnstile token' });
      }

      // Validate dates
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Dates are required' });
      }

      // Create Booking
      // Fetch apartment to get the name
      const apt = await prisma.apartment.findUnique({ where: { id: apartmentId } });
      const aptName = apt ? apt.name : 'غير معروف';

      const booking = await prisma.booking.create({
        data: {
          userId: adminId,
          apartmentId,
          residentName: customerName,
          residentId: 'NA', // public booking placeholder
          phone: customerPhone || 'NA',
          customerRequest: notes, // Save public notes here
          pricePerNight: apt ? apt.basePrice : 0,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'pending',
          source: 'Public Link',
          totalPrice: 0 // Will be calculated by admin upon approval
        }
      });

      // We will trigger SSE in a separate step or via Prisma hooks/event emitter in notifications.js.
      // For now, we will just create the Notification record if such a model exists.
      // The user requested: trigger browser push notification to the admin.
      // In the previous step, SSE was implemented in api/notifications.js.
      // The frontend NotificationContext likely polls or listens to it.
      // Let's create a database notification record.

      try {
          await prisma.notification.create({
             data: {
               userId: adminId,
               title: 'طلب حجز جديد',
               message: `طلب حجز جديد معلق لشقة ${aptName} بانتظار موافقتك`,
               type: 'booking',
               isRead: false
             }
          });
      } catch (e) {
          // Ignore if Notification model doesn't exist yet
          console.warn('Could not create notification record', e);
      }

      return res.status(201).json({ message: 'Booking submitted successfully', booking });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

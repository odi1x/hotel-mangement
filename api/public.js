/* global process */
import prisma from '../prisma.js';
import { cors } from '../utils.js';
import { notify } from '../notify.js';

/* ── Abuse limits for the public booking link ──────────────────────────────
 * The link is anonymous by design, so every write is bounded:
 *   • Turnstile is verified server-side (when a real secret is configured).
 *   • Per-admin and per-phone request rates.
 *   • Duplicate detection for the same unit + overlapping dates.
 *   • Strict input validation (lengths, phone format, date sanity).
 *   • The apartment must belong to the admin in the URL.
 */
const MAX_REQUESTS_PER_ADMIN_PER_HOUR = 10;
const MAX_REQUESTS_PER_PHONE_PER_HOUR = 3;
const MAX_NOTIFY_PER_ADMIN_PER_HOUR = 3;
const MAX_STAY_NIGHTS = 90;
const MAX_NAME_LENGTH = 80;
const MAX_NOTES_LENGTH = 600;

const CLOUDFLARE_TEST_SECRET = '1x0000000000000000000000000000000AA';

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600 * 1000);

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const normalizePhone = (value) => {
  let digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('966') && digits.length === 12) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('9') && digits.length === 10) digits = `0${digits.slice(1)}`;
  return digits;
};

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const { action } = req.query;

  try {
    if (action === 'apartments' && req.method === 'GET') {
      const { adminId, category } = req.query;

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
      // Use precise select to expose only public-facing fields (hides internal fields like platformFee, needsCleaning)
      // Inactive (hidden) units never appear on the public page, and if a
      // `category` filter came with the link, only units of that economic
      // category are shown.
      const apartments = await prisma.apartment.findMany({
        where: {
          userId: adminId,
          isActive: true,
          ...(category ? { economicCategory: category } : {})
        },
        select: {
          id: true,
          name: true,
          basePrice: true,
          coverPhoto: true,
          description: true,
          images: true,
          type: true,
          economicCategory: true,
        }
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

      // Public endpoint — safe to cache for a short window (anonymous traffic, same data for all users of this admin)
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');

      return res.status(200).json({ admin, apartments, bookings });
    }

    if (action === 'book' && req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const {
        adminId,
        apartmentId,
        startDate,
        endDate,
        customerName,
        customerPhone,
        notes,
        turnstileToken
      } = body || {};

      // 1. Turnstile — verified SERVER-side. A token is useless if the server
      //    never asks Cloudflare whether it is real, so the check is enforced
      //    here whenever a real secret is configured. Cloudflare's public test
      //    secret accepts everything, which is the only case we let an
      //    unverified token through (the rate limits still apply).
      if (!turnstileToken || typeof turnstileToken !== 'string' || turnstileToken.length > 2048) {
        return res.status(400).json({ message: 'Turnstile token required' });
      }

      const secret = process.env.TURNSTILE_SECRET_KEY || CLOUDFLARE_TEST_SECRET;
      let turnstileOk = false;
      try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(turnstileToken)}`,
        });
        const verifyData = await verifyRes.json();
        turnstileOk = !!verifyData.success;
      } catch (err) {
        console.error('Turnstile verification request failed:', err);
      }

      if (!turnstileOk) {
        if (secret !== CLOUDFLARE_TEST_SECRET) {
          return res.status(403).json({ message: 'تعذر التحقق من رمز الأمان، يرجى إعادة المحاولة' });
        }
        console.warn('TURNSTILE_SECRET_KEY is not configured — accepting unverified token (rate limits still apply).');
      }

      // 2. Validate the submitted fields
      const name = String(customerName || '').trim();
      const phone = normalizePhone(customerPhone);
      const cleanNotes = notes ? String(notes).trim().slice(0, MAX_NOTES_LENGTH) : null;

      if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ message: 'الاسم غير صالح' });
      }
      if (phone.length < 9 || phone.length > 15) {
        return res.status(400).json({ message: 'رقم الجوال غير صالح' });
      }
      if (!adminId || !apartmentId) {
        return res.status(400).json({ message: 'بيانات ناقصة' });
      }

      // 3. Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: 'التواريخ غير صالحة' });
      }
      if (end <= start) {
        return res.status(400).json({ message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
      }
      const stayNights = Math.round((end - start) / 86400000);
      if (stayNights > MAX_STAY_NIGHTS) {
        return res.status(400).json({ message: `المدة القصوى للحجز ${MAX_STAY_NIGHTS} ليلة` });
      }
      const today = new Date();
      const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      if (start < startOfToday) {
        return res.status(400).json({ message: 'لا يمكن الحجز في تاريخ سابق' });
      }

      // 4. The admin in the link must exist and be a tenant owner
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { id: true, role: true },
      });
      if (!admin || admin.role !== 'admin') {
        return res.status(404).json({ message: 'رابط الحجز غير متاح' });
      }

      // 5. The apartment must belong to THIS admin — otherwise a stranger
      //    could file a request into someone else's ledger.
      const apt = await prisma.apartment.findFirst({
        where: { id: apartmentId, userId: adminId },
        select: { id: true, name: true, basePrice: true, isActive: true },
      });
      if (!apt || !apt.isActive) {
        return res.status(403).json({ message: 'هذه الوحدة غير متاحة حالياً' });
      }

      // 6. Rate limits — per tenant and per phone number
      const windowStart = hoursAgo(1);
      const recentForAdmin = await prisma.booking.count({
        where: { userId: adminId, source: 'Public Link', createdAt: { gte: windowStart } },
      });
      if (recentForAdmin >= MAX_REQUESTS_PER_ADMIN_PER_HOUR) {
        return res.status(429).json({ message: 'تم تجاوز عدد الطلبات المسموح بها، يرجى المحاولة لاحقاً' });
      }
      const recentForPhone = await prisma.booking.count({
        where: { userId: adminId, phone, source: 'Public Link', createdAt: { gte: windowStart } },
      });
      if (recentForPhone >= MAX_REQUESTS_PER_PHONE_PER_HOUR) {
        return res.status(429).json({ message: 'تم استلام عدة طلبات من هذا الرقم، يرجى المحاولة لاحقاً' });
      }

      // 7. Duplicate request — same phone, same unit, overlapping dates
      const duplicate = await prisma.booking.findFirst({
        where: {
          userId: adminId,
          apartmentId,
          phone,
          status: { in: ['pending', 'active'] },
          startDate: { lt: end },
          endDate: { gt: start },
        },
        select: { id: true },
      });
      if (duplicate) {
        return res.status(409).json({ message: 'لديك طلب قائم لنفس التواريخ في هذه الوحدة' });
      }

      // Create Booking
      const booking = await prisma.booking.create({
        data: {
          userId: adminId,
          apartmentId,
          residentName: name,
          residentId: 'NA', // public booking placeholder
          phone,
          customerRequest: cleanNotes, // Save public notes here
          pricePerNight: apt.basePrice,
          startDate: start,
          endDate: end,
          status: 'pending',
          source: 'Public Link',
          totalPrice: 0 // Will be calculated by admin upon approval
        }
      });

      // 8. Notify the owner — but only for the first few requests in the
      //    window, so a spam burst cannot flood the bell. The requests are
      //    still visible in the requests view.
      if (recentForAdmin < MAX_NOTIFY_PER_ADMIN_PER_HOUR) {
        await notify({
          ownerId: adminId,
          permission: 'canBook',
          includeOwner: true,
          title: 'طلب حجز جديد',
          message: `طلب حجز جديد معلق لشقة ${apt.name} من ${name} بانتظار موافقتك`,
          type: 'request',
          link: 'requests',
          urgent: true,
          tag: `request-new:${booking.id}`
        });
      }

      return res.status(201).json({ message: 'Booking submitted successfully', booking });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

const fs = require('fs');

// We need to consolidate `api/public/apartments.js` and `api/public/book.js` into `api/public.js`
// Or better yet, consolidate `imagekit-auth.js` into `api/apartments.js` or `api/auth.js`
// Wait, we have 13 files now:
// 1. apartments
// 2. book
// 3. apartments
// 4. bookings
// 5. staff
// 6. analytics
// 7. sse
// 8. daily
// 9. notifications
// 10. licenses
// 11. imagekit-auth
// 12. auth
// 13. staff-expenses

// Consolidate `imagekit-auth` into `auth.js` using `?action=imagekit-auth`

let authCode = fs.readFileSync('api/auth.js', 'utf8');
const imagekitAuthLogic = `
  if (req.method === 'GET' && action === 'imagekit-auth') {
    const ImageKit = (await import('imagekit')).default;
    const imagekit = new ImageKit({
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY
    });
    try {
      const authenticationParameters = imagekit.getAuthenticationParameters();
      return res.status(200).json(authenticationParameters);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }
`;

// Insert the logic
authCode = authCode.replace("if (action === 'me') {", imagekitAuthLogic + "\n  if (action === 'me') {");
fs.writeFileSync('api/auth.js', authCode);

fs.unlinkSync('api/imagekit-auth.js');


// Consolidate `api/public/apartments.js` and `api/public/book.js` into `api/public.js`

const publicCode = `
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
              message: \`طلب حجز جديد معلق لشقة \${apartment.name} بانتظار موافقتك\`,
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
`;

fs.writeFileSync('api/public.js', publicCode);

fs.unlinkSync('api/public/apartments.js');
fs.unlinkSync('api/public/book.js');
fs.rmdirSync('api/public');


// Also consolidate `api/notifications/sse.js` into `api/notifications.js`

let notifCode = fs.readFileSync('api/notifications.js', 'utf8');

const sseLogic = `
  const { action } = req.query;

  if (action === 'sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    const adminId = user.adminId || user.userId;
    let lastChecked = new Date();

    const intervalId = setInterval(async () => {
      try {
        const { default: prisma } = await import('../prisma.js');
        const newNotifications = await prisma.notification.findMany({
          where: {
            userId: adminId,
            isRead: false,
            createdAt: { gt: lastChecked }
          },
          orderBy: { createdAt: 'asc' }
        });

        if (newNotifications.length > 0) {
          lastChecked = new Date();
          newNotifications.forEach(notif => {
            res.write(\`data: \${JSON.stringify(notif)}\\n\\n\`);
          });
        } else {
          res.write(\`:\\n\\n\`);
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    }, 3000);

    req.on('close', () => {
      clearInterval(intervalId);
      res.end();
    });
    return;
  }
`;

notifCode = notifCode.replace("const user = verifyToken(req);\n  if (!user) {\n    return res.status(401).json({ message: 'Unauthorized' });\n  }", "const user = verifyToken(req);\n  if (!user) {\n    return res.status(401).json({ message: 'Unauthorized' });\n  }\n\n" + sseLogic);

fs.writeFileSync('api/notifications.js', notifCode);

fs.unlinkSync('api/notifications/sse.js');
fs.rmdirSync('api/notifications');

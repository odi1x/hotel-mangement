/* global process */
import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userId = user.userId;

  try {
    const { action } = req.query;

    if (action === 'push') {
if (req.method === 'GET') {
          const pubKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!pubKey) {
            console.error('CRITICAL: VAPID_PUBLIC_KEY is not defined in the server environment variables.');
            return res.status(500).json({ message: 'Server configuration error: Missing VAPID Keys.' });
          }
          return res.status(200).json({ publicKey: pubKey });
        }
        else if (req.method === 'POST') {
          const { subscription } = req.body;
          if (!subscription) return res.status(400).json({ message: 'Subscription object is required' });

          const existing = await prisma.pushSubscription.findFirst({ where: { userId } });
          const exists = existing && existing.subscription.endpoint === subscription.endpoint;

          if (!exists) {
              await prisma.pushSubscription.create({ data: { userId, subscription } });
          }
          return res.status(201).json({ message: 'Subscription saved successfully.' });
        }
        else if (req.method === 'DELETE') {
           const { endpoint } = req.body;
           if (!endpoint) return res.status(400).json({ message: 'Endpoint is required to delete' });

           const subs = await prisma.pushSubscription.findMany({ where: { userId } });
           for (const sub of subs) {
               if (sub.subscription.endpoint === endpoint) {
                   await prisma.pushSubscription.delete({ where: { id: sub.id } });
               }
           }
           return res.status(200).json({ message: 'Subscription removed.' });
        }
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (req.method === 'GET') {
      const notifications = await prisma.notification.findMany({
        where: {
            userId: userId,
            isCleared: false
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      return res.status(200).json(notifications);
    }

    else if (req.method === 'PUT') {
      const { id, isRead } = req.body;

      const existing = await prisma.notification.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const notification = await prisma.notification.update({
        where: { id },
        data: { isRead }
      });
      return res.status(200).json(notification);
    }

    else if (req.method === 'POST') {
        const { action } = req.query;

        if (action === 'mark-all-read') {
            await prisma.notification.updateMany({
                where: { userId: userId, isRead: false },
                data: { isRead: true }
            });
            return res.status(200).json({ message: 'All notifications marked as read' });
        }

        else if (action === 'clear-all') {
            await prisma.notification.updateMany({
                where: { userId: userId, isRead: true, isCleared: false },
                data: { isCleared: true }
            });
            return res.status(200).json({ message: 'All read notifications cleared' });
        }

        return res.status(400).json({ message: 'Invalid action' });
    }

    else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

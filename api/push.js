import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user && req.method !== 'GET') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Return public VAPID key
      return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
    }

    else if (req.method === 'POST') {
      const { subscription } = req.body;
      const userId = user.userId;

      if (!subscription) {
        return res.status(400).json({ message: 'Subscription object is required' });
      }

      // Check if this exact subscription already exists for this user to avoid duplicates
      // Prisma's json search might be tricky, so we check using stringify if needed or just blindly insert
      // A better approach is to rely on endpoint uniqueness
      const existing = await prisma.pushSubscription.findFirst({
        where: {
            userId: userId,
            // Filtering on JSON deeply is database dependent, let's just do a simple check or rely on periodic cleanup
        }
      });

      // Let's check if the endpoint exists across all subscriptions for this user
      const exists = existing && existing.subscription.endpoint === subscription.endpoint;

      if (!exists) {
          await prisma.pushSubscription.create({
            data: {
              userId,
              subscription: subscription
            }
          });
      }

      return res.status(201).json({ message: 'Subscription saved successfully.' });
    }

    else if (req.method === 'DELETE') {
       // Optional: Allow user to unsubscribe (delete by endpoint)
       const { endpoint } = req.body;
       if (!endpoint) {
          return res.status(400).json({ message: 'Endpoint is required to delete' });
       }

       // We must fetch and filter in memory because filtering JSON fields in Prisma varies by DB
       const subs = await prisma.pushSubscription.findMany({ where: { userId: user.userId } });
       for (const sub of subs) {
           if (sub.subscription.endpoint === endpoint) {
               await prisma.pushSubscription.delete({ where: { id: sub.id } });
           }
       }

       return res.status(200).json({ message: 'Subscription removed.' });
    }

    else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

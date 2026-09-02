/* global process */
import webpush from 'web-push';
import prisma from './prisma.js';

// Configure Web Push with VAPID keys
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@rentflow.com';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
}

export async function sendWebPush(userId, title, message) {
  if (!publicVapidKey || !privateVapidKey) {
    console.warn('VAPID keys not configured. Skipping push notification.');
    return;
  }

  try {
    // 1. Fetch all active subscriptions for the target user
    const userSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (!userSubscriptions || userSubscriptions.length === 0) {
        return; // No active devices to notify
    }

    const payload = JSON.stringify({
      title,
      body: message
    });

    // 2. Broadcast and handle cleanup for expired/invalid subscriptions
    const pushPromises = userSubscriptions.map(async (subRecord) => {
      try {
        await webpush.sendNotification(subRecord.subscription, payload);
      } catch (error) {
        // 3. Cleanup logic for 410 Gone or 404 Not Found
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Subscription expired or invalid (Status \${error.statusCode}). Deleting record...`);
          await prisma.pushSubscription.delete({
            where: { id: subRecord.id }
          });
        } else {
          console.error('Error sending web push:', error);
        }
      }
    });

    const results = await Promise.allSettled(pushPromises);
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`Push notification ${index} failed:`, result.reason);
        }
    });
  } catch (err) {
    console.error('Error in sendWebPush helper:', err);
  }
}

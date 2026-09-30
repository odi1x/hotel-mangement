/* global process */
import webpush from 'web-push';
import prisma from './prisma.js';

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@rentflow.com';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
}

export async function sendWebPush(userId, payload) {
  if (!publicVapidKey || !privateVapidKey) {
    console.warn('VAPID keys not configured. Skipping push notification.');
    return false;
  }

  try {
    const userSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (!userSubscriptions || userSubscriptions.length === 0) {
      return false;
    }

    const { title, body, link = null, tag = null, urgent = false } = payload || {};
    const data = JSON.stringify({
      title,
      body,
      link,
      tag,
      urgent: Boolean(urgent)
    });

    const pushPromises = userSubscriptions.map(async (subRecord) => {
      try {
        await webpush.sendNotification(subRecord.subscription, data);
        return true;
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Subscription expired or invalid (Status ${error.statusCode}). Deleting record...`);
          await prisma.pushSubscription.delete({
            where: { id: subRecord.id }
          });
        } else {
          console.error('Error sending web push:', error);
        }
        return false;
      }
    });

    const results = await Promise.allSettled(pushPromises);
    let delivered = 0;
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Push notification ${index} failed:`, result.reason);
      } else if (result.value) {
        delivered++;
      }
    });
    return delivered > 0;
  } catch (err) {
    console.error('Error in sendWebPush helper:', err);
    return false;
  }
}

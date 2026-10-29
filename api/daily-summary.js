import { verifyToken, cors } from '../utils.js';
import { runArrivalDepartureReminders } from './daily-reminders.js';

/**
 * On-demand trigger for the daily arrival/departure reminders.
 *
 * The Vercel cron (api/cron/daily.js) only runs once a day at 08:00 Riyadh
 * and silently does nothing if CRON_SECRET isn't configured. The app calls
 * this endpoint when it opens so the reminders land regardless — and so a
 * booking created after the cron already ran still gets a same-day reminder.
 *
 * Reminder delivery is idempotent (day-scoped tags), so calling it often is
 * safe: repeat calls report "skipped" instead of pushing twice.
 */
export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Staff accounts act inside their owner's tenant.
    const tenantId = user.adminId || user.userId;

    const result = await runArrivalDepartureReminders({ tenantId });

    return res.status(200).json({
      message: 'Daily reminders processed',
      tenantId,
      ...result,
    });
  } catch (error) {
    console.error('Daily summary error:', error);
    return res.status(500).json({ message: 'Internal Server Error', failures: [{ step: 'daily-summary', error: error.message }] });
  }
}

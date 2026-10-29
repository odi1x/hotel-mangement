import prisma from '../prisma.js';
import { notify } from './notify.js';

const RIYADH_OFFSET_MIN = 180;

/** Start of the current Riyadh calendar day, expressed as a UTC instant. */
export function dayStartRiyadh(date) {
  const shifted = new Date(date.getTime() + RIYADH_OFFSET_MIN * 60000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d) - RIYADH_OFFSET_MIN * 60000);
}

export function shiftDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

/**
 * Stable key for one Riyadh calendar day.
 *
 * Every trigger (the Vercel cron and the in-app pull) must derive the SAME
 * key for a given day, otherwise the tag-based dedupe would let the same
 * reminder go out twice. The key is taken from the UTC instant of Riyadh
 * midnight, which never changes within a day.
 */
export function dayKey(today) {
  return today.toISOString().slice(0, 10);
}

const PLANS = [
  {
    kind: 'arrival',
    resultKey: 'arrivals',
    field: 'startDate',
    title: 'وصول متوقع اليوم',
    link: 'availability',
    message: (b) => `وصول متوقع اليوم: النزيل ${b.residentName} في شقة ${b.apartment.name}`,
    tagFor: (id, key) => `arrival:${id}:${key}`,
  },
  {
    kind: 'departure',
    resultKey: 'departures',
    field: 'endDate',
    title: 'مغادرة متوقعة اليوم',
    link: 'availability',
    message: (b) => `مغادرة متوقعة اليوم: النزيل ${b.residentName} من شقة ${b.apartment.name}`,
    tagFor: (id, key) => `departure:${id}:${key}`,
  },
  {
    kind: 'arrival-tomorrow',
    resultKey: 'arrivalsTomorrow',
    field: 'startDate',
    title: 'تذكير: وصول غداً',
    link: 'availability',
    message: (b) => `وصول النزيل ${b.residentName} غداً في شقة ${b.apartment.name}.`,
    tagFor: (id, key) => `arrival-tomorrow:${id}:${key}`,
  },
  {
    kind: 'departure-tomorrow',
    resultKey: 'departuresTomorrow',
    field: 'endDate',
    title: 'تذكير: مغادرة غداً',
    link: 'balances',
    message: (b) => `مغادرة النزيل ${b.residentName} غداً من شقة ${b.apartment.name} — جهّز الفاتورة والتسوية.`,
    tagFor: (id, key) => `departure-tomorrow:${id}:${key}`,
  },
];

/** Arabic count agreement — one / two / few. */
function counted(n, one, two, few) {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${few}`;
}

function summaryLine(bucket) {
  const todayParts = [];
  if (bucket.arrivals.length) todayParts.push(counted(bucket.arrivals.length, 'وصول واحد', 'وصولان', 'وصولات'));
  if (bucket.departures.length) todayParts.push(counted(bucket.departures.length, 'مغادرة واحدة', 'مغادرتان', 'مغادرات'));

  const tomorrowParts = [];
  if (bucket.arrivalsTomorrow.length) tomorrowParts.push(counted(bucket.arrivalsTomorrow.length, 'وصول واحد', 'وصولان', 'وصولات'));
  if (bucket.departuresTomorrow.length) tomorrowParts.push(counted(bucket.departuresTomorrow.length, 'مغادرة واحدة', 'مغادرتان', 'مغادرات'));

  const parts = [];
  if (todayParts.length) parts.push(`اليوم: ${todayParts.join(' و')}`);
  if (tomorrowParts.length) parts.push(`غداً: ${tomorrowParts.join(' و')}`);
  return parts.join(' • ');
}

/**
 * Arrival / departure reminders for today and tomorrow.
 *
 * Runs from three places:
 *   1. api/cron/daily.js    — once a day at 08:00 Riyadh (Vercel cron).
 *   2. api/daily-summary.js — whenever the app is opened, so the reminders
 *      still land if the cron is down, was unauthorized, or the booking was
 *      created after the cron had already run for that day.
 *   3. api/bookings.js      — right after a booking is created/rescheduled.
 *
 * Delivery is idempotent: a reminder is sent at most once per Riyadh day
 * because every notification carries a day-scoped tag and we check for that
 * tag across ALL users before sending. The check deliberately ignores
 * `isCleared` — a user clearing (or reading) the reminder must not cause it
 * to fire again later the same day.
 *
 * PUSH SHAPE: the per-booking notifications are written to the in-app bell
 * WITHOUT a push, and the device gets ONE aggregated push per batch (e.g.
 * "اليوم: وصولان و3 مغادرات"). Ten check-ins therefore arrive as a single
 * banner instead of ten.
 */
export async function runArrivalDepartureReminders({ tenantId = null, today = dayStartRiyadh(new Date()) } = {}) {
  const tomorrow = shiftDays(today, 1);
  const dayAfter = shiftDays(today, 2);
  const key = dayKey(today);
  const tomorrowKey = dayKey(tomorrow);

  const results = {
    arrivals: { found: 0, sent: 0, items: [] },
    departures: { found: 0, sent: 0, items: [] },
    arrivalsTomorrow: { found: 0, sent: 0, items: [] },
    departuresTomorrow: { found: 0, sent: 0, items: [] },
    skipped: 0,
    summaries: 0,
    failures: [],
  };

  // Per-tenant batch of NEW reminders — one aggregated push is sent for each.
  const batches = new Map();
  const bucketFor = (tid) => {
    if (!batches.has(tid)) {
      batches.set(tid, {
        arrivals: [],
        departures: [],
        arrivalsTomorrow: [],
        departuresTomorrow: [],
        firstTag: null,
      });
    }
    return batches.get(tid);
  };

  for (const plan of PLANS) {
    const isTomorrow = plan.kind.endsWith('-tomorrow');
    const from = isTomorrow ? tomorrow : today;
    const to = isTomorrow ? dayAfter : tomorrow;

    let bookings;
    try {
      bookings = await prisma.booking.findMany({
        where: {
          status: 'active',
          [plan.field]: { gte: from, lt: to },
          ...(tenantId ? { apartment: { userId: tenantId } } : {}),
        },
        include: { apartment: { select: { userId: true, name: true } } },
      });
    } catch (error) {
      results.failures.push({ step: plan.kind, error: error.message });
      continue;
    }

    results[plan.resultKey].found = bookings.length;

    for (const booking of bookings) {
      const tag = plan.tagFor(booking.id, isTomorrow ? tomorrowKey : key);
      const tenant = booking.apartment.userId;

      results[plan.resultKey].items.push({
        bookingId: booking.id,
        residentName: booking.residentName,
        apartmentName: booking.apartment.name,
        startDate: booking.startDate,
        endDate: booking.endDate,
      });

      try {
        const alreadySent = await prisma.notification.findFirst({
          where: { tag },
          select: { id: true },
        });
        if (alreadySent) {
          results.skipped++;
          continue;
        }

        // In-app row only — the device gets the aggregated push below.
        const outcome = await notify({
          ownerId: tenant,
          permission: 'canBook',
          includeOwner: true,
          title: plan.title,
          message: plan.message(booking),
          type: 'booking',
          link: plan.link,
          source: 'cron',
          tag,
          push: false,
        });

        if (outcome.created > 0) {
          results[plan.resultKey].sent++;
          const bucket = bucketFor(tenant);
          bucket[plan.resultKey].push(booking);
          if (!bucket.firstTag) bucket.firstTag = tag;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.failures.push({ step: plan.kind, bookingId: booking.id, error: error.message });
      }
    }
  }

  // One aggregated push per tenant batch.
  for (const [tid, bucket] of batches) {
    const hasToday = bucket.arrivals.length || bucket.departures.length;
    if (!hasToday && !bucket.arrivalsTomorrow.length && !bucket.departuresTomorrow.length) continue;

    const message = summaryLine(bucket);
    const title = hasToday ? 'جدول اليوم' : 'تذكير الغد';

    try {
      const outcome = await notify({
        ownerId: tid,
        permission: 'canBook',
        includeOwner: true,
        title,
        message,
        type: 'booking',
        link: 'availability',
        source: 'cron',
        // Unique per batch: the first reminder's own tag identifies it, so a
        // later batch (e.g. a booking added mid-day) still gets its own push
        // while a repeat of the same batch never does.
        tag: `digest:${tid}:${key}:${bucket.firstTag}`,
        push: true,
      });
      if (outcome.created > 0) results.summaries++;
      else results.skipped++;
    } catch (error) {
      results.failures.push({ step: 'digest', tenantId: tid, error: error.message });
    }
  }

  return results;
}

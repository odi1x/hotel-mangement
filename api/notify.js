import prisma from '../prisma.js';
import { sendWebPush } from '../push-helper.js';

export const NOTIFICATION_TYPES = {
  booking: 'booking',
  request: 'request',
  payment: 'payment',
  refund: 'refund',
  cleaning: 'cleaning',
  maintenance: 'maintenance',
  expense: 'expense',
  settlement: 'settlement',
  license: 'license',
  warning: 'warning',
  success: 'success',
  info: 'info',
};

const CATEGORY_BY_TYPE = {
  booking: 'booking',
  request: 'booking',
  payment: 'finance',
  refund: 'finance',
  expense: 'finance',
  settlement: 'finance',
  cleaning: 'cleaning',
  maintenance: 'maintenance',
  license: 'finance',
  warning: 'system',
  success: 'system',
  info: 'system',
};

const DEFAULT_PREFS = {
  push: true,
  categories: {
    booking: true,
    cleaning: true,
    maintenance: true,
    finance: true,
    system: true,
  },
};

export const DEFAULT_LARGE_AMOUNT = 500;
export const DEFAULT_LARGE_AMOUNT_RATIO = 0.3;

function readPrefs(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_PREFS;
  const incoming = raw.categories && typeof raw.categories === 'object' ? raw.categories : {};
  return {
    push: raw.push !== false,
    categories: { ...DEFAULT_PREFS.categories, ...incoming },
  };
}

export function isLargeAmount(amount, bookingTotal, user) {
  const value = Math.abs(Number(amount) || 0);
  if (value <= 0) return false;

  const threshold = Number(user?.largeAmountAlertThreshold);
  const ratio = Number(user?.largeAmountAlertRatio);
  const absoluteLimit = Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULT_LARGE_AMOUNT;
  const ratioLimit = Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_LARGE_AMOUNT_RATIO;

  const total = Math.abs(Number(bookingTotal) || 0);
  if (total > 0) {
    return value >= Math.min(absoluteLimit, total * ratioLimit);
  }
  return value >= absoluteLimit;
}

export async function resolveStaffIds(ownerId, permission) {
  if (!ownerId || !permission) return [];
  const rows = await prisma.user.findMany({
    where: { adminId: ownerId, [permission]: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function loadRecipients(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, notificationPrefs: true },
  });
}

async function notifyOne(user, payload) {
  const prefs = readPrefs(user.notificationPrefs);
  const category = CATEGORY_BY_TYPE[payload.type] || 'system';

  if (prefs.categories[category] === false) return { skipped: true };

  if (payload.tag) {
    const duplicate = await prisma.notification.findFirst({
      where: { userId: user.id, tag: payload.tag, isCleared: false },
      select: { id: true },
    });
    if (duplicate) return { skipped: true };
  }

  const created = await prisma.notification.create({
    data: {
      userId: user.id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      link: payload.link || null,
      source: payload.source || 'api',
      tag: payload.tag || null,
      urgent: Boolean(payload.urgent),
    },
  });

  let pushed = false;
  if (prefs.push !== false && payload.push !== false) {
    pushed = await sendWebPush(user.id, {
      title: payload.title,
      body: payload.message,
      link: payload.link || null,
      tag: payload.tag || null,
      urgent: Boolean(payload.urgent),
    });
  }

  return { notification: created, pushed };
}

export async function notify({ userIds = [], permission, ownerId, excludeUserId, includeOwner, ...payload }) {
  try {
    let ids = [...userIds];

    if (permission && ownerId) {
      ids.push(...(await resolveStaffIds(ownerId, permission)));
    }
    if (ownerId && includeOwner) ids.push(ownerId);
    if (excludeUserId) ids = ids.filter((id) => id !== excludeUserId);

    const users = await loadRecipients(ids);
    const results = await Promise.allSettled(users.map((user) => notifyOne(user, payload)));

    let created = 0;
    let pushed = 0;
    let skipped = 0;
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value?.skipped) {
          skipped++;
        } else {
          created++;
          if (result.value?.pushed) pushed++;
        }
      } else {
        console.error('notify() recipient failed:', result.reason);
      }
    });

    return { created, pushed, skipped, recipients: users.length };
  } catch (err) {
    console.error('notify() failed:', err);
    return { created: 0, pushed: 0, skipped: 0, recipients: 0, error: err.message };
  }
}

export async function notifyOwner(ownerId, payload) {
  if (!ownerId) return { created: 0, pushed: 0, skipped: 0, recipients: 0 };
  return notify({ userIds: [ownerId], ...payload });
}

export async function notifyStaff(ownerId, permission, payload) {
  return notify({ ownerId, permission, ...payload });
}

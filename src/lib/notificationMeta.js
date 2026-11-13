import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Handshake,
  Info,
  Sparkles,
  Wallet,
  Wrench,
} from 'lucide-react';

export const NOTIFICATION_TYPE_META = {
  booking: { icon: Calendar, accent: 'text-accent-strong dark:text-accent' },
  request: { icon: Calendar, accent: 'text-accent-strong dark:text-accent' },
  payment: { icon: Wallet, accent: 'text-success dark:text-success' },
  refund: { icon: Wallet, accent: 'text-warning dark:text-warning' },
  expense: { icon: Wallet, accent: 'text-warning dark:text-warning' },
  settlement: { icon: Handshake, accent: 'text-success dark:text-success' },
  license: { icon: FileText, accent: 'text-warning dark:text-warning' },
  cleaning: { icon: Sparkles, accent: 'text-accent-strong dark:text-accent' },
  maintenance: { icon: Wrench, accent: 'text-warning dark:text-warning' },
  warning: { icon: AlertTriangle, accent: 'text-warning dark:text-warning' },
  success: { icon: CheckCircle2, accent: 'text-success dark:text-success' },
  info: { icon: Info, accent: 'text-muted dark:text-body-dark' },
};

export const NOTIFICATION_DEFAULT_LINK = {
  booking: 'residents',
  request: 'requests',
  payment: 'balances',
  refund: 'balances',
  expense: 'expenses',
  settlement: 'partners',
  license: 'settings',
  cleaning: 'cleaning',
  maintenance: 'maintenance',
  warning: 'availability',
  success: 'residents',
  info: 'availability',
};

export function getNotificationTarget(notification) {
  return notification.link || NOTIFICATION_DEFAULT_LINK[notification.type] || null;
}

export function formatNotificationDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 1) return 'الآن';
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
  if (diffMinutes < 1440) return `منذ ${Math.floor(diffMinutes / 60)} ساعة`;
  if (diffMinutes < 2880) return 'أمس';

  return date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
  });
}

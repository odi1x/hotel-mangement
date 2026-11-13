import { useMemo, useState } from 'react';
import { Bell, Check, ChevronLeft, Trash2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import {
  formatNotificationDate,
  getNotificationTarget,
  NOTIFICATION_TYPE_META,
} from '../../lib/notificationMeta';
import SegmentedControl from '../ui/SegmentedControl';

export function NotificationList({
  notifications,
  onSelect,
  emptyTitle = 'لا توجد إشعارات',
  emptySubtitle = 'ستظهر التنبيهات الجديدة هنا عند الحاجة.',
  dense = false,
}) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <Bell className="h-9 w-9 text-muted-soft dark:text-body-dark mb-3" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-ink dark:text-white">{emptyTitle}</p>
          <p className="text-[13px] text-muted dark:text-body-dark mt-1 max-w-xs leading-5">{emptySubtitle}</p>
      </div>
    );
  }

  return (
    <ul className={dense ? 'divide-y divide-hairline-soft dark:divide-hairline-dark' : 'divide-y divide-hairline-soft dark:divide-hairline-dark'}>
      {notifications.map((notification) => {
        const meta = NOTIFICATION_TYPE_META[notification.type] || NOTIFICATION_TYPE_META.info;
        const Icon = meta.icon;
        const target = getNotificationTarget(notification);

        return (
          <li key={notification.id}>
            <button
              type="button"
              onClick={() => onSelect(notification, target)}
              className={`w-full text-right flex items-start gap-3 transition-colors ${
                dense ? 'px-4 py-3' : 'px-4 py-4'
              } ${
                notification.isRead
                  ? 'bg-canvas dark:bg-surface-dark-elevated hover:bg-surface-soft dark:hover:bg-hairline-dark'
                  : 'bg-accent-soft hover:bg-accent-soft/80 dark:hover:bg-hairline-dark-soft'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${meta.accent}`} strokeWidth={1.8} />
              <span className="min-w-0 flex-1 block">
                <span className="flex items-start justify-between gap-3">
                  <span className={`text-sm font-semibold leading-5 ${notification.isRead ? 'text-body dark:text-body-dark' : 'text-ink dark:text-white'}`}>
                    {notification.urgent && <span className="text-warning ml-1">•</span>}
                    {notification.title}
                  </span>
                  <span className="text-xs text-muted-soft dark:text-body-dark shrink-0 whitespace-nowrap pt-0.5">
                    {formatNotificationDate(notification.createdAt)}
                  </span>
                </span>
                <span className={`block text-[13px] leading-5 mt-1 ${notification.isRead ? 'text-muted dark:text-body-dark' : 'text-body dark:text-body-dark'}`}>
                  {notification.message}
                </span>
                {target && (
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-strong dark:text-accent mt-2">
                    عرض التفاصيل
                    <ChevronLeft className="w-3 h-3" />
                  </span>
                )}
              </span>
              {!notification.isRead && (
                <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" aria-label="غير مقروء" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function NotificationFeed({ onNavigate, onOpenAll }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    hasMore,
    loadMore,
    loadingMore,
  } = useNotifications();
  const [filter, setFilter] = useState('all');

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((notification) => !notification.isRead);
    }
    return notifications;
  }, [filter, notifications]);

  const readCount = notifications.filter((notification) => notification.isRead).length;

  const handleSelect = (notification, target) => {
    if (!notification.isRead) markAsRead(notification.id);
    if (target && onNavigate) onNavigate(target);
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-4 py-4 border-b border-hairline-soft dark:border-hairline-dark flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink dark:text-white flex items-center gap-2">
            الإشعارات
            {unreadCount > 0 && (
              <span className="text-xs font-semibold text-white bg-accent rounded-full px-2 py-0.5 min-w-5 text-center">
                {unreadCount}
              </span>
            )}
          </h2>
          <p className="text-[13px] text-muted dark:text-body-dark mt-1">
            {unreadCount > 0 ? `${unreadCount} إشعاراً بحاجة إلى مراجعة` : 'لا توجد إشعارات غير مقروءة'}
          </p>
        </div>
        {onOpenAll && (
          <button
            type="button"
            onClick={onOpenAll}
            className="text-[13px] font-semibold text-accent-strong dark:text-accent hover:underline underline-offset-2 shrink-0"
          >
            عرض القائمة
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-b border-hairline-soft dark:border-hairline-dark flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          options={[
            { value: 'all', label: `الكل (${notifications.length})` },
            { value: 'unread', label: `غير المقروءة (${unreadCount})` },
          ]}
          value={filter}
          onChange={setFilter}
          ariaLabel="تصفية الإشعارات"
          itemClassName="text-[13px]"
        />
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink dark:text-body-dark dark:hover:text-white px-2 py-1.5 rounded-md hover:bg-surface-soft dark:hover:bg-hairline-dark transition-colors whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              قراءة الكل
            </button>
          )}
          {readCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink dark:text-body-dark dark:hover:text-white px-2 py-1.5 rounded-md hover:bg-surface-soft dark:hover:bg-hairline-dark transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              مسح المقروءة
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[430px] overflow-y-auto overscroll-contain">
        <NotificationList
          notifications={visibleNotifications}
          onSelect={handleSelect}
          emptyTitle={filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات بعد'}
          emptySubtitle={filter === 'unread' ? 'أنجزت مراجعة كل التنبيهات.' : 'ستظهر التنبيهات الجديدة هنا.'}
        />
        {notifications.length > 0 && hasMore && (
          <div className="p-3 border-t border-hairline-soft dark:border-hairline-dark">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full text-[13px] font-semibold text-accent-strong dark:text-accent hover:underline disabled:opacity-50 py-1"
            >
              {loadingMore ? 'جاري التحميل...' : 'عرض المزيد'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

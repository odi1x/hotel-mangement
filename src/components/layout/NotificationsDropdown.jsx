import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationList } from './NotificationFeed';
import SegmentedControl from '../ui/SegmentedControl';

export default function NotificationsDropdown({ onNavigate }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    hasMore,
    loadMore,
    loadingMore,
    notificationsPanelOpen,
    openNotificationsPanel,
    closeNotificationsPanel,
  } = useNotifications();
  const [filter, setFilter] = useState('all');
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [buttonRect, setButtonRect] = useState(null);

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((notification) => !notification.isRead);
    }
    return notifications;
  }, [filter, notifications]);

  const readCount = notifications.filter((notification) => notification.isRead).length;

  const toggleOpen = () => {
    if (notificationsPanelOpen) {
      closeNotificationsPanel();
      return;
    }
    if (buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    openNotificationsPanel();
  };

  useEffect(() => {
    function handleClickOutside(event) {
      const inButton = buttonRef.current && buttonRef.current.contains(event.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      if (!inButton && !inDropdown) closeNotificationsPanel();
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') closeNotificationsPanel();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeNotificationsPanel]);

  const handleSelect = (notification, target) => {
    if (!notification.isRead) markAsRead(notification.id);
    if (target && onNavigate) onNavigate(target);
    closeNotificationsPanel();
  };

  const handleOpenTodayNotifications = () => {
    if (onNavigate) onNavigate('today', { focus: 'notifications' });
    closeNotificationsPanel();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="relative p-2 rounded-md text-muted hover:bg-surface-soft hover:text-ink dark:text-body-dark dark:hover:bg-surface-dark-elevated dark:hover:text-white transition-colors focus:outline-none"
        aria-label={unreadCount > 0 ? `الإشعارات، ${unreadCount} غير مقروءة` : 'الإشعارات'}
        aria-expanded={notificationsPanelOpen}
        title="الإشعارات"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-5 h-5 px-1 text-2xs font-semibold text-white bg-accent rounded-full border-2 border-white dark:border-surface-dark">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {notificationsPanelOpen && createPortal(
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="الإشعارات"
          className="w-auto md:w-[520px] max-w-[calc(100vw-24px)] bg-canvas dark:bg-surface-dark-elevated rounded-xl md:rounded-lg shadow-soft border border-hairline dark:border-hairline-dark-soft overflow-hidden z-[100] anim-dropdown"
          style={(() => {
            const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
            if (isDesktop && buttonRect) {
              const dropdownWidth = Math.min(520, window.innerWidth - 24);
              const gap = 12;
              const buttonOnLeftHalf = buttonRect.left < window.innerWidth / 2;
              const style = {
                position: 'fixed',
                top: Math.round(buttonRect.bottom + 8),
              };
              if (buttonOnLeftHalf) {
                const proposedLeft = Math.round(buttonRect.left);
                const maxLeft = window.innerWidth - dropdownWidth - gap;
                style.left = Math.max(gap, Math.min(proposedLeft, maxLeft));
              } else {
                const proposedRight = Math.round(window.innerWidth - buttonRect.right);
                const maxRight = window.innerWidth - dropdownWidth - gap;
                style.right = Math.max(gap, Math.min(proposedRight, maxRight));
              }
              return style;
            }
            return {
              position: 'fixed',
              top: 64,
              left: 12,
              right: 12,
              marginInline: 'auto',
            };
          })()}
        >
          <div className="px-4 py-4 border-b border-hairline-soft dark:border-hairline-dark flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-semibold text-ink dark:text-white flex items-center gap-2 text-base">
                الإشعارات
                {unreadCount > 0 && (
                  <span className="text-2xs font-semibold text-white bg-accent rounded-full px-2 py-0.5 min-w-5 text-center">
                    {unreadCount}
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted dark:text-body-dark mt-1">
                {unreadCount > 0 ? `${unreadCount} إشعاراً بحاجة إلى مراجعة` : 'كل التنبيهات مقروءة'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-soft dark:text-body-dark dark:hover:text-white dark:hover:bg-hairline-dark transition-colors"
                  title="تحديد الكل كمقروء"
                  aria-label="تحديد الكل كمقروء"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {readCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-soft dark:text-body-dark dark:hover:text-white dark:hover:bg-hairline-dark transition-colors"
                  title="مسح المقروءة"
                  aria-label="مسح المقروءة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="px-4 py-3 border-b border-hairline-soft dark:border-hairline-dark">
            <SegmentedControl
              options={[
                { value: 'all', label: `الكل (${notifications.length})` },
                { value: 'unread', label: `غير المقروءة (${unreadCount})` },
              ]}
              value={filter}
              onChange={setFilter}
              ariaLabel="تصفية الإشعارات"
              itemClassName="text-xs"
            />
          </div>

          <div className="max-h-[430px] overflow-y-auto overscroll-contain">
            <NotificationList
              notifications={visibleNotifications}
              onSelect={handleSelect}
              emptyTitle={filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات بعد'}
              emptySubtitle={filter === 'unread' ? 'أنجزت مراجعة كل التنبيهات.' : 'ستظهر التنبيهات الجديدة هنا.'}
              dense
            />
            {notifications.length > 0 && hasMore && (
              <div className="p-3 border-t border-hairline-soft dark:border-hairline-dark">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full text-xs font-semibold text-accent-strong dark:text-accent hover:underline disabled:opacity-50 py-1"
                >
                  {loadingMore ? 'جاري التحميل...' : 'عرض المزيد'}
                </button>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-hairline-soft dark:border-hairline-dark bg-surface-soft/60 dark:bg-surface-dark/40">
            <button
              type="button"
              onClick={handleOpenTodayNotifications}
              className="w-full h-9 rounded-md text-xs font-semibold text-ink dark:text-white border border-hairline dark:border-hairline-dark-soft hover:bg-canvas dark:hover:bg-hairline-dark transition-colors"
            >
              عرض إشعارات اليوم
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

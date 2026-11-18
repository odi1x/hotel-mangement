import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationList } from './NotificationFeed';

// The bell is a *signal*, not a surface. It answers one question in a glance:
// "is there anything I need to act on?" The full triage list — filters,
// read-all, clear, pagination — lives in exactly one place: today's
// notification segment. Duplicating it here meant two copies to mark read in
// and two that drift apart.
const PEEK_LIMIT = 3;

export default function NotificationsDropdown({ onNavigate }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    notificationsPanelOpen,
    openNotificationsPanel,
    closeNotificationsPanel,
  } = useNotifications();
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [buttonRect, setButtonRect] = useState(null);

  const unreadPreview = useMemo(
    () => notifications.filter((notification) => !notification.isRead).slice(0, PEEK_LIMIT),
    [notifications]
  );

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

  // A notification is a pointer to a place, not a message to read in place:
  // mark it read and take the user straight to the context it points at.
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
        className="relative p-2 rounded-md hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark-elevated dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ink active:scale-[0.97]"
        aria-label={unreadCount > 0 ? `الإشعارات، ${unreadCount} غير مقروءة` : 'الإشعارات، لا توجد غير مقروءة'}
        aria-expanded={notificationsPanelOpen}
        aria-haspopup="dialog"
        title="الإشعارات"
      >
        <Bell
          className={`w-6 h-6 transition-colors ${
            unreadCount > 0
              ? 'text-ink dark:text-white'
              : 'text-muted-soft dark:text-body-dark'
          }`}
        />
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
          className="w-full md:w-[360px] max-w-[calc(100vw-24px)] bg-canvas dark:bg-surface-dark-elevated rounded-xl md:rounded-lg shadow-soft border border-hairline dark:border-hairline-dark-soft overflow-hidden z-[100] anim-dropdown"
          style={(() => {
            const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
            if (isDesktop && buttonRect) {
              const dropdownWidth = Math.min(360, window.innerWidth - 24);
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
          <div className="px-4 py-3 border-b border-hairline-soft dark:border-hairline-dark flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink dark:text-white">الإشعارات</h2>
            <span className="text-xs text-muted dark:text-body-dark">
              {unreadCount > 0 ? `${unreadCount} غير مقروءة` : 'كل التنبيهات مقروءة'}
            </span>
          </div>

          {unreadPreview.length > 0 ? (
            <div className="max-h-[280px] overflow-y-auto overscroll-contain">
              <NotificationList
                notifications={unreadPreview}
                onSelect={handleSelect}
                compact
              />
            </div>
          ) : (
            <div className="px-6 py-8 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="h-7 w-7 text-success dark:text-success mb-2.5" strokeWidth={1.6} />
              <p className="text-[13px] font-semibold text-ink dark:text-white">لا توجد إشعارات غير مقروءة</p>
              <p className="text-xs text-muted dark:text-body-dark mt-1 leading-5">
                ستظهر التنبيهات الجديدة هنا فور وصولها.
              </p>
            </div>
          )}

          <div className="border-t border-hairline-soft dark:border-hairline-dark">
            <button
              type="button"
              onClick={handleOpenTodayNotifications}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-[13px] font-semibold text-accent-strong dark:text-accent hover:bg-surface-soft dark:hover:bg-hairline-dark transition-colors active:scale-[0.99]"
            >
              <span>عرض كل الإشعارات</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

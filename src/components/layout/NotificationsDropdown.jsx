import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle2, Calendar, ChevronLeft } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationsDropdown({ onNavigate }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, fetchNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Map a notification to the page it should open
  const targetFor = (n) => {
    if (n.link) return n.link;
    switch (n.type) {
      case 'booking':
      case 'warning':
        return 'requests';
      case 'success':
        return 'residents';
      default:
        return null;
    }
  };

  const handleNotifClick = (n) => {
    if (!n.isRead) markAsRead(n.id);
    const t = targetFor(n);
    if (t && onNavigate) {
      onNavigate(t);
      setIsOpen(false);
    }
  };

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) fetchNotifications(); // always show fresh on open
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-ink dark:text-white" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-ink dark:text-white" />;
      case 'booking': return <Calendar className="w-5 h-5 text-ink dark:text-white" />;
      case 'info':
      default: return <Info className="w-5 h-5 text-muted dark:text-body-dark" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;

    return date.toLocaleDateString('ar-SA');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-md text-muted hover:bg-surface-soft hover:text-ink dark:text-body-dark dark:hover:bg-surface-dark-elevated dark:hover:text-white transition-colors focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-2xs font-semibold text-white bg-accent rounded-full border-2 border-white dark:border-surface-dark">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div className="fixed md:absolute inset-x-3 top-16 md:inset-auto md:top-full md:left-0 md:mt-2 w-auto md:w-80 lg:w-96 max-w-md md:max-w-none mx-auto md:mx-0 bg-canvas dark:bg-surface-dark-elevated rounded-xl md:rounded-lg shadow-soft border border-hairline dark:border-hairline-dark-soft overflow-hidden z-[100] anim-dropdown" ref={dropdownRef}>
          <div className="px-4 py-3 border-b border-hairline-soft dark:border-hairline-dark-soft flex justify-between items-center">
            <h3 className="font-semibold text-ink dark:text-white flex items-center gap-2">
              الإشعارات
              {unreadCount > 0 && <span className="text-2xs font-semibold text-white bg-accent rounded-full px-2 py-0.5">{unreadCount}</span>}
            </h3>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-muted hover:text-ink dark:text-body-dark dark:hover:text-white font-medium flex items-center gap-1 p-1.5 rounded-md hover:bg-surface-soft dark:hover:bg-hairline-dark transition-colors"
                  title="تحديد الكل كمقروء"
                >
                  <Check className="w-3.5 h-3.5" />
                  تحديد الكل كمقروء
                </button>
              )}
              <button
                onClick={clearAll}
                className="text-xs text-muted hover:text-ink dark:text-body-dark dark:hover:text-white font-medium flex items-center gap-1 p-1.5 rounded-md hover:bg-surface-soft dark:hover:bg-hairline-dark transition-colors"
                title="مسح المقروءة"
              >
                <Trash2 className="w-3.5 h-3.5" />
                مسح المقروءة
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="w-12 h-12 text-hairline dark:text-hairline-dark-soft mb-3" />
                <p className="text-sm font-medium text-muted dark:text-body-dark">لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`group px-4 py-3.5 cursor-pointer transition-colors border-r-2 ${
                      notif.isRead
                        ? 'border-transparent bg-canvas dark:bg-surface-dark-elevated hover:bg-surface-soft dark:hover:bg-hairline-dark'
                        : 'border-accent bg-accent-soft hover:bg-accent-soft dark:bg-hairline-dark dark:hover:bg-hairline-dark-soft'
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="shrink-0 mt-0.5">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm font-semibold truncate ${notif.isRead ? 'text-body dark:text-body-dark' : 'text-ink dark:text-white'}`}>
                            {notif.title}
                          </p>
                          <span className="text-2xs text-muted-soft shrink-0 mr-2 whitespace-nowrap">
                            {formatDate(notif.createdAt)}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${notif.isRead ? 'text-muted dark:text-body-dark' : 'text-body dark:text-body-dark font-medium'}`}>
                          {notif.message}
                        </p>
                        {targetFor(notif) && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            عرض التفاصيل <ChevronLeft className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

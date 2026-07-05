import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationsDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
      default: return <Info className="w-5 h-5 text-muted dark:text-[#a1a1aa]" />;
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
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md text-muted hover:bg-surface-soft hover:text-ink dark:text-[#a1a1aa] dark:hover:bg-surface-dark-elevated dark:hover:text-white transition-colors focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-[10px] font-semibold text-white bg-ink rounded-full border-2 border-white dark:bg-white dark:text-ink dark:border-surface-dark">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-canvas dark:bg-surface-dark-elevated rounded-lg shadow-soft border border-hairline dark:border-[#2e2e2e] overflow-hidden z-50 transform origin-top-left transition-all">
          <div className="px-4 py-3 border-b border-hairline-soft dark:border-[#2e2e2e] flex justify-between items-center">
            <h3 className="font-semibold text-ink dark:text-white">الإشعارات</h3>
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="text-xs text-muted hover:text-ink dark:text-[#a1a1aa] dark:hover:text-white font-medium flex items-center gap-1 p-1 transition-colors"
                title="تحديد الكل كمقروء"
              >
                <Check className="w-3.5 h-3.5" />
                تحديد الكل كمقروء
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-muted hover:text-ink dark:text-[#a1a1aa] dark:hover:text-white font-medium flex items-center gap-1 p-1 transition-colors"
                title="مسح الكل"
              >
                <Trash2 className="w-3.5 h-3.5" />
                مسح الكل
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="w-12 h-12 text-hairline dark:text-[#2e2e2e] mb-3" />
                <p className="text-sm font-medium text-muted dark:text-[#a1a1aa]">لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-[#242424]">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      notif.isRead
                        ? 'bg-canvas dark:bg-surface-dark-elevated hover:bg-surface-soft dark:hover:bg-[#242424]'
                        : 'bg-surface-soft dark:bg-[#242424] hover:bg-surface-card dark:hover:bg-[#2e2e2e]'
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="shrink-0 mt-0.5">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm font-semibold truncate ${notif.isRead ? 'text-body dark:text-[#a1a1aa]' : 'text-ink dark:text-white'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-muted-soft shrink-0 mr-2 whitespace-nowrap">
                            {formatDate(notif.createdAt)}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${notif.isRead ? 'text-muted dark:text-[#a1a1aa]' : 'text-body dark:text-[#a1a1aa] font-medium'}`}>
                          {notif.message}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-ink dark:bg-white shrink-0 mt-1.5" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

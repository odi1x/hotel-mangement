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
      case 'warning': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'booking': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'info':
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'warning': return 'border-r-red-500';
      case 'success': return 'border-r-emerald-500';
      case 'booking': return 'border-r-blue-500';
      case 'info':
      default: return 'border-r-blue-400';
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
        className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden z-50 transform origin-top-left transition-all">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-gray-800 dark:text-slate-100">الإشعارات</h3>
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1 p-1"
                title="تحديد الكل كمقروء"
              >
                <Check className="w-3.5 h-3.5" />
                تحديد الكل كمقروء
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium flex items-center gap-1 p-1"
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
                <Bell className="w-12 h-12 text-gray-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-slate-800/50">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                    className={`p-4 cursor-pointer transition-colors border-r-4 ${getBorderColor(notif.type)} ${
                      notif.isRead
                        ? 'bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/80'
                        : 'bg-blue-50/50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/80'
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="shrink-0 mt-0.5">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm font-bold truncate ${notif.isRead ? 'text-gray-700 dark:text-slate-300' : 'text-gray-900 dark:text-white'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0 mr-2 whitespace-nowrap">
                            {formatDate(notif.createdAt)}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${notif.isRead ? 'text-gray-500 dark:text-slate-400' : 'text-gray-600 dark:text-slate-300 font-medium'}`}>
                          {notif.message}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
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

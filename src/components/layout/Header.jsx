import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Settings, LogOut } from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';
import ImageUpload from '../ui/ImageUpload';
import toast from 'react-hot-toast';

export default function Header({ openStaffSettings }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleOpenSettings = () => {
    setDropdownOpen(false);
    openStaffSettings();
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 py-3 px-8 flex justify-end items-center gap-4 relative z-20">
      <NotificationsDropdown />
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="text-left hidden sm:block">
            <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{user?.name || user?.username}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {user?.role === 'admin' ? 'مدير النظام' : 'موظف'}
            </p>
          </div>

          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden border border-blue-200 dark:border-blue-800">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 py-1 overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 sm:hidden">
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{user?.role === 'admin' ? 'مدير النظام' : 'موظف'}</p>
            </div>

            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>إعدادات الحساب</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
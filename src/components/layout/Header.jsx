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
    <header className="bg-canvas dark:bg-surface-dark border-b border-hairline dark:border-[#242424] py-3 px-8 flex justify-end items-center gap-4 relative z-20">
      <NotificationsDropdown />
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 hover:bg-surface-soft dark:hover:bg-surface-dark-elevated p-2 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        >
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-ink dark:text-white">{user?.name || user?.username}</p>
            <p className="text-xs text-muted dark:text-[#a1a1aa]">
              {user?.role === 'admin' ? 'مدير النظام' : 'موظف'}
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-surface-card dark:bg-surface-dark-elevated flex items-center justify-center overflow-hidden">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-muted dark:text-[#a1a1aa]" />
            )}
          </div>
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-canvas dark:bg-surface-dark-elevated rounded-lg shadow-soft border border-hairline dark:border-[#2e2e2e] py-1 overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-hairline-soft dark:border-[#2e2e2e] sm:hidden">
              <p className="text-sm font-semibold text-ink dark:text-white truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-muted dark:text-[#a1a1aa]">{user?.role === 'admin' ? 'مدير النظام' : 'موظف'}</p>
            </div>

            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-body dark:text-[#a1a1aa] hover:bg-surface-soft dark:hover:bg-[#242424] hover:text-ink dark:hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>إعدادات الحساب</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-body dark:text-[#a1a1aa] hover:bg-surface-soft dark:hover:bg-[#242424] hover:text-ink dark:hover:text-white transition-colors"
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

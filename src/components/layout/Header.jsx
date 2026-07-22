import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Settings, LogOut } from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';

export default function Header({ openStaffSettings, onNavigate, title }) {
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
    <header className="bg-page dark:bg-surface-dark py-2 px-4 md:px-8 flex justify-between md:justify-end items-center gap-3 relative z-20">
      {/* Mobile title on the leading (RTL right) edge — this is what puts the
          page heading right next to the top corner, instead of buried 24px+
          below in the main content area. Truncates with ellipsis for long
          titles ("المستحقات المالية" etc.). Hidden on desktop where the big
          title in main padding still owns the visual hierarchy. */}
      {title && (
        <h1 className="md:hidden text-lg font-bold tracking-tight text-ink dark:text-white leading-tight truncate min-w-0 flex-1">
          {title}
        </h1>
      )}

      <div className="flex items-center gap-4 shrink-0">
      <NotificationsDropdown onNavigate={onNavigate} />
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 hover:bg-surface-soft dark:hover:bg-surface-dark-elevated p-2 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        >
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-ink dark:text-white">{user?.name || user?.username}</p>
            <p className="text-xs text-muted dark:text-body-dark">
              {user?.role === 'admin' ? 'مدير النظام' : 'موظف'}
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-surface-card dark:bg-surface-dark-elevated flex items-center justify-center overflow-hidden">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-muted dark:text-body-dark" />
            )}
          </div>
        </button>

        {dropdownOpen && createPortal(
          <div className="fixed md:absolute inset-x-3 top-16 md:inset-auto md:top-full md:left-0 md:mt-2 w-auto md:w-48 max-w-md md:max-w-none bg-canvas dark:bg-surface-dark-elevated rounded-xl md:rounded-lg shadow-soft border border-hairline dark:border-hairline-dark-soft py-1 overflow-hidden z-[100] anim-dropdown" ref={dropdownRef}>
            <div className="px-4 py-3 border-b border-hairline-soft dark:border-hairline-dark-soft sm:hidden">
              <p className="text-sm font-semibold text-ink dark:text-white truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-muted dark:text-body-dark">{user?.role === 'admin' ? 'مدير النظام' : 'موظف'}</p>
            </div>

            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-body dark:text-body-dark hover:bg-surface-soft dark:hover:bg-hairline-dark hover:text-ink dark:hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>إعدادات الحساب</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-body dark:text-body-dark hover:bg-surface-soft dark:hover:bg-hairline-dark hover:text-ink dark:hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>,
          document.body
        )}
      </div>
      </div>
    </header>
  );
}

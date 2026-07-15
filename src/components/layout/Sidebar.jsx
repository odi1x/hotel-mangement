import { Home, Calendar, Users, BarChart3, Moon, Sun, LogOut, Settings, PanelRightClose, PanelRightOpen, BellRing, Wallet, Wrench, TagsIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { computeBookingTotals } from '../../lib/paymentUtils';


const SidebarItem = ({ icon: Icon, label, id, badgeCount, view, setView, isCollapsed }) => (
  <button
    onClick={() => setView(id)}
    className={`w-full flex items-center space-x-reverse ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-2.5 rounded-md transition-colors relative ${
      view === id
      ? 'bg-surface-card text-ink font-semibold dark:bg-surface-dark-elevated dark:text-white'
      : 'text-muted hover:bg-surface-soft hover:text-ink dark:text-body-dark dark:hover:bg-surface-dark-elevated dark:hover:text-white'
    }`}
    title={isCollapsed ? label : ''}
  >
    {view === id && !isCollapsed && (
      <span className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-accent"></span>
    )}
    <Icon size={20} strokeWidth={view === id ? 2.25 : 2} className={view === id ? 'text-accent' : ''} />
    {!isCollapsed && <span className="text-sm mr-3 flex-1 text-right">{label}</span>}
    {!isCollapsed && badgeCount > 0 && (
      <span className="bg-accent text-white text-2xs font-semibold px-2 py-0.5 rounded-full">
        {badgeCount}
      </span>
    )}
    {isCollapsed && badgeCount > 0 && (
      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent rounded-full border-2 border-white dark:border-surface-dark"></span>
    )}
  </button>
);

export default function Sidebar({ view, setView, isCollapsed, setIsCollapsed }) {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const { apartments, bookings, maintenanceIssues } = useData();
  const pendingCount = (bookings || []).filter(b => b.status === 'pending').length;

  const duesCount = (bookings || []).reduce((n, b) => {
    const { balanceDue } = computeBookingTotals(b);
    return balanceDue > 0.01 ? n + 1 : n;
  }, 0);

  // Sidebar badge: urgent open maintenance issues — the things that literally
  // shouldn't be forgotten.
  const urgentMaintenanceCount = (maintenanceIssues || []).filter(i =>
    i.status !== 'resolved' && i.severity === 'urgent'
  ).length;

  const isDateBetween = (date, start, end) => {
    const d = new Date(date).setHours(0,0,0,0);
    const s = new Date(start).setHours(0,0,0,0);
    const e = new Date(end).setHours(0,0,0,0);
    return d >= s && d <= e;
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-canvas dark:bg-surface-dark border-l border-hairline dark:border-hairline-dark p-6 flex flex-col h-full shrink-0 relative`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute top-6 text-muted hover:text-ink dark:text-body-dark dark:hover:text-white z-10 transition-colors ${isCollapsed ? 'right-6' : 'left-6'}`}
      >
        {isCollapsed ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
      </button>

      <div className={`flex items-center space-x-reverse space-x-2 mb-10 ${isCollapsed ? 'justify-center mt-10 px-0' : 'px-2'} cursor-pointer`} onClick={() => setView('availability')}>
        <div className="bg-ink p-2 rounded-md dark:bg-white">
          <Home className="text-white dark:text-ink" size={24} />
        </div>
        {!isCollapsed && <span className="text-xl font-semibold tracking-tight text-ink dark:text-white mr-2">رنت فلو</span>}
      </div>

      <nav className="space-y-1 flex-1">
        <SidebarItem icon={Calendar} label="التوفر" id="availability" view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={Home} label="الشقق" id="apartments" view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={BellRing} label="الطلبات" id="requests" badgeCount={pendingCount} view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={Users} label="سجل النزلاء" id="residents" view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={Wallet} label="المستحقات" id="balances" badgeCount={duesCount} view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={Wrench} label="الصيانة" id="maintenance" badgeCount={urgentMaintenanceCount} view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={TagsIcon} label="الأسعار الموسمية" id="pricing" view={view} setView={setView} isCollapsed={isCollapsed} />

        {(user?.role === 'admin' || user?.permissions?.canViewAnalytics) && (
          <SidebarItem icon={BarChart3} label="التحليلات" id="analytics" view={view} setView={setView} isCollapsed={isCollapsed} />
        )}

        {(user?.role === 'admin' || user?.permissions?.canViewSettings) && (
          <SidebarItem icon={Settings} label="الإعدادات" id="settings" view={view} setView={setView} isCollapsed={isCollapsed} />
        )}
      </nav>

      <div className="mt-auto space-y-4">
        <button
          onClick={toggleDarkMode}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-4 py-2'} rounded-md border border-hairline dark:border-hairline-dark-soft hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors text-body dark:text-body-dark`}
          title={darkMode ? 'الوضع المضيء' : 'الوضع الليلي'}
        >
          {!isCollapsed && <span className="text-sm font-medium">{darkMode ? 'الوضع المضيء' : 'الوضع الليلي'}</span>}
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {!isCollapsed && (
          <div className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg">
            <p className="text-xs font-semibold text-muted dark:text-body-dark mb-3">معلومات مباشرة</p>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted dark:text-body-dark">إجمالي الوحدات</span>
              <span className="text-sm font-semibold text-ink dark:text-white">{apartments.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted dark:text-body-dark">النزلاء الحاليين</span>
              <span className="text-sm font-semibold text-ink dark:text-white">
                {bookings.filter(b => isDateBetween(new Date(), b.startDate, b.endDate)).length}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={`w-full flex items-center justify-center space-x-reverse ${isCollapsed ? 'px-0 py-3 space-x-0' : 'space-x-2 px-4 py-2'} rounded-md text-muted hover:text-ink hover:bg-surface-soft dark:text-body-dark dark:hover:text-white dark:hover:bg-surface-dark-elevated transition-colors`}
          title={isCollapsed ? "تسجيل الخروج" : ""}
        >
          <LogOut size={16} />
          {!isCollapsed && <span className="text-sm font-medium mr-2">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  );
}

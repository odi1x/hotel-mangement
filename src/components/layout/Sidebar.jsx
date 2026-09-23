import { Home, Calendar, Users, BarChart3, Moon, Sun, LogOut, Settings, PanelRightOpen, PanelRightClose, BellRing, Wallet, Wrench, TagsIcon, ArrowDownCircle, Sparkles, Handshake } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { computeBookingTotals } from '../../lib/paymentUtils';
import logoWide from '../../assets/brand/logo.png';


const SidebarItem = ({ icon: Icon, label, id, badgeCount, view, setView, isCollapsed }) => (
  <button
    onClick={() => setView(id)}
    className={`relative flex items-center w-full h-11 rounded-md transition-colors ${
      isCollapsed ? 'justify-center px-1.5' : 'justify-start pr-3 pl-2'
    } ${
      view === id
        ? 'bg-surface-card text-ink font-semibold dark:bg-surface-dark-elevated dark:text-white'
        : 'text-muted hover:bg-surface-soft hover:text-ink dark:text-body-dark dark:hover:bg-surface-dark-elevated dark:hover:text-white'
    }`}
    title={isCollapsed ? label : ''}
  >
    {view === id && !isCollapsed && (
      <span className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-accent"></span>
    )}
    <span className={`relative w-11 h-11 flex items-center justify-center shrink-0 rounded-lg transition-colors ${isCollapsed ? '' : 'me-2.5'} ${view === id ? 'bg-accent-soft text-accent-strong' : ''}`}>
      <Icon size={20} strokeWidth={view === id ? 2.25 : 2} />
      {isCollapsed && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-canvas dark:border-surface-dark"></span>
      )}
    </span>
    <span className={`text-sm transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
      {label}
    </span>
    {!isCollapsed && badgeCount > 0 && (
      <span className="mr-auto bg-accent text-white text-2xs font-semibold px-2 py-0.5 rounded-full">
        {badgeCount}
      </span>
    )}
  </button>
);

export default function Sidebar({ view, setView, isCollapsed, setIsCollapsed }) {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const { apartments, bookings, maintenanceIssues, cleaningTasks } = useData();
  const pendingCount = (bookings || []).filter(b => b.status === 'pending').length;

  const duesCount = (bookings || []).reduce((n, b) => {
    const { balanceDue } = computeBookingTotals(b);
    return balanceDue > 0.01 ? n + 1 : n;
  }, 0);

  const urgentMaintenanceCount = (maintenanceIssues || []).filter(i =>
    i.status !== 'resolved' && i.severity === 'urgent'
  ).length;

  const pendingCleaningCount = (cleaningTasks || []).filter(t => t.status !== 'done').length;

  const isDateBetween = (date, start, end) => {
    const d = new Date(date).setHours(0,0,0,0);
    const s = new Date(start).setHours(0,0,0,0);
    const e = new Date(end).setHours(0,0,0,0);
    return d >= s && d <= e;
  };

  return (
    <aside className={`hidden md:flex justify-start flex-col ${isCollapsed ? 'w-20' : 'w-64'} py-4 px-0 gap-3 transition-all duration-300 bg-canvas dark:bg-surface-dark border-l border-hairline dark:border-hairline-dark h-full shrink-0 relative`}>
      {/* Fixed-height header slot — mounted in BOTH states so the nav below
          always starts from the same vertical offset. Only the logo image is
          hidden when collapsed; the collapse toggle stays in this slot. */}
      <div className="h-16 flex items-center justify-between px-4 shrink-0">
        {isCollapsed ? (
          <span className="flex-1" aria-hidden="true" />
        ) : (
          <div
            className="flex items-center space-x-reverse space-x-2.5 flex-1 min-w-0 cursor-pointer"
            onClick={() => setView('availability')}
            title="رنت فلو"
          >
            <img src={logoWide} alt="رنت فلو" className="h-8 object-contain" />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-9 h-9 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-soft dark:text-body-dark dark:hover:text-white dark:hover:bg-surface-dark-elevated transition-colors"
          aria-label={isCollapsed ? 'فتح القائمة الجانبية' : 'طي القائمة الجانبية'}
          title={isCollapsed ? 'فتح القائمة الجانبية' : 'طي القائمة الجانبية'}
        >
          {isCollapsed ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
        </button>
      </div>

      <nav className="flex flex-col gap-2 w-full flex-1 justify-start">
        <SidebarItem icon={Calendar} label="التوفر" id="availability" view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={Home} label="الشقق" id="apartments" view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={BellRing} label="الطلبات" id="requests" badgeCount={pendingCount} view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={Users} label="سجل النزلاء" id="residents" view={view} setView={setView} isCollapsed={isCollapsed} />
        {(user?.role === 'admin' || user?.permissions?.canViewBalances) && (
          <SidebarItem icon={Wallet} label="المستحقات" id="balances" badgeCount={duesCount} view={view} setView={setView} isCollapsed={isCollapsed} />
        )}
        {(user?.role === 'admin' || user?.permissions?.canViewAnalytics) && (
          <SidebarItem icon={ArrowDownCircle} label="المصروفات" id="expenses" view={view} setView={setView} isCollapsed={isCollapsed} />
        )}
        {(user?.role === 'admin' || user?.permissions?.canClean) && (
          <SidebarItem icon={Sparkles} label="التنظيف" id="cleaning" badgeCount={pendingCleaningCount} view={view} setView={setView} isCollapsed={isCollapsed} />
        )}
        {(user?.role === 'admin' || user?.permissions?.canViewMaintenance) && (
          <SidebarItem icon={Wrench} label="الصيانة" id="maintenance" badgeCount={urgentMaintenanceCount} view={view} setView={setView} isCollapsed={isCollapsed} />
        )}
        {(user?.role === 'admin' || user?.permissions?.canViewPricing) && (
          <SidebarItem icon={TagsIcon} label="الأسعار الموسمية" id="pricing" view={view} setView={setView} isCollapsed={isCollapsed} />
        )}
        {(user?.role === 'admin' || user?.permissions?.canViewAnalytics) && (
          <SidebarItem icon={BarChart3} label="التحليلات" id="analytics" view={view} setView={setView} isCollapsed={isCollapsed} />
        )}
        {user?.role === 'admin' && user?.partnersRevenueSharingEnabled && (
          <SidebarItem icon={Handshake} label="الشركاء" id="partners" view={view} setView={setView} isCollapsed={isCollapsed} />
        )}

        {(user?.role === 'admin' || user?.permissions?.canViewSettings) && (
          <SidebarItem icon={Settings} label="الإعدادات" id="settings" view={view} setView={setView} isCollapsed={isCollapsed} />
        )}
      </nav>

      <div className="mt-auto space-y-4 border-t border-hairline dark:border-hairline-dark pt-3">
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
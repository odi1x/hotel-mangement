import { Home, Calendar, Users, BarChart3, Moon, Sun, LogOut, Settings, PanelRightClose, PanelRightOpen, BellRing } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';


const SidebarItem = ({ icon: Icon, label, id, badgeCount, view, setView, isCollapsed }) => (
  <button
    onClick={() => setView(id)}
    className={`w-full flex items-center space-x-reverse ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors ${
      view === id
      ? 'bg-surface-card text-ink font-bold shadow-sm'
      : 'text-muted dark:text-slate-400 hover:bg-surface-soft dark:hover:bg-slate-800'
    }`}
    title={isCollapsed ? label : ''}
  >
    <Icon size={20} />
    {!isCollapsed && <span className="font-medium mr-3 flex-1 text-right">{label}</span>}
    {!isCollapsed && badgeCount > 0 && (
      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        {badgeCount}
      </span>
    )}
    {isCollapsed && badgeCount > 0 && (
      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
    )}
  </button>
);

export default function Sidebar({ view, setView, isCollapsed, setIsCollapsed }) {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const { apartments, bookings } = useData();
  const pendingCount = (bookings || []).filter(b => b.status === 'pending').length;

  const isDateBetween = (date, start, end) => {
    const d = new Date(date).setHours(0,0,0,0);
    const s = new Date(start).setHours(0,0,0,0);
    const e = new Date(end).setHours(0,0,0,0);
    return d >= s && d <= e;
  };



  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-canvas dark:bg-slate-900 border-l border-hairline dark:border-slate-800 p-6 flex flex-col h-full shrink-0 relative`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute top-6 text-muted-soft hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 z-10 ${isCollapsed ? 'right-6' : 'left-6'}`}
      >
        {isCollapsed ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
      </button>

      <div className={`flex items-center space-x-reverse space-x-2 mb-10 ${isCollapsed ? 'justify-center mt-10 px-0' : 'px-2'} cursor-pointer`} onClick={() => setView('availability')}>
        <div className="bg-blue-600 p-2 rounded-lg shadow-md shadow-blue-200 dark:shadow-none">
          <Home className="text-white" size={24} />
        </div>
        {!isCollapsed && <span className="text-xl font-black tracking-tight text-blue-900 dark:text-white mr-2">رنت فلو</span>}
      </div>

      <nav className="space-y-2 flex-1">
        <SidebarItem icon={Calendar} label="التوفر" id="availability" view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={Home} label="الشقق" id="apartments" view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={BellRing} label="الطلبات" id="requests" badgeCount={pendingCount} view={view} setView={setView} isCollapsed={isCollapsed} />
        <SidebarItem icon={Users} label="سجل النزلاء" id="residents" view={view} setView={setView} isCollapsed={isCollapsed} />

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
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'justify-between px-4 py-2'} rounded-lg border border-hairline dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-slate-300`}
          title={darkMode ? 'الوضع المضيء' : 'الوضع الليلي'}
        >
          {!isCollapsed && <span className="text-sm font-medium">{darkMode ? 'الوضع المضيء' : 'الوضع الليلي'}</span>}
          {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-primary" />}
        </button>

        {!isCollapsed && (
          <div className="bg-blue-50 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700">
            <p className="text-xs font-bold text-primary dark:text-blue-400 uppercase mb-3">معلومات مباشرة</p>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted dark:text-slate-400 font-medium">إجمالي الوحدات</span>
              <span className="text-sm font-black text-gray-800 dark:text-slate-200">{apartments.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted dark:text-slate-400 font-medium">النزلاء الحاليين</span>
              <span className="text-sm font-black text-gray-800 dark:text-slate-200">
                {bookings.filter(b => isDateBetween(new Date(), b.startDate, b.endDate)).length}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={`w-full flex items-center justify-center space-x-reverse ${isCollapsed ? 'px-0 py-3 space-x-0' : 'space-x-2 px-4 py-2'} rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors`}
          title={isCollapsed ? "تسجيل الخروج" : ""}
        >
          <LogOut size={16} />
          {!isCollapsed && <span className="text-sm font-medium mr-2">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  );
}

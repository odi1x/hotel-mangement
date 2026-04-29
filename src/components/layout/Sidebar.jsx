import { Home, Calendar, Users, BarChart3, Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export default function Sidebar({ view, setView }) {
  const { darkMode, toggleDarkMode } = useTheme();
  const { logout } = useAuth();
  const { apartments, bookings } = useData();

  const isDateBetween = (date, start, end) => {
    const d = new Date(date).setHours(0,0,0,0);
    const s = new Date(start).setHours(0,0,0,0);
    const e = new Date(end).setHours(0,0,0,0);
    return d >= s && d <= e;
  };

  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button
      onClick={() => setView(id)}
      className={`w-full flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg transition-colors ${
        view === id
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium mr-3">{label}</span>
    </button>
  );

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 p-6 flex flex-col h-full shrink-0">
      <div className="flex items-center space-x-reverse space-x-2 mb-10 px-2 cursor-pointer" onClick={() => setView('availability')}>
        <div className="bg-blue-600 p-2 rounded-lg shadow-md shadow-blue-200 dark:shadow-none">
          <Home className="text-white" size={24} />
        </div>
        <span className="text-xl font-black tracking-tight text-blue-900 dark:text-white mr-2">رنت فلو</span>
      </div>

      <nav className="space-y-2 flex-1">
        <SidebarItem icon={Calendar} label="التوفر" id="availability" />
        <SidebarItem icon={Home} label="الشقق" id="apartments" />
        <SidebarItem icon={Users} label="سجل النزلاء" id="residents" />
        <SidebarItem icon={BarChart3} label="التحليلات" id="analytics" />
      </nav>

      <div className="mt-auto space-y-4">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-slate-300"
        >
          <span className="text-sm font-medium">{darkMode ? 'الوضع المضيء' : 'الوضع الليلي'}</span>
          {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-blue-600" />}
        </button>

        <div className="bg-blue-50 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-3">معلومات مباشرة</p>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-slate-400 font-medium">إجمالي الوحدات</span>
            <span className="text-sm font-black text-gray-800 dark:text-slate-200">{apartments.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-slate-400 font-medium">النزلاء الحاليين</span>
            <span className="text-sm font-black text-gray-800 dark:text-slate-200">
              {bookings.filter(b => isDateBetween(new Date(), b.startDate, b.endDate)).length}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-reverse space-x-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <LogOut size={16} />
          <span className="text-sm font-medium mr-2">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}

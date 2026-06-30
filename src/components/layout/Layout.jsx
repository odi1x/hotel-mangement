import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AvailabilityView from '../views/AvailabilityView';
import ApartmentsView from '../views/ApartmentsView';
import ResidentsView from '../views/ResidentsView';
import AnalyticsView from '../views/AnalyticsView';
import SettingsView from '../views/SettingsView';
import BookingForm from '../ui/BookingForm';
import BookByDateModal from '../ui/BookByDateModal';
import ProfileSettingsModal from '../ui/ProfileSettingsModal';
import { Plus, CalendarSearch } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  const [view, setView] = useState('availability');
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [isBookingByDate, setIsBookingByDate] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [initialBookingData, setInitialBookingData] = useState({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleOpenBookingForm = (initialData = {}) => {
    setInitialBookingData(initialData);
    setIsAddingBooking(true);
  };

  const handleSelectApartmentByDate = (apartmentId, startDate, endDate) => {
    setIsBookingByDate(false);
    handleOpenBookingForm({
      apartmentId,
      startDate,
      endDate
    });
  };

  const getViewTitle = () => {
    switch (view) {
      case 'availability': return 'جدول التوفر';
      case 'apartments': return 'إدارة الشقق';
      case 'residents': return 'سجل النزلاء';
      case 'analytics': return 'تحليلات الأداء';
      case 'settings': return 'الإعدادات';
      default: return '';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 font-sans text-gray-900 dark:text-slate-100 overflow-hidden" dir="rtl">
      <Sidebar view={view} setView={setView} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header openStaffSettings={() => setIsProfileSettingsOpen(true)} />

        <main className="flex-1 overflow-hidden p-6 pb-6 bg-gray-50 dark:bg-slate-950 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-slate-100 mb-1">
              {getViewTitle()}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">إدارة التأجير اليومي والأسبوعي والشهري بدقة.</p>
          </div>
          {(user?.role === 'admin' || user?.permissions?.canBook) && (
            <div className="flex space-x-reverse space-x-3">
              <button
                onClick={() => setIsBookingByDate(true)}
                className="flex items-center space-x-reverse space-x-2 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95"
              >
                <CalendarSearch size={18} />
                <span className="mr-2">حجز بالتاريخ</span>
              </button>
              <button
                onClick={() => handleOpenBookingForm()}
                className="flex items-center space-x-reverse space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
              >
                <Plus size={18} />
                <span className="mr-2">حجز جديد</span>
              </button>
            </div>
          )}
        </div>

          <div className="flex-1 min-h-0 h-full flex flex-col">
            {view === 'availability' && <AvailabilityView openBookingForm={handleOpenBookingForm} />}
            {view === 'apartments' && <ApartmentsView />}
            {view === 'residents' && <ResidentsView openBookingForm={handleOpenBookingForm} />}
            {view === 'analytics' && <AnalyticsView />}
            {view === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {isProfileSettingsOpen && (
        <ProfileSettingsModal onClose={() => setIsProfileSettingsOpen(false)} />
      )}

      {isAddingBooking && (
        <BookingForm
          onClose={() => setIsAddingBooking(false)}
          initialData={initialBookingData}
        />
      )}

      {isBookingByDate && (
        <BookByDateModal
          onClose={() => setIsBookingByDate(false)}
          onSelectApartment={handleSelectApartmentByDate}
        />
      )}
    </div>
  );
}

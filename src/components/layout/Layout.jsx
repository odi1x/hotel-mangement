import { useState } from 'react';
import Sidebar from './Sidebar';
import AvailabilityView from '../views/AvailabilityView';
import ApartmentsView from '../views/ApartmentsView';
import ResidentsView from '../views/ResidentsView';
import AnalyticsView from '../views/AnalyticsView';
import SettingsView from '../views/SettingsView';
import BookingForm from '../ui/BookingForm';
import { Plus } from 'lucide-react';

export default function Layout() {
  const [view, setView] = useState('availability');
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [initialBookingData, setInitialBookingData] = useState({});

  const handleOpenBookingForm = (initialData = {}) => {
    setInitialBookingData(initialData);
    setIsAddingBooking(true);
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
      <Sidebar view={view} setView={setView} />

      <main className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-slate-950">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-slate-100 mb-1">
              {getViewTitle()}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">إدارة التأجير اليومي والأسبوعي والشهري بدقة.</p>
          </div>
          <div className="flex space-x-reverse space-x-3">
            <button
              onClick={() => handleOpenBookingForm()}
              className="flex items-center space-x-reverse space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
            >
              <Plus size={18} />
              <span className="mr-2">حجز جديد</span>
            </button>
          </div>
        </div>

        <div className="pb-20">
          {view === 'availability' && <AvailabilityView openBookingForm={handleOpenBookingForm} />}
          {view === 'apartments' && <ApartmentsView />}
          {view === 'residents' && <ResidentsView />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'settings' && <SettingsView />}
        </div>
      </main>

      {isAddingBooking && (
        <BookingForm
          onClose={() => setIsAddingBooking(false)}
          initialData={initialBookingData}
        />
      )}
    </div>
  );
}

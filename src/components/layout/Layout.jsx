import { useState } from 'react';
import Sidebar from './Sidebar';
import toast from 'react-hot-toast';
import Header from './Header';
import AvailabilityView from '../views/AvailabilityView';
import ApartmentsView from '../views/ApartmentsView';
import ResidentsView from '../views/ResidentsView';
import AnalyticsView from '../views/AnalyticsView';
import SettingsView from '../views/SettingsView';
import RequestsView from '../views/RequestsView';
import BookingForm from '../ui/BookingForm';
import BookByDateModal from '../ui/BookByDateModal';
import ProfileSettingsModal from '../ui/ProfileSettingsModal';
import { Plus, CalendarSearch, Share2, Copy, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  const [view, setView] = useState('availability');
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [isBookingByDate, setIsBookingByDate] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [initialBookingData, setInitialBookingData] = useState({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const shareableLink = `${window.location.origin}/book/${user?.adminId || user?.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setIsCopied(true);
    toast.success('تم نسخ الرابط!');
    setTimeout(() => setIsCopied(false), 2000);
  };

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
      case 'requests': return 'طلبات الحجز';
      default: return '';
    }
  };

  return (
    <div className="flex h-screen bg-page dark:bg-surface-dark font-sans text-ink dark:text-white overflow-hidden" dir="rtl">
      <Sidebar view={view} setView={setView} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header openStaffSettings={() => setIsProfileSettingsOpen(true)} />

        <main className="flex-1 overflow-hidden p-6 pb-6 bg-page dark:bg-surface-dark flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink dark:text-white mb-1">
              {getViewTitle()}
            </h1>
            <p className="text-sm text-muted dark:text-[#a1a1aa]">إدارة التأجير اليومي والأسبوعي والشهري بدقة.</p>
          </div>
          {(user?.role === 'admin' || user?.permissions?.canBook) && (
            <div className="flex items-center space-x-reverse space-x-3">

              {view === 'apartments' && (
                <div className="bg-canvas dark:bg-surface-dark-elevated p-1.5 rounded-md border border-hairline dark:border-[#2e2e2e] flex items-center gap-2 max-w-[300px]">
                  <div className="bg-surface-card dark:bg-[#242424] p-1.5 rounded-md text-ink dark:text-white">
                    <Share2 size={16} />
                  </div>
                  <div className="flex-1 overflow-hidden hidden md:block">
                    <p className="text-[10px] text-muted dark:text-[#a1a1aa] mb-0.5 truncate">رابط الحجز المباشر للعملاء</p>
                    <input
                      type="text"
                      readOnly
                      value={shareableLink}
                      className="w-full text-xs bg-transparent border-none outline-none text-body dark:text-[#a1a1aa] text-left truncate"
                      dir="ltr"
                    />
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`p-1.5 rounded-md font-semibold flex items-center gap-1 transition-colors ${isCopied ? 'bg-primary-active text-white' : 'bg-primary text-white hover:bg-primary-active'}`}
                    title="نسخ الرابط"
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span className="text-xs hidden lg:inline">{isCopied ? 'تم' : 'نسخ الرابط'}</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsBookingByDate(true)}
                className="btn-secondary"
              >
                <CalendarSearch size={18} />
                <span>حجز بالتاريخ</span>
              </button>
              <button
                onClick={() => handleOpenBookingForm()}
                className="btn-primary"
              >
                <Plus size={18} />
                <span>حجز جديد</span>
              </button>
            </div>
          )}
        </div>

          <div className="flex-1 min-h-0 h-full flex flex-col">
            {view === 'availability' && <AvailabilityView openBookingForm={handleOpenBookingForm} />}
            {view === 'requests' && <RequestsView openBookingForm={handleOpenBookingForm} />}
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

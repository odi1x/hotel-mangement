import { useState } from 'react';
import Sidebar from './Sidebar';
import toast from 'react-hot-toast';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import MobileMoreMenu from './MobileMoreMenu';
import AvailabilityView from '../views/AvailabilityView';
import ApartmentsView from '../views/ApartmentsView';
import ResidentsView from '../views/ResidentsView';
import AnalyticsView from '../views/AnalyticsView';
import SettingsView from '../views/SettingsView';
import RequestsView from '../views/RequestsView';
import BalancesView from '../views/BalancesView';
import MaintenanceView from '../views/MaintenanceView';
import PricingView from '../views/PricingView';
import BookingForm from '../ui/BookingForm';
import BookByDateModal from '../ui/BookByDateModal';
import ProfileSettingsModal from '../ui/ProfileSettingsModal';
import { Plus, CalendarSearch, Share2, Copy, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Permission-gated views. If a staff member's permission for one of these
// is false, setView() silently no-ops instead of navigating. Admin always
// bypasses. Keeping this in module scope so it's a single source of truth.
const GATED_VIEW_PERM = {
  balances:    'canViewBalances',
  maintenance: 'canViewMaintenance',
  pricing:     'canViewPricing',
  analytics:   'canViewAnalytics',
  settings:    'canViewSettings',
};

export default function Layout() {
  const { user } = useAuth();
  const [view, setViewRaw] = useState('availability');
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [isBookingByDate, setIsBookingByDate] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [initialBookingData, setInitialBookingData] = useState({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Wrap setView so unauthorized navigation is blocked at the source.
  // Admin bypasses gating. Non-gated views (availability, apartments,
  // requests, residents) pass straight through.
  const setView = (newView) => {
    if (user?.role === 'admin' || !GATED_VIEW_PERM[newView]) {
      setViewRaw(newView);
      return;
    }
    const permKey = GATED_VIEW_PERM[newView];
    if (user?.permissions?.[permKey]) {
      setViewRaw(newView);
    }
    // else: silently ignore — the sidebar shouldn't have exposed this option anyway
  };

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
      case 'balances': return 'المستحقات المالية';
      case 'maintenance': return 'سجل الصيانة';
      case 'pricing': return 'الأسعار الموسمية';
      case 'analytics': return 'تحليلات الأداء';
      case 'settings': return 'الإعدادات';
      case 'requests': return 'طلبات الحجز';
      case 'more': return 'المزيد';
      default: return '';
    }
  };

  const getViewSubtitle = () => {
    switch (view) {
      case 'balances':    return 'تتبّع الدفعات والأرصدة المتبقية على الحجوزات.';
      case 'maintenance': return 'وثّق بلاغات الصيانة وتتبّع حالتها حتى الحل.';
      case 'pricing':     return 'اضبط أسعار المواسم والفترات الخاصة تلقائياً.';
      case 'more':        return null;
      default:            return 'إدارة التأجير اليومي والأسبوعي والشهري بدقة.';
    }
  };

  return (
    <div className="flex h-screen bg-page dark:bg-surface-dark font-sans text-ink dark:text-white overflow-hidden" dir="rtl">
      <Sidebar view={view} setView={setView} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header openStaffSettings={() => setIsProfileSettingsOpen(true)} onNavigate={setView} title={getViewTitle()} />

        {/* Main padding: comfortable on desktop (p-6), tighter on mobile (p-4).
            No extra bottom padding — each view's own scrollable content area
            handles the safe-area padding to clear the floating bottom nav,
            so the main bg extends seamlessly to the bottom of the viewport
            (no visible edge above the nav bar). */}
        <main className="flex-1 overflow-hidden p-4 pb-4 md:p-6 md:pb-6 bg-page dark:bg-surface-dark flex flex-col min-h-0">
          {/* Title row — desktop only. On mobile the title lives in the header
              row (see Header.jsx), giving that "up close to the corner" feel
              instead of pushing the title 24px down into the content area. */}
          <div className="hidden md:flex justify-between items-end mb-6 gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-ink dark:text-white mb-1 md:mb-1.5 leading-none">
              {getViewTitle()}
            </h1>
            {getViewSubtitle() && (
              <p className="text-xs md:text-sm text-muted dark:text-body-dark line-clamp-2">{getViewSubtitle()}</p>
            )}
          </div>
          {(user?.role === 'admin' || user?.permissions?.canBook) && (
            <div className="hidden md:flex items-center space-x-reverse space-x-3 shrink-0">

              {view === 'apartments' && (
                <div className="bg-canvas dark:bg-surface-dark-elevated p-1.5 rounded-md border border-hairline dark:border-hairline-dark-soft flex items-center gap-2 max-w-[300px]">
                  <div className="bg-surface-card dark:bg-hairline-dark p-1.5 rounded-md text-ink dark:text-white">
                    <Share2 size={16} />
                  </div>
                  <div className="flex-1 overflow-hidden hidden md:block">
                    <p className="text-2xs text-muted dark:text-body-dark mb-0.5 truncate">رابط الحجز المباشر للعملاء</p>
                    <input
                      type="text"
                      readOnly
                      value={shareableLink}
                      className="w-full text-xs bg-transparent border-none outline-none text-body dark:text-body-dark text-left truncate"
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

              {view !== 'balances' && view !== 'maintenance' && view !== 'pricing' && view !== 'more' && (
                <button
                  onClick={() => setIsBookingByDate(true)}
                  className="btn-accent"
                >
                  <Plus size={18} />
                  <span>حجز جديد</span>
                </button>
              )}
            </div>
          )}
        </div>

          {/* Wrapping with `key={view}` forces React to remount the view
              subtree when switching tabs, which triggers the fade+slide-up
              enter animation from our custom .anim-tab keyframe. Subtle but
              gives the mobile tab-swap a native feel. Desktop looks the
              same since duration is quick and translate is tiny. */}
          <div key={view} className="flex-1 min-h-0 h-full flex flex-col anim-tab">
            {view === 'availability' && <AvailabilityView openBookingForm={handleOpenBookingForm} />}
            {view === 'requests' && <RequestsView openBookingForm={handleOpenBookingForm} />}
            {view === 'apartments' && <ApartmentsView />}
            {view === 'residents' && <ResidentsView openBookingForm={handleOpenBookingForm} />}
            {view === 'balances' && <BalancesView />}
            {view === 'maintenance' && <MaintenanceView />}
            {view === 'pricing' && <PricingView />}
            {view === 'analytics' && <AnalyticsView />}
            {view === 'settings' && <SettingsView />}
            {view === 'more' && (
              <MobileMoreMenu
                setView={setView}
                onProfileClick={() => setIsProfileSettingsOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile-only fade scrims — fixed at viewport level, aligned to
          exactly the header bottom / nav top. Both get `mobile-scrim-shield`
          so the CSS :has() rule hides them when any modal is open.
          - TOP: right below header (top-14 h-6 = 24px band). Ends at y=80.
            Content starts at y=80 too (main pt-4 + scroll pt-2 = 24px below
            header). No overlap at rest → no clipping. When scrolled,
            content moves up into the scrim and fades gracefully.
          - BOTTOM: extends from viewport bottom (bottom-0 h-28). Solid
            bottom 40%, fades up. Nav pill (z-40) sits ON TOP of scrim
            (z-30) — content flows through and disappears under the nav. */}
      <div className="md:hidden fixed top-14 inset-x-0 h-6 pointer-events-none z-30 bg-gradient-to-b from-page dark:from-surface-dark to-transparent mobile-scrim-shield" />
      <div className="md:hidden fixed bottom-0 inset-x-0 h-28 pointer-events-none z-30 bg-gradient-to-t from-page from-40% dark:from-surface-dark to-transparent mobile-scrim-shield" />

      {/* Mobile bottom nav — floating pill + separated FAB. Hidden on desktop
          (md:hidden inside the component). */}
      <MobileBottomNav
        view={view}
        setView={setView}
        onNewBooking={() => setIsBookingByDate(true)}
      />

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

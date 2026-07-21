import { CalendarDays, BellRing, Users, Menu as MenuIcon, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { computeBookingTotals } from '../../lib/paymentUtils';

/**
 * MobileBottomNav — mobile-only floating navigation.
 *
 * Pattern from the reference: a rounded-pill nav with 3-5 items plus the
 * primary action broken out as a separate floating button. 44px+ tap targets.
 *
 * We chose 4 items (Availability / Requests / Residents / More) because 9
 * sidebar tabs don't fit in a bar. Everything else lives inside "More" which
 * opens a full-page menu — the Notion pattern the video explicitly describes.
 *
 * The FAB opens the "new booking" flow (the app's primary recurring action).
 * It hides on views where "new booking" isn't the natural action (المزيد
 * itself, plus admin-only views the user can't do quick actions on).
 */
export default function MobileBottomNav({ view, setView, onNewBooking }) {
  const { user } = useAuth();
  const { bookings, maintenanceIssues } = useData();

  const pendingCount = (bookings || []).filter(b => b.status === 'pending').length;

  const canSeeBalances    = user?.role === 'admin' || user?.permissions?.canViewBalances;
  const canSeeMaintenance = user?.role === 'admin' || user?.permissions?.canViewMaintenance;

  const duesCount = canSeeBalances
    ? (bookings || []).reduce((n, b) => (computeBookingTotals(b).balanceDue > 0.01 ? n + 1 : n), 0)
    : 0;

  const urgentMaintenanceCount = canSeeMaintenance
    ? (maintenanceIssues || []).filter(i => i.status !== 'resolved' && i.severity === 'urgent').length
    : 0;

  // "More" badge aggregates the notification-worthy counts hiding in the More
  // menu — so the user still sees "something needs attention" without opening.
  const moreBadge = duesCount + urgentMaintenanceCount;

  // The three primary content tabs share the bottom bar; "more" is the 4th.
  // Any other view (analytics, settings, apartments, etc.) reached via the
  // More menu should keep "More" highlighted so the user knows where they are.
  const primaryContentTabs = ['availability', 'requests', 'residents'];
  const moreIsActive = view === 'more' || !primaryContentTabs.includes(view);

  const showFAB = primaryContentTabs.includes(view);

  return (
    <div className="md:hidden fixed bottom-4 inset-x-4 z-40 flex items-center gap-3 anim-nav">
      <div className="flex-1 flex items-center gap-1 bg-canvas/85 dark:bg-surface-dark/85 backdrop-blur-lg border border-hairline/60 dark:border-hairline-dark/60 rounded-full h-14 shadow-lift px-1">
        <TabItem
          icon={CalendarDays}
          label="التوفر"
          isActive={view === 'availability'}
          onClick={() => setView('availability')}
        />
        <TabItem
          icon={BellRing}
          label="الطلبات"
          isActive={view === 'requests'}
          onClick={() => setView('requests')}
          badge={pendingCount}
        />
        <TabItem
          icon={Users}
          label="النزلاء"
          isActive={view === 'residents'}
          onClick={() => setView('residents')}
        />
        <TabItem
          icon={MenuIcon}
          label="المزيد"
          isActive={moreIsActive}
          onClick={() => setView('more')}
          badge={moreBadge}
        />
      </div>

      {showFAB && (
        <button
          onClick={onNewBooking}
          className="w-14 h-14 shrink-0 rounded-full bg-accent text-white shadow-lift flex items-center justify-center hover:bg-accent-strong transition-colors active:scale-95"
          aria-label="حجز جديد"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

function TabItem({ icon: Icon, label, isActive, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-full transition-colors ${
        isActive
          ? 'text-ink dark:text-white'
          : 'text-muted dark:text-body-dark hover:text-ink dark:hover:text-white'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="relative">
        <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-canvas dark:border-surface-dark leading-none">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}

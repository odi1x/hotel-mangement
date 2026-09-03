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
 * The FAB is context-aware: it fires a different action depending on which
 * view is currently open, mirroring the desktop header's per-tab primary
 * button. Since MobileBottomNav is always mounted (fixed position, renders
 * on every view including ones reached via "More"), the FAB stays available
 * even when the tab itself isn't one of the 4 in the bottom bar — e.g. on
 * Cleaning, Expenses, Maintenance, Pricing, all reached via "المزيد".
 */
export default function MobileBottomNav({
  view, setView,
  onNewBooking, onNewCleaningTask, onNewExpense, onNewMaintenance, onNewPricingRule, onNewPartner,
}) {
  const { user } = useAuth();
  const { bookings, maintenanceIssues } = useData();

  const pendingCount = (bookings || []).filter(b => b.status === 'pending').length;

  const canSeeBalances    = user?.role === 'admin' || user?.permissions?.canViewBalances;
  const canSeeMaintenance = user?.role === 'admin' || user?.permissions?.canViewMaintenance;
  const canEditExpenses   = user?.role === 'admin' || user?.permissions?.canEdit;
  const canSeePricing     = user?.role === 'admin' || user?.permissions?.canViewPricing;
  const isAdmin            = user?.role === 'admin';

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
  // Any other view (analytics, settings, apartments, cleaning, expenses,
  // maintenance, pricing, etc.) reached via the More menu should keep
  // "More" highlighted so the user knows where they are.
  const primaryContentTabs = ['availability', 'requests', 'residents'];
  const moreIsActive = view === 'more' || !primaryContentTabs.includes(view);

  // Per-view FAB config — mirrors the desktop header's primary-action button
  // logic (same permission gates). booking-related tabs keep the original
  // action; other tabs reached via "More" get their own create-action.
  const fabConfig = (() => {
    if (['availability', 'requests', 'residents', 'apartments'].includes(view)) {
      return { show: true, onClick: onNewBooking, label: 'حجز جديد' };
    }
    if (view === 'cleaning' && isAdmin) {
      return { show: true, onClick: onNewCleaningTask, label: 'مهمة جديدة' };
    }
    if (view === 'expenses' && canEditExpenses) {
      return { show: true, onClick: onNewExpense, label: 'مصروف جديد' };
    }
    if (view === 'maintenance' && canSeeMaintenance) {
      return { show: true, onClick: onNewMaintenance, label: 'بلاغ جديد' };
    }
    if (view === 'pricing' && canSeePricing) {
      return { show: true, onClick: onNewPricingRule, label: 'قاعدة جديدة' };
    }
    if (view === 'partners' && isAdmin) {
      return { show: true, onClick: onNewPartner, label: 'شريك جديد' };
    }
    return { show: false, onClick: () => {}, label: '' };
  })();

  const showFAB = fabConfig.show;

  return (
    <div className="md:hidden fixed bottom-4 inset-x-4 z-40 flex items-center anim-nav mobile-nav-shield">
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

      {/* FAB always renders but morphs its size / opacity / scale based on
          whether it should show. When collapsing (view→more, or a view with
          no primary action): width shrinks from 56px to 0, right-margin
          shrinks from 12px to 0, opacity fades, scale down slightly — feels
          like the circle is "absorbed" into the pill. When expanding back:
          reverse — circle pops out of the pill's left edge as it compresses.
          Pill's flex-1 auto-fills the reclaimed space smoothly during either
          transition. iOS-quality easing (quart-out). 350ms — long enough to
          feel intentional, short enough to feel snappy. */}
      <button
        onClick={fabConfig.onClick}
        aria-label={fabConfig.label || 'إجراء'}
        aria-hidden={!showFAB}
        tabIndex={showFAB ? 0 : -1}
        className={`shrink-0 h-14 rounded-full bg-accent text-white shadow-lift flex items-center justify-center overflow-hidden transition-[width,margin,opacity,transform] duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-accent-strong active:scale-95 ${
          showFAB
            ? 'w-14 mr-3 opacity-100 scale-100'
            : 'w-0 mr-0 opacity-0 scale-75 pointer-events-none'
        }`}
      >
        <Plus size={26} strokeWidth={2.5} className="shrink-0" />
      </button>
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

import { Home, Wallet, Wrench, Tag, BarChart2, Settings, Moon, Sun, LogOut, User as UserIcon, ChevronLeft, ArrowDownCircle, Sparkles, Handshake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { computeBookingTotals } from '../../lib/paymentUtils';

/**
 * MobileMoreMenu — the "المزيد" tab from the mobile bottom nav renders this
 * full-page menu. Follows the Notion pattern the reference video describes:
 * when there are too many nav items for a bottom bar, treat "More" as a
 * whole page with the profile at top and remaining sections listed below.
 *
 * Everything is permission-gated to match the sidebar's rules.
 */
export default function MobileMoreMenu({ setView, onProfileClick }) {
  const { user, logout } = useAuth();
  const { bookings, maintenanceIssues, cleaningTasks } = useData();
  const { darkMode, toggleDarkMode } = useTheme();

  const canSeeBalances    = user?.role === 'admin' || user?.permissions?.canViewBalances;
  const canSeeMaintenance = user?.role === 'admin' || user?.permissions?.canViewMaintenance;
  const canSeePricing     = user?.role === 'admin' || user?.permissions?.canViewPricing;
  const canSeeAnalytics   = user?.role === 'admin' || user?.permissions?.canViewAnalytics;
  const canSeeSettings    = user?.role === 'admin' || user?.permissions?.canViewSettings;
  const canSeeCleaning    = user?.role === 'admin' || user?.permissions?.canClean;

  const duesCount = canSeeBalances
    ? (bookings || []).reduce((n, b) => (computeBookingTotals(b).balanceDue > 0.01 ? n + 1 : n), 0)
    : 0;

  const urgentMaintenanceCount = canSeeMaintenance
    ? (maintenanceIssues || []).filter(i => i.status !== 'resolved' && i.severity === 'urgent').length
    : 0;

  const pendingCleaningCount = canSeeCleaning
    ? (cleaningTasks || []).filter(t => t.status !== 'done').length
    : 0;

  return (
    <div className="h-full overflow-y-auto pt-2 md:pt-0 pb-32 -mx-1 px-1">
      <div className="space-y-2">
        {/* Profile card — tap opens profile settings */}
        <button
          onClick={onProfileClick}
          className="w-full card-surface p-4 flex items-center gap-3 text-right hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors"
        >
          {user?.profilePicture ? (
            <img src={user.profilePicture} className="w-14 h-14 rounded-full object-cover shrink-0" alt="" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-surface-card dark:bg-surface-dark-elevated flex items-center justify-center shrink-0">
              <UserIcon size={22} className="text-muted" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink dark:text-white text-base truncate leading-tight">{user?.name || 'مستخدم'}</p>
            <p className="text-xs text-muted dark:text-body-dark mt-0.5">{user?.role === 'admin' ? 'مدير النظام' : 'موظف'}</p>
          </div>
          <ChevronLeft size={16} className="text-muted-soft shrink-0" />
        </button>

        <SectionTitle>إدارة المنشأة</SectionTitle>
        <MenuItem icon={Home}  label="الشقق"      onClick={() => setView('apartments')} />
        {canSeeBalances && (
          <MenuItem icon={Wallet}  label="المستحقات" badge={duesCount} onClick={() => setView('balances')} />
        )}
        {canSeeAnalytics && (
          <MenuItem icon={ArrowDownCircle} label="المصروفات" onClick={() => setView('expenses')} />
        )}
        {canSeeCleaning && (
          <MenuItem icon={Sparkles} label="التنظيف" badge={pendingCleaningCount} onClick={() => setView('cleaning')} />
        )}
        {canSeeMaintenance && (
          <MenuItem icon={Wrench}  label="الصيانة"   badge={urgentMaintenanceCount} onClick={() => setView('maintenance')} />
        )}
        {canSeePricing && (
          <MenuItem icon={Tag}     label="الأسعار الموسمية" onClick={() => setView('pricing')} />
        )}
        {user?.role === 'admin' && user?.partnersRevenueSharingEnabled && (
          <MenuItem icon={Handshake} label="الشركاء والتقاسم" onClick={() => setView('partners')} />
        )}

        {(canSeeAnalytics || canSeeSettings) && <SectionTitle>التقارير والإعدادات</SectionTitle>}
        {canSeeAnalytics && (
          <MenuItem icon={BarChart2} label="التحليلات" onClick={() => setView('analytics')} />
        )}
        {canSeeSettings && (
          <MenuItem icon={Settings}  label="الإعدادات" onClick={() => setView('settings')} />
        )}

        <SectionTitle>أخرى</SectionTitle>
        <MenuItem
          icon={darkMode ? Sun : Moon}
          label={darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
          onClick={toggleDarkMode}
          hideChevron
        />
        <MenuItem
          icon={LogOut}
          label="تسجيل الخروج"
          onClick={logout}
          hideChevron
          isDestructive
        />
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <p className="eyebrow px-2 mt-6 mb-2">{children}</p>;
}

function MenuItem({ icon: Icon, label, onClick, badge, hideChevron, isDestructive }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-lg text-right transition-colors border bg-canvas dark:bg-surface-dark ${
        isDestructive
          ? 'border-hairline dark:border-hairline-dark text-muted hover:text-ink hover:bg-surface-soft dark:hover:bg-surface-dark-elevated'
          : 'border-hairline dark:border-hairline-dark hover:bg-surface-soft dark:hover:bg-surface-dark-elevated'
      }`}
    >
      <Icon
        size={20}
        strokeWidth={1.75}
        className={isDestructive ? 'text-muted shrink-0' : 'text-muted dark:text-body-dark shrink-0'}
      />
      <span className={`text-sm font-semibold flex-1 ${isDestructive ? 'text-ink dark:text-white' : 'text-ink dark:text-white'}`}>
        {label}
      </span>
      {badge > 0 && (
        <span className="badge-pill badge-solid text-xs">{badge > 99 ? '99+' : badge}</span>
      )}
      {!hideChevron && <ChevronLeft size={16} className="text-muted-soft shrink-0" />}
    </button>
  );
}

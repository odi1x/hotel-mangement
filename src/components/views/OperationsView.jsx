import { Sparkles, Wrench, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CleaningView from './CleaningView';
import MaintenanceView from './MaintenanceView';
import SegmentedControl from '../ui/SegmentedControl';
import EmptyState from '../ui/EmptyState';

/**
 * OperationsView — one nav stop for the two "back-of-house" work queues.
 *
 * Cleaning and Maintenance are the same kind of thing to the user: a list of
 * jobs on the property that need someone to pick them up. Splitting them into
 * two sidebar items made the nav longer than it needed to be and split the
 * mental model. Here they live under one view with two real tabs.
 *
 * These are genuine tabs (they swap the whole content area), so they use the
 * tier-1 segmented control — not the inline mode chips.
 */
export default function OperationsView({
  tab,
  onTabChange,
  cleaningAddTrigger = 0,
  maintenanceAddTrigger = 0,
}) {
  const { user } = useAuth();
  const canClean = user?.role === 'admin' || !!user?.permissions?.canClean;
  const canMaintenance = user?.role === 'admin' || !!user?.permissions?.canViewMaintenance;

  const tabs = [];
  if (canClean) tabs.push({ value: 'cleaning', label: 'التنظيف', icon: Sparkles });
  if (canMaintenance) tabs.push({ value: 'maintenance', label: 'الصيانة', icon: Wrench });

  const activeTab = tabs.some((t) => t.value === tab) ? tab : tabs[0]?.value;

  if (!tabs.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={ShieldAlert}
          title="لا صلاحية لعرض هذه الصفحة"
          description="يحتاج حسابك إلى صلاحية التنظيف أو الصيانة. تواصل مع المسؤول."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-center mb-4 shrink-0">
        <SegmentedControl
          options={tabs}
          value={activeTab}
          onChange={onTabChange}
          ariaLabel="التنظيف والصيانة"
          role="tablist"
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'cleaning' ? (
          <CleaningView addTrigger={cleaningAddTrigger} />
        ) : (
          <MaintenanceView addTrigger={maintenanceAddTrigger} />
        )}
      </div>
    </div>
  );
}

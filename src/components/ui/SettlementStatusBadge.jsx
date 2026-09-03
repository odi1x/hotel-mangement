import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function SettlementStatusBadge({ status }) {
  const config = {
    draft: {
      label: 'مسودة',
      icon: Clock,
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    },
    paid: {
      label: 'مدفوعة',
      icon: CheckCircle,
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    void: {
      label: 'ملغية',
      icon: XCircle,
      className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    },
  };

  const cfg = config[status] || config.draft;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 ${cfg.className}`}>
      <Icon size={11} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}
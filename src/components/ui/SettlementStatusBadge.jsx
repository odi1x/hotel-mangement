import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function SettlementStatusBadge({ status }) {
  const config = {
    draft: {
      label: 'مسودة',
      icon: Clock,
      className: 'bg-surface-soft text-muted-soft dark:bg-surface-dark-elevated dark:text-body-dark',
    },
    paid: {
      label: 'مدفوعة',
      icon: CheckCircle,
      className: 'bg-ink text-white dark:bg-white dark:text-ink',
    },
    void: {
      label: 'ملغية',
      icon: XCircle,
      className: 'bg-transparent text-muted border border-dashed border-muted-soft',
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
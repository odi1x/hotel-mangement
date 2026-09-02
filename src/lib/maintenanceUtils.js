export const MAINTENANCE_CATEGORIES = [
  { value: 'hvac',        label: 'تكييف',       icon: 'AirVent' },
  { value: 'plumbing',    label: 'سباكة',       icon: 'Droplets' },
  { value: 'electrical',  label: 'كهرباء',      icon: 'Zap' },
  { value: 'furniture',   label: 'أثاث',        icon: 'Armchair' },
  { value: 'appliances',  label: 'أجهزة',       icon: 'Refrigerator' },
  { value: 'deep_clean',  label: 'تنظيف عميق',  icon: 'SprayCan' },
  { value: 'other',       label: 'أخرى',        icon: 'Wrench' }
];

export const SEVERITIES = [
  { value: 'urgent',      label: 'عاجل' },
  { value: 'normal',      label: 'عادي' },
  { value: 'improvement', label: 'تحسين' }
];

export const STATUSES = [
  { value: 'open',        label: 'مفتوح' },
  { value: 'in_progress', label: 'قيد المعالجة' },
  { value: 'resolved',    label: 'منجَز' }
];

export const categoryLabel = (v) => MAINTENANCE_CATEGORIES.find(c => c.value === v)?.label || v;
export const severityLabel = (v) => SEVERITIES.find(s => s.value === v)?.label || v;
export const statusLabel = (v) => STATUSES.find(s => s.value === v)?.label || v;

// Days between reportedAt and now (or resolvedAt), floored at 0.
export const daysOpen = (issue) => {
  const start = new Date(issue.reportedAt);
  const end = issue.resolvedAt ? new Date(issue.resolvedAt) : new Date();
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
};

// Human-friendly Arabic pluralization for days count
export const daysOpenLabel = (n) => {
  if (n === 0) return 'اليوم';
  if (n === 1) return 'منذ يوم';
  if (n === 2) return 'منذ يومين';
  if (n < 11) return `منذ ${n} أيام`;
  return `منذ ${n} يوماً`;
};

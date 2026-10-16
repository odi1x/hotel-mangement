// Filter definitions + helpers for the residents/tenants view. Kept out of the
// component file so it only exports a component (react-refresh rule).

export const STATUS_OPTIONS = [
  { value: 'all',       label: 'الكل' },
  { value: 'current',   label: 'مقيم حالياً' },
  { value: 'upcoming',  label: 'قادم' },
  { value: 'departed',  label: 'مغادر' },
  { value: 'early',     label: 'خروج مبكر' },
  { value: 'cancelled', label: 'ملغى' },
  { value: 'pending',   label: 'طلب معلّق' },
];

export const PAYMENT_OPTIONS = [
  { value: 'all',     label: 'الكل' },
  { value: 'paid',    label: 'مسدَّد' },
  { value: 'partial', label: 'سداد جزئي' },
  { value: 'due',     label: 'غير مسدَّد' },
];

// Human-readable active filters, rendered as removable chips above the list.
export function describeFilters(filters, apartments = [], showPayment = false) {
  const chips = [];
  if (filters.status !== 'all') {
    const opt = STATUS_OPTIONS.find(o => o.value === filters.status);
    if (opt) chips.push({ key: 'status', label: opt.label });
  }
  if (filters.apartmentId !== 'all') {
    const apt = apartments.find(a => a.id === filters.apartmentId);
    chips.push({ key: 'apartmentId', label: apt?.name || 'وحدة' });
  }
  if (showPayment && filters.payment !== 'all') {
    const opt = PAYMENT_OPTIONS.find(o => o.value === filters.payment);
    if (opt) chips.push({ key: 'payment', label: opt.label });
  }
  return chips;
}

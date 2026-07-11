/**
 * Payment math for a booking.
 *
 * Rules:
 *   totalDue      = booking.totalPrice OR (pricePerNight * nights) as fallback
 *   totalReceived = sum of all payments.amount (refunds are stored negative,
 *                   so this handles them naturally)
 *   balanceDue    = totalDue - totalReceived, floored at 0 for overpayment
 *
 * Status derivation:
 *   - "paid"    → balance = 0 AND at least one payment recorded
 *   - "partial" → some received, some outstanding
 *   - "unpaid"  → nothing recorded yet
 *   - "overpaid" → received > due (rare, but explicit is safer than silent)
 */

const nightsBetween = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.abs(e - s);
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
};

export function computeBookingTotals(booking) {
  if (!booking) {
    return { totalDue: 0, totalReceived: 0, balanceDue: 0, status: 'unpaid' };
  }

  const nights = nightsBetween(booking.startDate, booking.endDate);
  const totalDue = booking.totalPrice != null
    ? Number(booking.totalPrice)
    : Number(booking.pricePerNight) * nights;

  const payments = Array.isArray(booking.payments) ? booking.payments : [];
  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  let status;
  if (totalReceived === 0) status = 'unpaid';
  else if (totalReceived >= totalDue - 0.01) status = totalReceived > totalDue + 0.01 ? 'overpaid' : 'paid';
  else status = 'partial';

  const balanceDue = Math.max(0, totalDue - totalReceived);

  return { totalDue, totalReceived, balanceDue, status, nights };
}

// Localised label + amount formatter — kept here so ledger, badges, print
// and dues list all speak the same language.
export function formatSAR(amount) {
  const n = Number(amount || 0);
  // Use Arabic-Indic locale if the app is displaying Arabic; keep numerals
  // Western for clarity in financial contexts (matches existing app style).
  return n.toLocaleString('en-US', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
}

export const PAYMENT_METHODS = [
  { value: 'cash',          label: 'نقداً' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'stc_pay',       label: 'STC Pay' },
  { value: 'mada',          label: 'مدى' }
];

export const PAYMENT_TYPES = [
  { value: 'payment', label: 'دفعة' },
  { value: 'deposit', label: 'عربون' },
  { value: 'refund',  label: 'استرداد' }
];

export const methodLabel = (v) => PAYMENT_METHODS.find(m => m.value === v)?.label || v;
export const typeLabel   = (v) => PAYMENT_TYPES.find(t => t.value === v)?.label || v;

export const statusLabel = (s) => ({
  paid:     'مسدَّد بالكامل',
  partial:  'سداد جزئي',
  unpaid:   'لم يُسدَّد',
  overpaid: 'دفع زائد'
}[s] || s);

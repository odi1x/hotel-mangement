import { Check, Minus, CircleDollarSign } from 'lucide-react';
import { statusLabel } from '../../lib/paymentUtils';

/**
 * Payment status pill.
 *
 * Encoded by TREATMENT (matching the app's existing badge system) plus an
 * accent tint where the accent is semantically money:
 *
 *   paid     → accent-soft fill, accent-strong text, check glyph
 *   partial  → transparent, dashed accent border, accent-strong text
 *   unpaid   → surface-soft ghost, muted text, minus glyph
 *   overpaid → accent-strong fill, white text (rare, but flagged clearly)
 */
export default function PaymentStatusBadge({ status, size = 'sm' }) {
  const base = 'inline-flex items-center gap-1.5 font-semibold rounded-full';
  const dim = size === 'sm'
    ? 'text-[11px] px-2.5 py-0.5'
    : 'text-xs px-3 py-1';

  const variants = {
    paid: {
      cls: 'bg-accent-soft text-accent-strong',
      icon: <Check size={size === 'sm' ? 12 : 14} strokeWidth={2.75} />
    },
    partial: {
      cls: 'bg-transparent text-accent-strong border border-dashed border-accent/60 dark:border-accent/50',
      icon: <CircleDollarSign size={size === 'sm' ? 12 : 14} strokeWidth={2.25} />
    },
    unpaid: {
      cls: 'bg-surface-soft text-muted dark:bg-surface-dark-elevated dark:text-[#a1a1aa]',
      icon: <Minus size={size === 'sm' ? 12 : 14} strokeWidth={2.5} />
    },
    overpaid: {
      cls: 'bg-accent-strong text-white',
      icon: <Check size={size === 'sm' ? 12 : 14} strokeWidth={2.75} />
    }
  };

  const v = variants[status] || variants.unpaid;

  return (
    <span className={`${base} ${dim} ${v.cls}`}>
      {v.icon}
      <span>{statusLabel(status)}</span>
    </span>
  );
}

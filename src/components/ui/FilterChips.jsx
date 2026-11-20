import { Check } from 'lucide-react';

/**
 * FilterChips — the app's filter control.
 *
 * A filter narrows the list you are already looking at; a tab takes you
 * somewhere else. Chips deliberately carry no capsule track for that
 * reason: the track is what makes a segmented control read as a tab bar,
 * and a page of filters that looks like a page of tabs is the exact
 * confusion this app was suffering from.
 *
 * The active chip fills with ink, the same selection language as an
 * active segment — so the two controls feel like one system without
 * sharing a silhouette.
 *
 * Styling lives in `src/index.css` (`.chip`, `.chip-active`, `.chip-sm`).
 */

/**
 * A single chip.
 *
 * @param {boolean} active
 * @param {() => void} onClick
 * @param {string} label
 * @param {React.ComponentType} [icon] — shown when the chip is inactive
 * @param {number} [count] — a trailing count, e.g. "غير المقروءة (7)"
 */
export function FilterChip({ active, onClick, label, icon: Icon, count, size = 'md' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip ${active ? 'chip-active' : ''} ${size === 'sm' ? 'chip-sm' : ''}`}
    >
      {active ? <Check size={14} className="shrink-0" /> : Icon && <Icon size={14} className="shrink-0" />}
      <span className="whitespace-nowrap">{label}</span>
      {count != null && (
        <span className="text-2xs tabular-nums opacity-70">{count}</span>
      )}
    </button>
  );
}

/**
 * A row of filter chips.
 *
 * @param {Array<{ value: string, label: string, icon?: React.ComponentType, count?: number }>} options
 * @param {string} value — the selected option's `value`
 * @param {(value: string) => void} onChange
 * @param {string} ariaLabel — accessible name for the group
 * @param {string} [label] — an eyebrow rendered above the row
 * @param {'sm' | 'md'} [size]
 * @param {string} [className] — extra classes on the row
 */
export default function FilterChips({
  options,
  value,
  onChange,
  ariaLabel,
  label,
  size = 'md',
  className = '',
}) {
  const row = (
    <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <FilterChip
          key={option.value}
          active={option.value === value}
          onClick={() => onChange(option.value)}
          label={option.label}
          icon={option.icon}
          count={option.count}
          size={size}
        />
      ))}
    </div>
  );

  if (!label) return row;

  return (
    <div>
      <p className="eyebrow mb-2.5">{label}</p>
      {row}
    </div>
  );
}

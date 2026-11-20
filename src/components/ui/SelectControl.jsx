import { ChevronDown } from 'lucide-react';

/**
 * SelectControl — a single-value parameter on the current page.
 *
 * Ranges (هذا الشهر / الربع / السنة) and sorts (الأقرب مغادرة / الأكبر
 * مبلغاً) are inputs, not destinations. They used to wear the segmented
 * control's capsule track, which made a page of parameters look like a
 * page of tabs. A dressed native <select> says "this is a field", gets
 * the OS picker on phones for free, and keeps full keyboard semantics
 * without a dependency.
 *
 * Styling lives in `src/index.css` (`.select-control`).
 *
 * @param {Array<{ value: string, label: string }>} options
 * @param {string} value
 * @param {(value: string) => void} onChange
 * @param {string} ariaLabel — accessible name for the select
 * @param {React.ComponentType} [icon] — a leading glyph, e.g. a sort arrow
 * @param {'sm' | 'md'} [size]
 * @param {string} [className] — extra classes on the wrapper
 */
export default function SelectControl({
  options,
  value,
  onChange,
  ariaLabel,
  icon: Icon,
  size = 'md',
  className = '',
}) {
  return (
    <div className={`select-control ${size === 'sm' ? 'select-control-sm' : ''} ${className}`}>
      {Icon && <Icon size={15} className="shrink-0 text-muted dark:text-body-dark" aria-hidden="true" />}
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="shrink-0 text-muted dark:text-body-dark pointer-events-none -ms-1" aria-hidden="true" />
    </div>
  );
}

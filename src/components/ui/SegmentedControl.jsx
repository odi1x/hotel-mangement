import { useRef } from 'react';

/**
 * SegmentedControl — the app's single "pick one of these" control.
 *
 * A soft capsule track holds mutually exclusive segments; the active one
 * fills with ink and flips to white text. Every button-options group in
 * Rent Flow (Today/Upcoming, notification filters, period pickers, sort
 * toggles, settings tabs) renders through this so the whole product reads
 * as one system instead of a dozen near-misses.
 *
 * The track and segment styling live in `src/index.css` (`.seg-group`,
 * `.seg-item`, `.seg-item-active`) — this component only owns layout,
 * accessibility and the optional icon / badge.
 *
 * @param {Array<{ value: string, label: string, icon?: React.ComponentType, badge?: number }>} options
 * @param {string} value — the currently selected option's `value`
 * @param {(value: string) => void} onChange
 * @param {string} ariaLabel — accessible name for the group
 * @param {'tablist' | 'radiogroup'} role
 * @param {string} className — extra classes for the track
 * @param {string} itemClassName — extra classes applied to every segment
 */
export default function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  role = 'tablist',
  className = '',
  itemClassName = '',
}) {
  const groupRef = useRef(null);

  const handleKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;

    const currentIndex = options.findIndex((option) => option.value === value);
    if (currentIndex === -1) return;

    // RTL: ArrowRight moves toward the previous option.
    const isRtl = groupRef.current?.closest('[dir="rtl"]');
    const forward = isRtl ? event.key === 'ArrowLeft' : event.key === 'ArrowRight';
    const nextIndex = forward
      ? (currentIndex + 1) % options.length
      : (currentIndex - 1 + options.length) % options.length;

    event.preventDefault();
    onChange(options[nextIndex].value);

    const nextButton = groupRef.current?.querySelectorAll('[role="tab"], [role="radio"]')[nextIndex];
    nextButton?.focus();
  };

  return (
    <div
      ref={groupRef}
      className={`seg-group ${className}`}
      role={role}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role={role === 'radiogroup' ? 'radio' : 'tab'}
            aria-checked={role === 'radiogroup' ? isActive : undefined}
            aria-selected={role === 'radiogroup' ? undefined : isActive}
            onClick={() => onChange(option.value)}
            className={`seg-item ${isActive ? 'seg-item-active' : ''} ${itemClassName}`}
          >
            {Icon && <Icon size={15} strokeWidth={isActive ? 2.2 : 1.9} aria-hidden="true" />}
            <span className="whitespace-nowrap">{option.label}</span>
            {option.badge > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold tabular-nums leading-none"
                aria-label={`${option.badge} غير مقروء`}
              >
                {option.badge > 9 ? '9+' : option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

import { useRef } from 'react';

/**
 * SegmentedControl — the app's tier-1 / tier-2 "pick one of these" control.
 *
 * A soft capsule track holds mutually exclusive segments; the active one
 * fills with ink and flips to white text. Used for two things:
 *
 *   size="md"  — a TAB BAR. Switching to a different panel of content
 *                (Today/Upcoming/Notifications, Settings sections). The
 *                track's weight says "you are somewhere else".
 *   size="sm"  — an INLINE MODE SWITCH. Same data, different shape
 *                (week/month view, compensation type). Sits in a toolbar
 *                row next to a title, never centred on its own.
 *
 * Filters, ranges, sorts and pagers deliberately do NOT use this — they
 * are parameters on the page, and a capsule track around them reads as a
 * tab bar. They use FilterChips, SelectControl and Pager instead.
 *
 * The track and segment styling live in `src/index.css` (`.seg-group`,
 * `.seg-item`, `.seg-item-active`) — this component only owns layout,
 * accessibility and the optional icon / badge.
 *
 * @param {Array<{ value: string, label: string, shortLabel?: string, icon?: React.ComponentType, badge?: number, disabled?: boolean }>} options
 * @param {string} value — the currently selected option's `value`
 * @param {(value: string) => void} onChange
 * @param {string} ariaLabel — accessible name for the group
 * @param {'tablist' | 'radiogroup'} role
 * @param {'sm' | 'md'} [size]
 * @param {string} className — extra classes for the track
 * @param {string} itemClassName — extra classes applied to every segment
 */
export default function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  role = 'tablist',
  size = 'md',
  className = '',
  itemClassName = '',
}) {
  const groupRef = useRef(null);

  const handleKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;

    const currentIndex = options.findIndex((option) => option.value === value);
    if (currentIndex === -1) return;

    // Skip over disabled options so the arrow keys never land on one.
    const enabledIndexes = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index !== -1);
    if (enabledIndexes.length === 0) return;

    const positionInEnabled = enabledIndexes.indexOf(currentIndex);
    const start = positionInEnabled === -1 ? 0 : positionInEnabled;

    // RTL: ArrowRight moves toward the previous option.
    const isRtl = groupRef.current?.closest('[dir="rtl"]');
    const forward = isRtl ? event.key === 'ArrowLeft' : event.key === 'ArrowRight';
    const nextPosition = forward
      ? (start + 1) % enabledIndexes.length
      : (start - 1 + enabledIndexes.length) % enabledIndexes.length;
    const nextIndex = enabledIndexes[nextPosition];

    event.preventDefault();
    onChange(options[nextIndex].value);

    const nextButton = groupRef.current?.querySelectorAll('[role="tab"], [role="radio"]')[nextIndex];
    nextButton?.focus();
  };

  return (
    <div
      ref={groupRef}
      className={`seg-group ${size === 'sm' ? 'seg-group-sm' : ''} ${className}`}
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
            disabled={option.disabled}
            aria-disabled={option.disabled || undefined}
            className={`seg-item ${isActive ? 'seg-item-active' : ''} ${itemClassName} ${option.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {Icon && <Icon size={15} strokeWidth={isActive ? 2.2 : 1.9} aria-hidden="true" />}
            {option.shortLabel ? (
              <>
                <span className="md:hidden whitespace-nowrap">{option.shortLabel}</span>
                <span className="hidden md:inline whitespace-nowrap">{option.label}</span>
              </>
            ) : (
              <span className="whitespace-nowrap">{option.label}</span>
            )}
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

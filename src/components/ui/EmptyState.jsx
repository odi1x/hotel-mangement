import { Fragment } from 'react';

/**
 * EmptyState — a shared, consistent placeholder used when a list/grid/table
 * has no content to render.
 *
 * The pattern (icon on a rounded soft-accent surface + heading + supporting
 * subtext, optional CTA) is what RequestsView used and it works everywhere.
 * Extracted here so every empty state across the app shares one voice.
 *
 * Variants:
 *   variant="soft"   → for peaceful "no work to do" states (default)
 *   variant="dashed" → for "you haven't done anything yet" states with a
 *                       dashed border around the whole block
 *
 * Usage:
 *   <EmptyState
 *     icon={Wallet}
 *     title="لا توجد مستحقات معلّقة"
 *     subtitle="جميع الحجوزات مسدَّدة بالكامل. عمل ممتاز."
 *   />
 *
 *   <EmptyState
 *     icon={Building2}
 *     title="لا توجد وحدات"
 *     subtitle="ابدأ بإضافة أول وحدة سكنية."
 *     variant="dashed"
 *     action={<button onClick={openAdd} className="btn-accent h-10 px-5">
 *       <Plus size={16} /><span>إضافة وحدة</span>
 *     </button>}
 *   />
 */
export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  variant = 'soft',
  action,
  className = '',
}) {
  const wrapperCls = variant === 'dashed'
    ? 'text-center py-16 px-6 bg-canvas dark:bg-surface-dark rounded-xl border border-dashed border-hairline dark:border-hairline-dark-soft'
    : 'text-center py-16 px-6';

  return (
    <div className={`${wrapperCls} ${className}`}>
      {Icon && (
        <div className="mx-auto h-14 w-14 rounded-full bg-surface-soft dark:bg-surface-dark-elevated flex items-center justify-center mb-4">
          <Icon size={22} className="text-muted dark:text-body-dark" strokeWidth={1.75} />
        </div>
      )}
      {title && (
        <p className="text-base font-semibold text-ink dark:text-white mb-1">
          {title}
        </p>
      )}
      {subtitle && (
        <p className="text-sm text-muted dark:text-body-dark max-w-sm mx-auto">
          {subtitle}
        </p>
      )}
      {action && (
        <div className="mt-6 inline-flex">
          <Fragment>{action}</Fragment>
        </div>
      )}
    </div>
  );
}

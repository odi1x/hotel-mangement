import { AREAS, areaMeta } from '../../lib/cleaningAreas';

/**
 * CleaningAreaPicker — the area grid + per-area note fields.
 *
 * Both the task editor (CleaningView) and the template editor
 * (CleaningTemplates) let an admin pick which areas need cleaning and add a
 * note to each. The markup was duplicated in both places, so a change to the
 * grid had to be made twice and the two drifted. This is the single copy.
 */
export default function CleaningAreaPicker({ checklist, onToggle, onNoteChange }) {
  const isSelected = (area) => checklist.some((x) => x.area === area);

  return (
    <>
      <div className="grid grid-cols-4 gap-1.5 md:gap-2 mb-3">
        {AREAS.map((a) => {
          const selected = isSelected(a.value);
          const A = a.Icon;
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => onToggle(a.value)}
              aria-pressed={selected}
              className={`flex flex-col items-center justify-center gap-1 md:gap-1.5 p-1.5 md:p-2.5 min-h-16 rounded-lg border-2 transition-all active:scale-[0.97] ${
                selected
                  ? 'border-accent bg-accent/10 text-accent-strong'
                  : 'border-hairline dark:border-hairline-dark-soft text-muted hover:text-ink dark:hover:text-white'
              }`}
            >
              <A size={20} />
              <span className="text-[10px] md:text-2xs font-semibold text-center leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>

      {checklist.length > 0 && (
        <div className="space-y-2 mb-3">
          {checklist.map((item) => {
            const meta = areaMeta(item.area);
            const A = meta.Icon;
            if (meta.noNote) {
              return (
                <div key={item.area} className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-soft dark:bg-surface-dark-elevated/50 text-xs">
                  <A size={14} className="text-accent-strong shrink-0" />
                  <span className="font-semibold text-ink dark:text-white">{meta.label}</span>
                  <span className="text-2xs text-muted-soft">(بدون تعليق)</span>
                </div>
              );
            }
            return (
              <div key={item.area} className="p-2.5 rounded-lg bg-surface-soft dark:bg-surface-dark-elevated/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <A size={14} className="text-accent-strong shrink-0" />
                  <span className="font-semibold text-xs text-ink dark:text-white">{meta.label}</span>
                </div>
                <input
                  type="text"
                  placeholder="ملاحظة (اختياري)"
                  value={item.note || ''}
                  onChange={(e) => onNoteChange(item.area, e.target.value)}
                  className="input-field h-8 text-xs w-full"
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

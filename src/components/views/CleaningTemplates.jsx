import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, X, Pencil, Trash2, CheckCircle2, ListChecks, Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import EmptyState from '../ui/EmptyState';
import { AREAS, areaMeta } from '../../lib/cleaningAreas';

/*
 * Admin-configured cleaning routines with one active default.
 *
 * The default template is copied automatically into every cleaning task
 * that's created after a check-out (and on backfill), so staff see the
 * standard routine with zero extra setup. Tasks that DO NOT come from the
 * default template keep their origin empty and are shown as "custom" in the
 * Cleaning tab — the exception stands out, the routine stays calm.
 *
 * Exactly one default per account: marking a template as default clears the
 * flag from the previous one on the server.
 *
 * Renders inside the Cleaning tab: a persistent left panel on desktop, and a
 * bottom sheet on mobile (compact hides the page-style headline since the
 * sheet provides its own header with a close button).
 */
export default function CleaningTemplates({ compact = false }) {
  const {
    cleaningTemplates,
    createCleaningTemplate,
    updateCleaningTemplate,
    deleteCleaningTemplate,
  } = useData();

  const [editor, setEditor] = useState(null);      // { template } or null
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Default first, then alphabetical.
  const sorted = [...(cleaningTemplates || [])].sort(
    (a, b) => (b.isDefault - a.isDefault) || a.name.localeCompare(b.name, 'ar')
  );
  const hasDefault = sorted.some(t => t.isDefault);

  const handleSubmit = async (data, templateId) => {
    if (templateId) await updateCleaningTemplate(templateId, data);
    else await createCleaningTemplate(data);
    setEditor(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {compact ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted dark:text-body-dark leading-relaxed min-w-0">
            القالب الافتراضي يُطبَّق تلقائياً على كل مهمة تنظيف بعد مغادرة الضيف.
          </p>
          <button
            onClick={() => setEditor({})}
            className="btn-primary h-9 px-4 text-xs shrink-0"
          >
            <Plus size={13} /> قالب جديد
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow mb-1">إعدادات التنظيف</p>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink dark:text-white">قوالب التنظيف</h3>
              {hasDefault && (
                <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent-strong">
                  <CheckCircle2 size={11} />
                  افتراضي
                </span>
              )}
            </div>
            <p className="text-xs text-muted dark:text-body-dark mt-1">
              القالب الافتراضي يُطبَّق تلقائياً على كل مهمة تنظيف بعد مغادرة الضيف.
            </p>
          </div>
          <button
            onClick={() => setEditor({})}
            className="btn-primary h-9 px-4 text-xs"
          >
            <Plus size={13} /> قالب جديد
          </button>
        </div>
      )}

      {/* No-default hint: without a default, auto tasks arrive empty */}
      {!hasDefault && (cleaningTemplates || []).length > 0 && (
        <div className="p-3 rounded-lg bg-surface-card dark:bg-surface-dark-elevated border border-hairline dark:border-hairline-dark-soft text-xs text-muted dark:text-body-dark">
          لا يوجد قالب افتراضي حالياً — المهام التي تُنشأ تلقائياً بعد المغادرة
          ستصل بدون قائمة. عدّل أي قالب وعيّنه كافتراضي.
        </div>
      )}

      {/* Template cards */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="لا قوالب بعد"
          description="أنشئ قالباً ثم عيّنه كافتراضي ليُطبَّق تلقائياً بعد كل مغادرة."
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map(tpl => {
            const items = (tpl.checklist || []).map(c => {
              const meta = areaMeta(c.area);
              return { ...c, meta };
            });
            return (
              <li
                key={tpl.id}
                className={`rounded-lg border p-4 flex items-start gap-3 transition-colors ${
                  tpl.isDefault
                    ? 'border-accent bg-accent/5 dark:bg-accent/10'
                    : 'border-hairline dark:border-hairline-dark-soft bg-canvas dark:bg-surface-dark'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  tpl.isDefault
                    ? 'bg-accent text-white'
                    : 'bg-surface-card text-muted dark:bg-surface-dark-elevated dark:text-body-dark'
                }`}>
                  {tpl.isDefault ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm text-ink dark:text-white">{tpl.name}</h4>
                    {tpl.isDefault && (
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent-strong">
                        افتراضي
                      </span>
                    )}
                    <span className="text-2xs text-muted-soft">{(tpl.checklist || []).length} مناطق</span>
                  </div>

                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {items.map(c => {
                        const A = c.meta.Icon;
                        return (
                          <span
                            key={c.area}
                            className="inline-flex items-center gap-1 text-2xs px-2 py-1 rounded-md bg-surface-soft dark:bg-surface-dark-elevated/50 text-muted dark:text-body-dark"
                          >
                            <A size={10} className="shrink-0" />
                            {c.meta.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {tpl.notes && (
                    <p className="text-2xs text-muted-soft mt-2 truncate">{tpl.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditor({ template: tpl })}
                    className="icon-action h-8 w-8"
                    title="تعديل القالب"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(tpl)}
                    className="icon-action h-8 w-8 text-accent-strong"
                    title="حذف القالب"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Editor modal */}
      {editor && createPortal(
        <TemplateEditorModal
          template={editor.template || null}
          onClose={() => setEditor(null)}
          onSubmit={handleSubmit}
        />,
        document.body
      )}

      {/* Delete confirm */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" data-modal-active>
          <div className="absolute inset-0" onClick={() => setConfirmDelete(null)}></div>
          <div className="relative bg-canvas dark:bg-surface-dark-elevated rounded-xl border border-hairline dark:border-hairline-dark-soft shadow-soft w-full max-w-sm p-5">
            <h3 className="font-semibold text-ink dark:text-white mb-2">حذف القالب؟</h3>
            <p className="text-sm text-muted dark:text-body-dark mb-4">
              {confirmDelete.isDefault
                ? 'سيُزال هذا القالب الافتراضي. المهام المنشأة سابقاً لن تتأثر.'
                : 'لا يمكن التراجع عن هذا الإجراء.'}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost h-9 px-4 text-xs">إلغاء</button>
              <button
                onClick={async () => {
                  await deleteCleaningTemplate(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="h-9 px-4 rounded-md bg-accent-strong text-white text-xs font-semibold"
              >
                حذف
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ---------------- Template editor modal ---------------- */

function TemplateEditorModal({ template, onClose, onSubmit }) {
  const [name, setName] = useState(template?.name || '');
  const [checklist, setChecklist] = useState(
    (template?.checklist || []).map(c => ({ area: c.area, note: c.note ?? '', checked: false }))
  );
  const [notes, setNotes] = useState(template?.notes || '');
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [saving, setSaving] = useState(false);

  const isSelected = (area) => checklist.some(x => x.area === area);

  const toggleArea = (area) => {
    if (isSelected(area)) {
      setChecklist(prev => prev.filter(x => x.area !== area));
    } else {
      const meta = areaMeta(area);
      setChecklist(prev => [...prev, { area, note: meta.noNote ? null : '', checked: false }]);
    }
  };

  const setAreaNote = (area, note) => {
    setChecklist(prev => prev.map(x => x.area === area ? { ...x, note } : x));
  };

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit(
        { name: name.trim(), checklist, notes: notes.trim() || null, isDefault },
        template?.id
      );
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" data-modal-active>
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-canvas dark:bg-surface-dark-elevated rounded-t-2xl md:rounded-xl border border-hairline dark:border-hairline-dark-soft shadow-soft w-full max-w-lg max-h-[92vh] md:max-h-[90vh] overflow-hidden flex flex-col anim-sheet">
        {/* Grab handle on mobile */}
        <div className="md:hidden pt-2 flex justify-center shrink-0">
          <div className="w-9 h-1 rounded-full bg-hairline dark:bg-hairline-dark" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-hairline dark:border-hairline-dark shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-muted shrink-0" />
              <h3 className="font-semibold text-ink dark:text-white">
                {template ? 'تعديل القالب' : 'قالب تنظيف جديد'}
              </h3>
            </div>
            <p className="text-2xs text-muted-soft mt-1">
              القائمة التي سيحصل عليها عامل التنظيف بعد كل مغادرة.
            </p>
          </div>
          <button onClick={onClose} className="icon-action h-8 w-8"><X size={14} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {/* Name + default toggle */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">اسم القالب</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: تنظيف قياسي بعد المغادرة"
                className="input-field h-9 text-xs w-full"
              />
            </div>
            <label
              className={`shrink-0 flex items-center gap-2 h-9 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors select-none ${
                isDefault
                  ? 'border-accent bg-accent/10 text-accent-strong'
                  : 'border-hairline dark:border-hairline-dark-soft text-muted dark:text-body-dark hover:text-ink dark:hover:text-white'
              }`}
            >
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="hidden"
              />
              <CheckCircle2 size={14} />
              افتراضي
            </label>
          </div>

          {/* Areas grid */}
          <div>
            <p className="text-xs font-semibold text-muted dark:text-body-dark uppercase tracking-widest border-b border-hairline-soft dark:border-hairline-dark pb-2 mb-3">
              ما يحتاج تنظيف
            </p>
            <div className="grid grid-cols-4 gap-1.5 md:gap-2 mb-3">
              {AREAS.map(a => {
                const selected = isSelected(a.value);
                const A = a.Icon;
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => toggleArea(a.value)}
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
                {checklist.map(item => {
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
                        onChange={(e) => setAreaNote(item.area, e.target.value)}
                        className="input-field h-8 text-xs w-full"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Template-level notes */}
          <div>
            <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">تعليمات إضافية للعامل</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input-field text-xs w-full resize-none"
              placeholder="مثال: انتبه لملء المستلزمات والتأكد من عمل التكييف..."
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-3 md:p-4 border-t border-hairline dark:border-hairline-dark shrink-0 flex items-center gap-2"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button onClick={onClose} className="btn-ghost h-10 px-4 text-xs">إلغاء</button>
          <button
            onClick={submit}
            disabled={!name.trim() || saving}
            className="btn-primary h-10 flex-1 text-sm disabled:opacity-50"
          >
            {isDefault ? <CheckCircle2 size={15} /> : <Sparkles size={15} />}
            {template ? 'حفظ التعديلات' : (isDefault ? 'إنشاء كافتراضي' : 'إنشاء القالب')}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Sparkles, ShowerHead, ChefHat, Bed, Sofa, DoorOpen, Package,
  MoreHorizontal, Check, X, Trash2, AlertTriangle, Building2, ArrowLeft, Clock, Calendar,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../ui/EmptyState';

// Fixed vocabulary — must match CLEANING_AREAS in api/admin-resources.js.
// The "general" area is a marker with no note (design decision).
const AREAS = [
  { value: 'bathroom',    label: 'الحمام',            Icon: ShowerHead },
  { value: 'kitchen',     label: 'المطبخ',            Icon: ChefHat },
  { value: 'bedroom',     label: 'غرفة النوم',        Icon: Bed },
  { value: 'living_room', label: 'الصالة',            Icon: Sofa },
  { value: 'entrance',    label: 'المدخل',            Icon: DoorOpen },
  { value: 'supplies',    label: 'تجديد المستلزمات',  Icon: Package },
  { value: 'general',     label: 'تنظيف عام',         Icon: Sparkles, noNote: true },
  { value: 'other',       label: 'أخرى',              Icon: MoreHorizontal },
];

const areaMeta = (value) => AREAS.find(a => a.value === value) || AREAS[AREAS.length - 1];

// Human-friendly relative-date label. Used for the urgency chip.
function urgencyBadge(task) {
  if (!task.dueBy) return null;
  const now = new Date();
  const due = new Date(task.dueBy);
  const hoursLeft = Math.round((due - now) / (1000 * 60 * 60));
  if (hoursLeft < 0) return { label: 'متأخر', tone: 'danger' };
  if (hoursLeft < 24) return { label: `${hoursLeft} ساعة`, tone: 'warn' };
  const days = Math.ceil(hoursLeft / 24);
  return { label: `${days} يوم`, tone: 'neutral' };
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

export default function CleaningView({ addTrigger = 0 }) {
  const { cleaningTasks, apartments, createCleaningTask, updateCleaningTask, deleteCleaningTask } = useData();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const canClean = isAdmin || !!user?.permissions?.canClean;

  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'done' | 'all'
  const [openTask, setOpenTask] = useState(null);              // task object being viewed
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  // React to Layout's "New Task" button. The counter increments on each
  // click; we open the add modal only when the incoming number DIFFERS from
  // the last-seen value. This avoids spurious opens if the view unmounts
  // and remounts while addTrigger is already >0 (which happens whenever
  // the user has clicked the button in a previous session).
  const lastAddTrigger = useRef(addTrigger);
  useEffect(() => {
    if (addTrigger !== lastAddTrigger.current) {
      lastAddTrigger.current = addTrigger;
      if (isAdmin) setShowAddModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addTrigger]);

  // Filter + sort. Pending first, urgency-sorted (dueBy soonest first);
  // completed today stay visible; older completed hidden by default.
  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return (cleaningTasks || [])
      .filter(t => {
        if (statusFilter === 'pending') {
          return t.status !== 'done';
        }
        if (statusFilter === 'done') {
          return t.status === 'done';
        }
        return true; // 'all'
      })
      .filter(t => {
        // In pending view, also show tasks completed today (recently-done).
        if (statusFilter === 'pending' && t.status === 'done') {
          return t.completedAt && new Date(t.completedAt) >= startOfToday;
        }
        return true;
      })
      .filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          t.apartment?.name?.toLowerCase().includes(s) ||
          t.notes?.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => {
        // Pending before done.
        if ((a.status === 'done') !== (b.status === 'done')) {
          return a.status === 'done' ? 1 : -1;
        }
        // Urgency: dueBy soonest first (nulls last).
        if (a.dueBy && b.dueBy) return new Date(a.dueBy) - new Date(b.dueBy);
        if (a.dueBy) return -1;
        if (b.dueBy) return 1;
        return new Date(b.scheduledFor) - new Date(a.scheduledFor);
      });
  }, [cleaningTasks, statusFilter, search]);

  const pendingCount = (cleaningTasks || []).filter(t => t.status !== 'done').length;

  if (!canClean) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={AlertTriangle}
          title="لا صلاحية لعرض هذه الصفحة"
          description="يحتاج حسابك إلى صلاحية التنظيف. تواصل مع المسؤول."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Hero counter */}
      <div className="card-surface p-4 md:p-5 mb-4 shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow mb-1.5">تحتاج تنظيف</p>
            <p
              className="text-3xl md:text-4xl font-bold tracking-tight text-ink dark:text-white leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {pendingCount}
              <span className="text-base md:text-lg font-medium text-muted dark:text-body-dark mr-1.5">وحدة</span>
            </p>
            <p className="text-xs text-muted-soft mt-2">
              {pendingCount === 0 ? 'كل الوحدات نظيفة، عمل ممتاز.' : 'تظهر أولاً حسب الأقرب موعد استقبال ضيف قادم.'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter chips + search */}
      <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
        <div className="nav-pill-group shrink-0">
          {[
            { id: 'pending', label: 'قيد التنفيذ' },
            { id: 'done',    label: 'المكتمل' },
            { id: 'all',     label: 'الكل' },
          ].map(o => (
            <button
              key={o.id}
              onClick={() => setStatusFilter(o.id)}
              className={`nav-pill text-xs ${statusFilter === o.id ? 'nav-pill-active' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft" />
          <input
            type="text"
            placeholder="ابحث في الوحدات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field h-9 pr-9 text-xs w-full"
          />
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={statusFilter === 'pending' ? 'لا مهام تنظيف حالياً' : 'لا مهام في هذا العرض'}
            description={statusFilter === 'pending'
              ? 'ستظهر هنا تلقائياً بعد كل مغادرة، أو أضف مهمة جديدة يدوياً.'
              : 'جرّب تغيير التصفية أو البحث.'}
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map(task => <TaskRow key={task.id} task={task} onOpen={setOpenTask} />)}
          </ul>
        )}
      </div>

      {/* Task detail modal */}
      {openTask && createPortal(
        <TaskDetailModal
          task={openTask}
          onClose={() => setOpenTask(null)}
          isAdmin={isAdmin}
          onUpdate={async (patch) => {
            await updateCleaningTask(openTask.id, patch);
            // Close the modal after any main-button action (save OR complete).
            // Staying open after save was creating confusion — the user
            // couldn't tell whether the button was "save" or "finish" from
            // the still-open state. Always closing removes that ambiguity.
            setOpenTask(null);
          }}
          onDelete={() => { setConfirmDeleteId(openTask.id); setOpenTask(null); }}
        />,
        document.body
      )}

      {/* Add task modal */}
      {showAddModal && isAdmin && createPortal(
        <AddTaskModal
          apartments={apartments}
          onClose={() => setShowAddModal(false)}
          onSubmit={async (data) => { await createCleaningTask(data); setShowAddModal(false); }}
        />,
        document.body
      )}

      {/* Delete confirm */}
      {confirmDeleteId && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" data-modal-active>
          <div className="absolute inset-0" onClick={() => setConfirmDeleteId(null)}></div>
          <div className="relative bg-canvas dark:bg-surface-dark-elevated rounded-xl border border-hairline dark:border-hairline-dark-soft shadow-soft w-full max-w-sm p-5">
            <h3 className="font-semibold text-ink dark:text-white mb-2">حذف المهمة؟</h3>
            <p className="text-sm text-muted dark:text-body-dark mb-4">لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-ghost h-9 px-4 text-xs">إلغاء</button>
              <button
                onClick={async () => { await deleteCleaningTask(confirmDeleteId); setConfirmDeleteId(null); }}
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

/* ---------------- Task row ---------------- */

function TaskRow({ task, onOpen }) {
  const urgency = urgencyBadge(task);
  const isDone = task.status === 'done';
  const checkedCount = (task.checklist || []).filter(x => x.checked).length;
  const totalCount = (task.checklist || []).length;

  return (
    <li>
      <button
        onClick={() => onOpen(task)}
        className="w-full text-right flex items-center gap-3 p-3 rounded-lg border border-hairline dark:border-hairline-dark-soft bg-canvas dark:bg-surface-dark hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isDone ? 'bg-accent text-white' : 'bg-surface-card text-muted dark:bg-surface-dark-elevated dark:text-body-dark'
        }`}>
          {isDone ? <Check size={18} /> : <Sparkles size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-ink dark:text-white truncate">{task.apartment?.name || 'وحدة'}</p>
            {totalCount > 0 && !isDone && (
              <span className="text-2xs text-muted-soft shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {checkedCount}/{totalCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-2xs text-muted-soft">
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(task.scheduledFor)}
            </span>
            {task.bookingId && (
              <span className="inline-flex items-center gap-1">
                <ArrowLeft size={11} />
                بعد حجز
              </span>
            )}
            {isDone && task.completer?.name && (
              <span className="inline-flex items-center gap-1">
                <Check size={11} />
                {task.completer.name}
              </span>
            )}
          </div>
        </div>
        {urgency && !isDone && (
          <span className={`text-2xs font-semibold px-2 py-1 rounded-full shrink-0 ${
            urgency.tone === 'danger' ? 'bg-accent-strong/10 text-accent-strong' :
            urgency.tone === 'warn'   ? 'bg-ink/10 text-ink dark:bg-white/10 dark:text-white' :
            'bg-muted-soft/10 text-muted-soft'
          }`}>
            {urgency.tone === 'danger' && <AlertTriangle size={11} className="inline mr-0.5" />}
            {urgency.label}
          </span>
        )}
      </button>
    </li>
  );
}

/* ---------------- Task detail modal ---------------- */

function TaskDetailModal({ task, onClose, onUpdate, onDelete, isAdmin }) {
  const isDone = task.status === 'done';
  const [checklist, setChecklist] = useState(task.checklist || []);
  const [cleanerNotes, setCleanerNotes] = useState(task.cleanerNotes || '');
  // Grid expanded by default for admin — was collapsed which meant admin
  // had to tap to open it every time. Users always want to see the grid
  // when they open a task; collapse toggle stays available if they want.
  const [gridExpanded, setGridExpanded] = useState(true);

  // Dirty tracking: has the admin changed the checklist STRUCTURE (areas
  // added/removed OR notes edited) since the last save? Excludes .checked
  // toggles — those are cleaner actions, not admin edits, and shouldn't
  // flip the button from "Finish" back to "Save".
  //
  // Compares local checklist against task.checklist (the server-known state).
  // After a successful save, parent updates the task prop → task.checklist
  // catches up → isDirty resets to false naturally.
  const structureOf = (list) => (list || [])
    .map(x => `${x.area}:${x.note || ''}`)
    .sort()
    .join('|');
  const isDirty = structureOf(checklist) !== structureOf(task.checklist || []);

  // Map area value → current entry in checklist (for lookup)
  const bySlot = useMemo(() => {
    const m = new Map();
    for (const item of checklist) m.set(item.area, item);
    return m;
  }, [checklist]);

  const isSelected = (area) => bySlot.has(area);
  const noteFor    = (area) => bySlot.get(area)?.note || '';

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

  const toggleCheck = (area) => {
    setChecklist(prev => prev.map(x => x.area === area ? { ...x, checked: !x.checked } : x));
  };

  const checkedCount = checklist.filter(x => x.checked).length;
  const totalCount = checklist.length;

  const saveChecklistEdits = async () => {
    await onUpdate({ checklist });
    onClose();
  };

  // Finish: mark task done. One click, closes immediately.
  const complete = async () => {
    await onUpdate({ action: 'complete', checklist, cleanerNotes });
  };

  // Main button behavior — one big context-aware button.
  //   Staff always sees Finish (they can't edit the checklist structure).
  //   Admin sees Save when the checklist has unsaved changes, else Finish.
  const primaryAction = (isAdmin && isDirty) ? 'save' : 'complete';
  const primaryLabel = primaryAction === 'save'
    ? 'حفظ المهام'
    : (totalCount === 0 ? 'تم الانتهاء' : `إنهاء (${checkedCount}/${totalCount})`);
  const onPrimary = primaryAction === 'save' ? saveChecklistEdits : complete;

  return (
    <div className="fixed inset-0 z-[105] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" data-modal-active>
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-canvas dark:bg-surface-dark-elevated rounded-t-2xl md:rounded-xl border border-hairline dark:border-hairline-dark-soft shadow-soft w-full max-w-xl md:max-h-[90vh] overflow-hidden flex flex-col anim-dropdown">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-hairline dark:border-hairline-dark shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={16} className="text-muted shrink-0" />
              <h3 className="font-semibold text-ink dark:text-white truncate">{task.apartment?.name || 'وحدة'}</h3>
            </div>
            <div className="flex items-center gap-3 text-2xs text-muted-soft">
              <span className="inline-flex items-center gap-1">
                <Calendar size={11} /> جدولة: {formatDate(task.scheduledFor)}
              </span>
              {task.dueBy && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} /> موعد الضيف: {formatDate(task.dueBy)}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="icon-action h-8 w-8"><X size={14} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Admin section — grid of areas (admin only) */}
          {isAdmin && !isDone && (
            <section>
              <button
                type="button"
                onClick={() => setGridExpanded(v => !v)}
                className="w-full flex items-center justify-between text-xs font-semibold text-muted dark:text-body-dark uppercase tracking-widest border-b border-hairline-soft dark:border-hairline-dark pb-2 mb-3"
              >
                <span>ما يحتاج تنظيف إضافي</span>
                <span className={`transition-transform ${gridExpanded ? 'rotate-90' : ''}`}>‹</span>
              </button>
              {gridExpanded && (
                <div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {AREAS.map(a => {
                      const selected = isSelected(a.value);
                      const A = a.Icon;
                      return (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => toggleArea(a.value)}
                          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 transition-all ${
                            selected
                              ? 'border-accent bg-accent/10 text-accent-strong'
                              : 'border-hairline dark:border-hairline-dark-soft text-muted hover:text-ink dark:hover:text-white'
                          }`}
                        >
                          <A size={20} />
                          <span className="text-2xs font-semibold text-center leading-tight">{a.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected areas with note fields */}
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
                              value={noteFor(item.area)}
                              onChange={(e) => setAreaNote(item.area, e.target.value)}
                              className="input-field h-8 text-xs w-full"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Cleaner section — checklist to tick through */}
          {!isDone && checklist.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-muted dark:text-body-dark uppercase tracking-widest border-b border-hairline-soft dark:border-hairline-dark pb-2 mb-3">
                قائمة المهام {isAdmin ? '(معاينة)' : ''}
              </p>
              <ul className="space-y-2">
                {checklist.map(item => {
                  const meta = areaMeta(item.area);
                  const A = meta.Icon;
                  return (
                    <li key={item.area}>
                      <button
                        type="button"
                        onClick={() => toggleCheck(item.area)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border text-right transition-colors ${
                          item.checked
                            ? 'border-accent bg-accent/5'
                            : 'border-hairline dark:border-hairline-dark-soft'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          item.checked ? 'border-accent bg-accent text-white' : 'border-muted-soft'
                        }`}>
                          {item.checked && <Check size={12} />}
                        </div>
                        <A size={14} className="text-muted mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${item.checked ? 'line-through text-muted' : 'text-ink dark:text-white'}`}>
                            {meta.label}
                          </p>
                          {item.note && !meta.noNote && (
                            <p className={`text-2xs mt-0.5 ${item.checked ? 'line-through text-muted-soft' : 'text-muted-soft'}`}>
                              {item.note}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Notes */}
          {!isDone && (
            <section>
              <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">ملاحظات</label>
              <textarea
                value={cleanerNotes}
                onChange={(e) => setCleanerNotes(e.target.value)}
                placeholder="أي شيء تريد إضافته..."
                rows={2}
                className="input-field text-xs w-full resize-none"
              />
            </section>
          )}

          {/* Done view — read-only summary */}
          {isDone && (
            <section className="text-xs text-muted-soft space-y-2">
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 flex items-center gap-2 text-accent-strong">
                <Check size={14} />
                <span className="font-semibold">مكتملة{task.completer?.name ? ` بواسطة ${task.completer.name}` : ''}</span>
                <span className="ml-auto">{formatDate(task.completedAt)}</span>
              </div>
              {task.cleanerNotes && <p className="text-ink dark:text-white text-sm">{task.cleanerNotes}</p>}
              {task.checklist?.length > 0 && (
                <ul className="space-y-1">
                  {task.checklist.map(item => {
                    const meta = areaMeta(item.area);
                    return (
                      <li key={item.area} className="flex items-center gap-2">
                        {item.checked ? <Check size={12} className="text-accent" /> : <X size={12} className="text-muted-soft" />}
                        <span className={item.checked ? '' : 'line-through'}>{meta.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        {!isDone && (
          <div className="p-4 border-t border-hairline dark:border-hairline-dark shrink-0 flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={onDelete}
                className="icon-action h-9 w-9 text-accent-strong"
                title="حذف المهمة"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={onPrimary}
              className="btn-primary h-10 flex-1 text-sm"
            >
              <Check size={15} />
              {primaryLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Add manual task modal ---------------- */

function AddTaskModal({ apartments, onClose, onSubmit }) {
  const [apartmentId, setApartmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!apartmentId || submitting) return;
    setSubmitting(true);
    try { await onSubmit({ apartmentId, notes }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4" data-modal-active>
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-canvas dark:bg-surface-dark-elevated rounded-t-2xl md:rounded-xl border border-hairline dark:border-hairline-dark-soft shadow-soft w-full max-w-md p-5 anim-dropdown">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-ink dark:text-white">مهمة تنظيف جديدة</h3>
          <button onClick={onClose} className="icon-action h-8 w-8"><X size={14} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">الوحدة</label>
            <select
              value={apartmentId}
              onChange={(e) => setApartmentId(e.target.value)}
              className="input-field text-sm w-full"
            >
              <option value="">اختر وحدة</option>
              {apartments.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input-field text-xs w-full resize-none"
              placeholder="سبب المهمة، تعليمات عامة..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="btn-ghost h-9 px-4 text-xs">إلغاء</button>
          <button
            onClick={submit}
            disabled={!apartmentId || submitting}
            className="btn-primary h-9 px-4 text-xs disabled:opacity-50"
          >
            <Plus size={13} /> إنشاء
          </button>
        </div>
      </div>
    </div>
  );
}

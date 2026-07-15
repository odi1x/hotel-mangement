import { useState, useMemo } from 'react';
import { X, TagsIcon, CalendarDays } from 'lucide-react';
import { useData } from '../../context/DataContext';
import DatePickerCal from './DatePickerCal';
import {
  PRICE_MODES,
  RULE_COLORS,
  DAYS_OF_WEEK,
  WEEKEND_DAYS,
  WORKWEEK_DAYS,
  PRIORITY_LEVELS,
  priorityLevel
} from '../../lib/pricingUtils';

// Turn a Date or ISO string into a 'YYYY-MM-DD' string (what DatePickerCal expects)
const toYmd = (d) => {
  if (!d) return null;
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

/**
 * Create-or-edit form for a pricing rule.
 *
 * Uses the app's DatePickerCal for range selection instead of the browser's
 * default date input. Priority is exposed as three buckets (low/normal/high)
 * mapped to 25/50/75 rather than a raw 0–100 number. A day-of-week filter
 * lets a rule fire only on specific weekdays — the way you'd model a "weekend
 * surcharge" or a "workweek discount".
 */
export default function PricingRuleForm({ onClose, initialData }) {
  const { apartments, addPricingRule, updatePricingRule, pricingRules } = useData();
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState({
    id:          initialData?.id          || null,
    label:       initialData?.label       || '',
    startDate:   toYmd(initialData?.startDate) || null,
    endDate:     toYmd(initialData?.endDate)   || null,
    priceMode:   initialData?.priceMode   || 'multiplier',
    value:       initialData?.value       != null ? String(initialData.value) : '1.5',
    priority:    initialData?.priority    != null ? initialData.priority : 50,
    color:       initialData?.color       || RULE_COLORS[0].value,
    apartmentId: initialData?.apartmentId || '',
    daysOfWeek:  Array.isArray(initialData?.daysOfWeek) ? [...initialData.daysOfWeek] : []
  });
  const [submitting, setSubmitting] = useState(false);

  const eyebrow = 'block text-[11px] font-semibold text-body dark:text-[#a1a1aa] mb-1.5 uppercase tracking-wider';

  const previewApartment = useMemo(() => {
    if (form.apartmentId) return apartments.find(a => a.id === form.apartmentId);
    return apartments[0];
  }, [form.apartmentId, apartments]);

  const previewPrice = useMemo(() => {
    if (!previewApartment || !form.value) return null;
    const v = parseFloat(form.value);
    if (Number.isNaN(v)) return null;
    if (form.priceMode === 'fixed') return v;
    return Number(previewApartment.basePrice) * v;
  }, [form.priceMode, form.value, previewApartment]);

  // Detect overlap conflicts: is there another rule targeting the same scope,
  // with overlapping dates AND overlapping days of week? If yes, priority
  // matters and we should surface that clearly. Runs in real time as the user
  // edits, so they see conflicts before they save.
  const overlapConflicts = useMemo(() => {
    if (!form.startDate || !form.endDate) return [];
    const myStart = new Date(form.startDate).getTime();
    const myEnd = new Date(form.endDate).getTime();
    const myDays = form.daysOfWeek.length === 0 ? [0,1,2,3,4,5,6] : form.daysOfWeek;

    return pricingRules.filter(r => {
      if (r.id === form.id) return false; // don't compare against self
      // Scope overlap: both target same apartment, or one is global
      const scopeOverlap = !r.apartmentId || !form.apartmentId || r.apartmentId === form.apartmentId;
      if (!scopeOverlap) return false;
      // Date overlap
      const rStart = new Date(r.startDate).getTime();
      const rEnd = new Date(r.endDate).getTime();
      if (rEnd < myStart || rStart > myEnd) return false;
      // Day-of-week overlap
      const rDays = !r.daysOfWeek || r.daysOfWeek.length === 0 ? [0,1,2,3,4,5,6] : r.daysOfWeek;
      const daysOverlap = myDays.some(d => rDays.includes(d));
      return daysOverlap;
    });
  }, [form.startDate, form.endDate, form.daysOfWeek, form.apartmentId, form.id, pricingRules]);

  const toggleDay = (d) => {
    setForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(d)
        ? prev.daysOfWeek.filter(x => x !== d)
        : [...prev.daysOfWeek, d].sort((a, b) => a - b)
    }));
  };

  const dayScopeSummary = form.daysOfWeek.length === 0
    ? 'كل الأيام (بلا حصر)'
    : form.daysOfWeek.length === 7
      ? 'كل الأيام'
      : form.daysOfWeek.slice().sort((a, b) => a - b).map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label).filter(Boolean).join('، ');

  const currentPriorityLevel = priorityLevel(form.priority);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label || !form.startDate || !form.endDate || !form.value) return;
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (isEdit) {
        await updatePricingRule(payload);
      } else {
        await addPricingRule(payload);
      }
      onClose();
    } catch { /* toast handled */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-2xl overflow-hidden border border-hairline dark:border-[#2e2e2e] flex flex-col max-h-[92vh]">

        <div className="px-6 py-4 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md" style={{ backgroundColor: `${form.color}22`, color: form.color }}>
              <TagsIcon size={18} />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight text-ink dark:text-white text-lg leading-tight">
                {isEdit ? 'تعديل قاعدة سعرية' : 'قاعدة سعرية جديدة'}
              </h3>
              <p className="text-xs text-muted dark:text-[#a1a1aa] mt-0.5">
                حدّد فترة موسمية أو نمط أسبوعي وسعرها الخاص
              </p>
            </div>
          </div>
          <button onClick={onClose} className="icon-action hover:text-accent">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5">

          <div>
            <label className={eyebrow}>اسم القاعدة</label>
            <input
              required
              type="text"
              className="input-field"
              placeholder="مثال: موسم الحج ١٤٤٧ / رمز نهاية الأسبوع"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>

          {/* Date range — using DatePickerCal (same as booking form) */}
          <div>
            <label className={eyebrow}>الفترة</label>
            <div className="border border-hairline dark:border-[#2e2e2e] rounded-md p-3 bg-canvas dark:bg-surface-dark-elevated">
              <DatePickerCal
                value={{ startDate: form.startDate, endDate: form.endDate }}
                onChange={(v) => setForm({ ...form, startDate: v.startDate, endDate: v.endDate })}
              />
            </div>
            <p className="text-[10px] text-muted-soft mt-1">
              للأنماط الأسبوعية (مثل عطلة نهاية الأسبوع)، اختر فترة طويلة تصل لسنة كاملة.
            </p>
          </div>

          {/* Day of week — a NEW section that makes weekend/workweek rules possible */}
          <div>
            <label className={eyebrow}>أيام تطبيق القاعدة</label>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <button
                type="button"
                onClick={() => setForm({ ...form, daysOfWeek: [] })}
                className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-colors ${
                  form.daysOfWeek.length === 0
                    ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
                    : 'text-muted border-hairline hover:text-ink dark:text-[#a1a1aa] dark:border-[#2e2e2e]'
                }`}
              >
                كل الأيام
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, daysOfWeek: [...WEEKEND_DAYS] })}
                className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-colors ${
                  form.daysOfWeek.length === 2 && WEEKEND_DAYS.every(d => form.daysOfWeek.includes(d))
                    ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
                    : 'text-muted border-hairline hover:text-ink dark:text-[#a1a1aa] dark:border-[#2e2e2e]'
                }`}
              >
                عطلة نهاية الأسبوع (الجمعة + السبت)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, daysOfWeek: [...WORKWEEK_DAYS] })}
                className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-colors ${
                  form.daysOfWeek.length === 5 && WORKWEEK_DAYS.every(d => form.daysOfWeek.includes(d))
                    ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
                    : 'text-muted border-hairline hover:text-ink dark:text-[#a1a1aa] dark:border-[#2e2e2e]'
                }`}
              >
                أيام العمل (الأحد – الخميس)
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map(d => {
                const on = form.daysOfWeek.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`h-9 rounded-md text-xs font-semibold transition-colors border ${
                      on
                        ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
                        : 'bg-canvas text-muted border-hairline hover:text-ink dark:bg-surface-dark-elevated dark:text-[#a1a1aa] dark:border-[#2e2e2e]'
                    }`}
                  >
                    {d.shortLabel}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-soft mt-1.5">
              {dayScopeSummary}
              {form.daysOfWeek.length === 0 && ' — القاعدة تسري على كل يوم ضمن الفترة'}
            </p>
          </div>

          <div>
            <label className={eyebrow}>نطاق التطبيق</label>
            <select
              className="input-field"
              value={form.apartmentId}
              onChange={(e) => setForm({ ...form, apartmentId: e.target.value })}
            >
              <option value="">كل الوحدات</option>
              {apartments.map(a => (
                <option key={a.id} value={a.id}>{a.name} (السعر الأساسي: {a.basePrice} ر.س)</option>
              ))}
            </select>
          </div>

          <div>
            <label className={eyebrow}>نوع التسعير</label>
            <div className="grid grid-cols-2 gap-2">
              {PRICE_MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm({ ...form, priceMode: m.value, value: m.value === 'multiplier' ? '1.5' : '500' })}
                  className={`p-3 rounded-md text-right transition-colors border ${
                    form.priceMode === m.value
                      ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
                      : 'bg-canvas text-body border-hairline hover:border-muted dark:bg-surface-dark-elevated dark:text-[#a1a1aa] dark:border-[#2e2e2e]'
                  }`}
                >
                  <div className="text-sm font-semibold mb-0.5">{m.label}</div>
                  <div className={`text-[10px] ${form.priceMode === m.value ? 'opacity-80' : 'text-muted-soft'}`}>{m.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={eyebrow}>
              {form.priceMode === 'multiplier' ? 'المضاعف' : 'السعر (ر.س / ليلة)'}
            </label>
            <input
              required
              type="number"
              step={form.priceMode === 'multiplier' ? '0.1' : '1'}
              min="0"
              className="input-field font-semibold"
              placeholder={form.priceMode === 'multiplier' ? '1.5' : '500'}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>

          {/* Priority — the OLD version was a 0-100 number field, which no one
              understood. Three buttons is much clearer. */}
          <div>
            <label className={eyebrow}>الأهمية عند التداخل</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_LEVELS.map(p => {
                const active = currentPriorityLevel === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p.value })}
                    className={`p-3 rounded-md text-center transition-colors border ${
                      active
                        ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
                        : 'bg-canvas text-body border-hairline hover:border-muted dark:bg-surface-dark-elevated dark:text-[#a1a1aa] dark:border-[#2e2e2e]'
                    }`}
                  >
                    <div className="text-sm font-semibold mb-0.5">{p.label}</div>
                    <div className={`text-[10px] ${active ? 'opacity-80' : 'text-muted-soft'}`}>{p.hint}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-soft mt-1.5">
              عند تداخل قاعدتين على نفس اليوم، تُطبَّق القاعدة الأعلى أهمية.
            </p>
          </div>

          {/* Overlap conflict warning — only shows when there ARE overlaps */}
          {overlapConflicts.length > 0 && (
            <div className="border border-dashed border-accent/60 bg-accent-soft rounded-md p-3">
              <p className="text-[11px] font-semibold text-accent-strong mb-1">
                تتداخل هذه القاعدة مع {overlapConflicts.length} {overlapConflicts.length === 1 ? 'قاعدة أخرى' : 'قواعد أخرى'}:
              </p>
              <ul className="text-[11px] text-body dark:text-[#a1a1aa] space-y-0.5">
                {overlapConflicts.slice(0, 4).map(r => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: r.color }}></span>
                      <span className="truncate">{r.label}</span>
                    </span>
                    <span className="text-muted-soft shrink-0">أهمية: {PRIORITY_LEVELS.find(p => p.value === priorityLevel(r.priority))?.label}</span>
                  </li>
                ))}
                {overlapConflicts.length > 4 && (
                  <li className="text-muted-soft">... و {overlapConflicts.length - 4} أخرى</li>
                )}
              </ul>
              <p className="text-[10px] text-muted-soft mt-1.5">
                ضع أهميتها الأعلى لتسبق، أو الأقل لتتراجع أمامها.
              </p>
            </div>
          )}

          <div>
            <label className={eyebrow}>لون التمييز</label>
            <div className="flex items-center gap-2 flex-wrap">
              {RULE_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={`h-8 w-8 rounded-full transition-all ${
                    form.color === c.value ? 'ring-2 ring-offset-2 ring-ink dark:ring-white dark:ring-offset-surface-dark' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Live preview */}
          {previewApartment && previewPrice != null && form.startDate && form.endDate && (
            <div
              className="border rounded-md p-4"
              style={{ borderColor: `${form.color}55`, backgroundColor: `${form.color}0c` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={13} style={{ color: form.color }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: form.color }}>
                  معاينة
                </span>
              </div>
              <p className="text-sm text-body dark:text-[#a1a1aa] leading-relaxed">
                خلال هذه الفترة (و{form.daysOfWeek.length === 0 ? 'كل الأيام' : dayScopeSummary})، سعر الليلة على {form.apartmentId ? previewApartment.name : 'كل الوحدات (بمثال)'} سيكون{' '}
                <span className="font-black text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {previewPrice} ر.س
                </span>
                {form.priceMode === 'multiplier' && (
                  <span className="text-muted-soft"> (بدلاً من {previewApartment.basePrice} ر.س)</span>
                )}
              </p>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-hairline-soft dark:border-[#242424] flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary h-10 px-5">
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.label || !form.startDate || !form.endDate || !form.value}
            className="btn-accent h-10 px-6"
          >
            {submitting ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'إنشاء القاعدة'}
          </button>
        </div>
      </div>
    </div>
  );
}

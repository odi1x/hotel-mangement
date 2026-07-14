import { useState, useMemo } from 'react';
import { X, TagsIcon, CalendarDays } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { PRICE_MODES, RULE_COLORS } from '../../lib/pricingUtils';

const isoDate = (d) => {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
};

/**
 * Create-or-edit form for a pricing rule.
 *
 * The signature detail: a live "preview strip" at the bottom shows what one
 * night would cost for the currently-selected scope, using either the current
 * base price or a picked apartment's base price. Turns abstract numbers into
 * concrete money before you hit save.
 */
export default function PricingRuleForm({ onClose, initialData }) {
  const { apartments, addPricingRule, updatePricingRule } = useData();
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState({
    id:          initialData?.id          || null,
    label:       initialData?.label       || '',
    startDate:   isoDate(initialData?.startDate) || '',
    endDate:     isoDate(initialData?.endDate)   || '',
    priceMode:   initialData?.priceMode   || 'multiplier',
    value:       initialData?.value       != null ? String(initialData.value) : '1.5',
    priority:    initialData?.priority    != null ? initialData.priority : 50,
    color:       initialData?.color       || RULE_COLORS[0].value,
    apartmentId: initialData?.apartmentId || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const eyebrow = 'block text-[11px] font-semibold text-body dark:text-[#a1a1aa] mb-1.5 uppercase tracking-wider';

  // Preview: what one night would cost with these settings
  const previewApartment = useMemo(() => {
    if (form.apartmentId) return apartments.find(a => a.id === form.apartmentId);
    return apartments[0]; // any unit for preview when the rule is global
  }, [form.apartmentId, apartments]);

  const previewPrice = useMemo(() => {
    if (!previewApartment || !form.value) return null;
    const v = parseFloat(form.value);
    if (Number.isNaN(v)) return null;
    if (form.priceMode === 'fixed') return v;
    return Number(previewApartment.basePrice) * v;
  }, [form.priceMode, form.value, previewApartment]);

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
                حدّد فترة موسمية وسعرها الخاص
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
              placeholder="مثال: موسم الحج ١٤٤٧"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={eyebrow}>من تاريخ</label>
              <input
                required
                type="date"
                className="input-field"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className={eyebrow}>إلى تاريخ</label>
              <input
                required
                type="date"
                className="input-field"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
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
            <p className="text-[10px] text-muted-soft mt-1">
              قواعد الوحدة المحددة تتفوّق على القواعد العامة عند تساوي الأولوية
            </p>
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

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className={eyebrow}>الأولوية (0–100)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input-field font-semibold"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              />
              <p className="text-[10px] text-muted-soft mt-1">القيمة الأعلى تفوز عند التداخل</p>
            </div>
          </div>

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
                خلال هذه الفترة، سعر الليلة على {form.apartmentId ? previewApartment.name : 'كل الوحدات (بمثال)'} سيكون{' '}
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

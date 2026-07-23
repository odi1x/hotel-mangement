import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet, Repeat } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { EXPENSE_CATEGORIES, EXPENSE_SCOPES, RECURRING_PERIODS } from '../../lib/expenseUtils';

/**
 * Create-or-edit form for expense records.
 *
 * Deliberately compact — expenses get added often, so anything that isn't
 * strictly required for a single row lives behind the "تفاصيل إضافية"
 * toggle (vendor, notes, receipt, scope specifics). Keeps first-time-use
 * fast and doesn't intimidate.
 */
export default function ExpenseForm({ onClose, initialData }) {
  const { apartments, createExpense, updateExpense } = useData();
  const editing = !!initialData?.id;

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: initialData?.title || '',
    amount: initialData?.amount ?? '',
    date: initialData?.date ? new Date(initialData.date).toISOString().slice(0, 10) : today,
    category: initialData?.category || 'other',
    scope: initialData?.scope || 'global',
    branch: initialData?.branch || '',
    apartmentId: initialData?.apartmentId || '',
    vendor: initialData?.vendor || '',
    notes: initialData?.notes || '',
    isRecurring: initialData?.isRecurring || false,
    recurringPeriod: initialData?.recurringPeriod || 'monthly',
  });

  const [showAdvanced, setShowAdvanced] = useState(
    !!(initialData?.vendor || initialData?.notes || initialData?.branch)
  );
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const isSubmittable = form.title.trim() && Number(form.amount) > 0 && form.date;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSubmittable || saving) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        amount: Number(form.amount),
        date: form.date,
        category: form.category,
        scope: form.scope,
        branch: form.scope === 'branch' ? (form.branch || null) : null,
        apartmentId: form.scope === 'unit' ? (form.apartmentId || null) : null,
        vendor: form.vendor.trim() || null,
        notes: form.notes.trim() || null,
        isRecurring: form.isRecurring,
        recurringPeriod: form.isRecurring ? form.recurringPeriod : null,
      };
      if (editing) {
        await updateExpense({ id: initialData.id, ...payload });
      } else {
        await createExpense(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4"
      data-modal-active
      dir="rtl"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl anim-sheet shadow-soft w-full max-w-lg overflow-hidden border border-hairline dark:border-hairline-dark-soft flex flex-col max-h-[92vh]">
        <div className="sheet-handle" />

        <div className="px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark-soft flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-surface-soft dark:bg-surface-dark-elevated text-ink dark:text-white flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold tracking-tight text-ink dark:text-white leading-tight text-base">
              {editing ? 'تعديل المصروف' : 'مصروف جديد'}
            </h2>
            <p className="text-xs text-muted dark:text-body-dark mt-0.5">
              سجّل مبلغاً خرج من العمل
            </p>
          </div>
          <button onClick={onClose} className="icon-action shrink-0" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-4 md:p-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block eyebrow mb-1.5">البند</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="مثال: إيجار الفرع الرئيسي — أغسطس"
              className="input-field w-full"
              required
              autoFocus
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block eyebrow mb-1.5">المبلغ (ر.س)</label>
              <input
                type="number"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="input-field w-full text-ink dark:text-white font-semibold"
                style={{ fontVariantNumeric: 'tabular-nums' }}
                required
              />
            </div>
            <div>
              <label className="block eyebrow mb-1.5">التاريخ</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          {/* Category + Scope */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block eyebrow mb-1.5">التصنيف</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="input-field w-full"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block eyebrow mb-1.5">النطاق</label>
              <select
                value={form.scope}
                onChange={(e) => update('scope', e.target.value)}
                className="input-field w-full"
              >
                {EXPENSE_SCOPES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scope-conditional field */}
          {form.scope === 'unit' && (
            <div>
              <label className="block eyebrow mb-1.5">الوحدة</label>
              <select
                value={form.apartmentId}
                onChange={(e) => update('apartmentId', e.target.value)}
                className="input-field w-full"
                required
              >
                <option value="">اختر الوحدة...</option>
                {apartments.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {form.scope === 'branch' && (
            <div>
              <label className="block eyebrow mb-1.5">اسم الفرع</label>
              <input
                type="text"
                value={form.branch}
                onChange={(e) => update('branch', e.target.value)}
                placeholder="مثال: فرع النزهة"
                className="input-field w-full"
              />
            </div>
          )}

          {/* Recurring toggle */}
          <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-hairline dark:border-hairline-dark-soft cursor-pointer hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <Repeat size={16} className="text-muted dark:text-body-dark shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink dark:text-white leading-tight">مصروف متكرر</p>
                <p className="text-2xs text-muted dark:text-body-dark mt-0.5">
                  سيتم تسجيله تلقائياً كل {form.recurringPeriod === 'yearly' ? 'سنة' : 'شهر'}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) => update('isRecurring', e.target.checked)}
              className="w-5 h-5 shrink-0 accent-ink dark:accent-white"
            />
          </label>

          {form.isRecurring && (
            <div>
              <label className="block eyebrow mb-1.5">دورة التكرار</label>
              <select
                value={form.recurringPeriod}
                onChange={(e) => update('recurringPeriod', e.target.value)}
                className="input-field w-full"
              >
                {RECURRING_PERIODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Advanced disclosure */}
          <button
            type="button"
            onClick={() => setShowAdvanced(s => !s)}
            className="text-xs font-semibold text-muted dark:text-body-dark hover:text-ink dark:hover:text-white transition-colors"
          >
            {showAdvanced ? '− تفاصيل إضافية' : '+ تفاصيل إضافية (المورّد، ملاحظات)'}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block eyebrow mb-1.5">المورّد (اختياري)</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={(e) => update('vendor', e.target.value)}
                  placeholder="اسم الشركة أو الشخص"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block eyebrow mb-1.5">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  rows={3}
                  placeholder="أي تفاصيل إضافية..."
                  className="input-field w-full resize-none"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark-soft flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary h-11 px-5"
          >
            إلغاء
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!isSubmittable || saving}
            className="btn-primary flex-1 h-11 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المصروف'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

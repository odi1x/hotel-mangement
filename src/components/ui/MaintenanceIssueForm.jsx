import { useState } from 'react';
import { X, Wrench, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { MAINTENANCE_CATEGORIES, SEVERITIES, STATUSES } from '../../lib/maintenanceUtils';

/**
 * Create-or-edit form for maintenance issues.
 * Pass `initialData` to open in edit mode.
 */
export default function MaintenanceIssueForm({ onClose, initialData }) {
  const { apartments, addMaintenanceIssue, updateMaintenanceIssue } = useData();
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState({
    id:          initialData?.id          || null,
    apartmentId: initialData?.apartmentId || '',
    title:       initialData?.title       || '',
    description: initialData?.description || '',
    category:    initialData?.category    || 'other',
    severity:    initialData?.severity    || 'normal',
    status:      initialData?.status      || 'open',
    cost:        initialData?.cost        != null ? String(initialData.cost) : '',
    contractor:  initialData?.contractor  || '',
    notes:       initialData?.notes       || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const eyebrow = 'block text-[11px] font-semibold text-body dark:text-[#a1a1aa] mb-1.5 uppercase tracking-wider';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.apartmentId || !form.title) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateMaintenanceIssue(form);
      } else {
        await addMaintenanceIssue(form);
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
            <div className="p-2 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
              <Wrench size={18} className="text-ink dark:text-white" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight text-ink dark:text-white text-lg leading-tight">
                {isEdit ? 'تعديل البلاغ' : 'بلاغ صيانة جديد'}
              </h3>
              <p className="text-xs text-muted dark:text-[#a1a1aa] mt-0.5">
                {isEdit ? 'حدّث حالة البلاغ أو تفاصيله' : 'وثّق كل مشكلة لبناء سجل صيانة الوحدة'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="icon-action hover:text-accent">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5">

          <div>
            <label className={eyebrow}>الوحدة</label>
            <select
              required
              className="input-field"
              value={form.apartmentId}
              onChange={(e) => setForm({ ...form, apartmentId: e.target.value })}
              disabled={isEdit}
            >
              <option value="">اختر الشقة...</option>
              {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {isEdit && (
              <p className="text-[10px] text-muted-soft mt-1">لا يمكن تغيير الوحدة بعد إنشاء البلاغ</p>
            )}
          </div>

          <div>
            <label className={eyebrow}>عنوان المشكلة</label>
            <input
              required
              type="text"
              className="input-field"
              placeholder="مثال: مكيف غرفة النوم لا يبرد"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={eyebrow}>التصنيف</label>
              <select
                className="input-field"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {MAINTENANCE_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={eyebrow}>الأولوية</label>
              <select
                className="input-field"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                {SEVERITIES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={eyebrow}>تفاصيل المشكلة</label>
            <textarea
              className="input-field resize-none"
              rows="3"
              placeholder="اشرح المشكلة بمزيد من التفصيل..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {isEdit && (
            <div className="border-t border-hairline-soft dark:border-[#242424] pt-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-muted" />
                <span className="text-[11px] font-semibold text-muted dark:text-[#a1a1aa] uppercase tracking-wider">
                  تفاصيل المتابعة والإنجاز
                </span>
              </div>

              <div>
                <label className={eyebrow}>حالة البلاغ</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm({ ...form, status: s.value })}
                      className={`h-10 rounded-md text-xs font-semibold transition-colors border ${
                        form.status === s.value
                          ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
                          : 'bg-canvas text-muted border-hairline hover:text-ink dark:bg-surface-dark-elevated dark:text-[#a1a1aa] dark:border-[#2e2e2e]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={eyebrow}>التكلفة (اختياري)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className="input-field font-semibold pl-12"
                      placeholder="0"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-soft font-medium pointer-events-none">ر.س</span>
                  </div>
                </div>
                <div>
                  <label className={eyebrow}>المُنفِّذ (اختياري)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="اسم الفني أو المقاول"
                    value={form.contractor}
                    onChange={(e) => setForm({ ...form, contractor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className={eyebrow}>ملاحظات الحل</label>
                <textarea
                  className="input-field resize-none"
                  rows="2"
                  placeholder="ماذا تم فعله بالضبط..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
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
            disabled={submitting || !form.apartmentId || !form.title}
            className="btn-accent h-10 px-6"
          >
            {submitting ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'إضافة البلاغ'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calculator, Sparkles, CheckCircle, Handshake, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import toast from 'react-hot-toast';

const COMP_TYPES = [
  { value: 'percentage_gross', label: '% من إجمالي الإيرادات', desc: 'نسبة من إجمالي إيرادات الوحدات المحددة' },
  { value: 'percentage_net', label: '% من صافي الربح', desc: 'نسبة من (إجمالي الإيرادات - المصروفات)' },
  { value: 'fixed', label: 'مبلغ ثابت', desc: 'مبلغ محدد بغض النظر عن الأداء' },
  { value: 'fixed_percentage', label: 'ثابت + نسبة', desc: 'مبلغ ثابت + نسبة من إجمالي الإيرادات' },
];

function CompensationPreview({ partner, apartments, calculateSettlement, periodStart, periodEnd }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!partner?.name) return;
    let cancelled = false;
    async function fetchPreview() {
      setLoading(true);
      setError(null);
      try {
        // Send form data directly for preview calculation
        const partnerData = {
          compType: partner.compType,
          percentage: partner.percentage ? parseFloat(partner.percentage) : null,
          fixedAmount: partner.fixedAmount ? parseFloat(partner.fixedAmount) : null,
          apartmentIds: partner.apartmentIds || [],
        };
        const res = await calculateSettlement(partnerData, periodStart, periodEnd);
        if (!cancelled && res && typeof res === 'object' && res.gross !== undefined) {
          setPreview({
            gross: Number(res.gross) || 0,
            expenses: Number(res.expenses) || 0,
            net: Number(res.net) || 0,
            amount: Number(res.amount) || 0,
            formulaLabel: res.formulaLabel || '—',
          });
        } else if (!cancelled) {
          setError('Invalid response from server');
          setPreview(null);
        }
      } catch (e) {
        console.error('Preview calculation failed:', e);
        if (!cancelled) {
          setError('فشل في حساب المعاينة');
          setPreview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPreview();
    return () => { cancelled = true; };
  }, [partner?.compType, partner?.percentage, partner?.fixedAmount, partner?.apartmentIds, apartments, periodStart, periodEnd, calculateSettlement]);

  if (loading && !preview) {
    return (
      <div className="bg-surface-soft dark:bg-surface-dark-elevated rounded-lg p-4 mb-4 text-center">
        <Calculator className="animate-spin h-5 w-5 mx-auto text-accent mb-2" />
        <p className="text-sm text-muted">جاري حساب المعاينة...</p>
      </div>
    );
  }

  if (!preview) {
    if (error) {
      return (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 mb-4 animate-tab">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">
            <AlertTriangle size={16} />
            <span>تعذر حساب المعاينة</span>
          </div>
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-accent-soft border border-accent/60 rounded-lg p-4 mb-4 animate-tab">
      <div className="flex items-center gap-2 text-sm font-semibold text-accent-strong mb-3">
        <Sparkles size={16} />
        <span>معاينة حية للتسوية (تقديري)</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-canvas dark:bg-surface-dark-elevated p-3 rounded-md">
          <p className="text-muted-soft mb-1">إجمالي الإيرادات</p>
          <p className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Number(preview.gross || 0).toLocaleString()} ر.س
          </p>
        </div>
        <div className="bg-canvas dark:bg-surface-dark-elevated p-3 rounded-md">
          <p className="text-muted-soft mb-1">المصروفات (مخصومة)</p>
          <p className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Number(preview.expenses || 0).toLocaleString()} ر.س
          </p>
        </div>
        <div className="bg-canvas dark:bg-surface-dark-elevated p-3 rounded-md">
          <p className="text-muted-soft mb-1">صافي الربح</p>
          <p className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Number(preview.net || 0).toLocaleString()} ر.س
          </p>
        </div>
        <div className="bg-canvas dark:bg-surface-dark-elevated p-3 rounded-md">
          <p className="text-muted-soft mb-1">التطبيق</p>
          <p className="font-semibold text-accent-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {preview.formulaLabel || '—'}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-accent/40 flex justify-between items-center">
        <span className="text-sm text-muted">مبلغ التسوية المتوقع:</span>
        <span className="text-xl font-bold text-accent-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {Number(preview.amount || 0).toLocaleString()} ر.س
        </span>
      </div>
    </div>
  );
}

export default function PartnerFormModal({ isOpen, onClose, initialData, apartments, addTrigger }) {
  const { createPartner, updatePartner, calculatePartnerSettlement } = useData();
  const isEdit = !!initialData?.id;
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    compType: 'percentage_gross',
    percentage: '',
    fixedAmount: '',
    apartmentIds: [],
    status: 'active',
  });
  const initialDataRef = useRef(initialData);
  const isOpenRef = useRef(isOpen);
  const addTriggerRef = useRef(addTrigger);

  // Reset form when modal opens/closes or addTrigger changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    isOpenRef.current = isOpen;
    initialDataRef.current = initialData;
    addTriggerRef.current = addTrigger;

    if (isOpen) {
      const data = initialData;
      if (data) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          notes: data.notes || '',
          compType: data.compType || 'percentage_gross',
          percentage: data.percentage != null ? String(data.percentage) : '',
          fixedAmount: data.fixedAmount != null ? String(data.fixedAmount) : '',
          apartmentIds: data.apartmentIds || [],
          status: data.status || 'active',
        });
      } else {
        setFormData({
          name: '',
          phone: '',
          email: '',
          notes: '',
          compType: 'percentage_gross',
          percentage: '',
          fixedAmount: '',
          apartmentIds: [],
          status: 'active',
        });
      }
    }
  }, [isOpen, initialData, addTrigger]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('اسم الشريك مطلوب');
      return;
    }

    // Validate based on compType
    if (['percentage_gross', 'percentage_net', 'fixed_percentage'].includes(formData.compType)) {
      if (!formData.percentage) {
        toast.error('النسبة المئوية مطلوبة');
        return;
      }
      const pct = parseFloat(formData.percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        toast.error('النسبة يجب أن تكون بين 0 و 100');
        return;
      }
    }
    if (['fixed', 'fixed_percentage'].includes(formData.compType)) {
      if (!formData.fixedAmount) {
        toast.error('المبلغ الثابت مطلوب');
        return;
      }
      const amt = parseFloat(formData.fixedAmount);
      if (isNaN(amt) || amt < 0) {
        toast.error('المبلغ يجب أن يكون أكبر من أو يساوي الصفر');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone || null,
        email: formData.email || null,
        notes: formData.notes || null,
        compType: formData.compType,
        percentage: formData.compType === 'fixed' ? null : (formData.percentage ? parseFloat(formData.percentage) : null),
        fixedAmount: (formData.compType === 'fixed' || formData.compType === 'fixed_percentage') ? parseFloat(formData.fixedAmount) : null,
        apartmentIds: formData.apartmentIds,
        status: formData.status,
      };

      if (isEdit) {
        await updatePartner({ ...payload, id: initialData.id });
        toast.success('تم حفظ التعديلات');
      } else {
        await createPartner(payload);
        toast.success('تم إنشاء الشريك بنجاح');
      }
      onClose();
    } catch {
      // toast handled in DataContext
    } finally {
      setSaving(false);
    }
  };

  const needsPercentage = ['percentage_gross', 'percentage_net', 'fixed_percentage'].includes(formData.compType);
  const needsFixed = ['fixed', 'fixed_percentage'].includes(formData.compType);

  // Calculate preview period (last 30 days)
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);
  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft w-full max-w-2xl overflow-hidden border border-hairline dark:border-hairline-dark-soft flex flex-col max-h-[92vh] anim-sheet">
        <div className="sheet-handle" />

        <div className="px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark-soft flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-surface-soft dark:bg-surface-dark-elevated text-ink dark:text-white flex items-center justify-center shrink-0">
            <Handshake size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold tracking-tight text-ink dark:text-white leading-tight text-base">
              {isEdit ? 'تعديل الشريك' : 'شريك جديد'}
            </h2>
            <p className="text-xs text-muted dark:text-body-dark mt-0.5">
              {isEdit ? 'عدّل بيانات الشريك ونسب تقاسم الإيرادات' : 'أضف شريكاً جديداً لتقاسم الإيرادات'}
            </p>
          </div>
          <button onClick={onClose} className="icon-action shrink-0" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-4 md:p-5 space-y-4">
          <div>
            <label className="block eyebrow mb-1.5">اسم الشريك <span className="text-rose-500">*</span></label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="مثال: شركة الصيانة المتحدة"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block eyebrow mb-1.5">الهاتف</label>
              <input
                type="tel"
                className="input-field w-full"
                placeholder="05XXXXXXXX"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block eyebrow mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                className="input-field w-full"
                placeholder="partner@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block eyebrow mb-1.5">ملاحظات</label>
            <textarea
              className="input-field w-full"
              rows={3}
              placeholder="ملاحظات إضافية عن الشريك..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          {/* Compensation Builder */}
          <fieldset className="border border-hairline dark:border-hairline-dark-soft rounded-lg p-4 space-y-4">
            <legend className="eyebrow mb-2">طريقة التعويض <span className="text-rose-500">*</span></legend>

            {/* Comp Type Pills */}
            <div className="nav-pill-group" role="radiogroup">
              {COMP_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  role="radio"
                  aria-checked={formData.compType === type.value}
                  onClick={() => handleChange('compType', type.value)}
                  className={`h-10 px-4 rounded-full text-sm font-semibold transition-colors ${
                    formData.compType === type.value
                      ? 'bg-canvas text-ink shadow-pill dark:bg-hairline-dark-soft dark:text-white'
                      : 'text-muted hover:text-ink dark:hover:text-white'
                  }`}>
                  {type.label}
                </button>
              ))}
            </div>

            {/* Live description */}
            <p className="text-xs text-muted-soft dark:text-body-dark">
              {COMP_TYPES.find(t => t.value === formData.compType)?.desc}
            </p>

            {/* Conditional inputs */}
            <div className="grid grid-cols-2 gap-3">
              {needsPercentage && (
                <div>
                  <label className="block eyebrow mb-1.5">النسبة المئوية (%) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    className="input-field w-full text-ink dark:text-white font-semibold"
                    placeholder="10"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.percentage}
                    onChange={(e) => handleChange('percentage', e.target.value)}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                    required
                  />
                </div>
              )}
              {needsFixed && (
                <div>
                  <label className="block eyebrow mb-1.5">المبلغ الثابت (ر.س) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    className="input-field w-full text-ink dark:text-white font-semibold"
                    placeholder="5000"
                    min="0"
                    step="0.01"
                    value={formData.fixedAmount}
                    onChange={(e) => handleChange('fixedAmount', e.target.value)}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                    required
                  />
                </div>
              )}
            </div>

            {/* Live Preview Card */}
            <CompensationPreview
              partner={formData}
              apartments={apartments}
              calculateSettlement={calculatePartnerSettlement}
              periodStart={periodStartStr}
              periodEnd={periodEndStr}
            />
          </fieldset>

          {/* Scope Selector */}
          <fieldset className="border border-hairline dark:border-hairline-dark-soft rounded-lg p-4 space-y-3">
            <legend className="eyebrow mb-2">نطاق التطبيق</legend>

            <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-hairline dark:border-hairline-dark-soft cursor-pointer hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded border-2 border-accent flex items-center justify-center shrink-0">
                  {formData.apartmentIds.length === 0 && <CheckCircle size={14} className="text-accent" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink dark:text-white leading-tight">جميع الوحدات</p>
                  <p className="text-2xs text-muted dark:text-body-dark mt-0.5">يطبق على كل الشقق الحالية والمستقبلية</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.apartmentIds.length === 0}
                onChange={() => handleChange('apartmentIds', [])}
                className="w-5 h-5 shrink-0 accent-ink dark:accent-white"
              />
            </label>

            <div className="pt-2">
              <p className="text-xs text-muted-soft dark:text-body-dark mb-2">أو اختر وحدات محددة:</p>
              <div className="flex flex-wrap gap-2">
                {apartments.map((apt) => (
                  <label key={apt.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                    formData.apartmentIds.includes(apt.id)
                      ? 'bg-accent text-white'
                      : 'bg-surface-soft text-muted hover:bg-accent/10 hover:text-accent dark:bg-surface-dark-elevated dark:text-body-dark dark:hover:bg-accent/20'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.apartmentIds.includes(apt.id)}
                      onChange={() => handleChange('apartmentIds', formData.apartmentIds.includes(apt.id)
                        ? formData.apartmentIds.filter(id => id !== apt.id)
                        : [...formData.apartmentIds, apt.id])}
                      className="w-4 h-4 accent-ink dark:accent-white"
                    />
                    <span>{apt.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          {/* Status */}
          <fieldset className="border border-hairline dark:border-hairline-dark-soft rounded-lg p-4 space-y-3">
            <legend className="eyebrow mb-2">الحالة</legend>
            <div className="nav-pill-group">
              {['active', 'inactive', 'paused'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleChange('status', s)}
                  className={`h-9 px-4 rounded-full text-sm font-semibold transition-colors ${
                    formData.status === s
                      ? 'bg-canvas text-ink shadow-pill dark:bg-hairline-dark-soft dark:text-white'
                      : 'text-muted hover:text-ink dark:hover:text-white'
                  }`}>
                    {s === 'active' && 'نشط'}
                    {s === 'inactive' && 'غير نشط'}
                    {s === 'paused' && 'موقوف مؤقتاً'}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Footer */}
          <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark-soft flex gap-2 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary h-11 px-5">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="btn-accent flex-1 h-11 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة الشريك'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
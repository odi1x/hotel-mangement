import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calculator, CheckCircle, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import toast from 'react-hot-toast';
import MonthPicker from './MonthPicker';

export default function SettlePartnerModal({ isOpen, onClose, partner }) {
  const { settlePartner, calculatePartnerSettlementById } = useData();
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState('');
  const [memo, setMemo] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const calculateRef = useRef(calculatePartnerSettlementById);
  useEffect(() => {
    calculateRef.current = calculatePartnerSettlementById;
  }, [calculatePartnerSettlementById]);
  const prevPartnerRef = useRef(null);

  // Map a "YYYY-MM" month to [periodStart, periodEnd] covering the full calendar month
  function monthBounds(ym) {
    if (!/^\d{4}-\d{2}$/.test(ym)) return null;
    const [y, m] = ym.split('-').map(Number);
    const start = new Date(y, m - 1, 1); start.setHours(0, 0, 0, 0);
    const end = new Date(y, m, 1); end.setHours(0, 0, 0, 0); end.setSeconds(-1);
    return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
  }

  // Reset month initial value per partner; initialize on first open
  useEffect(() => {
    if (isOpen && partner?.id !== prevPartnerRef.current) {
      prevPartnerRef.current = partner?.id || null;
      setMonth(new Date().toISOString().slice(0, 7));
      setPreview(null);
    }
  }, [isOpen, partner?.id]);

  // Fetch preview when month changes
  const activeMonth = monthBounds(month);
  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !activeMonth || !partner) return;
    async function fetchPreview() {
      setPreviewLoading(true);
      try {
        const res = await calculateRef.current(partner.id, activeMonth.periodStart, activeMonth.periodEnd);
        if (!cancelled && res) {
          setPreview(res);
        }
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }
    fetchPreview();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, partner, month]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!month || !monthBounds(month)) {
      toast.error('يرجى تحديد الشهر');
      return;
    }
    const bounds = monthBounds(month);

    setSaving(true);
    try {
      await settlePartner(partner.id, bounds.periodStart, bounds.periodEnd, memo);
      toast.success('تم إنشاء التسوية كمسودة');
      onClose();
    } catch {
      // toast handled in DataContext
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft w-full max-w-lg overflow-hidden border border-hairline dark:border-hairline-dark-soft flex flex-col max-h-[92vh] anim-sheet">
        <div className="sheet-handle" />

        <div className="px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark-soft flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-surface-soft dark:bg-surface-dark-elevated text-ink dark:text-white flex items-center justify-center shrink-0">
            <Calculator size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold tracking-tight text-ink dark:text-white leading-tight text-base">
              إنشاء تسوية جديدة
            </h2>
            <p className="text-xs text-muted dark:text-body-dark mt-0.5">
              {partner.name} — {partner.formulaLabel || 'طريقة التعويض'}
            </p>
          </div>
          <button onClick={onClose} className="icon-action shrink-0" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-4 md:p-5 space-y-4">
          <div>
            <label className="block eyebrow mb-1.5">شهر التسوية <span className="text-rose-500">*</span></label>
            <MonthPicker
              value={month}
              onChange={(ym) => setMonth(ym)}
              max={new Date().toISOString().slice(0, 7)}
            />
            <p className="text-xs text-muted-soft dark:text-body-dark mt-1">
              تُنشئ تسوية واحدة عن الشهر المحدد بالكامل (من أول يوم إلى آخر يوم).
            </p>
          </div>

          {/* Transparent Basis Breakdown Card */}
          {preview && preview.gross !== undefined && preview.gross !== null && (
            <div className="bg-accent-soft border border-accent/60 rounded-lg p-4 animate-tab space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent-strong">
                <CheckCircle size={16} />
                <span>تفصيل الأساس المالي للشهر المحدد</span>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between py-1 border-b border-accent/30">
                  <span className="text-muted">إجمالي الإيرادات (النطاق + الفترة)</span>
                  <span className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(preview.gross).toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-accent/30">
                  <span className="text-muted">− المصروفات (بالتخصيص)</span>
                  <span className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(preview.expenses).toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-accent/30">
                  <span className="text-muted">= صافي الربح</span>
                  <span className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(preview.net).toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex justify-between py-1 border-t-2 border-accent/60">
                  <span className="text-muted">التطبيق: {preview.formulaLabel}</span>
                  <span className="font-bold text-accent-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    مبلغ التسوية: {Number(preview.amount).toLocaleString()} ر.س
                  </span>
                </div>
              </div>

              {preview.unitBreakdown && Object.keys(preview.unitBreakdown).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-soft cursor-pointer flex items-center gap-1">
                    <AlertTriangle size={12} />
                    تفصيل لكل وحدة ({Object.keys(preview.unitBreakdown).length})
                  </summary>
                  <div className="mt-2 space-y-1 text-xs">
                    {Object.entries(preview.unitBreakdown).map(([aptId, data]) => (
                      <div key={aptId} className="flex justify-between text-muted-soft">
                        <span>{aptId}</span>
                        <span>{Number(data.revenue).toLocaleString()} ر.س ({data.nights} ليلة)</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {!preview && previewLoading && (
            <div className="bg-surface-soft dark:bg-surface-dark-elevated rounded-lg p-4 text-center">
              <Calculator className="animate-spin h-6 w-6 mx-auto text-accent mb-2" />
              <p className="text-sm text-muted">جاري حساب المعاينة...</p>
            </div>
          )}

          <div>
            <label className="block eyebrow mb-1.5">ملاحظة (اختياري)</label>
            <textarea
              className="input-field w-full"
              rows={3}
              placeholder="ملاحظة داخلية عن هذه التسوية..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark-soft flex gap-2 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary h-11 px-5 flex-1">
              إلغاء
            </button>
            <button type="submit" disabled={saving || previewLoading || !preview} className="btn-accent flex-1 h-11 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'جاري الإنشاء...' : 'إنشاء التسوية (مسودة)'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
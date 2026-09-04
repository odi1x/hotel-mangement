import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Calculator, CheckCircle, XCircle, AlertTriangle, FileText, X, Wallet, CalendarRange } from 'lucide-react';
import { useData } from '../../context/DataContext';
import SettlePartnerModal from '../ui/SettlePartnerModal';
import SettlementStatusBadge from '../ui/SettlementStatusBadge';
import toast from 'react-hot-toast';

function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCompLabel(compType, percentage, fixedAmount) {
  const pct = percentage != null ? Number(percentage) : 0;
  const fixed = fixedAmount != null ? Number(fixedAmount) : 0;
  switch (compType) {
    case 'percentage_gross': return `${pct}% من إجمالي الإيرادات`;
    case 'percentage_net': return `${pct}% من صافي الربح`;
    case 'fixed': return `مبلغ ثابت ${fixed.toLocaleString()} ر.س`;
    case 'fixed_percentage': return `مبلغ ثابت ${fixed.toLocaleString()} ر.س + ${pct}% من الإجمالي`;
    default: return '—';
  }
}

function getStatusConfig(status) {
  switch (status) {
    case 'draft': return { label: 'مسودة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: AlertTriangle };
    case 'paid': return { label: 'مدفوعة', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle };
    case 'void': return { label: 'ملغية', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300', icon: XCircle };
    default: return { label: status, className: 'bg-surface-card text-ink dark:bg-surface-dark-elevated dark:text-white', icon: AlertTriangle };
  }
}

export default function PartnerDetailView({ partnerId, onBack }) {
  const { fetchPartnerDetail, fetchPartnerSettlements, markSettlementPaid, voidSettlement, paySettlements, backfillMissingMonths, apartments } = useData();
  const [partner, setPartner] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [expandingId, setExpandingId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('cash');
  const [paying, setPaying] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [backfillMonth, setBackfillMonth] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const fetchPartnerDetailRef = useRef(fetchPartnerDetail);
  const fetchPartnerSettlementsRef = useRef(fetchPartnerSettlements);
  useEffect(() => {
    fetchPartnerDetailRef.current = fetchPartnerDetail;
    fetchPartnerSettlementsRef.current = fetchPartnerSettlements;
  }, [fetchPartnerDetail, fetchPartnerSettlements]);
  const backfillRef = useRef(backfillMissingMonths);
  useEffect(() => {
    backfillRef.current = backfillMissingMonths;
  }, [backfillMissingMonths]);

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [p, s] = await Promise.all([
          fetchPartnerDetailRef.current(partnerId),
          fetchPartnerSettlementsRef.current(partnerId),
        ]);
        if (!cancelled) {
          setPartner(p);
          setSettlements(s || []);
        }
      } catch (e) {
        console.error('Failed to load partner detail:', e);
        if (!cancelled) toast.error('فشل في تحميل بيانات الشريك');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [partnerId]);

  const handleMarkPaid = async (id) => {
    try {
      await markSettlementPaid(id);
      setSettlements(prev => prev.map(s => s.id === id ? { ...s, status: 'paid', paidAt: new Date().toISOString() } : s));
      toast.success('تم تحديد التسوية كمدفوعة');
    } catch {
      // toast handled in context
    }
  };

  const handleVoid = async (id) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه التسوية؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    try {
      await voidSettlement(id);
      setSettlements(prev => prev.map(s => s.id === id ? { ...s, status: 'void' } : s));
      toast.success('تم إلغاء التسوية');
    } catch {
      // toast handled in context
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectedSettlements = settlements.filter(s => selected.includes(s.id));
  const selectedTotal = selectedSettlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const selectedDrafts = settlements.filter(s => selected.includes(s.id) && s.status === 'draft');

  const handleBulkPay = async () => {
    if (selectedDrafts.length === 0) return;
    setPaying(true);
    try {
      await paySettlements({
        settlementIds: selected,
        method: payMethod,
        date: new Date().toISOString().split('T')[0],
        notes: `دفعة لـ ${partner.name}`,
      });
      setSettlements(prev => prev.map(s => selected.includes(s.id) ? { ...s, status: 'paid', paidAt: new Date().toISOString() } : s));
      setSelected([]);
      setPayOpen(false);
      setPaying(false);
    } catch {
      setPaying(false);
    }
  };

  const handleBackfill = async () => {
    if (!backfillMonth) {
      toast.error('يرجى اختيار شهر البداية');
      return;
    }
    setBackfilling(true);
    try {
      const res = await backfillRef.current(partner.id, backfillMonth);
      if (Array.isArray(res.created) && res.created.length > 0) {
        setSettlements(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          return [...res.created.filter(s => !existingIds.has(s.id)), ...prev];
        });
      }
      setBackfillOpen(false);
    } catch {
      // toast handled in DataContext
    } finally {
      setBackfilling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-page dark:bg-surface-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink dark:border-white"></div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex-1 flex items-center justify-center bg-page dark:bg-surface-dark">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-14 w-14 text-muted mb-4" />
          <p className="text-base font-semibold text-ink dark:text-white mb-1">الشريك غير موجود</p>
          <p className="text-sm text-muted dark:text-body-dark">قد يكون تم حذفه أو لا تملك صلاحية الوصول إليه</p>
          <button onClick={onBack} className="mt-4 btn-accent h-10 px-5">
            <ChevronLeft size={16} />
            <span>العودة للشركاء</span>
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(partner.status);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-page dark:bg-surface-dark">
      {/* Back button + header */}
      <div className="p-4 md:p-6 border-b border-hairline-soft dark:border-hairline-dark-soft shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="icon-action hover:text-accent shrink-0" aria-label="رجوع">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tightest text-ink dark:text-white leading-none">
              {partner.name}
            </h1>
            <p className="text-sm text-muted dark:text-body-dark mt-0.5">
              {partner.phone || 'لا يوجد هاتف'} {partner.email ? `· ${partner.email}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 ${statusConfig.className}`}>
              <statusConfig.icon size={11} strokeWidth={2.5} />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Compensation Basis Badge */}
        <div className="bg-accent-soft border border-accent/60 rounded-lg p-3 flex items-center gap-3">
          <Calculator size={20} className="text-accent-strong shrink-0" />
          <div>
            <p className="text-xs font-semibold text-accent-strong">أساس التعويض</p>
            <p className="text-sm text-ink dark:text-white mt-0.5">{getCompLabel(partner.compType, partner.percentage, partner.fixedAmount)}</p>
          </div>
          <div className="flex-1" />
          {partner.recurringPeriod === 'monthly' && (
            <span className="badge-pill badge-ghost text-sm" title="يُنشئ النظام تسوية تلقائية عن كل شهر مكتمل">
              تسوية تلقائية شهرية
            </span>
          )}
          {partner.apartmentIds.length === 0 ? (
            <span className="badge-pill badge-ghost text-sm">كل الوحدات</span>
          ) : (
            <span className="badge-pill badge-ghost text-sm">{partner.apartmentIds.length} وحدة محددة</span>
          )}
        </div>
      </div>

      {/* Settlement History Ledger */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
        {settlements.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-surface-soft dark:bg-surface-dark-elevated flex items-center justify-center mb-4">
              <FileText size={22} className="text-muted-soft" />
            </div>
            <p className="text-base font-semibold text-ink dark:text-white mb-1">لا توجد تسويات بعد</p>
            <p className="text-sm text-muted dark:text-body-dark mb-6 max-w-sm">
              أنشئ أول تسوية لحساب مستحقات الشريك عن فترة محددة
            </p>
            <button onClick={() => setSettling(true)} className="btn-accent h-10 px-5">
              <Calculator size={16} />
              <span>إنشاء تسوية جديدة</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold text-ink dark:text-white">سجل التسويات</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setBackfillOpen(true)} className="btn-secondary h-9 px-4 text-sm" title="إنشاء تسوية مستقلة لكل شهر من الأشهر السابقة">
                  <CalendarRange size={16} />
                  <span>ترحيل الأشهر السابقة</span>
                </button>
                <button onClick={() => setSettling(true)} className="btn-accent h-9 px-4 text-sm">
                  <Calculator size={16} />
                  <span>تسوية جديدة</span>
                </button>
              </div>
            </div>

            {/* Bulk pay bar */}
            {selected.length > 0 && (
              <div className="mb-4 p-4 rounded-lg border border-accent/50 bg-accent-soft flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink dark:text-white">
                    تم اختيار {selected.length} تسوية
                  </p>
                  <p className="text-xs text-muted-soft">
                    الإجمالي: <span className="font-semibold text-accent-strong">{Number(selectedTotal).toLocaleString('ar-SA')} ر.س</span>
                    {selectedDrafts.length < selected.length && ` (${selectedDrafts.length} منها قابلة للدفع)`}
                  </p>
                </div>
                <button onClick={() => setPayOpen(true)} disabled={selectedDrafts.length === 0} className="btn-accent h-10 px-5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <CheckCircle size={16} />
                  <span>دفع كدفعة واحدة</span>
                </button>
                <button onClick={() => setSelected([])} className="btn-secondary h-10 px-4 text-sm">إلغاء التحديد</button>
              </div>
            )}

              <div className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden">
              <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
                {settlements.map((s) => {
                  const isExpanded = expandingId === s.id;
                  const isSelected = selected.includes(s.id);

                  return (
                    <li key={s.id} className="px-6 py-4 hover:bg-surface-soft/50 dark:hover:bg-surface-dark-elevated/30 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Selection checkbox for draft settlements */}
                        {s.status === 'draft' && (
                          <label className={`mt-1 shrink-0 cursor-pointer flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${isSelected ? 'bg-accent border-accent' : 'border-hairline dark:border-hairline-dark'}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(s.id)}
                              className="appearance-none"
                            />
                            {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                          </label>
                        )}
                        {/* Status badge + amount */}
                        <div className="flex flex-col items-center gap-2 shrink-0 w-36 md:w-40">
                          <SettlementStatusBadge status={s.status} />
                          <p className="text-lg font-bold text-ink dark:text-white text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(s.amount)}
                          </p>
                          <p className="text-xs text-muted-soft text-right">
                            {formatDateShort(s.periodStart)} — {formatDateShort(s.periodEnd)}
                          </p>
                        </div>

                        {/* Basis breakdown (expandable) */}
                        <div className="flex-1 min-w-0">
                          <div className="grid grid-cols-3 gap-3 text-sm mb-2">
                            <div className="bg-surface-soft dark:bg-surface-dark-elevated p-2 rounded-md">
                              <p className="text-muted-soft text-[11px]">إجمالي الإيرادات</p>
                              <p className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatCurrency(s.basisGross)}
                              </p>
                            </div>
                            <div className="bg-surface-soft dark:bg-surface-dark-elevated p-2 rounded-md">
                              <p className="text-muted-soft text-[11px]">المصروفات</p>
                              <p className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatCurrency(s.basisExpenses)}
                              </p>
                            </div>
                            <div className="bg-surface-soft dark:bg-surface-dark-elevated p-2 rounded-md">
                              <p className="text-muted-soft text-[11px]">صافي الربح</p>
                              <p className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatCurrency(s.basisNet)}
                              </p>
                            </div>
                          </div>

                          {/* Snapshot label */}
                          <div className="flex items-center gap-2 text-xs text-muted-soft mb-2 flex-wrap">
                            <span className="badge-pill badge-ghost">
                              {s.compTypeSnap === 'percentage_gross' && `${s.percentageSnap}% من إجمالي الإيرادات`}
                              {s.compTypeSnap === 'percentage_net' && `${s.percentageSnap}% من صافي الربح`}
                              {s.compTypeSnap === 'fixed' && `مبلغ ثابت ${Number(s.fixedAmountSnap || 0).toLocaleString()} ر.س`}
                              {s.compTypeSnap === 'fixed_percentage' && `مبلغ ثابت ${Number(s.fixedAmountSnap || 0).toLocaleString()} ر.س + ${s.percentageSnap}% من الإجمالي`}
                            </span>
                            <span className="text-muted-soft">·</span>
                            <span>الوحدات: {s.scopeSnap.length === 0 ? 'الكل' : `${s.scopeSnap.length} وحدة`}</span>
                            {s.memo && (
                              <>
                                <span className="text-muted-soft">·</span>
                                <span className="line-clamp-1 max-w-xs">{s.memo}</span>
                              </>
                            )}
                          </div>

                          {/* Expand for full breakdown */}
                          <button
                            onClick={() => setExpandingId(isExpanded ? null : s.id)}
                            className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
                          >
                            {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل الكاملة'}
                            <ChevronLeft size={12} className={isExpanded ? '-rotate-180' : ''} />
                          </button>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-hairline-soft dark:border-hairline-dark-soft space-y-2 animate-tab">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-surface-soft dark:bg-surface-dark-elevated p-2 rounded-md">
                                  <p className="text-muted-soft">تاريخ الإنشاء</p>
                                  <p className="font-medium text-ink dark:text-white">{formatDate(s.createdAt)}</p>
                                </div>
                                <div className="bg-surface-soft dark:bg-surface-dark-elevated p-2 rounded-md">
                                  <p className="text-muted-soft">الحالة</p>
                                  <SettlementStatusBadge status={s.status} />
                                </div>
                                {s.paidAt && (
                                  <div className="bg-surface-soft dark:bg-surface-dark-elevated p-2 rounded-md">
                                    <p className="text-muted-soft">تاريخ الدفع</p>
                                    <p className="font-medium text-ink dark:text-white">{formatDate(s.paidAt)}</p>
                                  </div>
                                )}
                                {s.memo && (
                                  <div className="col-span-2 bg-surface-soft dark:bg-surface-dark-elevated p-2 rounded-md">
                                    <p className="text-muted-soft">ملاحظة</p>
                                    <p className="font-medium text-ink dark:text-white">{s.memo}</p>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-2 border-t border-hairline-soft dark:border-hairline-dark-soft">
                                {s.status === 'draft' && (
                                  <>
                                    <button onClick={() => handleMarkPaid(s.id)} className="btn-secondary h-9 px-4 text-sm flex-1">
                                      <CheckCircle size={16} />
                                      <span>تحديد كمدفوعة</span>
                                    </button>
                                    <button onClick={() => handleVoid(s.id)} className="btn-secondary h-9 px-4 text-sm border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex-1">
                                      <XCircle size={16} />
                                      <span>إلغاء</span>
                                    </button>
                                  </>
                                )}
                                {s.status === 'paid' && (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex-1 text-center">
                                    مدفوعة في {formatDateShort(s.paidAt)}
                                  </span>
                                )}
                                {s.status === 'void' && (
                                  <span className="text-xs text-rose-600 dark:text-rose-400 flex-1 text-center">
                                    ملغية — لا يمكن التعديل
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Chevron indicator */}
                        <div className="shrink-0 text-muted-soft">
                          <ChevronLeft size={20} className={isExpanded ? '-rotate-180' : ''} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* SettlePartnerModal */}
      <SettlePartnerModal
        isOpen={settling}
        onClose={() => setSettling(false)}
        partner={partner}
        apartments={apartments}
      />

      {/* Bulk Payment Modal */}
      {payOpen && createPortal(
        <div className="fixed inset-0 z-[80] flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active dir="rtl">
          <div className="absolute inset-0" onClick={() => setPayOpen(false)} />
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft w-full max-w-md overflow-hidden border border-hairline dark:border-hairline-dark-soft flex flex-col anim-sheet">
            <div className="sheet-handle" />
            <div className="px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark-soft flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Wallet size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold tracking-tight text-ink dark:text-white leading-tight text-base">دفع التسويات كدفعة واحدة</h2>
                <p className="text-xs text-muted dark:text-body-dark mt-0.5">
                  {selectedDrafts.length} تسوية · الإجمالي {Number(selectedTotal).toLocaleString('ar-SA')} ر.س
                </p>
              </div>
              <button onClick={() => setPayOpen(false)} className="icon-action shrink-0" aria-label="إغلاق"><X size={20} /></button>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block eyebrow mb-1.5">طريقة الدفع</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'cash', label: 'نقدي' },
                    { value: 'transfer', label: 'تحويل' },
                    { value: 'card', label: 'بطاقة' },
                  ].map(m => (
                    <button key={m.value} type="button" onClick={() => setPayMethod(m.value)}
                      className={`h-10 rounded-lg text-sm font-semibold transition-colors ${payMethod === m.value ? 'bg-accent text-white' : 'bg-surface-soft text-muted dark:bg-surface-dark-elevated dark:text-body-dark'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-accent/40 bg-accent-soft p-3 space-y-1 text-sm">
                {selectedDrafts.map(s => (
                  <div key={s.id} className="flex justify-between text-muted-soft">
                    <span>{s.partnerNameSnap || '—'} · {s.periodStart ? new Date(s.periodStart).toLocaleDateString('ar', { month: 'long' }) : ''}</span>
                    <span className="font-semibold text-ink dark:text-white">{Number(s.amount).toLocaleString('ar-SA')} ر.س</span>
                  </div>
                ))}
                <div className="pt-2 mt-1 border-t border-accent/30 flex justify-between font-bold text-ink dark:text-white">
                  <span>الإجمالي</span>
                  <span>{Number(selectedTotal).toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>

              <button onClick={handleBulkPay} disabled={paying || selectedDrafts.length === 0}
                className="btn-accent w-full h-11 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <CheckCircle size={16} />
                <span>{paying ? 'جاري الدفع...' : `تأكيد الدفع (${Number(selectedTotal).toLocaleString('ar-SA')} ر.س)`}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Backfill Past Months Modal */}
      {backfillOpen && createPortal(
        <div className="fixed inset-0 z-[80] flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active dir="rtl">
          <div className="absolute inset-0" onClick={() => setBackfillOpen(false)} />
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft w-full max-w-md overflow-hidden border border-hairline dark:border-hairline-dark-soft flex flex-col anim-sheet">
            <div className="sheet-handle" />
            <div className="px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark-soft flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-lg bg-accent-soft dark:bg-accent/20 text-accent-strong flex items-center justify-center shrink-0">
                <CalendarRange size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold tracking-tight text-ink dark:text-white leading-tight text-base">ترحيل الأشهر السابقة</h2>
                <p className="text-xs text-muted dark:text-body-dark mt-0.5">تسوية مستقلة لكل شهر منذ البداية حتى آخر شهر مكتمل</p>
              </div>
              <button onClick={() => setBackfillOpen(false)} className="icon-action shrink-0" aria-label="إغلاق"><X size={20} /></button>
            </div>

            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block eyebrow mb-1.5">من شهر <span className="text-rose-500">*</span></label>
                <input
                  type="month"
                  className="input-field w-full"
                  value={backfillMonth}
                  onChange={(e) => setBackfillMonth(e.target.value)}
                  max={new Date().toISOString().slice(0, 7)}
                  required
                />
                <p className="text-xs text-muted-soft dark:text-body-dark mt-1">
                  مثال: إذا كانت الشقة تحقق إيرادات منذ مايو، اختر مايو وسيُنشئ النظام تسوية لكل شهر (مايو، يونيو، يوليو، أغسطس...) حتى آخر شهر مكتمل.
                </p>
              </div>
              <div className="rounded-lg border border-accent/40 bg-accent-soft p-3 text-sm text-muted-soft dark:text-body-dark">
                يُحتسب كل شهر من إيرادات الحجوزات الفعلية لنطاق الشريك في ذلك الشهر، ويُتخطى أي شهر لديه تسوية سابقة أو لا توجد فيه إيرادات.
              </div>
              <button onClick={handleBackfill} disabled={backfilling} className="btn-accent w-full h-11 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {backfilling ? 'جاري إنشاء التسويات...' : 'إنشاء التسويات الشهرية'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
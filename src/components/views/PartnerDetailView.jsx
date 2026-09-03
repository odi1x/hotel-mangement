import { useState, useEffect } from 'react';
import { ChevronLeft, Calculator, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { useData } from '../../context/DataContext';
import SettlePartnerModal from '../ui/SettlePartnerModal';
import SettlementStatusBadge from '../ui/SettlementStatusBadge';
import toast from 'react-hot-toast';

function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(amount);
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
  const { fetchPartnerDetail, fetchPartnerSettlements, markSettlementPaid, voidSettlement, apartments } = useData();
  const [partner, setPartner] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [expandingId, setExpandingId] = useState(null);

  useEffect(() => {
    if (!partnerId) return;
    async function load() {
      setLoading(true);
      try {
        const [p, s] = await Promise.all([
          fetchPartnerDetail(partnerId),
          fetchPartnerSettlements(partnerId),
        ]);
        setPartner(p);
        setSettlements(s || []);
      } catch (e) {
        console.error('Failed to load partner detail:', e);
        toast.error('فشل في تحميل بيانات الشريك');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [partnerId, fetchPartnerDetail, fetchPartnerSettlements]);

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink dark:text-white">سجل التسويات</h2>
              <button onClick={() => setSettling(true)} className="btn-accent h-9 px-4 text-sm">
                <Calculator size={16} />
                <span>تسوية جديدة</span>
              </button>
            </div>

            <div className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden">
              <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
                {settlements.map((s) => {
                  const isExpanded = expandingId === s.id;

                  return (
                    <li key={s.id} className="px-6 py-4 hover:bg-surface-soft/50 dark:hover:bg-surface-dark-elevated/30 transition-colors">
                      <div className="flex items-start gap-4">
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
    </div>
  );
}
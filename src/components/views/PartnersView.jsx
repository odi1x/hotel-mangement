import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Edit, Calculator, Users, FileText } from 'lucide-react';
import { useData } from '../../context/DataContext';
import PartnerFormModal from '../ui/PartnerFormModal';
import SettlePartnerModal from '../ui/SettlePartnerModal';
import SettlementStatusBadge from '../ui/SettlementStatusBadge';
import EmptyState from '../ui/EmptyState';

function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr) {
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
    case 'active': return { label: 'نشط', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' };
    case 'inactive': return { label: 'غير نشط', className: 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300' };
    case 'paused': return { label: 'موقوف', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' };
    default: return { label: status, className: 'bg-surface-card text-ink dark:bg-surface-dark-elevated dark:text-white' };
  }
}

export default function PartnersView({ addTrigger, onSelectPartner }) {
  const { partners, fetchPartners, deletePartner, apartments } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [settlingPartner, setSettlingPartner] = useState(null);
  const addTriggerRef = useRef(addTrigger);

  // Watch addTrigger to open modal
  useEffect(() => {
    if (addTrigger !== addTriggerRef.current) {
      addTriggerRef.current = addTrigger;
      setShowAdd(true);
      setEditingPartner(null);
    }
  }, [addTrigger]);

  // Fetch on mount
  const fetchPartnersRef = useRef(fetchPartners);
  useEffect(() => {
    fetchPartnersRef.current = fetchPartners;
  }, [fetchPartners]);
  useEffect(() => {
    fetchPartnersRef.current();
  }, []);

  // Stats
  const activeCount = partners.filter(p => p.status === 'active').length;
  const totalPaid = partners.reduce((sum, p) => {
    const paid = (p.settlements || []).filter(s => s.status === 'paid').reduce((s, st) => s + Number(st.amount || 0), 0);
    return sum + paid;
  }, 0);
  const latestSettlement = partners
    .flatMap(p => (p.settlements || []).map(s => ({ ...s, partnerName: p.name })))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  const filteredPartners = partners.filter(p => {
    const matchesSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search) || p.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الشريك؟ سيتم حذف جميع تسوياته أيضاً.')) {
      try {
        await deletePartner(id);
      } catch {
        // toast handled in context
      }
    }
  };

  return (
    <>
      {/* PartnerFormModal */}
      <PartnerFormModal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setEditingPartner(null); }}
        initialData={editingPartner}
        apartments={apartments}
        addTrigger={addTrigger}
      />

      {/* SettlePartnerModal */}
      <SettlePartnerModal
        isOpen={!!settlingPartner}
        onClose={() => setSettlingPartner(null)}
        partner={settlingPartner}
        apartments={apartments}
      />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Desktop Stats Cards */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 mb-6">
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
                <Users size={13} className="text-muted dark:text-body-dark" />
              </div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark">
                إجمالي الشركاء
              </p>
            </div>
            <p className="text-2xl font-bold tracking-tight text-ink dark:text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {partners.length}
            </p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30">
                <Users size={13} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark">
                الشركاء النشطون
              </p>
            </div>
            <p className="text-2xl font-bold tracking-tight text-ink dark:text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {activeCount}
            </p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
                <Calculator size={13} className="text-muted dark:text-body-dark" />
              </div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark">
                إجمالي المدفوع
              </p>
            </div>
            <p className="text-2xl font-bold tracking-tight text-ink dark:text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
                <FileText size={13} className="text-muted dark:text-body-dark" />
              </div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark">
                آخر تسوية
              </p>
            </div>
            <p className="text-xl font-bold tracking-tight text-ink dark:text-white leading-none">
              {latestSettlement ? formatDate(latestSettlement.periodEnd) : '—'}
            </p>
          </div>
        </div>

        {/* Mobile Stats Strip */}
        <div className="md:hidden card-surface p-3 mb-4">
          <div className="grid grid-cols-4 gap-1 divide-x divide-x-reverse divide-hairline-soft dark:divide-hairline-dark-soft">
            <div className="px-2 py-1 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted dark:text-body-dark mb-0.5">
                <Users size={11} strokeWidth={2} />
                <span className="text-[10px] font-semibold">الشركاء</span>
              </div>
              <p className="text-xl font-bold tracking-tight leading-none text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {partners.length}
              </p>
            </div>
            <div className="px-2 py-1 flex flex-col items-center">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 mb-0.5">
                <Users size={11} strokeWidth={2} />
                <span className="text-[10px] font-semibold">نشط</span>
              </div>
              <p className="text-xl font-bold tracking-tight leading-none text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {activeCount}
              </p>
            </div>
            <div className="px-2 py-1 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted dark:text-body-dark mb-0.5">
                <Calculator size={11} strokeWidth={2} />
                <span className="text-[10px] font-semibold">مدفوع</span>
              </div>
              <p className="text-lg font-bold tracking-tight leading-none text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(totalPaid).replace('ر.س', '').trim()}
              </p>
            </div>
            <div className="px-2 py-1 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted dark:text-body-dark mb-0.5">
                <FileText size={11} strokeWidth={2} />
                <span className="text-[10px] font-semibold">أحدث</span>
              </div>
              <p className="text-base font-bold tracking-tight leading-none text-ink dark:text-white">
                {latestSettlement ? formatDate(latestSettlement.periodEnd).split(' ')[0] : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* List Container */}
        <div className="flex-1 bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="p-4 md:p-5 border-b border-hairline-soft dark:border-hairline-dark flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted size-5" />
                <input
                  type="text"
                  className="input-field w-full pr-10"
                  placeholder="ابحث بالاسم، الهاتف، أو البريد..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="nav-pill-group shrink-0" role="tablist">
                {['all', 'active', 'inactive', 'paused'].map((status) => (
                  <button
                    key={status}
                    role="tab"
                    aria-selected={statusFilter === status}
                    onClick={() => setStatusFilter(status)}
                    className={`h-9 px-4 rounded-full text-sm font-semibold transition-colors ${
                      statusFilter === status
                        ? 'bg-canvas text-ink shadow-pill dark:bg-hairline-dark-soft dark:text-white'
                        : 'text-muted hover:text-ink dark:hover:text-white'
                    }`}>
                    {status === 'all' && 'الكل'}
                    {status === 'active' && 'نشط'}
                    {status === 'inactive' && 'غير نشط'}
                    {status === 'paused' && 'موقوف'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setShowAdd(true); setEditingPartner(null); }}
              className="btn-accent h-10 shrink-0"
            >
              <Plus size={18} />
              <span>شريك جديد</span>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto min-h-0 pt-2 md:pt-0 pb-24 md:pb-0">
            {filteredPartners.length === 0 ? (
              <EmptyState
                icon={Users}
                title={search ? 'لا توجد نتائج مطابقة' : 'لا شركاء بعد'}
                subtitle={search
                  ? 'جرّب تغيير البحث أو الفلترة'
                  : 'ابدأ بإضافة أول شريك لتقاسم الإيرادات'}
                variant="dashed"
                action={
                  <button onClick={() => { setShowAdd(true); setEditingPartner(null); }} className="btn-accent h-10 px-5">
                    <Plus size={16} />
                    <span>إضافة أول شريك</span>
                  </button>
                }
              />
            ) : (
              <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
                {filteredPartners.map((partner) => {
                  const statusConfig = getStatusConfig(partner.status);
                  const latestSettlement = (partner.settlements || [])[0];
                  return (
                    <li
                      key={partner.id}
                      className="px-6 py-4 hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectPartner ? onSelectPartner(partner.id) : null}
                    >
                      <div className="flex items-center gap-4">
                        {/* Color indicator based on comp type */}
                        <div className="h-9 w-2 rounded-full shrink-0 bg-accent" />

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold leading-tight text-ink dark:text-white truncate">{partner.name}</p>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5 ${statusConfig.className}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted dark:text-body-dark flex-wrap mt-1">
                            {partner.phone && (
                              <span className="flex items-center gap-1">
                                <span>📞</span> {partner.phone}
                              </span>
                            )}
                            {partner.email && (
                              <span className="flex items-center gap-1">
                                <span>✉️</span> {partner.email}
                              </span>
                            )}
                            <span className="text-muted-soft">·</span>
                            <span>
                              {partner.apartmentIds.length === 0 ? 'كل الوحدات' : `${partner.apartmentIds.length} وحدة`}
                            </span>
                            <span className="text-muted-soft">·</span>
                            <span className="badge-pill badge-ghost text-[11px] px-2 py-0.5">
                              {getCompLabel(partner.compType, partner.percentage, partner.fixedAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Latest settlement badge */}
                        {latestSettlement && (
                          <SettlementStatusBadge status={latestSettlement.status} />
                        )}

                        {/* Action buttons (reveal on hover) */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowAdd(true); setEditingPartner(partner); }}
                            className="icon-action hover:text-accent"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSettlingPartner(partner); }}
                            className="icon-action hover:text-emerald-600"
                            title="تسوية جديدة"
                          >
                            <Calculator size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(partner.id); }}
                            className="icon-action hover:text-rose-600"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
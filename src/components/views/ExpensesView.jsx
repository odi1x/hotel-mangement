import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Filter, Wallet, Home, Zap, Users, Wrench, Megaphone,
  Shield, Package, ShieldCheck, HandCoins, MoreHorizontal, TrendingUp, TrendingDown,
  Pencil, Trash2, Repeat, Building2, X,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../ui/EmptyState';
import ExpenseForm from '../ui/ExpenseForm';
import {
  EXPENSE_CATEGORIES,
  categoryLabel,
  computeExpenseStats,
  contributionInPeriod,
  formatSAR,
} from '../../lib/expenseUtils';

const ICON_MAP = {
  Home, Zap, Users, Wrench, Megaphone, Shield, Package, ShieldCheck,
  HandCoins, MoreHorizontal, Wallet,
};

/** Look up the lucide icon for a category. Kept out of expenseUtils.js so
 *  that file stays free of React/Lucide imports. */
function iconFor(category) {
  const key = EXPENSE_CATEGORIES.find(c => c.value === category)?.iconKey || 'MoreHorizontal';
  return ICON_MAP[key] || MoreHorizontal;
}

/** Format a date for display in the ledger list. Locale-aware, RTL friendly. */
function fmtDate(d) {
  return new Date(d).toLocaleDateString('ar-SA-u-nu-latn', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function ExpensesView({ initialFilter = null, addTrigger = 0 }) {
  const { expenses, apartments, deleteExpense } = useData();
  const { user } = useAuth();

  const [showAdd, setShowAdd] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // React to Layout's "New Expense" button. The counter increments per click;
  // we open the add modal only when it actually changes vs the last-seen
  // value — prevents spurious opens on remount when trigger is already >0.
  const lastAddTrigger = useRef(addTrigger);
  useEffect(() => {
    if (addTrigger !== lastAddTrigger.current) {
      lastAddTrigger.current = addTrigger;
      setShowAdd(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addTrigger]);

  // When arriving via deep-link (e.g. from ApartmentsView or AnalyticsView P&L),
  // default to 'all' time so the user sees everything for that unit, and
  // apply the apartment filter. Otherwise default to 'month'.
  const [timeFilter, setTimeFilter] = useState(initialFilter?.apartmentId ? 'all' : 'month');
  const [apartmentFilter, setApartmentFilter] = useState(initialFilter?.apartmentId || null);

  const canEdit = user?.role === 'admin' || user?.permissions?.canEdit;
  const canDelete = user?.role === 'admin' || user?.permissions?.canDelete;

  const stats = useMemo(() => computeExpenseStats(expenses), [expenses]);

  // Period-aware hero — label + amount + optional comparison, driven by the
  // current time filter chip. Previously the hero was hardcoded to "this
  // month" no matter which chip was selected, which meant switching to
  // quarter/year/all left the hero on stale numbers. Now:
  //   - month:   this month vs last month (delta shown)
  //   - quarter: this quarter, prior quarter (delta shown)
  //   - year:    this year, prior year (delta shown)
  //   - all:     lifetime total (no comparison)
  const heroSummary = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'month') {
      return {
        label: 'صرفَك هذا الشهر',
        amount: stats.thisMonth,
        prevLabel: 'الشهر الماضي',
        prevAmount: stats.lastMonth,
      };
    }
    if (timeFilter === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      const thisStart = new Date(now.getFullYear(), q * 3, 1);
      const thisEnd = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
      const prevStart = new Date(now.getFullYear(), (q - 1) * 3, 1);
      const prevEnd = new Date(now.getFullYear(), (q - 1) * 3 + 3, 0, 23, 59, 59, 999);
      return {
        label: 'صرفَك هذا الربع',
        amount: (expenses || []).reduce((s, e) => s + contributionInPeriod(e, thisStart, thisEnd), 0),
        prevLabel: 'الربع الماضي',
        prevAmount: (expenses || []).reduce((s, e) => s + contributionInPeriod(e, prevStart, prevEnd), 0),
      };
    }
    if (timeFilter === 'year') {
      const thisStart = new Date(now.getFullYear(), 0, 1);
      const thisEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      const prevStart = new Date(now.getFullYear() - 1, 0, 1);
      const prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return {
        label: 'صرفَك هذه السنة',
        amount: (expenses || []).reduce((s, e) => s + contributionInPeriod(e, thisStart, thisEnd), 0),
        prevLabel: 'السنة الماضية',
        prevAmount: (expenses || []).reduce((s, e) => s + contributionInPeriod(e, prevStart, prevEnd), 0),
      };
    }
    // 'all' — lifetime total, no comparison
    return {
      label: 'إجمالي المصروفات',
      amount: (expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0),
      prevLabel: null,
      prevAmount: 0,
    };
  }, [expenses, timeFilter, stats.thisMonth, stats.lastMonth]);

  // Look up the pinned apartment (for the chip label).
  const pinnedApartment = apartmentFilter
    ? apartments.find(a => a.id === apartmentFilter)
    : null;

  // Apply active filters to the list. Recurring records are RULES (ongoing
  // obligations) not events — they always appear regardless of the time
  // filter. Non-recurring records filter by date normally. This matches
  // how analytics.js computes totals (proration for recurring), so the
  // hero total, the filtered total below, and analytics all agree.
  const filtered = useMemo(() => {
    const now = new Date();
    // Only `from` (period start) is needed here. `to` (period end) used to
    // be part of the "hide future recurring rules" check, but rules are
    // now always visible in the list regardless of whether they've started.
    let from = null;
    if (timeFilter === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeFilter === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), q * 3, 1);
    } else if (timeFilter === 'year') {
      from = new Date(now.getFullYear(), 0, 1);
    }

    return (expenses || [])
      .filter(e => {
        // Recurring rules represent ongoing obligations and should always
        // appear in the list — regardless of whether the current time
        // filter's window overlaps with the rule's start. The only reason
        // to hide is if the rule has been explicitly ended (recurringUntil)
        // and that end date is BEFORE the current period starts — in
        // which case the rule no longer applies.
        if (e.isRecurring) {
          if (!from) return true;
          if (e.recurringUntil && new Date(e.recurringUntil) < from) return false;
          return true;
        }
        // One-time expenses filter by date normally.
        return from ? new Date(e.date) >= from : true;
      })
      .filter(e => (categoryFilter === 'all' ? true : e.category === categoryFilter))
      .filter(e => (apartmentFilter ? e.apartmentId === apartmentFilter : true))
      .filter(e => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          e.title?.toLowerCase().includes(s) ||
          e.vendor?.toLowerCase().includes(s) ||
          categoryLabel(e.category).includes(search)
        );
      });
  }, [expenses, timeFilter, categoryFilter, search, apartmentFilter]);

  // Total for the current filter selection — uses proration for recurring
  // so the number matches the hero and analytics.
  const filteredTotal = useMemo(() => {
    const now = new Date();
    let from, to;
    if (timeFilter === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeFilter === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), q * 3, 1);
      to = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    } else if (timeFilter === 'year') {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else {
      // 'all' — just sum literal amounts (no proration makes sense here)
      return filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
    }
    return filtered.reduce((s, e) => s + contributionInPeriod(e, from, to), 0);
  }, [filtered, timeFilter]);

  return (
    <>
      {/* HERO — the "how much did you spend" panel.
          Mobile: compact, tabular numbers dominate.
          Desktop: adds a 6-month sparkline strip on the trailing edge. */}
      <div className="card-surface p-4 md:p-6 mb-3 md:mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow mb-1.5">{heroSummary.label}</p>
            <p
              className="text-3xl md:text-4xl font-bold tracking-tight text-ink dark:text-white leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatSAR(heroSummary.amount)}
              <span className="text-base md:text-lg font-medium text-muted dark:text-body-dark mr-1.5">ر.س</span>
            </p>
            <p className="text-xs text-muted-soft mt-2 flex items-center gap-1.5">
              {(() => {
                if (!heroSummary.prevLabel) return <span>إجمالي عبر جميع الفترات</span>;
                const prev = heroSummary.prevAmount;
                const curr = heroSummary.amount;
                if (prev <= 0 && curr <= 0) return <span>لا بيانات للمقارنة</span>;
                if (prev <= 0) return <span>لا مقارنة — {heroSummary.prevLabel} كان صفر</span>;
                const deltaPct = ((curr - prev) / prev) * 100;
                const isUp = deltaPct > 0;
                return (
                  <>
                    {isUp ? (
                      <TrendingUp size={13} className="text-ink dark:text-white shrink-0" />
                    ) : (
                      <TrendingDown size={13} className="text-accent-strong shrink-0" />
                    )}
                    <span>
                      <span
                        className={isUp ? 'text-ink dark:text-white font-semibold' : 'text-accent-strong font-semibold'}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {Math.abs(deltaPct).toFixed(0)}%
                      </span>
                      {' '}{isUp ? 'أعلى من' : 'أقل من'} {heroSummary.prevLabel} ({formatSAR(prev)} ر.س)
                    </span>
                  </>
                );
              })()}
            </p>
          </div>

          {/* 6-month sparkline on desktop only. Each bar = one month. Current
              month is filled solid, past months are outlined. */}
          <div className="hidden md:flex items-end gap-1 shrink-0 h-14">
            {stats.monthTrend.map((m, i) => {
              const max = Math.max(1, ...stats.monthTrend.map(x => x.total));
              const heightPct = Math.max(6, (m.total / max) * 100);
              const isCurrent = i === stats.monthTrend.length - 1;
              return (
                <div
                  key={m.monthKey}
                  className={`w-2 rounded-sm ${isCurrent ? 'bg-ink dark:bg-white' : 'bg-surface-strong dark:bg-hairline-dark'}`}
                  style={{ height: `${heightPct}%` }}
                  title={`${m.monthKey}: ${formatSAR(m.total)} ر.س`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* CATEGORY STRIP — this is the signature.
          Horizontal scroll on mobile so cards can be dense but not squished.
          Grid on desktop. Each card shows category, this-month total, share%,
          and delta from last month. Empty categories are hidden. */}
      {stats.byCategory.length > 0 && (
        <div className="mb-3 md:mb-4">
          <div className="flex overflow-x-auto md:grid md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3 -mx-3 md:mx-0 px-3 md:px-0 pb-1 md:pb-0 scrollbar-none">
            {stats.byCategory.map(({ category, total, share, deltaPct }) => {
              const Icon = iconFor(category);
              return (
                <div
                  key={category}
                  className="shrink-0 w-40 md:w-auto card-surface p-3"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={13} className="text-muted dark:text-body-dark shrink-0" />
                    <p className="text-2xs font-semibold text-muted dark:text-body-dark truncate">
                      {categoryLabel(category)}
                    </p>
                  </div>
                  <p
                    className="text-lg font-bold tracking-tight text-ink dark:text-white leading-none"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatSAR(total)}
                    <span className="text-xs font-medium text-muted-soft mr-1">ر.س</span>
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p
                      className="text-2xs text-muted-soft"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {share.toFixed(0)}%
                    </p>
                    {deltaPct != null && (
                      <p
                        className={`text-2xs font-semibold flex items-center gap-0.5 ${
                          deltaPct > 0 ? 'text-ink dark:text-white' : 'text-accent-strong'
                        }`}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {deltaPct > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(deltaPct).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST — the ledger itself. */}
      <div className="flex-1 bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden flex flex-col min-h-0">
        {/* Toolbar: title + search + add */}
        <div className="p-3 md:p-4 border-b border-hairline-soft dark:border-hairline-dark shrink-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold tracking-tight text-ink dark:text-white leading-tight">
                سجل المصروفات
              </h3>
              <p
                className="text-xs text-muted-soft mt-0.5"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {filtered.length} {filtered.length === 1 ? 'مصروف' : 'مصروف'} —{' '}
                {formatSAR(filteredTotal)} ر.س
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64 md:flex-none">
                <input
                  type="text"
                  placeholder="ابحث في السجل..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 pr-4 py-2 w-full"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-muted-soft" />
              </div>
            </div>
          </div>

          {/* Filter chips — time range + category selector.
              Horizontal scroll on mobile for the time chips. */}
          <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible -mx-3 md:mx-0 px-3 md:px-0 pb-1 md:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 mr-1 shrink-0">
              <Filter size={12} className="text-muted-soft" />
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-soft">
                تصفية:
              </span>
            </div>
            <div className="nav-pill-group shrink-0">
              {[
                { id: 'month',   label: 'هذا الشهر' },
                { id: 'quarter', label: 'الربع الحالي' },
                { id: 'year',    label: 'هذه السنة' },
                { id: 'all',     label: 'الكل' },
              ].map(o => (
                <button
                  key={o.id}
                  onClick={() => setTimeFilter(o.id)}
                  className={`nav-pill text-2xs md:text-xs ${timeFilter === o.id ? 'nav-pill-active' : ''}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field h-7 py-0 text-xs w-auto shrink-0"
            >
              <option value="all">كل التصنيفات</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {pinnedApartment && (
              <button
                onClick={() => setApartmentFilter(null)}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-ink dark:bg-white text-white dark:text-ink text-2xs font-semibold shrink-0 hover:opacity-90 transition-opacity"
                title="إزالة تصفية الوحدة"
              >
                <Building2 size={11} />
                <span>{pinnedApartment.name}</span>
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* List rows */}
        <div className="flex-1 overflow-y-auto min-h-0 pt-2 md:pt-0 pb-24 md:pb-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={search || categoryFilter !== 'all' ? 'لا نتائج مطابقة' : 'لا مصروفات بعد'}
              subtitle={
                search || categoryFilter !== 'all'
                  ? 'جرّب تعديل التصفية أو مصطلح البحث.'
                  : 'ابدأ بتسجيل مصروف يدوي — إيجار أو راتب أو أي مبلغ خرج من العمل.'
              }
              variant="dashed"
              action={
                canEdit && !search && categoryFilter === 'all' && (
                  <button onClick={() => setShowAdd(true)} className="btn-accent h-10 px-5">
                    <Plus size={16} />
                    <span>إضافة أول مصروف</span>
                  </button>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
              {filtered.map((row) => {
                const Icon = iconFor(row.category);
                const apartment = row.apartmentId ? apartments.find(a => a.id === row.apartmentId) : null;

                return (
                  <li
                    key={row.id}
                    className="p-3 md:px-5 md:py-4 hover:bg-surface-soft/40 dark:hover:bg-surface-dark-elevated/40 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Category icon chip */}
                      <div className="w-9 h-9 rounded-md bg-surface-soft dark:bg-surface-dark-elevated flex items-center justify-center text-ink dark:text-white shrink-0">
                        <Icon size={16} />
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-semibold text-sm text-ink dark:text-white truncate">
                            {row.title}
                          </p>
                          <p
                            className="text-sm font-bold text-ink dark:text-white shrink-0"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {formatSAR(row.amount)}
                            <span className="text-2xs font-medium text-muted-soft mr-0.5">ر.س</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-2xs text-muted dark:text-body-dark">
                          <span>{fmtDate(row.date)}</span>
                          <span className="text-hairline">·</span>
                          <span>{categoryLabel(row.category)}</span>
                          {apartment && (
                            <>
                              <span className="text-hairline">·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Building2 size={10} />
                                {apartment.name}
                              </span>
                            </>
                          )}
                          {row.isRecurring && (
                            <>
                              <span className="text-hairline">·</span>
                              <span className="inline-flex items-center gap-0.5 badge-pill text-2xs px-1.5 py-0">
                                <Repeat size={9} />
                                {row.recurringPeriod === 'yearly' ? 'سنوي' : 'شهري'}
                              </span>
                            </>
                          )}
                          {row.vendor && (
                            <>
                              <span className="text-hairline">·</span>
                              <span className="truncate">{row.vendor}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Row actions — always visible on mobile (44px tap targets
                          via the icon-action utility) since there's no hover. */}
                      <div className="flex items-center gap-0 shrink-0 -mr-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <button
                            onClick={() => setEditingRow(row)}
                            className="icon-action"
                            aria-label="تعديل"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setConfirmDeleteId(row.id)}
                            className="icon-action"
                            aria-label="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <ExpenseForm onClose={() => setShowAdd(false)} />
      )}
      {editingRow && (
        <ExpenseForm
          initialData={editingRow}
          onClose={() => setEditingRow(null)}
        />
      )}

      {/* Delete confirm — portaled so it also blurs the header consistently */}
      {confirmDeleteId && (
        <DeleteConfirmModal
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={async () => {
            try {
              await deleteExpense(confirmDeleteId);
              setConfirmDeleteId(null);
            } catch (err) {
              alert('فشل الحذف');
            }
          }}
        />
      )}
    </>
  );
}

/** Simple delete confirmation — the same pattern used elsewhere (e.g.
 *  ResidentsView, MaintenanceView). Portaled by consumers. */
function DeleteConfirmModal({ onCancel, onConfirm }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4"
      data-modal-active
      dir="rtl"
    >
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft w-full max-w-sm overflow-hidden border border-hairline dark:border-hairline-dark-soft anim-sheet">
        <div className="sheet-handle" />
        <div className="p-5">
          <h3 className="font-semibold text-ink dark:text-white text-base mb-1">حذف هذا المصروف؟</h3>
          <p className="text-sm text-muted dark:text-body-dark">
            هذا الإجراء دائم ولا يمكن التراجع عنه.
          </p>
        </div>
        <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark-soft flex gap-2">
          <button onClick={onCancel} className="btn-secondary h-11 px-5 flex-1">إلغاء</button>
          <button onClick={onConfirm} className="btn-danger h-11 px-5 flex-1">حذف</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { useMemo, useState } from 'react';
import { Plus, TagsIcon, Pencil, Trash2, AlertTriangle, Calendar, Home, ArrowLeftRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatRuleValue, summarizeDaysOfWeek } from '../../lib/pricingUtils';
import PricingRuleForm from '../ui/PricingRuleForm';

/**
 * Pricing view: 12-month rule timeline + rule list.
 *
 * Signature: the timeline. 12 columns (one per month, starting from THIS
 * month), each rule drawn as a horizontal bar spanning its date range.
 * Overlaps stack vertically so you can literally see two rules colliding
 * on a date — that's exactly when priority matters, and this is where you
 * catch a mispricing before it hurts.
 */
export default function PricingView() {
  const { apartments, pricingRules, deletePricingRule } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'global' | apartmentId

  // "Now" as a stable timestamp captured on mount and each time the rules
  // list changes — enough to keep "is this rule active now?" fresh whenever
  // rules are created / edited / deleted.
  // eslint-disable-next-line react-hooks/purity, react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [pricingRules]);

  // Timeline anchor — 12 months starting from the first day of this month
  const timelineStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const timelineEnd = useMemo(() => {
    const d = new Date(timelineStart);
    d.setMonth(d.getMonth() + 12);
    return d;
  }, [timelineStart]);

  // Months headers
  const months = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(timelineStart);
      d.setMonth(d.getMonth() + i);
      arr.push({
        label: d.toLocaleDateString('ar-EG', { month: 'short' }),
        year:  d.toLocaleDateString('ar-EG', { year: 'numeric' }),
        start: new Date(d).getTime()
      });
    }
    return arr;
  }, [timelineStart]);

  // Rules in scope + within the 12-month window (so we don't draw distant rules)
  const scopedRules = useMemo(() => {
    return pricingRules
      .filter(r => {
        // Scope filter
        if (scopeFilter === 'global' && r.apartmentId) return false;
        if (scopeFilter !== 'all' && scopeFilter !== 'global' && r.apartmentId !== scopeFilter && r.apartmentId != null) return false;
        // In window
        const rEnd = new Date(r.endDate).getTime();
        const rStart = new Date(r.startDate).getTime();
        return rEnd >= timelineStart.getTime() && rStart <= timelineEnd.getTime();
      });
  }, [pricingRules, scopeFilter, timelineStart, timelineEnd]);

  // Convert rule → % offset + width relative to timeline
  const barStyle = (rule) => {
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    const rStart = Math.max(new Date(rule.startDate).getTime(), timelineStart.getTime());
    const rEnd   = Math.min(new Date(rule.endDate).getTime(), timelineEnd.getTime());
    const rightPct = ((rStart - timelineStart.getTime()) / totalMs) * 100; // RTL: from right
    const widthPct = Math.max(1, ((rEnd - rStart) / totalMs) * 100);
    return { right: `${rightPct}%`, width: `${widthPct}%` };
  };

  const dateFormat = (d) => new Date(d).toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const scopeLabel = (rule) => {
    if (!rule.apartmentId) return 'كل الوحدات';
    return apartments.find(a => a.id === rule.apartmentId)?.name || 'وحدة محذوفة';
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
              <TagsIcon size={13} className="text-muted dark:text-[#a1a1aa]" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa]">
              إجمالي القواعد
            </p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-ink dark:text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {pricingRules.length}
          </p>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
              <Calendar size={13} className="text-muted dark:text-[#a1a1aa]" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa]">
              قواعد نشطة الآن
            </p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-accent-strong leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {pricingRules.filter(r => (
              new Date(r.startDate).getTime() <= now && new Date(r.endDate).getTime() >= now
            )).length}
          </p>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
              <Home size={13} className="text-muted dark:text-[#a1a1aa]" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa]">
              قواعد عامة (لكل الوحدات)
            </p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-ink dark:text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {pricingRules.filter(r => !r.apartmentId).length}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-[#242424] p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold tracking-tight text-ink dark:text-white leading-tight">
              الجدول الزمني للأسعار
            </h3>
            <p className="text-xs text-muted dark:text-[#a1a1aa] mt-0.5">
              ١٢ شهراً قادمة — كل شريط يمثّل قاعدة سعرية
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="input-field h-9 text-xs w-auto"
            >
              <option value="all">كل النطاقات</option>
              <option value="global">القواعد العامة فقط</option>
              {apartments.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button onClick={() => setShowAdd(true)} className="btn-accent h-9 px-4">
              <Plus size={14} />
              <span>قاعدة جديدة</span>
            </button>
          </div>
        </div>

        {/* Month headers */}
        <div className="relative" dir="rtl">
          <div className="grid grid-cols-12 border-b border-hairline-soft dark:border-[#242424] pb-1.5">
            {months.map((m, i) => (
              <div key={i} className="text-center border-r border-hairline-soft dark:border-[#242424] last:border-r-0 first:border-r-0">
                <div className="text-[10px] font-semibold text-muted dark:text-[#a1a1aa]">{m.label}</div>
                <div className="text-[9px] text-muted-soft">{m.year}</div>
              </div>
            ))}
          </div>

          {/* Rows */}
          {scopedRules.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted dark:text-[#a1a1aa]">
                {pricingRules.length === 0
                  ? 'لم تُنشأ قواعد سعرية بعد. ابدأ بإنشاء قاعدة للحج أو رمضان.'
                  : 'لا توجد قواعد ضمن هذا النطاق للاثنى عشر شهراً القادمة.'}
              </p>
            </div>
          ) : (
            <div className="relative mt-3 space-y-2">
              {scopedRules.map(rule => (
                <div key={rule.id} className="relative h-9 group">
                  {/* Faint month grid inside each row */}
                  <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                    {months.map((_, i) => (
                      <div key={i} className="border-r border-hairline-soft/60 dark:border-[#242424]/70 last:border-r-0 first:border-r-0"></div>
                    ))}
                  </div>

                  {/* The rule bar */}
                  <div
                    className="absolute top-1 bottom-1 rounded-md flex items-center px-2 text-white text-[11px] font-semibold overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] hover:shadow-md"
                    style={{
                      ...barStyle(rule),
                      backgroundColor: rule.color,
                      boxShadow: `0 1px 2px ${rule.color}44`
                    }}
                    onClick={() => setEditRule(rule)}
                    title={`${rule.label} — ${formatRuleValue(rule)} — ${scopeLabel(rule)}`}
                  >
                    <span className="truncate">{rule.label}</span>
                    <span className="mx-1.5 opacity-60">·</span>
                    <span className="opacity-90" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatRuleValue(rule)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rule list — plain */}
      <div className="flex-1 bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-[#242424] overflow-hidden flex flex-col min-h-0">
        <div className="p-5 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-center shrink-0">
          <h3 className="font-semibold tracking-tight text-ink dark:text-white">قائمة القواعد</h3>
          <span className="badge-pill text-[11px] font-semibold">
            {pricingRules.length} قاعدة
          </span>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {pricingRules.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-surface-soft dark:bg-surface-dark-elevated flex items-center justify-center mb-4">
                <TagsIcon size={22} className="text-muted-soft" />
              </div>
              <p className="text-base font-semibold text-ink dark:text-white mb-1">
                لا توجد قواعد سعرية بعد
              </p>
              <p className="text-sm text-muted dark:text-[#a1a1aa] mb-4">
                أنشئ قاعدة موسمية لتطبيق أسعار مختلفة على فترات معيّنة تلقائياً.
              </p>
              <button onClick={() => setShowAdd(true)} className="btn-accent h-10 px-5 mx-auto">
                <Plus size={16} />
                <span>إنشاء قاعدة أولى</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-hairline-soft dark:divide-[#242424]">
              {pricingRules.map(rule => {
                const isActive = new Date(rule.startDate).getTime() <= now && new Date(rule.endDate).getTime() >= now;
                const isPast = new Date(rule.endDate).getTime() < now;

                return (
                  <li key={rule.id} className="px-6 py-4 hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-2 rounded-full shrink-0" style={{ backgroundColor: rule.color }}></div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className={`font-semibold leading-tight ${isPast ? 'text-muted line-through' : 'text-ink dark:text-white'}`}>
                            {rule.label}
                          </p>
                          {isActive && (
                            <span className="badge-pill badge-solid text-[10px] font-semibold">نشطة الآن</span>
                          )}
                          {isPast && (
                            <span className="badge-pill badge-ghost text-[10px] font-semibold">منتهية</span>
                          )}
                          {rule.apartmentId ? (
                            <span className="badge-pill badge-outline text-[10px] font-semibold">وحدة محددة</span>
                          ) : (
                            <span className="badge-pill badge-dashed text-[10px] font-semibold">كل الوحدات</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted dark:text-[#a1a1aa] flex-wrap">
                          <span>{dateFormat(rule.startDate)}</span>
                          <ArrowLeftRight size={11} className="text-muted-soft" />
                          <span>{dateFormat(rule.endDate)}</span>
                          <span className="text-muted-soft">·</span>
                          <span>{scopeLabel(rule)}</span>
                          {rule.daysOfWeek && rule.daysOfWeek.length > 0 && rule.daysOfWeek.length < 7 && (
                            <>
                              <span className="text-muted-soft">·</span>
                              <span>{summarizeDaysOfWeek(rule.daysOfWeek)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-soft mb-0.5">
                          {rule.priceMode === 'multiplier' ? 'المضاعف' : 'ثابت'}
                        </p>
                        <p className="text-lg font-bold tracking-tight" style={{ color: rule.color, fontVariantNumeric: 'tabular-nums' }}>
                          {formatRuleValue(rule)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditRule(rule)}
                          className="icon-action hover:text-accent"
                          title="تعديل"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(rule.id)}
                          className="icon-action hover:text-accent"
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

      {showAdd && <PricingRuleForm onClose={() => setShowAdd(false)} />}
      {editRule && (
        <PricingRuleForm onClose={() => setEditRule(null)} initialData={editRule} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
          <div className="absolute inset-0" onClick={() => setConfirmDelete(null)}></div>
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-sm border border-hairline dark:border-[#2e2e2e] overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-surface-card dark:bg-surface-dark-elevated mb-4">
                <AlertTriangle className="h-7 w-7 text-ink dark:text-white" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-ink dark:text-white mb-1.5">
                حذف هذه القاعدة السعرية؟
              </h3>
              <p className="text-sm text-muted dark:text-[#a1a1aa]">
                لن تؤثر على الحجوزات القائمة، لكن الحجوزات الجديدة لن تستفيد منها.
              </p>
            </div>
            <div className="p-4 border-t border-hairline-soft dark:border-[#242424] flex gap-3">
              <button
                onClick={() => { deletePricingRule(confirmDelete); setConfirmDelete(null); }}
                className="btn-primary flex-1"
              >
                تأكيد الحذف
              </button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

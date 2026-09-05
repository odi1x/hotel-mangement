import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, TrendingUp, Globe, Filter, ChevronDown, Check, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import DatePickerCal from '../ui/DatePickerCal';
import { getAccent } from '../../lib/accent';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsView({ setView }) {
  const accentHex = getAccent().hex;
  const { apartments, bookings, analytics, analyticsFilter, setAnalyticsFilter, isAnalyticsLoading } = useData();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState({ ...analyticsFilter });
  const [breakdownModal, setBreakdownModal] = useState(null);
  const [breakdownData, setBreakdownData] = useState([]);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  // Page-level period filter — mirrors the Expenses tab chip pattern
  // (month / quarter / year / all). Default 'year' gives the trend chart
  // enough data to be interesting. Changing this chip drives the API
  // request (via setAnalyticsFilter dates); the trend chart just displays
  // whatever came back — no separate chart-local filter anymore.
  const [periodFilter, setPeriodFilter] = useState('year');

  const hasFilterChanges = () => {
    const startDiffers = tempFilter.startDate !== analyticsFilter.startDate;
    const endDiffers = tempFilter.endDate !== analyticsFilter.endDate;

    const tempIds = tempFilter.apartmentIds || [];
    const activeIds = analyticsFilter.apartmentIds || [];
    const idsDiffer = tempIds.length !== activeIds.length || !tempIds.every(id => activeIds.includes(id));

    return startDiffers || endDiffers || idsDiffer;
  };

  const handleApplyFilter = () => {
    setAnalyticsFilter({ ...tempFilter });
    setIsFilterOpen(false);
  };

  // Compute the date range implied by a period chip. Returns null dates for
  // 'all' (analytics API treats missing dates as "no time filter").
  //
  // Format is YYYY-MM-DD (not ISO datetime with the Z suffix) because
  // DatePickerCal expects this format — it parses via s.split('-').map(Number),
  // which returns NaN for the day segment if there's a "T00:00:00.000Z" tail.
  // The API server also accepts either format via new Date(), so this is safe.
  const rangeForPeriod = (period) => {
    const now = new Date();
    const toDateStr = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (period === 'month') {
      return {
        startDate: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate:   toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    }
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      return {
        startDate: toDateStr(new Date(now.getFullYear(), q * 3, 1)),
        endDate:   toDateStr(new Date(now.getFullYear(), q * 3 + 3, 0)),
      };
    }
    if (period === 'year') {
      return {
        startDate: toDateStr(new Date(now.getFullYear(), 0, 1)),
        endDate:   toDateStr(new Date(now.getFullYear(), 11, 31)),
      };
    }
    return { startDate: null, endDate: null };
  };

  // Sync period chip ↔ analyticsFilter on mount. Since analyticsFilter is
  // stored in DataContext, it persists across navigation. But this component's
  // periodFilter state is fresh on every mount (defaults to 'year'). Without
  // sync, the user could leave Analytics on "month" and come back to see the
  // "year" chip highlighted while the underlying data still reflects month
  // range — visibly inconsistent.
  //
  // Behavior:
  //   - No dates set in analyticsFilter → apply the default (year) chip.
  //   - Dates match a known chip's range → highlight that chip.
  //   - Dates don't match any chip (custom via modal) → leave chip state
  //     alone; the "advanced filter" indicator handles that case.
  useEffect(() => {
    if (analyticsFilter.startDate && analyticsFilter.endDate) {
      for (const chip of ['month', 'quarter', 'year']) {
        const r = rangeForPeriod(chip);
        if (r.startDate === analyticsFilter.startDate && r.endDate === analyticsFilter.endDate) {
          setPeriodFilter(chip);
          return;
        }
      }
      // No chip matches — must be a custom range from the modal. Leave
      // periodFilter at its default; hasActiveFilters will highlight the
      // advanced filter indicator so the user sees why no chip is active.
      return;
    }
    // No dates: apply default period.
    const range = rangeForPeriod(periodFilter);
    setAnalyticsFilter(prev => ({ ...prev, ...range }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chip click handler — updates state + dates in one shot.
  const handlePeriodChange = (period) => {
    setPeriodFilter(period);
    const range = rangeForPeriod(period);
    setAnalyticsFilter(prev => ({ ...prev, ...range }));
  };


  const fetchBreakdown = async (type) => {
    setBreakdownModal(type);
    setIsBreakdownLoading(true);
    setBreakdownData([]);
    try {
      const params = new URLSearchParams({ action: 'breakdown', type });
      if (analyticsFilter.apartmentIds) params.append('apartmentIds', analyticsFilter.apartmentIds.join(','));
      if (analyticsFilter.startDate) params.append('startDate', analyticsFilter.startDate);
      if (analyticsFilter.endDate) params.append('endDate', analyticsFilter.endDate);

      const res = await axios.get(`/api/analytics?${params.toString()}`);
      setBreakdownData(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch breakdown', err);
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  const calculateNights = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  // Per-unit P&L breakdown — populated post-migration by the API. Empty
  // for pre-migration users (the API can't cleanly separate unit costs
  // without the Expense table). Sorted by netProfit desc from the server.
  const perUnitPnL = useMemo(() => {
    return (analytics.perUnitPnL || []).map(u => ({
      ...u,
      name: u.name || apartments.find(a => a.id === u.id)?.name || 'وحدة',
    }));
  }, [analytics.perUnitPnL, apartments]);


  // Trend data — comes straight from the API, which already applied the
  // date range implied by the current period chip. No client-side slicing.
  const trendData = useMemo(() => {
    return analytics.dailyTrend && analytics.dailyTrend.length > 0
      ? [...analytics.dailyTrend]
      : [];
  }, [analytics.dailyTrend]);

  // Chart KPI strip — pulls straight from the analytics totals so it agrees
  // with the main KPI cards above. Previously summed from a client-side
  // sliced trend, which drifted from the API total whenever the slice
  // didn't cover the full period.
  const chartKPIs = useMemo(() => ({
    revenue: analytics.totalRevenue || 0,
    expenses: analytics.totalExpenses || 0,
    profit: analytics.netProfit || 0,
  }), [analytics.totalRevenue, analytics.totalExpenses, analytics.netProfit]);

  const displayTrendData = useMemo(() => {
    if (trendData.length === 1) {
      // Pad with dummy data to force area fill
      const item = trendData[0];
      return [
        { ...item, name: ' ' },
        item,
        { ...item, name: '  ' }
      ];
    }
    return trendData;
  }, [trendData]);


  // Transform source counts for pie chart
  const sourceChartData = useMemo(() => {
    return Object.entries(analytics.sourceCounts || {}).map(([name, value]) => ({
      name,
      value
    }));
  }, [analytics.sourceCounts]);


  const exportToExcel = (isFiltered = false) => {
    let csvContent = "اسم النزيل,رقم الهوية,الجوال,الشقة,تاريخ الدخول,تاريخ الخروج,عدد الليالي,سعر الليلة,الإجمالي,المصدر\n";

    let exportBookings = bookings;

    if (isFiltered && hasActiveFilters) {
      if (analyticsFilter.apartmentIds?.length > 0) {
        exportBookings = exportBookings.filter(b => analyticsFilter.apartmentIds.includes(b.apartmentId));
      }
      if (analyticsFilter.startDate && analyticsFilter.endDate) {
        const fStart = new Date(analyticsFilter.startDate).getTime();
        const fEnd = new Date(analyticsFilter.endDate).getTime();
        exportBookings = exportBookings.filter(b => {
          const bStart = new Date(b.startDate).getTime();
          const bEnd = new Date(b.endDate).getTime();
          return bStart <= fEnd && bEnd >= fStart;
        });
      }
    }

    exportBookings.forEach(b => {
      const apt = apartments.find(a => a.id === b.apartmentId);
      const nights = calculateNights(b.startDate, b.endDate);
      const total = b.totalPrice || (b.pricePerNight * nights);

      const row = [
        b.residentName,
        b.residentId,
        b.phone,
        apt?.name || 'غير معروف',
        new Date(b.startDate).toLocaleDateString('en-CA'),
        new Date(b.endDate).toLocaleDateString('en-CA'),
        nights,
        b.pricePerNight,
        total,
        b.source || 'زيارة مباشرة'
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileName = isFiltered && hasActiveFilters ? `تقرير_التحليلات_المصفى_${new Date().toLocaleDateString('ar-EG')}.csv` : `تقرير_التحليلات_الشامل_${new Date().toLocaleDateString('ar-EG')}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Does the current filter state include anything that a user could think
  // of as "an active advanced filter"? Chip-driven dates don't count — they
  // just represent the current period selection (always set). Only true
  // "advanced" state:
  //   - specific apartments picked from the modal
  //   - a custom date range that DOESN'T match any period chip
  const hasActiveFilters = (() => {
    const hasApartmentFilter = analyticsFilter.apartmentIds?.length > 0;
    if (hasApartmentFilter) return true;
    if (!analyticsFilter.startDate || !analyticsFilter.endDate) return false;
    // If dates match the current chip's range, it's not "advanced" — just
    // the chip in action. Compare to millisecond precision.
    const chipRange = rangeForPeriod(periodFilter);
    if (!chipRange.startDate || !chipRange.endDate) return true; // 'all' has no dates
    return analyticsFilter.startDate !== chipRange.startDate
        || analyticsFilter.endDate   !== chipRange.endDate;
  })();


  if (isAnalyticsLoading) {
    return (
      <div className="h-full overflow-hidden flex flex-col animate-pulse">
        {/* Compact action strip — mirrors the filter chip + period chips + export row */}
        <div className="flex justify-between items-center mb-5 gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 bg-surface-card dark:bg-surface-dark-elevated rounded-full"></div>
            <div className="hidden md:flex items-center gap-2">
              <div className="h-7 w-14 bg-surface-card dark:bg-surface-dark-elevated rounded-full"></div>
              <div className="h-7 w-16 bg-surface-card dark:bg-surface-dark-elevated rounded-full"></div>
              <div className="h-7 w-14 bg-surface-card dark:bg-surface-dark-elevated rounded-full"></div>
              <div className="h-7 w-12 bg-surface-card dark:bg-surface-dark-elevated rounded-full"></div>
            </div>
          </div>
          <div className="h-9 w-20 bg-surface-card dark:bg-surface-dark-elevated rounded-full"></div>
        </div>

        {/* Hero — net profit card with the leading accent bar */}
        <div className="relative bg-surface-card dark:bg-surface-dark-elevated rounded-lg p-6 md:p-7 overflow-hidden shrink-0 mb-5">
          <span className="absolute right-0 top-6 bottom-6 w-[3px] rounded-l-full bg-surface-strong dark:bg-hairline-dark"></span>
          <div className="pr-3">
            <div className="h-3 w-24 bg-surface-strong/60 dark:bg-hairline-dark rounded mb-3"></div>
            <div className="h-10 w-56 bg-surface-strong dark:bg-hairline-dark rounded mb-3"></div>
            <div className="h-3 w-40 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
          </div>
        </div>

        {/* 3 KPI cards — revenue, occupancy, nights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0 mb-5">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface-card dark:bg-surface-dark-elevated p-5 rounded-lg">
              <div className="h-3 w-24 bg-surface-strong/60 dark:bg-hairline-dark rounded mb-3"></div>
              <div className="h-8 w-32 bg-surface-strong dark:bg-hairline-dark rounded mb-2"></div>
              <div className="h-3 w-28 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
            </div>
          ))}
        </div>

        {/* Trend chart (2/3) + Sources (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0 shrink-0">
          <div className="bg-surface-card dark:bg-surface-dark-elevated rounded-lg p-4 md:p-5 lg:col-span-2 flex flex-col min-h-[280px]">
            <div className="h-5 w-44 bg-surface-strong dark:bg-hairline-dark rounded mb-5"></div>
            <div className="flex gap-6 mb-5">
              <div className="h-4 w-24 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
              <div className="h-4 w-24 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
              <div className="h-4 w-24 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
            </div>
            <div className="flex-1 w-full bg-surface-soft dark:bg-hairline-dark rounded-lg"></div>
          </div>
          <div className="bg-surface-card dark:bg-surface-dark-elevated rounded-lg p-5 flex flex-col gap-4">
            <div className="h-5 w-36 bg-surface-strong dark:bg-hairline-dark rounded"></div>
            <div className="h-3 w-40 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
            {[1,2,3].map(i => (
              <div key={i}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="h-3 w-20 bg-surface-strong dark:bg-hairline-dark rounded"></div>
                  <div className="h-3 w-14 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
                </div>
                <div className="h-1.5 rounded-full bg-surface-soft dark:bg-hairline-dark/60 overflow-hidden">
                  <div className="h-full w-3/5 rounded-full bg-surface-strong dark:bg-hairline-dark"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-unit P&L rows */}
        <div className="bg-surface-card dark:bg-surface-dark-elevated rounded-lg p-4 md:p-5 shrink-0 mt-5">
          <div className="h-5 w-40 bg-surface-strong dark:bg-hairline-dark rounded mb-4"></div>
          <div className="space-y-3.5">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full bg-surface-strong dark:bg-hairline-dark shrink-0"></div>
                  <div className="h-3 w-32 bg-surface-strong dark:bg-hairline-dark rounded"></div>
                </div>
                <div className="h-3 w-16 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
                <div className="h-3 w-16 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
                <div className="hidden sm:block h-3 w-16 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-full flex flex-col">
      {/* Compact action strip — filter chip + Excel export. Was two full-size
          button rows (~130px total). Now a single ~36px row so the analytics
          content below gets that vertical space back. */}
      <div className="flex justify-between items-center mb-5 gap-3 shrink-0 flex-wrap">
        <div className="relative flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              // Snapshot the CURRENT analyticsFilter into tempFilter when
              // opening. useState's initializer only runs once (at mount),
              // so if analyticsFilter was empty at that moment (before the
              // mount-sync effect populated it), tempFilter would be
              // permanently stale — DatePicker would receive undefined
              // dates and render "undefined NaN". Refreshing on each open
              // fixes it and also picks up any changes made via the chips
              // since the last open.
              const nextOpen = !isFilterOpen;
              if (nextOpen) setTempFilter({ ...analyticsFilter });
              setIsFilterOpen(nextOpen);
            }}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold transition-colors border ${
              hasActiveFilters
                ? 'bg-accent-soft text-accent-strong border-accent/40'
                : 'bg-canvas text-muted border-hairline hover:text-ink dark:bg-surface-dark-elevated dark:text-body-dark dark:border-hairline-dark dark:hover:text-white'
            }`}
          >
            <Filter size={13} />
            <span>تصفية</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 bg-accent rounded-full mx-0.5"></span>}
            <ChevronDown size={13} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Mobile Excel export — sits directly next to the filter chip.
              Desktop keeps the trailing export group (hidden here). */}
          <button
            onClick={() => exportToExcel(false)}
            className="md:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold bg-ink text-white dark:bg-white dark:text-ink transition-colors hover:opacity-90"
            title="تحميل تقرير Excel"
          >
            <Download size={13} />
            <span>Excel</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => { const empty = { apartmentIds: [], startDate: null, endDate: null }; setAnalyticsFilter(empty); setTempFilter(empty); setIsFilterOpen(false); }}
              className="icon-action opacity-100 h-8 w-8"
              title="إلغاء التصفية"
            >
              <X size={14} />
            </button>
          )}

          {/* Period chips — inline with تصفية. Mirrors the Expenses tab
              pattern. Changing a chip updates analyticsFilter's date range,
              which triggers a refetch — every card on the page reflects
              the same period. */}
          <div className="nav-pill-group shrink-0">
            {[
              { id: 'month',   label: 'هذا الشهر' },
              { id: 'quarter', label: 'الربع الحالي' },
              { id: 'year',    label: 'هذه السنة' },
              { id: 'all',     label: 'الكل' },
            ].map(o => (
              <button
                key={o.id}
                onClick={() => handlePeriodChange(o.id)}
                className={`nav-pill text-xs ${periodFilter === o.id ? 'nav-pill-active' : ''}`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-2 w-[320px] bg-canvas dark:bg-surface-dark border border-hairline dark:border-hairline-dark-soft rounded-lg shadow-soft z-50 p-4">
              <div className="mb-4">
                <span className="block text-sm font-semibold text-muted dark:text-body-dark mb-2">الفترة الزمنية:</span>
                <DatePickerCal
                  value={{ startDate: tempFilter.startDate || null, endDate: tempFilter.endDate || null }}
                  onChange={(val) => setTempFilter({ ...tempFilter, startDate: val?.startDate || null, endDate: val?.endDate || null })}
                />
              </div>

              <div className="mb-4">
                <span className="block text-sm font-semibold text-muted dark:text-body-dark mb-2">الوحدات:</span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
                  {apartments.map(a => {
                      const isChecked = tempFilter.apartmentIds?.includes(a.id);
                      return (
                          <label key={a.id} className="flex items-center space-x-reverse space-x-2 cursor-pointer text-sm font-medium text-body dark:text-body-dark hover:bg-surface-soft dark:hover:bg-surface-dark-elevated p-2 rounded-md transition-colors">
                              <input
                                  type="checkbox"
                                  checked={isChecked || false}
                                  onChange={(e) => {
                                      const currentIds = tempFilter.apartmentIds || [];
                                      const newIds = e.target.checked
                                          ? [...currentIds, a.id]
                                          : currentIds.filter(id => id !== a.id);
                                      setTempFilter({...tempFilter, apartmentIds: newIds});
                                  }}
                                  className="rounded border-hairline accent-black w-4 h-4"
                              />
                              <span>{a.name}</span>
                          </label>
                      );
                  })}
                </div>
              </div>

              {hasFilterChanges() && (
                <div className="pt-3 border-t border-hairline-soft dark:border-hairline-dark flex justify-end">
                  <button
                    onClick={handleApplyFilter}
                    className="btn-primary h-9 px-4 text-sm"
                  >
                    <Check size={16} />
                    <span>تطبيق الفلاتر</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Excel export — trailing side (RTL end). Desktop only; on mobile the
            Excel button renders inline next to the filter chip above. */}
        <div className="hidden md:flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={() => exportToExcel(true)}
              className="btn-secondary h-9 px-3 text-xs"
              title="تحميل التقرير المصفى"
            >
              <Download size={14} />
              <span>المصفى</span>
            </button>
          )}
          <button
            onClick={() => exportToExcel(false)}
            className="btn-primary h-9 px-3 text-xs"
            title="تحميل التقرير الشامل"
          >
            <Download size={14} />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* One scrollable content zone — the whole analytics page scrolls as
          one unit. Each card is natural content-height; the scroll happens
          at the page level, not per-card. */}
      <div className="flex-1 overflow-y-auto min-h-0 pt-2 md:pt-0 -mx-1 px-1 pb-24 md:pb-0">
      <div className="flex flex-col space-y-5 pb-4">

      {/* KPI hierarchy:
          Net Profit is the PRIMARY — the one number that actually captures
          whether the business is winning. Given a hero treatment with the
          scarce emerald accent + an accent bar on the leading edge. The
          three supporting metrics (Revenue, Occupancy, Nights) render at
          a subordinate weight in a strict 3-column grid below so the eye
          reads them as "context for the primary" rather than "four peers". */}

      <div
        onClick={() => fetchBreakdown('profit')}
        className="relative card-surface p-6 md:p-7 group cursor-pointer transition-all hover:shadow-soft overflow-hidden"
      >
        {/* Signature: accent bar on the leading (right-side, RTL) edge */}
        <span className="absolute right-0 top-6 bottom-6 w-[3px] rounded-l-full bg-accent"></span>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pr-3">
          <div className="min-w-0">
            <p className="eyebrow mb-2">صافي الأرباح</p>
            <h3 className="text-4xl md:text-5xl font-bold text-accent tracking-tightest leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(analytics.netProfit).toLocaleString()}
              <span className="text-lg md:text-xl font-semibold text-muted-soft mr-2">ر.س</span>
            </h3>
            <p className="text-xs text-muted-soft mt-3">
              الإيرادات ناقص كل المصروفات خلال الفترة المحددة
            </p>
          </div>

          {/* Math breakdown — turns the abstract profit number into a story:
              you can literally see it's revenue minus expenses. */}
          <div className="hidden md:flex items-center gap-8 pl-2">
            <div className="text-right">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-soft mb-1">الإيرادات</p>
              <p className="text-lg font-bold text-ink dark:text-white tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {analytics.totalRevenue.toLocaleString()}
                <span className="text-xs font-semibold text-muted-soft mr-1">ر.س</span>
              </p>
            </div>
            <div className="text-muted-soft text-2xl leading-none">−</div>
            <div className="text-right">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-soft mb-1">المصروفات</p>
              <p className="text-lg font-bold text-ink dark:text-white tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(analytics.totalExpenses || (analytics.totalRevenue - analytics.netProfit)).toLocaleString()}
                <span className="text-xs font-semibold text-muted-soft mr-1">ر.س</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => fetchBreakdown('revenue')}
          className="card-surface p-5 group cursor-pointer transition-all hover:shadow-soft"
        >
          <p className="eyebrow mb-2">إجمالي الإيرادات</p>
          <h3 className="text-2xl font-bold text-ink dark:text-white tracking-tightest" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {analytics.totalRevenue.toLocaleString()}
            <span className="text-xs font-semibold text-muted-soft mr-1.5">ر.س</span>
          </h3>
          <p className="text-xs text-muted-soft mt-1.5">عبر {analytics.count} حجز</p>
        </div>

        <div
          onClick={() => fetchBreakdown('occupancy')}
          className="card-surface p-5 group cursor-pointer transition-all hover:shadow-soft"
        >
          <p className="eyebrow mb-2">معدل الإشغال</p>
          <h3 className="text-2xl font-bold text-ink dark:text-white tracking-tightest" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(analytics.occupancyRate)}<span className="text-xs font-semibold text-muted mr-0.5">%</span>
          </h3>
          <p className="text-xs text-muted-soft mt-1.5">من إجمالي الأيام المتاحة</p>
        </div>

        <div
          onClick={() => fetchBreakdown('nights')}
          className="card-surface p-5 group cursor-pointer transition-all hover:shadow-soft"
        >
          <p className="eyebrow mb-2">الليالي المؤجرة</p>
          <h3 className="text-2xl font-bold text-ink dark:text-white tracking-tightest" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {analytics.totalNights} <span className="text-xs font-semibold text-muted mr-0.5">ليلة</span>
          </h3>
          <p className="text-xs text-muted-soft mt-1.5">عبر {analytics.count} حجز</p>
        </div>
      </div>

      {/* Chart + Sources row — trend chart takes 2/3 width, sources take 1/3.
          The old "top performers" card lived here too but was strictly a
          subset of the per-unit P&L below (P&L ranks by profit AND shows
          revenue AND margin AND occupancy). Removed. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend chart — col-span-2 on desktop */}
        <div className="card-surface p-4 md:p-5 lg:col-span-2 flex flex-col min-h-[320px] md:min-h-[440px]">
          <div className="mb-4 shrink-0">
            <h4 className="font-semibold tracking-tight text-ink dark:text-white flex items-center">
              <TrendingUp size={18} className="ml-2 text-muted" />
              اتجاه الإيرادات والمصروفات
            </h4>
          </div>

          <div className="flex gap-6 mb-4 shrink-0 border-b border-hairline dark:border-hairline-dark pb-4">
            <div>
              <p className="text-2xs font-semibold text-muted-soft mb-1">إجمالي الإيرادات</p>
              <p className="font-bold text-accent">{chartKPIs.revenue.toLocaleString()} <span className="text-2xs text-muted-soft">ر.س</span></p>
            </div>
            <div>
              <p className="text-2xs font-semibold text-muted-soft mb-1">إجمالي المصروفات</p>
              <p className="font-semibold text-muted dark:text-body-dark">{chartKPIs.expenses.toLocaleString()} <span className="text-2xs">ر.س</span></p>
            </div>
            <div>
              <p className="text-2xs font-semibold text-muted-soft mb-1">صافي الأرباح</p>
              <p className="text-lg font-bold tracking-tight text-accent leading-none">{chartKPIs.profit.toLocaleString()} <span className="text-2xs text-muted-soft">ر.س</span></p>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[280px] relative overflow-hidden" dir="ltr">
            <div className="absolute inset-0 pb-8 pl-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accentHex} stopOpacity={0.16}/>
                      <stop offset="95%" stopColor={accentHex} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#898989', fontSize: 12}} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#898989', fontSize: 12}} dx={-10} tickFormatter={(val) => `${val/1000}k`} />
                  <RechartsTooltip
                    formatter={(value) => [`${value.toLocaleString()} ر.س`]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'inherit' }}
                    labelStyle={{ fontWeight: '600', color: '#111111', marginBottom: '8px' }}
                  />
                  <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke={accentHex} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="expenses" name={analytics.totalExpenses > 0 ? "المصروفات" : "لا توجد مصروفات"} stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sources — col-span-1 on desktop */}
        <div className="card-surface p-5 lg:col-span-1">
          <div className="mb-4">
            <h4 className="font-semibold tracking-tight text-ink dark:text-white mb-1 flex items-center">
              <Globe size={18} className="ml-2 text-muted" /> مصادر التسويق
            </h4>
            <p className="text-xs text-muted">توزيع الحجوزات حسب المنصات</p>
          </div>

          {sourceChartData.length > 0 ? (() => {
            const total = sourceChartData.reduce((s, x) => s + x.value, 0) || 1;
            const sorted = [...sourceChartData].sort((a, b) => b.value - a.value);
            return (
              <ul className="space-y-3.5">
                {sorted.map((source, idx) => {
                  const pct = Math.round((source.value / total) * 100);
                  const isTop = idx === 0;
                  return (
                    <li key={source.name}>
                      <div className="flex items-baseline justify-between gap-3 mb-1.5">
                        <span className="text-sm font-semibold text-ink dark:text-white truncate">
                          {source.name}
                        </span>
                        <span className="text-2xs font-semibold text-muted-soft shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {source.value} حجز · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-card dark:bg-surface-dark-elevated overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isTop ? 'bg-accent' : 'bg-muted-soft/60 dark:bg-body-dark/60'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          })() : (
            <div className="py-8 text-center text-muted font-medium">لا توجد بيانات كافية</div>
          )}
        </div>
      </div>

      {/* Per-unit P&L — outside the grid so it can be full-width without
          fighting col-span math. */}
{perUnitPnL.length > 0 && (
          <div className="card-surface p-4 md:p-5">
            <div className="mb-4">
              <h4 className="font-semibold tracking-tight text-ink dark:text-white mb-1 flex items-center">
                <TrendingUp size={18} className="ml-2 text-muted" />
                الربحية حسب الوحدة
              </h4>
              <p className="text-xs text-muted">
                الإيرادات ناقص المصروفات المباشرة والحصة من التكاليف العامة —
                يكشف أي وحدة تربح فعلاً بعد كل التكاليف
              </p>
            </div>

            {/* Desktop: dense table. Columns: rank, name, revenue, expenses (with
                split hover-tooltip showing direct vs shared), net profit, margin,
                occupancy. Sticky-nothing — the whole page scrolls. */}
            <div className="hidden md:block overflow-x-auto -mx-1">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="text-2xs font-semibold uppercase tracking-wider text-muted-soft border-b border-hairline-soft dark:border-hairline-dark-soft">
                    <th className="px-3 py-2 text-right">#</th>
                    <th className="px-3 py-2 text-right">الوحدة</th>
                    <th className="px-3 py-2 text-left">الإيرادات</th>
                    <th className="px-3 py-2 text-left">المصروفات</th>
                    <th className="px-3 py-2 text-left">صافي الربح</th>
                    <th className="px-3 py-2 text-left">هامش الربح</th>
                    <th className="px-3 py-2 text-left">الإشغال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft dark:divide-hairline-dark">
                  {perUnitPnL.map((u, idx) => {
                    const isTop = idx === 0 && u.netProfit > 0;
                    const isLoss = u.netProfit < 0;
                    const clickable = typeof setView === 'function';
                    return (
                      <tr
                        key={u.id}
                        onClick={clickable ? () => setView('expenses', { apartmentId: u.id }) : undefined}
                        className={`hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors ${clickable ? 'cursor-pointer' : ''}`}
                        title={clickable ? 'شاهد مصروفات هذه الوحدة' : undefined}
                      >
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-2xs font-semibold ${
                            isTop
                              ? 'bg-accent text-white'
                              : 'bg-surface-card text-muted dark:bg-surface-dark dark:text-body-dark'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-ink dark:text-white truncate max-w-[180px]">
                          {u.name}
                        </td>
                        <td className="px-3 py-3 text-left text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {Math.round(u.revenue).toLocaleString()}
                          <span className="text-2xs font-medium text-muted-soft mr-0.5">ر.س</span>
                        </td>
                        <td
                          className="px-3 py-3 text-left text-body dark:text-body-dark"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                          title={`مباشرة: ${Math.round(u.directExpenses).toLocaleString()} · حصة عامة: ${Math.round(u.globalShare).toLocaleString()}`}
                        >
                          {Math.round(u.totalExpenses).toLocaleString()}
                          <span className="text-2xs font-medium text-muted-soft mr-0.5">ر.س</span>
                        </td>
                        <td
                          className={`px-3 py-3 text-left font-bold ${isLoss ? 'text-accent-strong' : 'text-ink dark:text-white'}`}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          <span dir="ltr">{isLoss && '-'}{Math.abs(Math.round(u.netProfit)).toLocaleString()}</span>
                          <span className="text-2xs font-medium text-muted-soft mr-0.5">ر.س</span>
                        </td>
                        <td
                          className={`px-3 py-3 text-left font-semibold ${isLoss ? 'text-accent-strong' : 'text-muted dark:text-body-dark'}`}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {u.marginPct != null ? `${Math.round(u.marginPct)}%` : '—'}
                        </td>
                        <td className="px-3 py-3 text-left text-muted dark:text-body-dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {Math.round(u.occupancyPct)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards. Same info, stacked. Prioritizes the profit
                headline (biggest) with revenue/expenses as small supporting
                stats. Rank chip in top-right. */}
            <div className="md:hidden space-y-2">
              {perUnitPnL.map((u, idx) => {
                const isTop = idx === 0 && u.netProfit > 0;
                const isLoss = u.netProfit < 0;
                const clickable = typeof setView === 'function';
                return (
                  <div
                    key={u.id}
                    onClick={clickable ? () => setView('expenses', { apartmentId: u.id }) : undefined}
                    className={`p-3 rounded-lg border border-hairline dark:border-hairline-dark-soft bg-canvas dark:bg-surface-dark ${clickable ? 'cursor-pointer active:bg-surface-soft/60 dark:active:bg-surface-dark-elevated/40 transition-colors' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink dark:text-white truncate">
                          {u.name}
                        </p>
                        <p className="text-2xs text-muted-soft mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {Math.round(u.occupancyPct)}% إشغال
                          {u.marginPct != null && (
                            <> · {Math.round(u.marginPct)}% هامش</>
                          )}
                        </p>
                      </div>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-2xs font-semibold shrink-0 ${
                        isTop
                          ? 'bg-accent text-white'
                          : 'bg-surface-card text-muted dark:bg-surface-dark-elevated dark:text-body-dark'
                      }`}>
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 border-t border-hairline-soft dark:border-hairline-dark-soft pt-2">
                      <div className="min-w-0">
                        <p className="text-2xs text-muted-soft uppercase tracking-wider font-semibold">
                          صافي الربح
                        </p>
                        <p
                          className={`text-lg font-bold leading-none mt-0.5 ${isLoss ? 'text-accent-strong' : 'text-ink dark:text-white'}`}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          <span dir="ltr">{isLoss && '-'}{Math.abs(Math.round(u.netProfit)).toLocaleString()}</span>
                          <span className="text-2xs font-medium text-muted-soft mr-0.5">ر.س</span>
                        </p>
                      </div>
                      <div className="text-left" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <p className="text-2xs text-muted-soft">
                          إيرادات: <span className="text-ink dark:text-white font-semibold">{Math.round(u.revenue).toLocaleString()}</span>
                        </p>
                        <p className="text-2xs text-muted-soft mt-0.5">
                          مصروفات: <span className="text-body dark:text-body-dark font-semibold">{Math.round(u.totalExpenses).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-2xs text-muted-soft mt-3 leading-relaxed">
              الحصة من التكاليف العامة (مثل التسويق والرواتب) موزعة بالتساوي على الوحدات المفلترة في هذه الفترة.
            </p>
          </div>
        )}


      {/* End of main content — modal is moved OUTSIDE the scroll wrapper so
          it renders as viewport-fixed, not inside the scrolling area. */}
      </div>{/* /space-y flow wrapper */}
      </div>{/* /scroll zone */}
      </div>{/* /outer h-full flex flex-col */}

      {/* Breakdown Modal — portaled to document.body so its `fixed inset-0`
          reaches the true viewport and blurs the header, no matter what
          stacking context our view ancestors have. */}
      {breakdownModal && createPortal(
        <div className="fixed inset-0 z-[100] flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active dir="rtl">
          <div className="absolute inset-0" onClick={() => setBreakdownModal(null)}></div>
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-hairline dark:border-hairline-dark-soft">
            <div className="px-6 py-4 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center">
              <h3 className="font-semibold tracking-tight text-ink dark:text-white text-lg flex items-center gap-2">
                {breakdownModal === 'revenue' && 'تفصيل الإيرادات حسب الوحدة'}
                {breakdownModal === 'profit' && 'سجل المصروفات والأرباح'}
                {(breakdownModal === 'occupancy' || breakdownModal === 'nights') && 'تفصيل الإشغال حسب الوحدة'}
              </h3>
              <button onClick={() => setBreakdownModal(null)} className="icon-action">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {isBreakdownLoading ? (
                <div className="space-y-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-12 bg-surface-card dark:bg-surface-dark-elevated rounded-md animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="w-full">
                  {breakdownModal === 'profit' ? (
                     <table className="w-full text-sm text-right">
                        <thead>
                          <tr className="text-muted dark:text-body-dark">
                            <th className="pb-3 font-semibold">البند</th>
                            <th className="pb-3 font-semibold">المبلغ (ر.س)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdownData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors border-t border-hairline-soft dark:border-hairline-dark">
                              <td className="py-3 font-semibold text-ink dark:text-white">{item.category}</td>
                              <td className={`py-3 font-semibold ${item.type === 'income' ? 'text-ink dark:text-white' : 'text-muted dark:text-body-dark'}`}>
                                {item.type === 'expense' ? '- ' : ''}{item.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-surface-card dark:bg-surface-dark-elevated">
                            <td className="py-4 px-2 font-semibold text-ink dark:text-white rounded-r-lg">الصافي</td>
                            <td className="py-4 px-2 font-semibold text-ink dark:text-white rounded-l-lg">
                              {breakdownData.reduce((acc, curr) => curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                     </table>
                  ) : (
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="text-muted dark:text-body-dark">
                          <th className="pb-3 font-semibold">الوحدة</th>
                          {breakdownModal === 'revenue' && (
                            <>
                              <th className="pb-3 font-semibold">الإيرادات (ر.س)</th>
                              <th className="pb-3 font-semibold">النسبة</th>
                              <th className="pb-3 font-semibold">الحجوزات</th>
                            </>
                          )}
                          {(breakdownModal === 'occupancy' || breakdownModal === 'nights') && (
                            <>
                              <th className="pb-3 font-semibold">الليالي المؤجرة</th>
                              <th className="pb-3 font-semibold">الليالي المتاحة</th>
                              <th className="pb-3 font-semibold">معدل الإشغال</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {breakdownData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors border-t border-hairline-soft dark:border-hairline-dark">
                            <td className="py-3 font-semibold text-ink dark:text-white">{item.name}</td>

                            {breakdownModal === 'revenue' && (
                              <>
                                <td className="py-3 font-semibold text-ink dark:text-white">{item.revenue.toLocaleString()}</td>
                                <td className="py-3 font-medium text-body dark:text-body-dark">{item.percentage}%</td>
                                <td className="py-3 font-medium text-body dark:text-body-dark">{item.count}</td>
                              </>
                            )}

                            {(breakdownModal === 'occupancy' || breakdownModal === 'nights') && (
                              <>
                                <td className="py-3 font-semibold text-ink dark:text-white">{item.nights}</td>
                                <td className="py-3 font-medium text-body dark:text-body-dark">{item.availableNights}</td>
                                <td className="py-3 font-semibold text-ink dark:text-white">{item.occupancy}%</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

}

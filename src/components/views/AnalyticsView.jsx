import { useState, useMemo } from 'react';
import { Download, TrendingUp, Globe, Filter, ChevronDown, Check, Star, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import DatePickerCal from '../ui/DatePickerCal';
import { getAccent } from '../../lib/accent';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsView() {
  const accentHex = getAccent().hex;
  const { apartments, bookings, analytics, analyticsFilter, setAnalyticsFilter, isAnalyticsLoading } = useData();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState({ ...analyticsFilter });
  const [breakdownModal, setBreakdownModal] = useState(null);
  const [breakdownData, setBreakdownData] = useState([]);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [chartFilter, setChartFilter] = useState('6m');

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

  // Extract top performing units directly from backend analytics payload
  const topUnits = useMemo(() => {
    return (analytics.topUnits || []).map(u => ({
      ...u,
      name: u.name || apartments.find(a => a.id === (u.id || u.apartmentId))?.name || 'وحدة'
    }));
  }, [analytics.topUnits, apartments]);


  // Transform data for line chart
  const filteredTrendData = useMemo(() => {
      let data = [];
      if (analytics.dailyTrend && analytics.dailyTrend.length > 0) {
          data = [...analytics.dailyTrend];
      }

      // Filter by time range from the end
      if (chartFilter === '1m') data = data.slice(-1);
      else if (chartFilter === '3m') data = data.slice(-3);
      else if (chartFilter === '6m') data = data.slice(-6);
      else if (chartFilter === '1y') data = data.slice(-12);

      return data;
  }, [analytics.dailyTrend, chartFilter]);

  const chartKPIs = useMemo(() => {
    let rev = 0, exp = 0;
    filteredTrendData.forEach(item => {
      rev += item.revenue;
      exp += item.expenses;
    });
    return { revenue: rev, expenses: exp, profit: rev - exp };
  }, [filteredTrendData]);


  const displayTrendData = useMemo(() => {
    if (filteredTrendData.length === 1) {
      // Pad with dummy data to force area fill
      const item = filteredTrendData[0];
      return [
        { ...item, name: ' ' },
        item,
        { ...item, name: '  ' }
      ];
    }
    return filteredTrendData;
  }, [filteredTrendData]);


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

  const hasActiveFilters = analyticsFilter.apartmentIds?.length > 0 || (analyticsFilter.startDate && analyticsFilter.endDate);


  if (isAnalyticsLoading) {
    return (
      <div className="h-full overflow-hidden flex flex-col space-y-4 animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <div className="h-10 w-48 bg-surface-card dark:bg-surface-dark-elevated rounded-md"></div>
          <div className="h-10 w-32 bg-surface-card dark:bg-surface-dark-elevated rounded-md"></div>
        </div>

        {/* 4 KPI Skeleton Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-surface-card dark:bg-surface-dark-elevated p-5 rounded-lg h-28 flex flex-col justify-center">
              <div className="h-4 w-20 bg-surface-strong dark:bg-hairline-dark rounded mb-3"></div>
              <div className="h-8 w-32 bg-surface-strong dark:bg-hairline-dark rounded mb-2"></div>
              <div className="h-3 w-24 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 w-full overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
          {/* Top Performers and Pie Chart Skeleton */}
          <div className="lg:col-span-1 flex flex-col gap-5 h-full min-h-0">
            <div className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg flex-1 min-h-0 flex flex-col">
               <div className="h-5 w-24 bg-surface-strong dark:bg-hairline-dark rounded mb-2"></div>
               <div className="h-3 w-32 bg-surface-strong/60 dark:bg-hairline-dark rounded mb-4"></div>
               <div className="flex-1 flex flex-col gap-3 justify-center">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                       <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-surface-strong dark:bg-hairline-dark"></div><div className="h-4 w-20 bg-surface-strong dark:bg-hairline-dark rounded"></div></div>
                       <div className="h-6 w-16 bg-surface-strong dark:bg-hairline-dark rounded"></div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg flex-1 min-h-0 flex flex-col items-center justify-center">
              <div className="self-start h-5 w-24 bg-surface-strong dark:bg-hairline-dark rounded mb-2"></div>
              <div className="self-start h-3 w-32 bg-surface-strong/60 dark:bg-hairline-dark rounded mb-4"></div>
              <div className="w-32 h-32 rounded-full border-8 border-surface-strong dark:border-hairline-dark mt-4"></div>
            </div>
          </div>

          {/* Area Chart Skeleton */}
          <div className="lg:col-span-2 bg-surface-card dark:bg-surface-dark-elevated rounded-lg p-5 flex flex-col h-full min-h-0">
            <div className="flex justify-between items-center mb-6">
              <div className="h-5 w-40 bg-surface-strong dark:bg-hairline-dark rounded"></div>
              <div className="h-8 w-48 bg-surface-strong/60 dark:bg-hairline-dark rounded-full"></div>
            </div>
            <div className="flex gap-6 mb-6">
               <div className="h-10 w-24 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
               <div className="h-10 w-24 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
               <div className="h-10 w-24 bg-surface-strong/60 dark:bg-hairline-dark rounded"></div>
            </div>
            <div className="flex-1 w-full bg-surface-soft dark:bg-hairline-dark rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-full overflow-hidden flex flex-col space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => exportToExcel(false)}
            className="btn-primary text-sm"
          >
            <Download size={18} />
            <span>تحميل التقرير الشامل (Excel)</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => exportToExcel(true)}
              className="btn-secondary text-sm"
            >
              <Download size={18} />
              <span>تحميل التقرير المصفى</span>
            </button>
          )}
        </div>

        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`btn-secondary text-sm ${
              (analyticsFilter.apartmentIds?.length > 0 || analyticsFilter.startDate)
                ? 'border-ink text-ink dark:border-white dark:text-white'
                : ''
            }`}
          >
            <Filter size={18} />
            <span>تصفية التحليلات</span>
            <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => { const empty = { apartmentIds: [], startDate: null, endDate: null }; setAnalyticsFilter(empty); setTempFilter(empty); setIsFilterOpen(false); }}
              className="icon-action opacity-100"
              title="إلغاء التصفية"
            >
              <X size={16} />
            </button>
          )}

          {isFilterOpen && (
            <div className="absolute top-full left-0 mt-2 w-[320px] bg-canvas dark:bg-surface-dark border border-hairline dark:border-hairline-dark-soft rounded-lg shadow-soft z-50 p-4">
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
      </div>


      {/* KPI hierarchy:
          Net Profit is the PRIMARY — the one number that actually captures
          whether the business is winning. Given a hero treatment with the
          scarce emerald accent + an accent bar on the leading edge. The
          three supporting metrics (Revenue, Occupancy, Nights) render at
          a subordinate weight in a strict 3-column grid below so the eye
          reads them as "context for the primary" rather than "four peers". */}

      <div
        onClick={() => fetchBreakdown('profit')}
        className="relative card-surface p-6 md:p-7 group cursor-pointer transition-all hover:shadow-soft overflow-hidden shrink-0"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
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

      <div className="flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-5 pb-2">
        <div className="lg:col-span-1 flex flex-col gap-5 h-full min-h-0 overflow-y-auto lg:pl-1">
            <div className="card-surface p-5 shrink-0 flex flex-col overflow-hidden">
            <div className="shrink-0">
              <h4 className="font-semibold tracking-tight text-ink dark:text-white mb-1 flex items-center">
                <Star size={18} className="ml-2 text-muted" /> الأعلى أداءً
              </h4>
              <p className="text-xs text-muted mb-3">الوحدات الأكثر تحقيقاً للإيرادات خلال الفترة</p>
            </div>

            {/* Top-performers list — natural rhythm from top, no justify-center
                so rows can't crush into each other when height is tight. */}
            <div className="flex flex-col gap-1.5 pr-1">
                {topUnits.length > 0 ? topUnits.slice(0, 5).map((unit, idx) => (
                    <div key={unit.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-surface-soft/60 dark:hover:bg-hairline-dark transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${idx === 0 ? 'bg-accent text-white' : 'bg-surface-card text-ink dark:bg-surface-dark dark:text-white'}`}>
                                #{idx + 1}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink dark:text-white truncate">{unit.name}</p>
                                <p className="text-xs text-muted">{unit.nights} ليلة مؤجرة</p>
                            </div>
                        </div>
                        <div className="text-left shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            <p className="text-base font-bold tracking-tight text-ink dark:text-white leading-none">{unit.revenue.toLocaleString()}</p>
                            <p className="text-2xs text-muted-soft mt-0.5">ر.س</p>
                        </div>
                    </div>
                )) : <div className="text-center py-8 text-muted font-medium">لا توجد بيانات كافية</div>}
            </div>
          </div>

            <div className="card-surface p-5 shrink-0 flex flex-col overflow-hidden">
            <div className="shrink-0">
              <h4 className="font-semibold tracking-tight text-ink dark:text-white mb-1 flex items-center"><Globe size={18} className="ml-2 text-muted" /> مصادر التسويق</h4>
              <p className="text-xs text-muted mb-4">توزيع الحجوزات حسب المنصات</p>
            </div>

            {/* Marketing sources — was a squished donut. Now a compact ranked
                list with a subtle horizontal bar per source. Uses way less
                vertical space, reads instantly, and the top source gets the
                scarce accent to draw the eye. */}
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

        <div className="card-surface p-5 lg:col-span-2 flex flex-col h-full min-h-0">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 shrink-0">
            <h4 className="font-semibold tracking-tight text-ink dark:text-white flex items-center">
                <TrendingUp size={18} className="ml-2 text-muted" />
                اتجاه الإيرادات والمصروفات
            </h4>
            <div className="nav-pill-group bg-canvas dark:bg-surface-dark">
              {[
                { id: '1m', label: '1 شهر' },
                { id: '3m', label: '3 أشهر' },
                { id: '6m', label: '6 أشهر' },
                { id: '1y', label: 'السنة' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setChartFilter(opt.id)}
                  className={`nav-pill px-3 py-1.5 text-xs font-semibold ${chartFilter === opt.id ? 'nav-pill-active bg-surface-card dark:bg-hairline-dark-soft' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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

          <div className="flex-1 w-full min-h-[250px] lg:min-h-0 relative overflow-hidden" dir="ltr">
            <div className="absolute inset-0 pb-8 pr-4">
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
      </div>

      {/* End of main content — modal is moved OUTSIDE this wrapper so
          space-y-5's margin-top selector can't push it down. */}
      </div>

      {/* Breakdown Modal */}
      {breakdownModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setBreakdownModal(null)}></div>
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-hairline dark:border-hairline-dark-soft">
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
        </div>
      )}
    </>
  );

}

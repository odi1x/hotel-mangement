import { useState, useMemo } from 'react';
import { Download, TrendingUp, Globe, Filter, ChevronDown, Check, Star, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import DatePickerCal from '../ui/DatePickerCal';
import { getAccent } from '../../lib/accent';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// Monochrome data palette — near-black to hairline gray (DESIGN-cal.md color scarcity rule)
const COLORS = ['#111111', '#374151', '#6b7280', '#9ca3af', '#c4c9d0', '#d1d5db', '#e5e7eb'];

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
              <div className="h-4 w-20 bg-surface-strong dark:bg-[#242424] rounded mb-3"></div>
              <div className="h-8 w-32 bg-surface-strong dark:bg-[#242424] rounded mb-2"></div>
              <div className="h-3 w-24 bg-surface-strong/60 dark:bg-[#242424] rounded"></div>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 w-full overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
          {/* Top Performers and Pie Chart Skeleton */}
          <div className="lg:col-span-1 flex flex-col gap-5 h-full min-h-0">
            <div className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg flex-1 min-h-0 flex flex-col">
               <div className="h-5 w-24 bg-surface-strong dark:bg-[#242424] rounded mb-2"></div>
               <div className="h-3 w-32 bg-surface-strong/60 dark:bg-[#242424] rounded mb-4"></div>
               <div className="flex-1 flex flex-col gap-3 justify-center">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                       <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-surface-strong dark:bg-[#242424]"></div><div className="h-4 w-20 bg-surface-strong dark:bg-[#242424] rounded"></div></div>
                       <div className="h-6 w-16 bg-surface-strong dark:bg-[#242424] rounded"></div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg flex-1 min-h-0 flex flex-col items-center justify-center">
              <div className="self-start h-5 w-24 bg-surface-strong dark:bg-[#242424] rounded mb-2"></div>
              <div className="self-start h-3 w-32 bg-surface-strong/60 dark:bg-[#242424] rounded mb-4"></div>
              <div className="w-32 h-32 rounded-full border-8 border-surface-strong dark:border-[#242424] mt-4"></div>
            </div>
          </div>

          {/* Area Chart Skeleton */}
          <div className="lg:col-span-2 bg-surface-card dark:bg-surface-dark-elevated rounded-lg p-5 flex flex-col h-full min-h-0">
            <div className="flex justify-between items-center mb-6">
              <div className="h-5 w-40 bg-surface-strong dark:bg-[#242424] rounded"></div>
              <div className="h-8 w-48 bg-surface-strong/60 dark:bg-[#242424] rounded-full"></div>
            </div>
            <div className="flex gap-6 mb-6">
               <div className="h-10 w-24 bg-surface-strong/60 dark:bg-[#242424] rounded"></div>
               <div className="h-10 w-24 bg-surface-strong/60 dark:bg-[#242424] rounded"></div>
               <div className="h-10 w-24 bg-surface-strong/60 dark:bg-[#242424] rounded"></div>
            </div>
            <div className="flex-1 w-full bg-surface-soft dark:bg-[#242424] rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
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
            <div className="absolute top-full left-0 mt-2 w-[320px] bg-canvas dark:bg-surface-dark border border-hairline dark:border-[#2e2e2e] rounded-lg shadow-soft z-50 p-4">
              <div className="mb-4">
                <span className="block text-sm font-semibold text-muted dark:text-[#a1a1aa] mb-2">الفترة الزمنية:</span>
                <DatePickerCal
                  value={{ startDate: tempFilter.startDate || null, endDate: tempFilter.endDate || null }}
                  onChange={(val) => setTempFilter({ ...tempFilter, startDate: val?.startDate || null, endDate: val?.endDate || null })}
                />
              </div>

              <div className="mb-4">
                <span className="block text-sm font-semibold text-muted dark:text-[#a1a1aa] mb-2">الوحدات:</span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
                  {apartments.map(a => {
                      const isChecked = tempFilter.apartmentIds?.includes(a.id);
                      return (
                          <label key={a.id} className="flex items-center space-x-reverse space-x-2 cursor-pointer text-sm font-medium text-body dark:text-[#a1a1aa] hover:bg-surface-soft dark:hover:bg-surface-dark-elevated p-2 rounded-md transition-colors">
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
                <div className="pt-3 border-t border-hairline-soft dark:border-[#242424] flex justify-end">
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


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
        <div
          onClick={() => fetchBreakdown('revenue')}
          className="card-surface p-5 group cursor-pointer transition-all hover:shadow-soft"
        >
          <p className="text-sm text-muted dark:text-[#a1a1aa] font-semibold mb-2">إجمالي الإيرادات</p>
          <h3 className="text-3xl font-bold text-accent tracking-tightest">{analytics.totalRevenue.toLocaleString()} <span className="text-sm font-semibold text-muted-soft">ر.س</span></h3>
        </div>

        <div
          onClick={() => fetchBreakdown('profit')}
          className="card-surface p-5 group cursor-pointer transition-all hover:shadow-soft"
        >
          <p className="text-sm text-muted dark:text-[#a1a1aa] font-semibold mb-2">صافي الأرباح</p>
          <h3 className="text-3xl font-bold text-accent tracking-tightest">{Math.round(analytics.netProfit).toLocaleString()} <span className="text-sm font-semibold text-muted-soft">ر.س</span></h3>
        </div>

        <div
          onClick={() => fetchBreakdown('occupancy')}
          className="card-surface p-5 group cursor-pointer transition-all hover:shadow-soft"
        >
          <p className="text-sm text-muted dark:text-[#a1a1aa] font-semibold mb-2">معدل الإشغال</p>
          <h3 className="text-3xl font-bold text-ink dark:text-white tracking-tightest">{Math.round(analytics.occupancyRate)}<span className="text-sm font-semibold text-muted">%</span></h3>
          <p className="text-xs text-muted-soft mt-2 font-medium">من إجمالي الأيام المتاحة</p>
        </div>

        <div
          onClick={() => fetchBreakdown('nights')}
          className="card-surface p-5 group cursor-pointer transition-all hover:shadow-soft"
        >
          <p className="text-sm text-muted dark:text-[#a1a1aa] font-semibold mb-2">الليالي المؤجرة</p>
          <h3 className="text-3xl font-bold text-ink dark:text-white tracking-tightest">{analytics.totalNights} <span className="text-sm font-semibold text-muted">ليلة</span></h3>
          <p className="text-xs text-muted-soft mt-2 font-medium">عبر {analytics.count} حجز</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-5 pb-2">
        <div className="lg:col-span-1 flex flex-col gap-5 h-full min-h-0">
            <div className="card-surface p-5 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0">
              <h4 className="font-semibold tracking-tight text-ink dark:text-white mb-1 flex items-center">
                <Star size={18} className="ml-2 text-muted" /> الأعلى أداءً
              </h4>
              <p className="text-xs text-muted mb-3">الوحدات الأكثر تحقيقاً للإيرادات خلال الفترة</p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2 pr-1">
                {topUnits.length > 0 ? topUnits.map((unit, idx) => (
                    <div key={unit.id} className="flex items-center justify-between p-2 rounded-md hover:bg-canvas dark:hover:bg-[#242424] transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${idx === 0 ? 'bg-accent text-white' : 'bg-surface-card text-ink dark:bg-surface-dark dark:text-white'}`}>
                                #{idx + 1}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-ink dark:text-white">{unit.name}</p>
                                <p className="text-xs text-muted">{unit.nights} ليلة مؤجرة</p>
                            </div>
                        </div>
                        <div className="text-left">
                            <p className="text-lg font-semibold tracking-tight text-ink dark:text-white leading-none">{unit.revenue.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-soft mt-0.5">ر.س</p>
                        </div>
                    </div>
                )) : <div className="text-center py-10 text-muted font-medium">لا توجد بيانات كافية</div>}
            </div>
          </div>

            <div className="card-surface p-5 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0">
              <h4 className="font-semibold tracking-tight text-ink dark:text-white mb-1 flex items-center"><Globe size={18} className="ml-2 text-muted" /> مصادر التسويق</h4>
              <p className="text-xs text-muted mb-2">توزيع الحجوزات حسب المنصات</p>
            </div>

            <div className="flex-1 min-h-0 w-full relative overflow-hidden" dir="ltr">
              {sourceChartData.length > 0 ? (
                <div className="absolute inset-0 pb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {sourceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'inherit' }}
                        labelStyle={{ fontWeight: '600', color: '#111111', marginBottom: '8px' }}
                      />
                      <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontFamily: 'inherit', fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                  <div className="h-full flex items-center justify-center text-muted font-medium">لا توجد بيانات كافية</div>
              )}
            </div>
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
                  className={`nav-pill px-3 py-1.5 text-xs font-semibold ${chartFilter === opt.id ? 'nav-pill-active bg-surface-card dark:bg-[#2e2e2e]' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-6 mb-4 shrink-0 border-b border-hairline dark:border-[#242424] pb-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-soft mb-1">إجمالي الإيرادات</p>
              <p className="font-bold text-accent">{chartKPIs.revenue.toLocaleString()} <span className="text-[10px] text-muted-soft">ر.س</span></p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-soft mb-1">إجمالي المصروفات</p>
              <p className="font-semibold text-muted dark:text-[#a1a1aa]">{chartKPIs.expenses.toLocaleString()} <span className="text-[10px]">ر.س</span></p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-soft mb-1">صافي الأرباح</p>
              <p className="text-lg font-bold tracking-tight text-accent leading-none">{chartKPIs.profit.toLocaleString()} <span className="text-[10px] text-muted-soft">ر.س</span></p>
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

      {/* Breakdown Modal */}
      {breakdownModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm m-0 border-0 outline-none">
          <div className="absolute inset-0" onClick={() => setBreakdownModal(null)}></div>
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-hairline dark:border-[#2e2e2e]">
            <div className="px-6 py-4 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-center">
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
                          <tr className="text-muted dark:text-[#a1a1aa]">
                            <th className="pb-3 font-semibold">البند</th>
                            <th className="pb-3 font-semibold">المبلغ (ر.س)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdownData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors border-t border-gray-100 dark:border-[#242424]">
                              <td className="py-3 font-semibold text-ink dark:text-white">{item.category}</td>
                              <td className={`py-3 font-semibold ${item.type === 'income' ? 'text-ink dark:text-white' : 'text-muted dark:text-[#a1a1aa]'}`}>
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
                        <tr className="text-muted dark:text-[#a1a1aa]">
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
                          <tr key={idx} className="hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors border-t border-gray-100 dark:border-[#242424]">
                            <td className="py-3 font-semibold text-ink dark:text-white">{item.name}</td>

                            {breakdownModal === 'revenue' && (
                              <>
                                <td className="py-3 font-semibold text-ink dark:text-white">{item.revenue.toLocaleString()}</td>
                                <td className="py-3 font-medium text-body dark:text-[#a1a1aa]">{item.percentage}%</td>
                                <td className="py-3 font-medium text-body dark:text-[#a1a1aa]">{item.count}</td>
                              </>
                            )}

                            {(breakdownModal === 'occupancy' || breakdownModal === 'nights') && (
                              <>
                                <td className="py-3 font-semibold text-ink dark:text-white">{item.nights}</td>
                                <td className="py-3 font-medium text-body dark:text-[#a1a1aa]">{item.availableNights}</td>
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
    </div>
  );

}

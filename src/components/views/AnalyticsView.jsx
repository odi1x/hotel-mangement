import { useState, useMemo } from 'react';
import { Download, TrendingUp, Globe, Filter, ChevronDown, Check, Star, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Datepicker from 'react-tailwindcss-datepicker';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function AnalyticsView() {
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
    // Rely on the heavily optimized api/analytics.js aggregation
    return analytics.topUnits || [];
  }, [analytics.topUnits]);


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
          <div className="h-10 w-48 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
        </div>

        {/* 4 KPI Skeleton Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 h-28 flex flex-col justify-center">
              <div className="h-4 w-20 bg-gray-200 dark:bg-slate-800 rounded mb-3"></div>
              <div className="h-8 w-32 bg-gray-200 dark:bg-slate-800 rounded mb-2"></div>
              <div className="h-3 w-24 bg-gray-100 dark:bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 w-full overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
          {/* Top Performers and Pie Chart Skeleton */}
          <div className="lg:col-span-1 flex flex-col gap-4 h-full min-h-0">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 flex-1 min-h-0 flex flex-col">
               <div className="h-5 w-24 bg-gray-200 dark:bg-slate-800 rounded mb-2"></div>
               <div className="h-3 w-32 bg-gray-100 dark:bg-slate-800 rounded mb-4"></div>
               <div className="flex-1 flex flex-col gap-3 justify-center">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                       <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-800"></div><div className="h-4 w-20 bg-gray-200 dark:bg-slate-800 rounded"></div></div>
                       <div className="h-6 w-16 bg-gray-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 flex-1 min-h-0 flex flex-col items-center justify-center">
              <div className="self-start h-5 w-24 bg-gray-200 dark:bg-slate-800 rounded mb-2"></div>
              <div className="self-start h-3 w-32 bg-gray-100 dark:bg-slate-800 rounded mb-4"></div>
              <div className="w-32 h-32 rounded-full border-8 border-gray-100 dark:border-slate-800 mt-4"></div>
            </div>
          </div>

          {/* Area Chart Skeleton */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 flex flex-col h-full min-h-0">
            <div className="flex justify-between items-center mb-6">
              <div className="h-5 w-40 bg-gray-200 dark:bg-slate-800 rounded"></div>
              <div className="h-8 w-48 bg-gray-100 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="flex gap-6 mb-6">
               <div className="h-10 w-24 bg-gray-100 dark:bg-slate-800 rounded"></div>
               <div className="h-10 w-24 bg-gray-100 dark:bg-slate-800 rounded"></div>
               <div className="h-10 w-24 bg-gray-100 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex-1 w-full bg-gray-50 dark:bg-slate-800/50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => exportToExcel(false)}
            className="flex items-center space-x-reverse space-x-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95"
          >
            <Download size={18} />
            <span className="mr-2">تحميل التقرير الشامل (Excel)</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => exportToExcel(true)}
              className="flex items-center space-x-reverse space-x-2 bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
            >
              <Download size={18} />
              <span className="mr-2">تحميل التقرير المصفى</span>
            </button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center space-x-reverse space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${
              (analyticsFilter.apartmentIds?.length > 0 || analyticsFilter.startDate)
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
                : 'bg-white border-gray-200 text-gray-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            <Filter size={18} />
            <span className="mr-2">تصفية التحليلات</span>
            <ChevronDown size={16} className={`ml-1 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFilterOpen && (
            <div className="absolute top-full left-0 mt-2 w-[320px] bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4">
              <div className="mb-4">
                <span className="block text-sm font-bold text-gray-500 dark:text-slate-400 mb-2">الفترة الزمنية:</span>
                <div dir="ltr">
                   <Datepicker
                      primaryColor="blue"
                      value={{ startDate: tempFilter.startDate || null, endDate: tempFilter.endDate || null }}
                      onChange={(val) => setTempFilter({ ...tempFilter, startDate: val?.startDate || null, endDate: val?.endDate || null })}
                      inputClassName="w-full pl-4 pr-12 py-2 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 text-right transition-all text-sm font-bold"
                      displayFormat="DD/MM/YYYY"
                      placeholder="اختر فترة التقرير"
                      configs={{
                          shortcuts: {
                              today: 'اليوم',
                              yesterday: 'الأمس',
                              past: p => `آخر ${p} يوم`,
                              currentMonth: 'الشهر الحالي',
                              pastMonth: 'الشهر الماضي',
                          }
                      }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <span className="block text-sm font-bold text-gray-500 dark:text-slate-400 mb-2">الوحدات:</span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
                  {apartments.map(a => {
                      const isChecked = tempFilter.apartmentIds?.includes(a.id);
                      return (
                          <label key={a.id} className="flex items-center space-x-reverse space-x-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
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
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span>{a.name}</span>
                          </label>
                      );
                  })}
                </div>
              </div>

              {hasFilterChanges() && (
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={handleApplyFilter}
                    className="flex items-center space-x-reverse space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
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


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div
          onClick={() => fetchBreakdown('revenue')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
        >
          <div className="absolute top-0 left-0 w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-br-[100%] transition-transform group-hover:scale-110 z-0"></div>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-bold mb-2 relative z-10">إجمالي الإيرادات</p>
          <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400 relative z-10 tracking-tight">{analytics.totalRevenue.toLocaleString()} <span className="text-sm font-bold text-gray-400">ر.س</span></h3>
        </div>

        <div
          onClick={() => fetchBreakdown('profit')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
        >
          <div className="absolute top-0 left-0 w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-br-[100%] transition-transform group-hover:scale-110 z-0"></div>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-bold mb-2 relative z-10">صافي الأرباح</p>
          <h3 className="text-3xl font-black text-green-600 dark:text-green-400 relative z-10 tracking-tight">{Math.round(analytics.netProfit).toLocaleString()} <span className="text-sm font-bold text-gray-400">ر.س</span></h3>
        </div>

        <div
          onClick={() => fetchBreakdown('occupancy')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
        >
          <div className="absolute top-0 left-0 w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-br-[100%] transition-transform group-hover:scale-110 z-0"></div>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-bold mb-2 relative z-10">معدل الإشغال</p>
          <h3 className="text-3xl font-black text-orange-500 relative z-10 tracking-tight">{Math.round(analytics.occupancyRate)}<span className="text-sm font-bold text-gray-400">%</span></h3>
          <p className="text-xs text-gray-400 mt-2 font-medium relative z-10">من إجمالي الأيام المتاحة</p>
        </div>

        <div
          onClick={() => fetchBreakdown('nights')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
        >
          <div className="absolute top-0 left-0 w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-br-[100%] transition-transform group-hover:scale-110 z-0"></div>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-bold mb-2 relative z-10">الليالي المؤجرة</p>
          <h3 className="text-3xl font-black text-purple-600 relative z-10 tracking-tight">{analytics.totalNights} <span className="text-sm font-bold text-gray-400">ليلة</span></h3>
          <p className="text-xs text-gray-400 mt-2 font-medium relative z-10">عبر {analytics.count} حجز</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
        <div className="lg:col-span-1 flex flex-col gap-4 h-full min-h-0">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0">
              <h4 className="font-bold text-gray-800 dark:text-slate-100 mb-1 flex items-center">
                <Star size={18} className="ml-2 text-yellow-500" /> الأعلى أداءً
              </h4>
              <p className="text-xs text-gray-500 mb-3">الوحدات الأكثر تحقيقاً للإيرادات خلال الفترة</p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2 pr-1">
                {topUnits.length > 0 ? topUnits.map((unit, idx) => (
                    <div key={unit.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-600'}`}>
                                #{idx + 1}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{unit.name}</p>
                                <p className="text-xs text-gray-500">{unit.nights} ليلة مؤجرة</p>
                            </div>
                        </div>
                        <div className="text-left">
                            <p className="text-lg font-black text-green-600 dark:text-green-400 leading-none">{unit.revenue.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">ر.س</p>
                        </div>
                    </div>
                )) : <div className="text-center py-10 text-gray-400 font-medium">لا توجد بيانات كافية</div>}
            </div>
          </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0">
              <h4 className="font-bold text-gray-800 dark:text-slate-100 mb-1 flex items-center"><Globe size={18} className="ml-2 text-blue-500" /> مصادر التسويق</h4>
              <p className="text-xs text-gray-500 mb-2">توزيع الحجوزات حسب المنصات</p>
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
                      >
                        {sourceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontFamily: 'inherit' }}
                        labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}
                      />
                      <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontFamily: 'inherit', fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 font-medium">لا توجد بيانات كافية</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 lg:col-span-2 flex flex-col h-full min-h-0">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 shrink-0">
            <h4 className="font-bold text-gray-800 dark:text-slate-100 flex items-center">
                <TrendingUp size={18} className="ml-2 text-blue-500" />
                اتجاه الإيرادات والمصروفات
            </h4>
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
              {[
                { id: '1m', label: '1 شهر' },
                { id: '3m', label: '3 أشهر' },
                { id: '6m', label: '6 أشهر' },
                { id: '1y', label: 'السنة' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setChartFilter(opt.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${chartFilter === opt.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-6 mb-4 shrink-0 border-b border-gray-100 dark:border-slate-800 pb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">إجمالي الإيرادات</p>
              <p className="font-black text-blue-600 dark:text-blue-400">{chartKPIs.revenue.toLocaleString()} <span className="text-[10px]">ر.س</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">إجمالي المصروفات</p>
              <p className="font-black text-red-500">{chartKPIs.expenses.toLocaleString()} <span className="text-[10px]">ر.س</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">صافي الأرباح</p>
              <p className="text-lg font-black text-green-600 dark:text-green-400 leading-none">{chartKPIs.profit.toLocaleString()} <span className="text-[10px]">ر.س</span></p>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[250px] lg:min-h-0 relative overflow-hidden" dir="ltr">
            <div className="absolute inset-0 pb-8 pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dx={-10} tickFormatter={(val) => `${val/1000}k`} />
                  <RechartsTooltip
                    formatter={(value) => [`${value.toLocaleString()} ر.س`]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontFamily: 'inherit' }}
                    labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}
                  />
                                    <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="expenses" name={analytics.totalExpenses > 0 ? "المصروفات" : "لا توجد مصروفات"} stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Modal */}
      {breakdownModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm m-0 border-0 outline-none">
          <div className="absolute inset-0" onClick={() => setBreakdownModal(null)}></div>
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800 ">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-black text-gray-900 dark:text-white text-lg flex items-center gap-2">
                {breakdownModal === 'revenue' && 'تفصيل الإيرادات حسب الوحدة'}
                {breakdownModal === 'profit' && 'سجل المصروفات والأرباح'}
                {(breakdownModal === 'occupancy' || breakdownModal === 'nights') && 'تفصيل الإشغال حسب الوحدة'}
              </h3>
              <button onClick={() => setBreakdownModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {isBreakdownLoading ? (
                <div className="space-y-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="w-full">
                  {breakdownModal === 'profit' ? (
                     <table className="w-full text-sm text-right">
                        <thead>
                          <tr className="text-gray-500 dark:text-gray-400">
                            <th className="pb-3 font-bold">البند</th>
                            <th className="pb-3 font-bold">المبلغ (ر.س)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdownData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-t border-gray-100 dark:border-slate-800/50">
                              <td className={`py-3 font-bold ${item.type === 'income' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-slate-200'}`}>{item.category}</td>
                              <td className={`py-3 font-black ${item.type === 'income' ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                                {item.type === 'expense' ? '- ' : ''}{item.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 dark:bg-slate-800">
                            <td className="py-4 px-2 font-black text-gray-900 dark:text-white rounded-r-xl">الصافي</td>
                            <td className="py-4 px-2 font-black text-green-600 dark:text-green-400 rounded-l-xl">
                              {breakdownData.reduce((acc, curr) => curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                     </table>
                  ) : (
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="text-gray-500 dark:text-gray-400">
                          <th className="pb-3 font-bold">الوحدة</th>
                          {breakdownModal === 'revenue' && (
                            <>
                              <th className="pb-3 font-bold">الإيرادات (ر.س)</th>
                              <th className="pb-3 font-bold">النسبة</th>
                              <th className="pb-3 font-bold">الحجوزات</th>
                            </>
                          )}
                          {(breakdownModal === 'occupancy' || breakdownModal === 'nights') && (
                            <>
                              <th className="pb-3 font-bold">الليالي المؤجرة</th>
                              <th className="pb-3 font-bold">الليالي المتاحة</th>
                              <th className="pb-3 font-bold">معدل الإشغال</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {breakdownData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-t border-gray-100 dark:border-slate-800/50">
                            <td className="py-3 font-bold text-gray-800 dark:text-slate-200">{item.name}</td>

                            {breakdownModal === 'revenue' && (
                              <>
                                <td className="py-3 font-black text-green-600 dark:text-green-400">{item.revenue.toLocaleString()}</td>
                                <td className="py-3 font-bold text-gray-600 dark:text-gray-300">{item.percentage}%</td>
                                <td className="py-3 font-bold text-gray-600 dark:text-gray-300">{item.count}</td>
                              </>
                            )}

                            {(breakdownModal === 'occupancy' || breakdownModal === 'nights') && (
                              <>
                                <td className="py-3 font-black text-purple-600 dark:text-purple-400">{item.nights}</td>
                                <td className="py-3 font-bold text-gray-600 dark:text-gray-400">{item.availableNights}</td>
                                <td className="py-3 font-black text-orange-500">{item.occupancy}%</td>
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

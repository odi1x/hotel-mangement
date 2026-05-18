import { useState } from 'react';
import { Download, TrendingUp, Globe, UserCheck, Filter, ChevronDown, Check } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Datepicker from 'react-tailwindcss-datepicker';

export default function AnalyticsView() {
  const { apartments, bookings, analytics, analyticsFilter, setAnalyticsFilter } = useData();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState({ ...analyticsFilter });

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

  const calculateNights = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  const exportToExcel = () => {
    let csvContent = "اسم النزيل,رقم الهوية,الجوال,الشقة,تاريخ الدخول,تاريخ الخروج,عدد الليالي,سعر الليلة,الإجمالي,المصدر\n";

    // Filter bookings based on current analytics filter
    const filteredBookings = analyticsFilter === 'all'
      ? bookings
      : bookings.filter(b => b.apartmentId === analyticsFilter);

    filteredBookings.forEach(b => {
      const apt = apartments.find(a => a.id === b.apartmentId);
      const nights = calculateNights(b.startDate, b.endDate);
      const total = b.pricePerNight * nights;

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
        b.source
      ].join(",");
      csvContent += row + "\n";
    });

    csvContent += `\nإجمالي الإيرادات,,,,,${analytics.totalRevenue}\n`;
    csvContent += `إجمالي الليالي,,,,,${analytics.totalNights}\n`;

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_التحليلات_${new Date().toLocaleDateString('ar-EG')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <button
          onClick={exportToExcel}
          className="flex items-center space-x-reverse space-x-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95"
        >
          <Download size={18} />
          <span className="mr-2">تحميل التقرير الشامل (Excel)</span>
        </button>

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <p className="text-sm text-gray-500 dark:text-slate-400 font-bold mb-2">إجمالي الإيرادات</p>
          <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">{analytics.totalRevenue.toLocaleString()} <span className="text-sm font-bold text-gray-400">ر.س</span></h3>
          <div className="mt-4 flex items-center text-green-500 text-xs font-bold bg-green-50 dark:bg-green-900/20 inline-flex px-2 py-1 rounded-md">
            <TrendingUp size={14} className="ml-1" /> مؤشر إيجابي
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <p className="text-sm text-gray-500 dark:text-slate-400 font-bold mb-2">إجمالي الحجوزات</p>
          <h3 className="text-3xl font-black text-gray-800 dark:text-slate-100">{analytics.count}</h3>
          <p className="text-xs text-gray-400 mt-4 font-medium">عدد العمليات المسجلة</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <p className="text-sm text-gray-500 dark:text-slate-400 font-bold mb-2">الليالي المؤجرة</p>
          <h3 className="text-3xl font-black text-orange-500">{analytics.totalNights}</h3>
          <p className="text-xs text-gray-400 mt-4 font-medium">إجمالي الأيام المحجوزة</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <p className="text-sm text-gray-500 dark:text-slate-400 font-bold mb-2">متوسط مدة الإقامة</p>
          <h3 className="text-3xl font-black text-purple-600">{(analytics.totalNights / (analytics.count || 1)).toFixed(1)} <span className="text-sm font-bold text-gray-400">أيام</span></h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <h4 className="font-bold text-gray-800 dark:text-slate-100 mb-6 flex items-center"><Globe size={18} className="ml-2 text-blue-500" /> مصادر التسويق</h4>
          <div className="space-y-5">
            {Object.keys(analytics.sourceCounts).length > 0 ? Object.entries(analytics.sourceCounts).map(([source, count]) => (
              <div key={source}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-gray-600 dark:text-slate-300">{source}</span>
                  <span className="font-black text-gray-800 dark:text-slate-100">{count}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(count / analytics.count) * 100}%` }}
                  ></div>
                </div>
              </div>
            )) : <div className="text-center py-10 text-gray-400 font-medium">لا توجد بيانات كافية</div>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-center items-center text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-full mb-6">
              <UserCheck size={40} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="text-lg font-black text-gray-800 dark:text-slate-100 mb-2">مؤشر الكفاءة</h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm leading-relaxed font-medium">
              أنت تشاهد التحليلات المخصصة بناءً على فلاتر الوقت والوحدات المحددة أعلاه.
          </p>
        </div>
      </div>
    </div>
  );
}

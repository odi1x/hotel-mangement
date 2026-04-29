import { Download, TrendingUp, Globe, UserCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function AnalyticsView() {
  const { apartments, bookings, analytics, analyticsFilter, setAnalyticsFilter } = useData();

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
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={exportToExcel}
          className="flex items-center space-x-reverse space-x-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95"
        >
          <Download size={18} />
          <span className="mr-2">تحميل التقرير الشامل (Excel)</span>
        </button>

        <div className="flex items-center space-x-reverse space-x-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <span className="text-sm font-bold text-gray-500 dark:text-slate-400">تصفية:</span>
          <select
            className="text-sm border-none bg-transparent outline-none font-black text-gray-800 dark:text-slate-200 cursor-pointer"
            value={analyticsFilter}
            onChange={(e) => setAnalyticsFilter(e.target.value)}
          >
            <option value="all">جميع الوحدات</option>
            {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
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
              {analyticsFilter === 'all'
                  ? "أنت تشاهد حالياً أداء كامل محفظتك العقارية. استخدم التصفية العلوية لعرض أداء وحدة معينة."
                  : `تشاهد البيانات الخاصة بـ ${apartments.find(a => a.id === analyticsFilter)?.name}.`}
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Calendar, 
  Home, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Search,
  BarChart3,
  Printer,
  X,
  MapPin,
  Phone,
  DollarSign,
  UserCheck,
  TrendingUp,
  Globe,
  Edit3,
  Moon,
  Sun,
  Download
} from 'lucide-react';

// --- الثوابت ---
const REFERRAL_SOURCES = ['بوكينج (Booking.com)', 'إير بي إن بي (Airbnb)', 'وسائل التواصل الاجتماعي', 'زيارة مباشرة', 'مكالمة هاتفية', 'صديق/توصية', 'أخرى'];

// --- دالة تنسيق التاريخ ---
const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG', { 
  month: 'long', 
  day: 'numeric', 
  year: 'numeric' 
});

const calculateNights = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
};

const isDateBetween = (date, start, end) => {
  const d = new Date(date).setHours(0,0,0,0);
  const s = new Date(start).setHours(0,0,0,0);
  const e = new Date(end).setHours(0,0,0,0);
  return d >= s && d <= e;
};

const App = () => {
  // --- الحالة ---
  const [darkMode, setDarkMode] = useState(false);
  const [apartments, setApartments] = useState([
    { id: '1', name: 'شقة 101', type: 'استوديو', description: 'إطلالة بحرية', basePrice: 200 },
    { id: '2', name: 'شقة 102', type: 'غرفة وصالة', description: 'دور أرضي مع حديقة', basePrice: 350 },
    { id: '3', name: 'شقة 201', type: 'غرفتين وصالة', description: 'بنتهاوس فاخر', basePrice: 500 },
  ]);

  const [bookings, setBookings] = useState([
    { 
      id: 'b1', 
      apartmentId: '1', 
      residentName: 'أحمد محمد', 
      residentId: '1234567890',
      phone: '0501234567',
      address: 'الرياض، المملكة العربية السعودية',
      pricePerNight: 200,
      source: 'زيارة مباشرة',
      startDate: '2024-05-01', 
      endDate: '2024-05-05' 
    },
  ]);

  const [view, setView] = useState('availability'); 
  const [isAddingApartment, setIsAddingApartment] = useState(false);
  const [editingApartmentId, setEditingApartmentId] = useState(null);
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [printBooking, setPrintBooking] = useState(null);
  const [analyticsFilter, setAnalyticsFilter] = useState('all');

  // حالات النماذج
  const [newApartment, setNewApartment] = useState({ name: '', type: 'استوديو', description: '', basePrice: '' });
  const [newBooking, setNewBooking] = useState({ 
    apartmentId: '', 
    residentName: '', 
    residentId: '',
    phone: '',
    address: '',
    pricePerNight: '',
    source: 'زيارة مباشرة',
    startDate: '', 
    endDate: '' 
  });

  const [timelineStart, setTimelineStart] = useState(new Date());
  
  // --- البيانات المحسوبة ---
  const timelineDates = useMemo(() => {
    const dates = [];
    const start = new Date(timelineStart);
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [timelineStart]);

  const analyticsData = useMemo(() => {
    const filteredBookings = analyticsFilter === 'all' 
      ? bookings 
      : bookings.filter(b => b.apartmentId === analyticsFilter);
    
    const totalRevenue = filteredBookings.reduce((acc, b) => acc + (b.pricePerNight * calculateNights(b.startDate, b.endDate)), 0);
    const totalNights = filteredBookings.reduce((acc, b) => acc + calculateNights(b.startDate, b.endDate), 0);
    
    const sourceCounts = {};
    filteredBookings.forEach(b => {
      sourceCounts[b.source] = (sourceCounts[b.source] || 0) + 1;
    });

    return { totalRevenue, totalNights, sourceCounts, count: filteredBookings.length };
  }, [bookings, analyticsFilter]);

  const getOccupancyStatus = (aptId, date) => {
    return bookings.find(b => b.apartmentId === aptId && isDateBetween(date, b.startDate, b.endDate));
  };

  // --- دالة تصدير الإكسل ---
  const exportToExcel = () => {
    // تجهيز العناوين
    let csvContent = "اسم النزيل,رقم الهوية,الجوال,الشقة,تاريخ الدخول,تاريخ الخروج,عدد الليالي,سعر الليلة,الإجمالي,المصدر\n";
    
    // إضافة البيانات
    bookings.forEach(b => {
      const apt = apartments.find(a => a.id === b.apartmentId);
      const nights = calculateNights(b.startDate, b.endDate);
      const total = b.pricePerNight * nights;
      
      const row = [
        b.residentName,
        b.residentId,
        b.phone,
        apt?.name || 'غير معروف',
        b.startDate,
        b.endDate,
        nights,
        b.pricePerNight,
        total,
        b.source
      ].join(",");
      csvContent += row + "\n";
    });

    // إضافة ملخص التحليلات في الأسفل
    csvContent += `\nإجمالي الإيرادات,,,,,${analyticsData.totalRevenue}\n`;
    csvContent += `إجمالي الليالي,,,,,${analyticsData.totalNights}\n`;

    // التعامل مع اللغة العربية (UTF-8 BOM) لضمان فتح الملف بشكل صحيح في Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_التحليلات_${new Date().toLocaleDateString('ar-EG')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- المعالجات ---
  const handleSaveApartment = (e) => {
    e.preventDefault();
    if (editingApartmentId) {
      setApartments(apartments.map(a => 
        a.id === editingApartmentId ? { ...newApartment, id: a.id } : a
      ));
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      setApartments([...apartments, { ...newApartment, id }]);
    }
    closeApartmentModal();
  };

  const startEditApartment = (apt) => {
    setNewApartment({ ...apt });
    setEditingApartmentId(apt.id);
    setIsAddingApartment(true);
  };

  const closeApartmentModal = () => {
    setIsAddingApartment(false);
    setEditingApartmentId(null);
    setNewApartment({ name: '', type: 'استوديو', description: '', basePrice: '' });
  };

  const handleAddBooking = (e) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    setBookings([...bookings, { ...newBooking, id }]);
    setNewBooking({ apartmentId: '', residentName: '', residentId: '', phone: '', address: '', pricePerNight: '', source: 'زيارة مباشرة', startDate: '', endDate: '' });
    setIsAddingBooking(false);
  };

  const deleteApartment = (id) => {
    if(confirm('هل أنت متأكد من حذف هذه الشقة وجميع حجوزاتها؟')) {
        setApartments(apartments.filter(a => a.id !== id));
        setBookings(bookings.filter(b => b.apartmentId !== id));
    }
  };

  const deleteBooking = (id) => {
    if(confirm('هل تريد حذف هذا الحجز؟')) {
        setBookings(bookings.filter(b => b.id !== id));
    }
  };

  const SidebarItem = ({ icon: Icon, label, id, active }) => (
    <button
      onClick={() => setView(id)}
      className={`w-full flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg transition-colors ${
        active 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium mr-3">{label}</span>
    </button>
  );

  return (
    <div className={`${darkMode ? 'dark' : ''} h-screen overflow-hidden`} dir="rtl">
      <div className="flex h-screen bg-gray-50 dark:bg-slate-950 font-sans text-gray-900 dark:text-slate-100 overflow-hidden">
        {/* القائمة الجانبية */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 p-6 flex flex-col">
          <div className="flex items-center space-x-reverse space-x-2 mb-10 px-2 cursor-pointer" onClick={() => setView('availability')}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <Home className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-blue-900 dark:text-blue-400 mr-2">رنت فلو</span>
          </div>

          <nav className="space-y-2 flex-1">
            <SidebarItem icon={Calendar} label="التوفر" id="availability" active={view === 'availability'} />
            <SidebarItem icon={Home} label="الشقق" id="apartments" active={view === 'apartments'} />
            <SidebarItem icon={Users} label="سجل النزلاء" id="residents" active={view === 'residents'} />
            <SidebarItem icon={BarChart3} label="التحليلات" id="analytics" active={view === 'analytics'} />
          </nav>

          <div className="mt-auto space-y-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="text-sm font-medium">{darkMode ? 'الوضع المضيء' : 'الوضع الليلي'}</span>
              {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-blue-600" />}
            </button>

            <div className="bg-blue-50 dark:bg-slate-800/50 p-4 rounded-xl">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-2">معلومات مباشرة</p>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-slate-400">إجمالي الوحدات</span>
                <span className="text-sm font-bold">{apartments.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">النزلاء الحاليين</span>
                <span className="text-sm font-bold">
                  {bookings.filter(b => isDateBetween(new Date(), b.startDate, b.endDate)).length}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* المحتوى الرئيسي */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-slate-950">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                  {view === 'availability' ? 'جدول التوفر' : view === 'apartments' ? 'إدارة الشقق' : view === 'residents' ? 'سجل النزلاء' : 'تحليلات الأداء'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">إدارة التأجير اليومي والأسبوعي والشهري بدقة.</p>
            </div>
            <div className="flex space-x-reverse space-x-3">
              <button 
                onClick={() => setIsAddingBooking(true)}
                className="flex items-center space-x-reverse space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm active:scale-95"
              >
                <Plus size={18} />
                <span className="mr-2">حجز جديد</span>
              </button>
            </div>
          </div>

          {/* --- عرض التوفر --- */}
          {view === 'availability' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-250px)]">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                <div className="flex items-center space-x-reverse space-x-4">
                  <h3 className="font-semibold text-gray-700 dark:text-slate-200 flex items-center">
                    <Calendar size={18} className="ml-2 text-blue-600" /> الجدول الزمني التفاعلي
                  </h3>
                  <div className="flex items-center space-x-reverse space-x-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-1 mr-4">
                    <button onClick={() => { const d = new Date(timelineStart); d.setDate(d.getDate() - 7); setTimelineStart(d); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500"><ChevronRight size={18} /></button>
                    <button onClick={() => setTimelineStart(new Date())} className="px-3 text-xs font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded py-1">اليوم</button>
                    <button onClick={() => { const d = new Date(timelineStart); d.setDate(d.getDate() + 7); setTimelineStart(d); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500"><ChevronLeft size={18} /></button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 italic font-medium">اضغط على أي خلية فارغة للحجز مباشرة</p>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                      <th className="px-6 py-4 text-right font-bold text-gray-700 dark:text-slate-200 border-b border-l sticky right-0 z-20 bg-white dark:bg-slate-900 w-48 shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#334155]">الشقة</th>
                      {timelineDates.map((date, i) => (
                        <th key={i} className={`px-2 py-4 text-center border-b dark:border-slate-800 min-w-[100px] ${date.toDateString() === new Date().toDateString() ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                          <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">{date.toLocaleDateString('ar-EG', { weekday: 'short' })}</p>
                          <p className={`text-lg ${date.toDateString() === new Date().toDateString() ? 'text-blue-600 font-bold' : 'text-gray-700 dark:text-slate-300 font-medium'}`}>{date.getDate()}</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apartments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 group">
                        <td className="px-6 py-4 border-b dark:border-slate-800 border-l sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 font-medium text-gray-700 dark:text-slate-300 shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#334155]">
                          {apt.name}
                        </td>
                        {timelineDates.map((date, i) => {
                          const booking = getOccupancyStatus(apt.id, date);
                          const isStart = booking && new Date(booking.startDate).toDateString() === date.toDateString();
                          return (
                            <td key={i} className={`border-b dark:border-slate-800 text-center relative p-0 h-16 ${date.toDateString() === new Date().toDateString() ? 'bg-blue-50/20' : ''}`}>
                              {booking ? (
                                <div className="h-full flex items-center justify-center p-1">
                                  <div className="w-full h-10 bg-blue-600 text-white text-[11px] rounded-lg flex items-center px-3 overflow-hidden whitespace-nowrap shadow-sm border border-blue-700">
                                    {isStart ? <span className="font-bold truncate">{booking.residentName}</span> : ''}
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setNewBooking({ ...newBooking, apartmentId: apt.id, startDate: date.toISOString().split('T')[0], pricePerNight: apt.basePrice || '' });
                                    setIsAddingBooking(true);
                                  }}
                                  className="w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center text-blue-400 bg-blue-50/50 transition-all"
                                >
                                  <Plus size={20} />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- عرض النزلاء --- */}
          {view === 'residents' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                <h3 className="font-semibold text-gray-700 dark:text-slate-200">سجلات الحجز الكاملة</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800">
                      <th className="px-6 py-4">معلومات النزيل</th>
                      <th className="px-6 py-4">الاتصال والهوية</th>
                      <th className="px-6 py-4">الوحدة / السعر</th>
                      <th className="px-6 py-4">الفترة</th>
                      <th className="px-6 py-4">الحالة</th>
                      <th className="px-6 py-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {bookings.map((booking) => {
                      const apt = apartments.find(a => a.id === booking.apartmentId);
                      const isCurrent = isDateBetween(new Date(), booking.startDate, booking.endDate);
                      return (
                        <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 dark:text-slate-100">{booking.residentName}</div>
                            <div className="text-[10px] text-gray-400">عبر: {booking.source}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm flex items-center space-x-reverse space-x-1"><Phone size={12}/> <span className="mr-1">{booking.phone}</span></div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">هوية: {booking.residentId}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium">{apt?.name}</div>
                            <div className="text-xs text-green-600 font-bold">{booking.pricePerNight} ر.س / ليلة</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs">{formatDate(booking.startDate)} ← {formatDate(booking.endDate)}</div>
                            <div className="text-[10px] text-gray-400 font-semibold uppercase">{calculateNights(booking.startDate, booking.endDate)} ليالي</div>
                          </td>
                          <td className="px-6 py-4">
                            {isCurrent ? (
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">مقيم حالياً</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500">تم تسجيل الخروج</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-reverse space-x-3">
                              <button 
                                onClick={() => setPrintBooking(booking)}
                                className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="طباعة العقد"
                              >
                                <Printer size={18} />
                              </button>
                              <button onClick={() => deleteBooking(booking.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- عرض التحليلات --- */}
          {view === 'analytics' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center space-x-reverse space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-green-100 dark:shadow-none transition-all active:scale-95"
                  >
                    <Download size={18} />
                    <span className="mr-2">تحميل التقرير الشامل (Excel)</span>
                  </button>

                  <div className="flex items-center space-x-reverse space-x-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm">
                      <span className="text-sm font-medium text-gray-500 dark:text-slate-400">تصفية حسب الشقة:</span>
                      <select 
                          className="text-sm border-none bg-transparent outline-none font-bold mr-2 text-gray-800 dark:text-slate-200"
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
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-1">إجمالي الإيرادات</p>
                  <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">{analyticsData.totalRevenue} <span className="text-sm">ر.س</span></h3>
                  <div className="mt-4 flex items-center text-green-500 text-xs font-bold">
                    <TrendingUp size={14} className="ml-1" /> +12% من الشهر الماضي
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-1">إجمالي الحجوزات</p>
                  <h3 className="text-3xl font-black text-gray-800 dark:text-slate-100">{analyticsData.count}</h3>
                  <p className="text-xs text-gray-400 mt-4 italic">إجمالي عدد النزلاء</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-1">الليالي المؤجرة</p>
                  <h3 className="text-3xl font-black text-orange-500">{analyticsData.totalNights}</h3>
                  <p className="text-xs text-gray-400 mt-4 italic">إجمالي الأيام المسجلة</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-1">متوسط مدة الإقامة</p>
                  <h3 className="text-3xl font-black text-purple-600">{(analyticsData.totalNights / (analyticsData.count || 1)).toFixed(1)} <span className="text-sm">أيام</span></h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                  <h4 className="font-bold text-gray-700 dark:text-slate-200 mb-6 flex items-center"><Globe size={18} className="ml-2 text-blue-500" /> مصادر التسويق</h4>
                  <div className="space-y-4">
                    {Object.entries(analyticsData.sourceCounts).length > 0 ? Object.entries(analyticsData.sourceCounts).map(([source, count]) => (
                      <div key={source}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-600 dark:text-slate-400">{source}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full transition-all duration-500" 
                            style={{ width: `${(count / analyticsData.count) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )) : <div className="text-center py-10 text-gray-400">لا توجد بيانات بعد</div>}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-center items-center text-center">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-4">
                      <UserCheck size={32} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-bold text-gray-800 dark:text-slate-200">مؤشر الكفاءة</h4>
                  <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mt-2">
                      {analyticsFilter === 'all' 
                          ? "أنت تشاهد حالياً أداء كامل محفظتك العقارية." 
                          : `تشاهد البيانات الخاصة بـ ${apartments.find(a => a.id === analyticsFilter)?.name}.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* --- عرض الشقق --- */}
          {view === 'apartments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apartments.map((apt) => (
                  <div key={apt.id} className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col h-full relative group transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"><Home size={24} /></div>
                      <div className="flex space-x-reverse space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditApartment(apt)} 
                          className="text-gray-400 hover:text-blue-600 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title="تعديل"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => deleteApartment(apt.id)} 
                          className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{apt.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{apt.type} • {apt.description}</p>
                    <div className="mt-auto pt-4 border-t border-gray-50 dark:border-slate-800 flex justify-between items-end">
                      <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">السعر الأساسي</p>
                          <p className="text-xl font-black text-green-600 dark:text-green-400">{apt.basePrice} <span className="text-xs text-gray-400 font-normal">ر.س / ليلة</span></p>
                      </div>
                    </div>
                  </div>
              ))}
              <button onClick={() => setIsAddingApartment(true)} className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all cursor-pointer bg-white/50 dark:bg-slate-900/50"><Plus size={32} className="mb-2" /><span className="font-medium">إضافة شقة جديدة</span></button>
            </div>
          )}
        </main>

        {/* --- نموذج حجز جديد --- */}
        {isAddingBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">إضافة حجز جديد</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">أدخل كافة التفاصيل لإعداد عقد الإيجار.</p>
                </div>
                <button onClick={() => setIsAddingBooking(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleAddBooking} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* معلومات النزيل */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b dark:border-slate-800 pb-1">معلومات النزيل</h4>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">الاسم الكامل</label>
                      <input required type="text" placeholder="مثلاً: أحمد محمد" className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={newBooking.residentName} onChange={(e) => setNewBooking({...newBooking, residentName: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">رقم الهوية / الجواز</label>
                      <input required type="text" placeholder="10XXXXXXXX" className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={newBooking.residentId} onChange={(e) => setNewBooking({...newBooking, residentId: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">رقم الهاتف</label>
                      <input required type="tel" placeholder="05XXXXXXXX" className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={newBooking.phone} onChange={(e) => setNewBooking({...newBooking, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">العنوان</label>
                      <input type="text" placeholder="الشارع، المدينة، الدولة" className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={newBooking.address} onChange={(e) => setNewBooking({...newBooking, address: e.target.value})} />
                    </div>
                  </div>

                  {/* تفاصيل الإقامة */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b dark:border-slate-800 pb-1">تفاصيل الإقامة</h4>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">الشقة</label>
                      <select required className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={newBooking.apartmentId} onChange={(e) => setNewBooking({...newBooking, apartmentId: e.target.value})}>
                        <option value="">اختر الشقة...</option>
                        {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">تاريخ الدخول</label>
                        <input required type="date" className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={newBooking.startDate} onChange={(e) => setNewBooking({...newBooking, startDate: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">تاريخ المغادرة</label>
                        <input required type="date" className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={newBooking.endDate} onChange={(e) => setNewBooking({...newBooking, endDate: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">السعر / الليلة</label>
                        <input required type="number" placeholder="0.00" className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none bg-gray-50 dark:bg-slate-800 font-bold text-green-600" value={newBooking.pricePerNight} onChange={(e) => setNewBooking({...newBooking, pricePerNight: parseFloat(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">مصدر الوصول</label>
                        <select className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={newBooking.source} onChange={(e) => setNewBooking({...newBooking, source: e.target.value})}>
                          {REFERRAL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none mt-8 active:scale-95">تأكيد الحجز</button>
              </form>
            </div>
          </div>
        )}

        {/* --- نموذج إضافة/تعديل شقة --- */}
        {isAddingApartment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                  {editingApartmentId ? 'تعديل بيانات الوحدة' : 'إضافة وحدة جديدة'}
                </h2>
                <button onClick={closeApartmentModal} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
              </div>
              <form onSubmit={handleSaveApartment} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">اسم/رقم الوحدة</label>
                  <input required type="text" placeholder="شقة 402" className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100" value={newApartment.name} onChange={(e) => setNewApartment({...newApartment, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">النوع</label>
                      <select className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 dark:text-slate-100" value={newApartment.type} onChange={(e) => setNewApartment({...newApartment, type: e.target.value})}>
                          <option>استوديو</option><option>غرفة وصالة</option><option>غرفتين وصالة</option><option>جناح ملكي</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">السعر الافتراضي</label>
                      <input required type="number" placeholder="200" className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 dark:text-slate-100" value={newApartment.basePrice} onChange={(e) => setNewApartment({...newApartment, basePrice: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">ملاحظات/وصف</label>
                  <textarea className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none h-24 bg-white dark:bg-slate-800 dark:text-slate-100" placeholder="وصف الشقة أو ملاحظات داخلية..." value={newApartment.description} onChange={(e) => setNewApartment({...newApartment, description: e.target.value})}></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg mt-4">
                  {editingApartmentId ? 'تحديث البيانات' : 'حفظ الوحدة'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- معاينة اتفاقية الإيجار (للطباعة) --- */}
        {printBooking && (
          <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center p-10 overflow-y-auto" dir="rtl">
            <div className="max-w-3xl w-full bg-white border shadow-sm p-12 print:shadow-none print:border-none" id="agreement-paper">
              <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                  <div>
                      <h1 className="text-3xl font-black tracking-tighter">عقد إيجار وحدات سكنية</h1>
                      <p className="text-gray-500 font-bold">المرجع: #{printBooking.id.toUpperCase()}</p>
                  </div>
                  <div className="text-left">
                      <p className="font-bold text-lg">رنت فلو العقارية</p>
                      <p className="text-sm text-gray-500 italic">نظام إدارة الضيافة</p>
                  </div>
              </div>

              <div className="space-y-8 text-gray-800">
                  <section>
                      <h3 className="font-bold text-sm bg-gray-100 p-2 uppercase mb-4 border-r-4 border-blue-600">أولاً: أطراف العقد</h3>
                      <div className="grid grid-cols-2 gap-8">
                          <div>
                              <p className="text-xs font-bold text-gray-400 uppercase">المؤجر / المدير</p>
                              <p className="font-semibold">مجموعة رنت فلو العقارية</p>
                          </div>
                          <div>
                              <p className="text-xs font-bold text-gray-400 uppercase">المستأجر / النزيل</p>
                              <p className="font-semibold uppercase">{printBooking.residentName}</p>
                              <p className="text-sm">رقم الهوية: {printBooking.residentId}</p>
                              <p className="text-sm">هاتف: {printBooking.phone}</p>
                              <p className="text-xs text-gray-500 mt-1">{printBooking.address}</p>
                          </div>
                      </div>
                  </section>

                  <section>
                      <h3 className="font-bold text-sm bg-gray-100 p-2 uppercase mb-4 border-r-4 border-blue-600">ثانياً: العقار ومدة الإيجار</h3>
                      <div className="grid grid-cols-2 gap-8">
                          <div>
                              <p className="text-xs font-bold text-gray-400 uppercase">بيانات الوحدة</p>
                              <p className="font-semibold">{apartments.find(a => a.id === printBooking.apartmentId)?.name}</p>
                              <p className="text-sm italic">{apartments.find(a => a.id === printBooking.apartmentId)?.type}</p>
                          </div>
                          <div>
                              <p className="text-xs font-bold text-gray-400 uppercase">فترة الإيجار</p>
                              <p className="font-semibold">{formatDate(printBooking.startDate)} — {formatDate(printBooking.endDate)}</p>
                              <p className="text-sm font-bold text-blue-600">{calculateNights(printBooking.startDate, printBooking.endDate)} ليلة إجمالية</p>
                          </div>
                      </div>
                  </section>

                  <section>
                      <h3 className="font-bold text-sm bg-gray-100 p-2 uppercase mb-4 border-r-4 border-blue-600">ثالثاً: الشروط المالية</h3>
                      <div className="grid grid-cols-3 gap-8">
                          <div>
                              <p className="text-xs font-bold text-gray-400 uppercase">سعر الليلة</p>
                              <p className="font-semibold">{printBooking.pricePerNight} ر.س</p>
                          </div>
                          <div>
                              <p className="text-xs font-bold text-gray-400 uppercase">المبلغ الإجمالي</p>
                              <p className="text-xl font-black">{printBooking.pricePerNight * calculateNights(printBooking.startDate, printBooking.endDate)} ر.س</p>
                          </div>
                          <div>
                              <p className="text-xs font-bold text-gray-400 uppercase">حالة الدفع</p>
                              <p className="text-sm font-bold text-green-600">مؤكد / مدفوع</p>
                          </div>
                      </div>
                  </section>

                  <section className="pt-10 border-t border-dashed mt-10">
                      <p className="text-[10px] text-gray-400 leading-relaxed text-justify">
                          يقر المستأجر بموجب هذا العقد بالالتزام بكافة لوائح المبنى والحفاظ على الوحدة السكنية بحالة جيدة وإخلائها في موعد تسجيل الخروج المحدد. أي تلفيات تلحق بالوحدة سيتحمل المستأجر تكاليف إصلاحها. تم إعداد هذا العقد لتوثيق فترة الإقامة وحقوق الطرفين.
                      </p>
                      
                      <div className="flex justify-between mt-20 gap-20">
                          <div className="flex-1 border-t-2 border-gray-300 pt-2 text-center">
                              <p className="text-xs font-bold text-gray-400">توقيع المؤجر</p>
                          </div>
                          <div className="flex-1 border-t-2 border-gray-300 pt-2 text-center">
                              <p className="text-xs font-bold text-gray-400">توقيع المستأجر</p>
                          </div>
                      </div>
                  </section>
              </div>
            </div>

            <div className="mt-8 flex space-x-reverse space-x-4 print:hidden">
              <button 
                  onClick={() => window.print()} 
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-reverse space-x-2 shadow-lg shadow-blue-100"
              >
                  <Printer size={20}/>
                  <span className="mr-2">طباعة المستند</span>
              </button>
              <button 
                  onClick={() => setPrintBooking(null)} 
                  className="bg-gray-100 text-gray-600 px-8 py-3 rounded-xl font-bold border border-gray-200"
              >
                  إغلاق المعاينة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Datepicker from 'react-tailwindcss-datepicker';
import Turnstile from 'react-turnstile';
import { toast } from 'react-hot-toast';
import { User, Phone, CheckCircle, Image as ImageIcon } from 'lucide-react';

export default function PublicBookingView() {
  const { adminId } = useParams();
  const [apartments, setApartments] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Turnstile test keys: 1x00000000000000000000AA (always passes)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

    const fetchApartments = async () => {
    setIsLoading(true);
    try {
      const params = { adminId };
      if (dateRange.startDate && dateRange.endDate) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }
      const res = await axios.get('/api/public?action=apartments', { params });
      setApartments(res.data);
    } catch (error) {
      console.error('Error fetching apartments:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setIsLoading(false);
    }
  };



  useEffect(() => {
    fetchApartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId, dateRange.startDate, dateRange.endDate]);

  const handleDateChange = (newValue) => {
    setDateRange(newValue);
    setSelectedApartment(null); // Reset selection when dates change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApartment) return toast.error('الرجاء اختيار وحدة');
    if (!dateRange.startDate || !dateRange.endDate) return toast.error('الرجاء تحديد تاريخ الحجز');
    if (!turnstileToken) return toast.error('الرجاء التحقق من الأمان');

    setIsSubmitting(true);
    try {
      await axios.post('/api/public?action=book', {
        adminId,
        apartmentId: selectedApartment.id,
        residentName: formData.name,
        phone: formData.phone,
        notes: formData.notes,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        turnstileToken
      });
      setIsSuccess(true);
      toast.success('تم إرسال طلب الحجز بنجاح');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4 text-center" dir="rtl">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-10 max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">تم استلام طلبك!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            طلبك الآن (معلق) قيد المراجعة. سنتواصل معك قريباً لتأكيد الحجز.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            تقديم طلب جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-800 dark:text-white">طلب حجز جديد</h1>
          <p className="text-gray-600 dark:text-gray-400">حدد تواريخ إقامتك لاستعراض الوحدات المتاحة</p>
        </div>

        {/* Step 1: Dates */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
            تاريخ الإقامة المتوقع
          </h2>
          <div className="relative z-20" dir="ltr">
            <Datepicker
              value={dateRange}
              onChange={handleDateChange}
              showShortcuts={true}
              primaryColor={"blue"}
              inputClassName="w-full px-4 pr-12 py-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white text-right"
            />
          </div>
        </div>

        {/* Step 2: Select Apartment */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
            الوحدات المتاحة
          </h2>

          {isLoading ? (
            <div className="flex justify-center p-8 text-blue-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apartments.length === 0 ? (
                <div className="col-span-full text-center p-8 text-gray-500 bg-gray-50 dark:bg-slate-900 rounded-xl">
                  {dateRange.startDate ? 'لا توجد وحدات متاحة في التواريخ المحددة' : 'الرجاء تحديد التواريخ أولاً'}
                </div>
              ) : (
                apartments.map(apt => (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedApartment(apt)}
                    className={`rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${selectedApartment?.id === apt.id ? 'border-blue-600 shadow-md ring-4 ring-blue-100 dark:ring-blue-900' : 'border-gray-100 dark:border-slate-700 hover:border-blue-300'}`}
                  >
                    <div className="h-40 bg-gray-200 dark:bg-slate-800 relative">
                      {apt.coverPhoto ? (
                        <img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={32} className="mb-2 opacity-50" />
                          <span className="text-xs">لا توجد صورة</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800">
                      <h3 className="font-bold text-gray-800 dark:text-white text-lg">{apt.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{apt.type}</p>
                      <p className="font-black text-green-600 dark:text-green-400 text-lg">
                        {apt.basePrice} <span className="text-xs text-gray-500 font-normal">ر.س/ليلة</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Step 3: Booking Form */}
        <div className={`transition-all duration-500 ${selectedApartment ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4'}`}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              بيانات مقدم الطلب
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">الاسم بالكامل</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-4 pr-10 py-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-900 dark:text-white"
                    placeholder="الاسم الثلاثي"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-4 pr-10 py-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-900 dark:text-white text-left"
                    dir="ltr"
                    placeholder="05X XXX XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ملاحظات إضافية (اختياري)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-900 dark:text-white h-24 resize-none"
                  placeholder="أي طلبات خاصة..."
                ></textarea>
              </div>

              {/* Turnstile */}
              <div className="py-4 flex justify-center">
                <Turnstile
                  sitekey={siteKey}
                  onVerify={(token) => setTurnstileToken(token)}
                  theme="light"
                />
              </div>

              <button
                type="submit"
                disabled={!turnstileToken || isSubmitting}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

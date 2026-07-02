import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Datepicker from 'react-tailwindcss-datepicker';
import { Turnstile } from '@marsidev/react-turnstile';

export default function PublicBookingView() {
  const { adminId } = useParams();
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [apartments, setApartments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedApt, setSelectedApt] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        // We will build a new api/public.js to handle these requests safely.
        const res = await axios.get(`/api/public?action=apartments&adminId=${adminId}`);
        setApartments(res.data.apartments);
        setBookings(res.data.bookings); // to calculate availability
        setLoading(false);
      } catch (err) {
        toast.error('لم نتمكن من تحميل البيانات');
        setLoading(false);
      }
    };
    fetchPublicData();
  }, [adminId]);

  const handleDateChange = (newValue) => {
    setDateRange(newValue);
  };

  const isAvailable = (apt) => {
    if (!dateRange.startDate || !dateRange.endDate) return true;

    const reqStart = new Date(dateRange.startDate).setHours(0,0,0,0);
    const reqEnd = new Date(dateRange.endDate).setHours(0,0,0,0);

    // Check conflicts
    const conflict = bookings.some(b => {
      if (b.apartmentId !== apt.id) return false;
      // Skip cancelled or completed bookings that might not block it,
      // but typically we consider 'confirmed' or 'pending' as blocking.
      if (b.status === 'cancelled') return false;

      const bStart = new Date(b.startDate).setHours(0,0,0,0);
      const bEnd = new Date(b.endDate).setHours(0,0,0,0);

      return (reqStart < bEnd && reqEnd > bStart);
    });

    return !conflict;
  };

  const availableApartments = apartments.filter(isAvailable);

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!turnstileToken) {
      toast.error('الرجاء تأكيد أنك لست روبوتاً');
      return;
    }
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('الرجاء اختيار تواريخ الحجز');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        adminId,
        apartmentId: selectedApt.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        customerName: formData.name,
        customerPhone: formData.phone,
        notes: formData.notes,
        turnstileToken
      };

      await axios.post('/api/public?action=book', payload);
      toast.success('تم إرسال طلب الحجز بنجاح!');
      setSelectedApt(null);
      setFormData({ name: '', phone: '', notes: '' });
      setTurnstileToken(null);
      // Reload bookings to reflect the new pending booking and disable dates if needed
      const res = await axios.get(`/api/public?action=apartments&adminId=${adminId}`);
      setBookings(res.data.bookings);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">طلب حجز شقة</h1>
          <p className="text-gray-600">اختر التواريخ المناسبة لعرض الشقق المتاحة</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="max-w-md mx-auto" dir="ltr">
            <Datepicker
              value={dateRange}
              onChange={handleDateChange}
              showShortcuts={true}
              primaryColor="blue"
              displayFormat="YYYY/MM/DD"
              minDate={new Date()}
              placeholder="تاريخ الوصول والمغادرة"
              inputClassName="w-full text-right pr-12 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Apartments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableApartments.map(apt => (
            <div key={apt.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-48 relative">
                {apt.coverPhoto ? (
                  <img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">لا توجد صورة</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-blue-600">
                  {apt.basePrice} ريال / يوم
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{apt.name}</h3>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs">{apt.type}</span>
                </div>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{apt.description}</p>
                <button
                  onClick={() => setSelectedApt(apt)}
                  className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl transition-colors"
                >
                  اختيار هذه الوحدة
                </button>
              </div>
            </div>
          ))}
          {availableApartments.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              لا توجد شقق متاحة في التواريخ المحددة.
            </div>
          )}
        </div>
      </div>

      {/* Booking Form Modal */}
      {selectedApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">طلب حجز: {selectedApt.name}</h3>
              <button onClick={() => setSelectedApt(null)} className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-lg">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">الاسم الكريم</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">رقم الجوال</label>
                <input
                  type="tel"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-left"
                  dir="ltr"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">ملاحظات (اختياري)</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>

              <div className="flex justify-center py-2">
                <Turnstile
                  siteKey="1x00000000000000000000AA"
                  onSuccess={(token) => setTurnstileToken(token)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !turnstileToken}
                className="w-full bg-blue-600 disabled:bg-blue-300 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 mt-4"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import InlineCalendar from "../ui/InlineCalendar";
import { Turnstile } from '@marsidev/react-turnstile';
import { ChevronRight, Calendar, User, Phone, CheckCircle, Image as ImageIcon, MapPin, X } from 'lucide-react';

export default function PublicBookingView() {
  const { adminId } = useParams();

  const formatDateForRender = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') return dateVal;
    if (typeof dateVal === 'object' && dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return '';
      return dateVal.toLocaleDateString('ar-SA');
    }
    // Sometimes moment or dayjs objects are returned, but datepicker uses Date.
    // However, react-tailwindcss-datepicker often returns a string like "2024-01-01".
    return String(dateVal);
  };

  const [step, setStep] = useState(1);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [apartments, setApartments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedApt, setSelectedApt] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const res = await axios.get(`/api/public?action=apartments&adminId=${adminId}`);
        setAdmin(res.data.admin);
        setApartments(res.data.apartments);
        setBookings(res.data.bookings);
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

    const conflict = bookings.some(b => {
      if (b.apartmentId !== apt.id) return false;
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
    if (!turnstileToken) return toast.error('الرجاء تأكيد أنك لست روبوتاً');

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
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {admin?.logoUrl ? (
              <img src={admin.logoUrl} alt={admin.businessName} className="h-10 w-10 object-contain rounded-lg border border-gray-100" />
            ) : (
              <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
                {admin?.businessName?.charAt(0) || admin?.name?.charAt(0) || 'م'}
              </div>
            )}
            <div>
              <h1 className="font-bold text-gray-900 text-lg">{admin?.businessName || admin?.name || 'إدارة الأملاك'}</h1>
              <p className="text-xs text-gray-500">منصة الحجز الإلكتروني</p>
            </div>
          </div>
          {step > 1 && step < 4 && (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
              <ChevronRight size={16} /> رجوع
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 py-12 w-full max-w-5xl mx-auto">

        {/* STEP 1: DATE SELECTION */}
        {step === 1 && (
          <div className="w-full max-w-xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-6">
              <Calendar size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">أهلاً بك!</h2>
            <p className="text-gray-500 mb-10 text-center">يرجى تحديد فترة الإقامة المتوقعة لعرض الوحدات المتاحة لك.</p>

            <div className="w-full bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">تاريخ الوصول والمغادرة</label>
              <div className="relative" dir="ltr">
                <InlineCalendar
                  value={dateRange}
                  onChange={handleDateChange}
                  minDate={new Date()}
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!dateRange.startDate || !dateRange.endDate) return toast.error('الرجاء اختيار التواريخ أولاً');
                setStep(2);
              }}
              className="w-full max-w-xs bg-gray-900 hover:bg-black text-white py-4 rounded-full font-bold text-lg shadow-lg shadow-gray-300 transition-all active:scale-95"
            >
              متابعة لعرض الوحدات
            </button>
          </div>
        )}

        {/* STEP 2: APARTMENT CATALOG */}
        {step === 2 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">الوحدات المتاحة</h2>
                <p className="text-gray-500 text-sm">من {formatDateForRender(dateRange.startDate)} إلى {formatDateForRender(dateRange.endDate)}</p>
              </div>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">{availableApartments.length} وحدات</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableApartments.map(apt => (
                <div key={apt.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all group flex flex-col h-full">
                  <div className="h-56 relative overflow-hidden cursor-pointer" onClick={() => { setSelectedApt(apt); setShowGallery(true); }}>
                    {apt.coverPhoto ? (
                      <img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="text-gray-300" size={40} />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl font-bold text-gray-900 shadow-sm text-sm">
                      {apt.basePrice} ر.س <span className="text-gray-500 font-normal text-xs">/ ليلة</span>
                    </div>
                    {apt.images?.length > 1 && (
                      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-white text-xs flex items-center gap-1 font-medium">
                        <ImageIcon size={14} /> +{apt.images.length - 1}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-xl text-gray-900">{apt.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                      <span className="bg-gray-100 px-2 py-1 rounded-md font-medium">{apt.type}</span>
                    </div>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-6 flex-1">{apt.description || 'لا يوجد وصف متاح.'}</p>

                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => { setSelectedApt(apt); setShowGallery(true); }}
                        className="p-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors"
                        title="عرض التفاصيل"
                      >
                        <ImageIcon size={20} />
                      </button>
                      <button
                        onClick={() => { setSelectedApt(apt); setStep(3); }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                      >
                        حجز الوحدة
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {availableApartments.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300 mt-6">
                <MapPin className="mx-auto text-gray-300 mb-4" size={48} />
                <h3 className="text-lg font-bold text-gray-900 mb-2">عذراً، لا توجد وحدات متاحة</h3>
                <p className="text-gray-500 max-w-md mx-auto">لم نتمكن من العثور على شقق متاحة في التواريخ المحددة. جرب تغيير فترة الإقامة.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CUSTOMER FORM */}
        {step === 3 && selectedApt && (
          <div className="w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 mb-6 shadow-sm">
              {selectedApt.coverPhoto && (
                <img src={selectedApt.coverPhoto} alt="cover" className="w-20 h-20 object-cover rounded-xl" />
              )}
              <div>
                <p className="text-xs text-gray-500 font-bold mb-1">الوحدة المختارة</p>
                <h3 className="font-bold text-lg text-gray-900 leading-tight">{selectedApt.name}</h3>
                <p className="text-blue-600 font-bold text-sm">{selectedApt.basePrice} ر.س / ليلة</p>
              </div>
            </div>

            <form onSubmit={handleSubmitBooking} className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 mb-6">بيانات الضيف</h2>

              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الكامل <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text" required
                      className="w-full pr-12 pl-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                      placeholder="أدخل اسمك الكريم"
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">رقم الجوال <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="tel" required dir="ltr"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-left"
                      placeholder="+966 5X XXX XXXX"
                      value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات إضافية</label>
                  <textarea
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    rows="3" placeholder="أي طلبات خاصة أو وقت الوصول المتوقع..."
                    value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 flex justify-center">
                <Turnstile
                  siteKey="1x00000000000000000000AA"
                  onSuccess={(token) => setTurnstileToken(token)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !turnstileToken}
                className="w-full bg-gray-900 disabled:bg-gray-300 hover:bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-gray-300 transition-all active:scale-95"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال طلب الحجز'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div className="w-full max-w-md mx-auto text-center animate-in zoom-in-95 duration-500 mt-10">
            <div className="bg-white p-10 rounded-3xl shadow-xl shadow-green-100 border border-green-50 flex flex-col items-center">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-3">تم إرسال طلبك بنجاح</h2>
              <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                تلقينا طلب الحجز الخاص بك لشقة <span className="font-bold text-gray-800">{selectedApt?.name}</span>. <br/>
                سيتم مراجعة الطلب والتواصل معك قريباً لتأكيد الحجز.
              </p>

              <button
                onClick={() => {
                  setStep(1);
                  setDateRange({ startDate: null, endDate: null });
                  setSelectedApt(null);
                }}
                className="text-blue-600 font-bold hover:underline"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Fluid Gallery Modal */}
      {showGallery && selectedApt && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <h3 className="text-white font-bold text-lg">{selectedApt.name}</h3>
            <button onClick={() => setShowGallery(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-6 pb-24">
            {selectedApt.images && selectedApt.images.length > 0 ? (
               selectedApt.images.map((img, idx) => (
                 <img key={idx} src={img} className="max-w-4xl w-full rounded-2xl shadow-2xl" alt={`gallery-${idx}`} />
               ))
            ) : (
               selectedApt.coverPhoto && <img src={selectedApt.coverPhoto} className="max-w-4xl w-full rounded-2xl shadow-2xl" alt="cover" />
            )}
            <div className="max-w-3xl w-full bg-white/10 backdrop-blur-md p-6 rounded-2xl text-white mt-8">
               <h4 className="font-bold text-xl mb-3">تفاصيل الوحدة</h4>
               <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{selectedApt.description || 'لا يوجد تفاصيل.'}</p>
            </div>
          </div>

          <div className="bg-gradient-to-t from-black to-transparent p-6 pb-8 fixed bottom-0 w-full flex justify-center">
            <button
              onClick={() => { setShowGallery(false); setStep(3); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-full font-bold text-lg shadow-2xl shadow-blue-900 transition-all active:scale-95"
            >
              تأكيد اختيار الوحدة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

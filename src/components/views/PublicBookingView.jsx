import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import DatePickerCal from '../ui/DatePickerCal';
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
      <div className="min-h-screen bg-canvas flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-canvas border-b border-hairline py-3 md:py-4 px-4 md:px-6 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {admin?.logoUrl ? (
              <img src={admin.logoUrl} alt={admin.businessName} className="h-10 w-10 shrink-0 object-contain rounded-md border border-hairline" />
            ) : (
              <div className="h-10 w-10 shrink-0 bg-ink text-white rounded-md flex items-center justify-center font-semibold text-xl">
                {admin?.businessName?.charAt(0) || admin?.name?.charAt(0) || 'م'}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-semibold tracking-tight text-ink text-base md:text-lg truncate leading-tight">{admin?.businessName || admin?.name || 'إدارة الأملاك'}</h1>
              <p className="text-xs text-muted truncate">منصة الحجز الإلكتروني</p>
            </div>
          </div>
          {step > 1 && step < 4 && (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors shrink-0">
              <ChevronRight size={16} /> رجوع
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6 md:py-12 w-full max-w-5xl mx-auto">

        {/* STEP 1: DATE SELECTION */}
        {step === 1 && (
          <div className="w-full max-w-xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-surface-card text-ink p-4 rounded-full mb-6">
              <Calendar size={32} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink mb-2">أهلاً بك!</h2>
            <p className="text-muted mb-10 text-center">يرجى تحديد فترة الإقامة المتوقعة لعرض الوحدات المتاحة لك.</p>

            <div className="w-full bg-canvas p-6 rounded-xl shadow-soft border border-hairline mb-6">
              <label className="block text-sm font-semibold text-body mb-3">تاريخ الوصول والمغادرة</label>
              <DatePickerCal value={dateRange} onChange={handleDateChange} />
            </div>

            <button
              onClick={() => {
                if (!dateRange.startDate || !dateRange.endDate) return toast.error('الرجاء اختيار التواريخ أولاً');
                setStep(2);
              }}
              className="w-full max-w-xs bg-ink hover:bg-primary-active text-white py-4 rounded-full font-semibold text-lg transition-colors active:scale-95"
            >
              متابعة لعرض الوحدات
            </button>
          </div>
        )}

        {/* STEP 2: APARTMENT CATALOG */}
        {step === 2 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2 mb-6 md:mb-8">
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-ink mb-1">الوحدات المتاحة</h2>
                <p className="text-muted text-sm">من {formatDateForRender(dateRange.startDate)} إلى {formatDateForRender(dateRange.endDate)}</p>
              </div>
              <span className="badge-pill font-semibold shrink-0 self-start md:self-auto">{availableApartments.length} وحدات</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableApartments.map(apt => (
                <div key={apt.id} className="bg-canvas rounded-lg border border-hairline overflow-hidden hover:shadow-soft transition-shadow group flex flex-col h-full">
                  <div className="h-56 relative overflow-hidden cursor-pointer" onClick={() => { setSelectedApt(apt); setShowGallery(true); }}>
                    {apt.coverPhoto ? (
                      <img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-surface-card flex items-center justify-center">
                        <ImageIcon className="text-muted-soft" size={40} />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-canvas/90 backdrop-blur-sm px-3 py-1.5 rounded-md font-semibold text-ink shadow-micro text-sm">
                      {apt.basePrice} ر.س <span className="text-muted font-normal text-xs">/ ليلة</span>
                    </div>
                    {apt.images?.length > 1 && (
                      <div className="absolute bottom-4 left-4 bg-ink/60 backdrop-blur-md px-2 py-1 rounded-md text-white text-xs flex items-center gap-1 font-medium">
                        <ImageIcon size={14} /> +{apt.images.length - 1}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-xl tracking-tight text-ink">{apt.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mb-4 text-sm text-body">
                      <span className="badge-pill">{apt.type}</span>
                    </div>
                    <p className="text-muted text-sm line-clamp-2 mb-6 flex-1">{apt.description || 'لا يوجد وصف متاح.'}</p>

                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => { setSelectedApt(apt); setShowGallery(true); }}
                        className="p-3.5 bg-surface-soft hover:bg-surface-card text-body rounded-md transition-colors"
                        title="عرض التفاصيل"
                      >
                        <ImageIcon size={20} />
                      </button>
                      <button
                        onClick={() => { setSelectedApt(apt); setStep(3); }}
                        className="btn-primary flex-1 h-auto py-3.5"
                      >
                        حجز الوحدة
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {availableApartments.length === 0 && (
              <div className="text-center py-20 bg-canvas rounded-xl border border-dashed border-hairline mt-6">
                <MapPin className="mx-auto text-muted-soft mb-4" size={48} />
                <h3 className="text-lg font-semibold text-ink mb-2">عذراً، لا توجد وحدات متاحة</h3>
                <p className="text-muted max-w-md mx-auto">لم نتمكن من العثور على شقق متاحة في التواريخ المحددة. جرب تغيير فترة الإقامة.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CUSTOMER FORM */}
        {step === 3 && selectedApt && (
          <div className="w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-canvas p-4 rounded-lg border border-hairline flex items-center gap-3 md:gap-4 mb-6">
              {selectedApt.coverPhoto && (
                <img src={selectedApt.coverPhoto} alt="cover" className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-md shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs text-muted font-semibold mb-1">الوحدة المختارة</p>
                <h3 className="font-semibold text-base md:text-lg tracking-tight text-ink leading-tight truncate">{selectedApt.name}</h3>
                <p className="text-ink font-semibold text-sm">{selectedApt.basePrice} ر.س / ليلة</p>
              </div>
            </div>

            <form onSubmit={handleSubmitBooking} className="bg-canvas p-5 md:p-8 rounded-xl shadow-soft border border-hairline">
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-ink mb-5 md:mb-6">بيانات الضيف</h2>

              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-body mb-2">الاسم الكامل <span className="text-ink">*</span></label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-soft" size={20} />
                    <input
                      type="text" required
                      className="w-full pr-12 pl-4 py-3.5 bg-canvas border border-hairline rounded-md focus:border-ink outline-none transition-colors font-medium"
                      placeholder="أدخل اسمك الكريم"
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-body mb-2">رقم الجوال <span className="text-ink">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-soft" size={20} />
                    <input
                      type="tel" required dir="ltr"
                      className="w-full pl-12 pr-4 py-3.5 bg-canvas border border-hairline rounded-md focus:border-ink outline-none transition-colors font-medium text-left"
                      placeholder="+966 5X XXX XXXX"
                      value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-body mb-2">ملاحظات إضافية</label>
                  <textarea
                    className="w-full px-4 py-3.5 bg-canvas border border-hairline rounded-md focus:border-ink outline-none transition-colors resize-none"
                    rows="3" placeholder="أي طلبات خاصة أو وقت الوصول المتوقع..."
                    value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="bg-surface-soft p-4 rounded-lg border border-hairline mb-6 flex justify-center">
                <Turnstile
                  siteKey="1x00000000000000000000AA"
                  onSuccess={(token) => setTurnstileToken(token)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !turnstileToken}
                className="w-full bg-ink disabled:bg-primary-disabled disabled:text-muted hover:bg-primary-active text-white py-4 rounded-md font-semibold text-lg transition-colors active:scale-95"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال طلب الحجز'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div className="w-full max-w-md mx-auto text-center animate-in zoom-in-95 duration-500 mt-6 md:mt-10">
            <div className="bg-canvas p-6 md:p-10 rounded-xl shadow-soft border border-hairline flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-surface-card text-ink rounded-full flex items-center justify-center mb-5 md:mb-6">
                <CheckCircle size={40} className="md:hidden" />
                <CheckCircle size={48} className="hidden md:block" />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink mb-3">تم إرسال طلبك بنجاح</h2>
              <p className="text-muted text-base md:text-lg mb-6 md:mb-8 leading-relaxed">
                تلقينا طلب الحجز الخاص بك لشقة <span className="font-semibold text-ink">{selectedApt?.name}</span>. <br/>
                سيتم مراجعة الطلب والتواصل معك قريباً لتأكيد الحجز.
              </p>

              <button
                onClick={() => {
                  setStep(1);
                  setDateRange({ startDate: null, endDate: null });
                  setSelectedApt(null);
                }}
                className="text-ink font-semibold hover:underline"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Fluid Gallery Modal */}
      {showGallery && selectedApt && (
        <div className="fixed inset-0 z-50 bg-ink/95 flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <h3 className="text-white font-semibold text-lg">{selectedApt.name}</h3>
            <button onClick={() => setShowGallery(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-6 pb-24">
            {selectedApt.images && selectedApt.images.length > 0 ? (
               selectedApt.images.map((img, idx) => (
                 <img key={idx} src={img} className="max-w-4xl w-full rounded-xl shadow-2xl" alt={`gallery-${idx}`} />
               ))
            ) : (
               selectedApt.coverPhoto && <img src={selectedApt.coverPhoto} className="max-w-4xl w-full rounded-xl shadow-2xl" alt="cover" />
            )}
            <div className="max-w-3xl w-full bg-white/10 backdrop-blur-md p-6 rounded-xl text-white mt-8">
               <h4 className="font-semibold text-xl mb-3">تفاصيل الوحدة</h4>
               <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{selectedApt.description || 'لا يوجد تفاصيل.'}</p>
            </div>
          </div>

          <div className="bg-gradient-to-t from-black to-transparent p-6 pb-8 fixed bottom-0 w-full flex justify-center">
            <button
              onClick={() => { setShowGallery(false); setStep(3); }}
              className="bg-canvas hover:bg-surface-soft text-ink px-10 py-4 rounded-full font-semibold text-lg shadow-2xl transition-colors active:scale-95"
            >
              تأكيد اختيار الوحدة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

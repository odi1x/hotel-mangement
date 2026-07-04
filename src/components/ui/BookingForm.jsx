import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import Datepicker from "react-tailwindcss-datepicker";
import toast from 'react-hot-toast';

export default function BookingForm({ onClose, initialData }) {
  const { apartments, bookings, addBooking, updateBooking, updateApartment } = useData();
  const { user } = useAuth();

  const [bookingSources, setBookingSources] = useState(['زيارة مباشرة', 'Booking.com', 'Airbnb']);

  useEffect(() => {
    if (user && user.bookingSources) {
      setBookingSources(user.bookingSources.split(',').map(s => s.trim()).filter(Boolean));
    }
  }, [user]);

  const [dateValue, setDateValue] = useState({
    startDate: initialData?.startDate || null,
    endDate: initialData?.endDate || null
  });

  const [formData, setFormData] = useState({
    id: initialData?.id || null, // Allow updating existing bookings
    apartmentId: initialData?.apartmentId || '',
    residentName: initialData?.residentName || '',
    residentId: initialData?.residentId || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    pricePerNight: initialData?.pricePerNight || '',
    source: initialData?.source || 'زيارة مباشرة',
    notes: initialData?.notes || '',
    customerRequest: initialData?.customerRequest || '',
    status: initialData?.status || undefined
  });

  const [retrievedNotes, setRetrievedNotes] = useState(null);

  // Auto-retrieve past notes when either phone number OR ID match
  useEffect(() => {
      // Don't auto-retrieve if we are editing an existing booking that already has notes
      if (formData.id) return;

      const hasPhone = formData.phone && formData.phone.length >= 8;
      const hasId = formData.residentId && formData.residentId.length >= 5;

      if (hasPhone || hasId) {
          const pastBookings = bookings.filter(b => {
              if (!b.notes || b.notes.trim() === '') return false;

              const phoneMatch = hasPhone && b.phone === formData.phone;
              const idMatch = hasId && b.residentId === formData.residentId;

              return phoneMatch || idMatch;
          });

          if (pastBookings.length > 0) {
              // Sort to get the most recent note
              pastBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              const latestNote = pastBookings[0].notes;

              if (formData.notes !== latestNote && retrievedNotes !== latestNote) {
                 setRetrievedNotes(latestNote);
              }
          } else {
              setRetrievedNotes(null);
          }
      } else {
          setRetrievedNotes(null);
      }
  }, [formData.phone, formData.residentId, bookings, formData.notes, formData.id]);

  const [error, setError] = useState('');

  const isOverlapping = (start, end, aptId) => {
    return bookings.some(b => {
      if (b.apartmentId !== aptId) return false;
      if (formData.id && b.id === formData.id) return false; // Ignore self when editing
      const bStart = new Date(b.startDate).setHours(0,0,0,0);
      const bEnd = new Date(b.endDate).setHours(0,0,0,0);
      return start < bEnd && end > bStart;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!dateValue.startDate || !dateValue.endDate) {
      setError('يرجى تحديد تواريخ الدخول والمغادرة');
      return;
    }

    const start = new Date(dateValue.startDate).setHours(0,0,0,0);
    const end = new Date(dateValue.endDate).setHours(0,0,0,0);

    if (end < start) {
      setError('تاريخ المغادرة لا يمكن أن يكون قبل تاريخ الوصول');
      return;
    }

    if (isOverlapping(start, end, formData.apartmentId)) {
      setError('هذه الوحدة محجوزة بالفعل في الفترة المحددة');
      return;
    }

    // Block booking if apartment needs cleaning
    const selectedApt = apartments.find(a => a.id === formData.apartmentId);
    if (selectedApt && selectedApt.needsCleaning) {
      setError('لا يمكن الحجز لأن الوحدة تحتاج إلى تنظيف.');
      return;
    }

    try {
      if (formData.id) {
          await updateBooking({
            ...formData,
            startDate: dateValue.startDate,
            endDate: dateValue.endDate
          , status: formData.status === 'pending' ? 'active' : formData.status});
      } else {
          await addBooking({
            ...formData,
            startDate: dateValue.startDate,
            endDate: dateValue.endDate
          });
      }
      toast.success('تم الحفظ بنجاح');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحجز');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto pt-10 pb-32" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-visible animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 rounded-t-3xl">
          <div>
            <h2 className="text-xl font-black text-gray-800 dark:text-slate-100 mb-1">إضافة حجز جديد</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">أدخل كافة التفاصيل لإعداد عقد الإيجار.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200 flex justify-between items-center">
              <span>{error}</span>
              {error === 'لا يمكن الحجز لأن الوحدة تحتاج إلى تنظيف.' && (user?.role === 'admin' || user?.permissions?.canEdit) && (
                <button
                  type="button"
                  onClick={async () => {
                      const apt = apartments.find(a => a.id === formData.apartmentId);
                      if (apt) {
                          await updateApartment({ ...apt, needsCleaning: false });
                          setError('');
                      }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                >
                  تحديد كـ "تم التنظيف"
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 pb-2">معلومات النزيل</h4>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">الاسم الكامل</label>
                <input required type="text" placeholder="مثلاً: أحمد محمد" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={formData.residentName} onChange={(e) => setFormData({...formData, residentName: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">رقم الهوية / الجواز</label>
                <input required type="text" placeholder="10XXXXXXXX" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={formData.residentId} onChange={(e) => setFormData({...formData, residentId: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">رقم الهاتف</label>
                <input required type="tel" placeholder="05XXXXXXXX" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>

              {initialData?.customerRequest && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">طلب النزيل الإضافي</p>
                    <p className="text-xs text-amber-900 dark:text-amber-200">{initialData.customerRequest}</p>
                </div>
              )}

              {retrievedNotes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex flex-col gap-2">
                    <p className="text-xs text-yellow-800 dark:text-yellow-400 font-bold">يوجد ملاحظة سابقة لهذا النزيل:</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-500 bg-white dark:bg-slate-800 p-2 rounded border border-yellow-100 dark:border-yellow-900">{retrievedNotes}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setFormData({...formData, notes: retrievedNotes});
                            setRetrievedNotes(null);
                        }}
                        className="text-xs bg-yellow-400 hover:bg-yellow-500 text-yellow-900 py-1.5 rounded font-bold transition-colors mt-1"
                    >
                        استعادة هذه الملاحظة للحجز الحالي
                    </button>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">العنوان</label>
                <input type="text" placeholder="الشارع، المدينة، الدولة" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 dark:bg-slate-800 dark:text-slate-100" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 pb-2">تفاصيل الإقامة</h4>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">الشقة</label>
                <select required className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.apartmentId} onChange={(e) => setFormData({...formData, apartmentId: e.target.value})}>
                  <option value="">اختر الشقة...</option>
                  {apartments.map(a => <option key={a.id} value={a.id}>{a.name} ({a.basePrice} ر.س)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">تاريخ الحجز (الدخول والمغادرة)</label>
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 relative z-50" dir="ltr">
                  <Datepicker
                    i18n={"ar"}
                    configs={{
                      shortcuts: {
                        today: "اليوم",
                        yesterday: "أمس",
                        past: (period) => `آخر ${period} يوم`,
                        currentMonth: "هذا الشهر",
                        pastMonth: "الشهر الماضي",
                      },
                    }}

                    value={dateValue}
                    onChange={newValue => setDateValue(newValue)}
                    showShortcuts={true}
                    primaryColor="blue"
                    inputClassName="w-full pl-4 pr-12 py-2.5 outline-none bg-transparent text-gray-900 dark:text-slate-100 placeholder-gray-400 text-right"
                    placeholder="اختر تواريخ الحجز"
                    displayFormat="YYYY-MM-DD"
                    useRange={true}
                    popoverDirection="down"
                    containerClassName="relative" popoverClassName="rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">السعر / الليلة</label>
                  <input required type="number" placeholder="0.00" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 font-black text-green-600 dark:text-green-400 transition-all" value={formData.pricePerNight} onChange={(e) => setFormData({...formData, pricePerNight: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">مصدر الوصول</label>
                  <select className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})}>
                    {bookingSources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-none mt-8 active:scale-95">تأكيد الحجز</button>
        </form>
      </div>
    </div>
  );
}

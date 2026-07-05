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
    pricePerNight: initialData?.pricePerNight ?? '',
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-10 pb-32" dir="rtl">
      <div className="bg-canvas dark:bg-surface-dark rounded-xl shadow-soft border border-hairline dark:border-[#2e2e2e] w-full max-w-2xl overflow-visible animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-center rounded-t-xl">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white mb-1">إضافة حجز جديد</h2>
            <p className="text-xs text-muted dark:text-[#a1a1aa]">أدخل كافة التفاصيل لإعداد عقد الإيجار.</p>
          </div>
          <button onClick={onClose} className="icon-action"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 bg-surface-card dark:bg-surface-dark-elevated text-ink dark:text-white p-3 rounded-md text-sm font-medium border border-hairline dark:border-[#2e2e2e] flex justify-between items-center">
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
                  className="bg-ink hover:bg-primary-active text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                >
                  تحديد كـ "تم التنظيف"
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[11px] font-semibold text-muted dark:text-[#a1a1aa] uppercase tracking-widest border-b border-hairline-soft dark:border-[#242424] pb-2">معلومات النزيل</h4>
              <div>
                <label className="block text-[10px] font-semibold text-muted dark:text-[#a1a1aa] uppercase mb-1.5">الاسم الكامل</label>
                <input required type="text" placeholder="مثلاً: أحمد محمد" className="input-field" value={formData.residentName} onChange={(e) => setFormData({...formData, residentName: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted dark:text-[#a1a1aa] uppercase mb-1.5">رقم الهوية / الجواز</label>
                <input required type="text" placeholder="10XXXXXXXX" className="input-field" value={formData.residentId} onChange={(e) => setFormData({...formData, residentId: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted dark:text-[#a1a1aa] uppercase mb-1.5">رقم الهاتف</label>
                <input required type="tel" placeholder="05XXXXXXXX" className="input-field" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>

              {initialData?.customerRequest && (
                <div className="bg-surface-card dark:bg-surface-dark-elevated border border-hairline dark:border-[#2e2e2e] rounded-md p-3 flex flex-col gap-1">
                    <p className="text-[10px] font-semibold text-muted dark:text-[#a1a1aa] uppercase">طلب النزيل الإضافي</p>
                    <p className="text-xs text-ink dark:text-white">{initialData.customerRequest}</p>
                </div>
              )}

              {retrievedNotes && (
                <div className="bg-surface-card dark:bg-surface-dark-elevated border border-hairline dark:border-[#2e2e2e] rounded-md p-3 flex flex-col gap-2">
                    <p className="text-xs text-ink dark:text-white font-semibold">يوجد ملاحظة سابقة لهذا النزيل:</p>
                    <p className="text-xs text-body dark:text-[#a1a1aa] bg-canvas dark:bg-surface-dark p-2 rounded border border-hairline dark:border-[#2e2e2e]">{retrievedNotes}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setFormData({...formData, notes: retrievedNotes});
                            setRetrievedNotes(null);
                        }}
                        className="text-xs bg-ink hover:bg-primary-active text-white py-1.5 rounded-md font-semibold transition-colors mt-1"
                    >
                        استعادة هذه الملاحظة للحجز الحالي
                    </button>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-muted dark:text-[#a1a1aa] uppercase mb-1.5">العنوان</label>
                <input type="text" placeholder="الشارع، المدينة، الدولة" className="input-field" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[11px] font-semibold text-muted dark:text-[#a1a1aa] uppercase tracking-widest border-b border-hairline-soft dark:border-[#242424] pb-2">تفاصيل الإقامة</h4>
              <div>
                <label className="block text-[10px] font-semibold text-muted dark:text-[#a1a1aa] uppercase mb-1.5">الشقة</label>
                <select required className="input-field" value={formData.apartmentId} onChange={(e) => {
                  const selectedAptId = e.target.value;
                  const apt = apartments.find(a => a.id === selectedAptId);
                  setFormData({
                    ...formData,
                    apartmentId: selectedAptId,
                    pricePerNight: apt ? apt.basePrice : formData.pricePerNight
                  });
                }}>
                  <option value="">اختر الشقة...</option>
                  {apartments.map(a => <option key={a.id} value={a.id}>{a.name} ({a.basePrice} ر.س)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted dark:text-[#a1a1aa] uppercase mb-1.5">تاريخ الحجز (الدخول والمغادرة)</label>
                <div className="dp-shell border border-hairline dark:border-[#2e2e2e] rounded-md bg-canvas dark:bg-surface-dark-elevated relative z-50" dir="ltr">
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
                    primaryColor="gray"
                    inputClassName="w-full pl-4 pr-12 py-2.5 outline-none bg-transparent text-ink dark:text-white placeholder-muted-soft text-right"
                    placeholder="اختر تواريخ الحجز"
                    displayFormat="YYYY-MM-DD"
                    useRange={true}
                    popoverDirection="down"
                    containerClassName="relative" popoverClassName="rounded-lg shadow-soft border border-hairline dark:border-[#2e2e2e] overflow-hidden"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted dark:text-[#a1a1aa] uppercase mb-1.5">السعر / الليلة</label>
                  <input required type="number" placeholder="0.00" className="input-field font-semibold text-ink dark:text-white" value={formData.pricePerNight} onChange={(e) => setFormData({...formData, pricePerNight: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted dark:text-[#a1a1aa] uppercase mb-1.5">مصدر الوصول</label>
                  <select className="input-field" value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})}>
                    {bookingSources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full h-12 text-base mt-8">تأكيد الحجز</button>
        </form>
      </div>
    </div>
  );
}

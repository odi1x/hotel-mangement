import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import Datepicker from "react-tailwindcss-datepicker";

export default function BookingForm({ onClose, initialData }) {
  const { apartments, bookings, addBooking } = useData();
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
    apartmentId: initialData?.apartmentId || '',
    residentName: '',
    residentId: '',
    phone: '',
    address: '',
    pricePerNight: initialData?.pricePerNight || '',
    source: 'زيارة مباشرة'
  });

  const [error, setError] = useState('');

  const isOverlapping = (start, end, aptId) => {
    return bookings.some(b => {
      if (b.apartmentId !== aptId) return false;
      const bStart = new Date(b.startDate).setHours(0,0,0,0);
      const bEnd = new Date(b.endDate).setHours(0,0,0,0);
      return start <= bEnd && end >= bStart;
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

    try {
      await addBooking({
        ...formData,
        startDate: dateValue.startDate,
        endDate: dateValue.endDate
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحجز');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-black text-gray-800 dark:text-slate-100 mb-1">إضافة حجز جديد</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">أدخل كافة التفاصيل لإعداد عقد الإيجار.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200">
              {error}
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
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 relative z-50">
                  <Datepicker
                    value={dateValue}
                    onChange={newValue => setDateValue(newValue)}
                    showShortcuts={true}
                    primaryColor="blue"
                    inputClassName="w-full px-4 py-2.5 outline-none bg-transparent text-gray-900 dark:text-slate-100 placeholder-gray-400"
                    placeholder="اختر تواريخ الحجز"
                    displayFormat="YYYY-MM-DD"
                    popoverDirection="down"
                    useRange={false}
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

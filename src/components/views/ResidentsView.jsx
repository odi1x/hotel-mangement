import { useState, useMemo } from 'react';
import { Phone, Printer, Trash2, Search } from 'lucide-react';
import { useData } from '../../context/DataContext';
import PrintAgreement from '../ui/PrintAgreement';

export default function ResidentsView() {
  const { apartments, bookings, deleteBooking } = useData();
  const [printBooking, setPrintBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;

    const query = searchQuery.toLowerCase();
    return bookings.filter(b =>
      b.residentName.toLowerCase().includes(query) ||
      b.phone.includes(query)
    );
  }, [bookings, searchQuery]);

  const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG', {
    month: 'short',
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

  const handleDelete = (id) => {
    if(confirm('هل تريد حذف هذا الحجز؟')) {
      deleteBooking(id);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 dark:text-slate-100">سجلات الحجز الكاملة</h3>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الجوال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all text-sm"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/50">
                <th className="px-6 py-4">معلومات النزيل</th>
                <th className="px-6 py-4">الاتصال والهوية</th>
                <th className="px-6 py-4">الوحدة / السعر</th>
                <th className="px-6 py-4">الفترة</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
              {filteredBookings.map((booking) => {
                const apt = apartments.find(a => a.id === booking.apartmentId);
                const isCurrent = isDateBetween(new Date(), booking.startDate, booking.endDate);
                return (
                  <tr key={booking.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-slate-100">{booking.residentName}</div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5">عبر: {booking.source}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium flex items-center text-gray-700 dark:text-slate-300"><Phone size={14} className="ml-1.5 text-gray-400"/> {booking.phone}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">هوية: {booking.residentId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-800 dark:text-slate-200">{apt?.name || 'وحدة محذوفة'}</div>
                      <div className="text-xs text-green-600 dark:text-green-500 font-black mt-1">{booking.pricePerNight} ر.س / ليلة</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-gray-600 dark:text-slate-400">{formatDate(booking.startDate)} <span className="mx-1 text-gray-300">←</span> {formatDate(booking.endDate)}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase mt-1 bg-gray-100 dark:bg-slate-800 inline-block px-2 py-0.5 rounded">{calculateNights(booking.startDate, booking.endDate)} ليالي</div>
                    </td>
                    <td className="px-6 py-4">
                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800/50">مقيم حالياً</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700">مغادر</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-reverse space-x-2">
                        <button
                          onClick={() => setPrintBooking(booking)}
                          className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="طباعة العقد"
                        >
                          <Printer size={18} />
                        </button>
                        <button onClick={() => handleDelete(booking.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-400 font-medium">لا توجد حجوزات مطابقة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {printBooking && (
        <PrintAgreement booking={printBooking} onClose={() => setPrintBooking(null)} />
      )}
    </>
  );
}

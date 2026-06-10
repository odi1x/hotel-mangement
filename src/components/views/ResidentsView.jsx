import { useState, useMemo } from 'react';
import { Phone, Printer, Trash2, Search, ShieldCheck, ShieldAlert, Edit2, MessageSquare, LogOut } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import PrintAgreement from '../ui/PrintAgreement';
import toast from 'react-hot-toast';

export default function ResidentsView({ openBookingForm }) {
  const { apartments, bookings, deleteBooking, checkoutBooking, toggleTrustedStatus, updateBooking } = useData();
  const { user } = useAuth();
  const [printBooking, setPrintBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteContent, setNoteContent] = useState('');

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

  const handleCheckout = (id) => {
    if(confirm('هل أنت متأكد من رغبتك في تسجيل خروج هذا النزيل مبكراً؟ سيتم تحديث تاريخ المغادرة للوقت الحالي مع الاحتفاظ بالقيمة المالية وإتاحة الوحدة للإيجار مجدداً.')) {
      checkoutBooking(id);
    }
  };

  const handleSaveNote = async () => {
    const booking = bookings.find(b => b.id === editingNoteId);
    if (booking) {
      try {
        await updateBooking({ ...booking, notes: noteContent });
        toast.success('تم حفظ الملاحظة بنجاح');
      } catch (err) {
        toast.error('فشل حفظ الملاحظة');
      }
    }
    setEditingNoteId(null);
    setNoteContent('');
  };

  const openNoteModal = (booking) => {
    setEditingNoteId(booking.id);
    setNoteContent(booking.notes || '');
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
                      <div className="font-bold text-gray-900 dark:text-slate-100 flex items-center">
                        {booking.residentName}
                        {booking.trusted && (
                          <ShieldCheck size={14} className="ml-2 text-green-500" title="نزيل موثوق" />
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5">عبر: {booking.source}</div>
                      {booking.creatorName && (
                        <div className="text-[10px] text-blue-500 font-medium mt-0.5">بواسطة: {booking.creatorName}</div>
                      )}
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
                      {booking.status === 'checked_out_early' ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50">خروج مبكر</span>
                      ) : isCurrent ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800/50">مقيم حالياً</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700">مغادر</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-reverse space-x-2">
                        {isCurrent && booking.status !== 'checked_out_early' && (
                          <button
                            onClick={() => handleCheckout(booking.id)}
                            className="text-orange-600 hover:text-orange-800 p-2 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors flex items-center"
                            title="تسجيل خروج مبكر"
                          >
                            <LogOut size={18} />
                          </button>
                        )}
                        {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                          <button
                            onClick={() => toggleTrustedStatus(booking.phone, booking.trusted)}
                            className={`p-2 rounded-lg transition-colors ${
                              booking.trusted
                                ? 'text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/30'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                            }`}
                            title={booking.trusted ? "إزالة من الموثوقين" : "تعيين كموثوق"}
                          >
                            {booking.trusted ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                          </button>
                        )}
                        <button
                          onClick={() => setPrintBooking(booking)}
                          className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="طباعة العقد"
                        >
                          <Printer size={18} />
                        </button>
                        {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                          <button
                            onClick={() => openNoteModal(booking)}
                            className={`p-2 rounded-lg transition-colors ${
                              booking.notes && booking.notes.trim() !== ''
                                ? 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                                : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                            }`}
                            title="ملاحظات النزيل"
                          >
                            <MessageSquare size={18} />
                          </button>
                        )}
                        {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                          <button
                            onClick={() => openBookingForm(booking)}
                            className="text-orange-500 hover:text-orange-700 p-2 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                            title="تعديل الحجز"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        {(user?.role === 'admin' || user?.permissions?.canDelete) && (
                          <button onClick={() => handleDelete(booking.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="حذف الحجز">
                            <Trash2 size={18} />
                          </button>
                        )}
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

      {editingNoteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-black text-gray-800 dark:text-slate-100 flex items-center">
                <MessageSquare className="ml-2 text-yellow-500" size={20} />
                ملاحظات النزيل
              </h2>
            </div>

            <div className="p-6">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="أضف ملاحظات تخص هذا النزيل..."
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 h-32 bg-gray-50 dark:bg-slate-800 dark:text-slate-100 resize-none transition-all"
              ></textarea>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex space-x-reverse space-x-3">
              <button
                onClick={handleSaveNote}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-yellow-200 dark:shadow-none"
              >
                حفظ الملاحظة
              </button>
              <button
                onClick={() => setEditingNoteId(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 py-2.5 rounded-xl font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

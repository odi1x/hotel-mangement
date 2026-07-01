import { useState, useEffect } from 'react';
import { Phone, Printer, Trash2, Search, Edit2, MessageSquare, LogOut, X, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import PrintAgreement from '../ui/PrintAgreement';
import toast from 'react-hot-toast';

export default function ResidentsView({ openBookingForm }) {
  const { apartments, bookings, deleteBooking, checkoutBooking, updateBooking, fetchBookings, fetchApartments } = useData(); // eslint-disable-line no-unused-vars
  const { user } = useAuth();
  const [printBooking, setPrintBooking] = useState(null);
  const [printSelectorBooking, setPrintSelectorBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [checkoutData, setCheckoutData] = useState({ id: null, option: 'keep', days: '', notes: '', booking: null });

  // Server-side pagination state
  const [paginatedData, setPaginatedData] = useState({
    bookings: [],
    metadata: {
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
      limit: ITEMS_PER_PAGE
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPaginatedBookings = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('/api/bookings', {
          params: {
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            search: searchQuery.trim() || undefined
          }
        });
        if (response.data && response.data.metadata) {
          setPaginatedData(response.data);
        } else {
          // Fallback if the API doesn't return metadata (e.g. backend not updated yet)
          setPaginatedData({
             bookings: Array.isArray(response.data) ? response.data : [],
             metadata: { totalPages: 1, currentPage: 1, limit: ITEMS_PER_PAGE, totalCount: Array.isArray(response.data) ? response.data.length : 0 }
          });
        }
      } catch (err) {
        console.error('Failed to fetch paginated bookings', err);
        toast.error('فشل في تحميل الحجوزات');
      } finally {
        setIsLoading(false);
      }
    };

    // Use a small timeout to debounce search typing
    const timeoutId = setTimeout(() => {
      fetchPaginatedBookings();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchQuery, bookings]); // Depend on bookings to re-fetch when global context bookings update (like after adding/deleting)


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

  const isFutureBooking = (startDate) => {
    const today = new Date().setHours(0,0,0,0);
    const start = new Date(startDate).setHours(0,0,0,0);
    return start > today;
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteBooking(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };


  const handleCheckout = (booking) => {
    const s = new Date(booking.startDate);
    const today = new Date();
    const diffTime = Math.abs(today - s);
    const stayedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    setCheckoutData({
      id: booking.id,
      option: 'keep',
      days: stayedDays.toString(),
      notes: '',
      booking
    });
    setCheckoutModalOpen(true);
  };

  const confirmCheckout = async () => {
    if (checkoutData.option === 'recalculate' && !checkoutData.days) {
      return toast.error('الرجاء إدخال عدد الأيام');
    }

    try {
      await axios.put('/api/bookings', {
        id: checkoutData.id,
        isCheckout: true,
        financialOption: checkoutData.option,
        customDays: checkoutData.days,
        reasonNotes: checkoutData.notes
      });
      fetchBookings();
      fetchApartments(); // Refresh apartment status
      toast.success('تم تسجيل الخروج بنجاح');
      setCheckoutModalOpen(false);
    } catch (e) { console.error(e);
      toast.error('حدث خطأ أثناء الخروج');
    }
  };

  const handleSaveNote = async () => {
    const booking = currentBookings.find(b => b.id === editingNoteId);
    if (booking) {
      try {
        await updateBooking({ ...booking, notes: noteContent });
        toast.success('تم حفظ الملاحظة بنجاح');
        fetchBookings(); // Trigger global refresh just in case
      } catch (err) { console.error(err);
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

  const { bookings: currentBookings, metadata } = paginatedData;
  const totalPages = metadata.totalPages;

  return (
    <>
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col min-h-0">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 dark:text-slate-100">سجلات الحجز الكاملة</h3>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الجوال..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all text-sm"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 h-full min-h-0">
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
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50 flex-1">
              {isLoading ? (
                Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse border-b border-gray-100 dark:border-slate-800">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-28"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-full w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-lg w-24"></div></td>
                  </tr>
                ))
              ) : currentBookings.map((booking) => {
                const apt = apartments.find(a => a.id === booking.apartmentId);
                const isCurrent = isDateBetween(new Date(), booking.startDate, booking.endDate);
                const isFuture = isFutureBooking(booking.startDate);
                return (
                  <tr key={booking.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-slate-100 flex items-center">
                        {booking.residentName}

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
                      ) : isFuture ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">متوقع وصوله</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700">مغادر</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-reverse space-x-2">
                        {isCurrent && booking.status !== 'checked_out_early' && (
                          <button
                            onClick={() => handleCheckout(booking)}
                            className="text-orange-600 hover:text-orange-800 p-2 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors flex items-center"
                            title="تسجيل خروج مبكر"
                          >
                            <LogOut size={18} />
                          </button>
                        )}

                        <button
                          onClick={() => setPrintSelectorBooking(booking)}
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
              {currentBookings.length > 0 && currentBookings.length < ITEMS_PER_PAGE && Array.from({ length: ITEMS_PER_PAGE - currentBookings.length }).map((_, idx) => (
                <tr key={`dummy-${idx}`} className="invisible pointer-events-none">
                  <td className="px-6 py-4">&nbsp;</td>
                </tr>
              ))}
              {!isLoading && currentBookings.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-400 font-medium">لا توجد حجوزات مطابقة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 mt-auto shrink-0">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              السابق
            </button>
            <div className="flex space-x-reverse space-x-1">
              {(() => {
                const pages = [];
                const maxVisible = 5;
                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  if (currentPage <= 3) {
                    pages.push(1, 2, 3, 4, '...', totalPages);
                  } else if (currentPage >= totalPages - 2) {
                    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                  }
                }
                return pages.map((page, index) => (
                  <button
                    key={`${page}-${index}`}
                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
                    disabled={page === '...'}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-md'
                        : page === '...'
                        ? 'text-gray-400 cursor-default'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                ));
              })()}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {printBooking && (
        <PrintAgreement booking={printBooking.booking} documentType={printBooking.type} onClose={() => setPrintBooking(null)} />
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

      {/* Checkout Modal */}
      {checkoutModalOpen && checkoutData.booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => { setCheckoutModalOpen(false); setCheckoutData({ id: null, option: 'keep', days: '', notes: '', booking: null }); }}></div>
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-red-100 dark:border-red-900/30">
            <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center">
              <h3 className="font-bold text-red-700 dark:text-red-400 text-lg flex items-center gap-2">
                <LogOut size={20} />
                تأكيد مغادرة مبكرة
              </h3>
              <button onClick={() => { setCheckoutModalOpen(false); setCheckoutData({ id: null, option: 'keep', days: '', notes: '', booking: null }); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 p-3 rounded-lg text-sm font-bold border border-orange-200 dark:border-orange-800/50">
                أنت على وشك تسجيل خروج للنزيل ({checkoutData.booking.residentName}) قبل موعده. هذا الإجراء سيقوم بإتاحة الشقة فوراً.
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">خيارات احتساب المبلغ:</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <input
                      type="radio"
                      name="financialOption"
                      value="keep"
                      checked={checkoutData.option === 'keep'}
                      onChange={() => setCheckoutData({...checkoutData, option: 'keep'})}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm font-bold text-gray-800 dark:text-white">الاحتفاظ بالمبلغ كامل (القيمة الأصلية)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <input
                      type="radio"
                      name="financialOption"
                      value="recalculate"
                      checked={checkoutData.option === 'recalculate'}
                      onChange={() => setCheckoutData({...checkoutData, option: 'recalculate'})}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm font-bold text-gray-800 dark:text-white">تعديل المبلغ بناءً على الأيام</span>
                  </label>
                </div>
              </div>

              {checkoutData.option === 'recalculate' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">عدد الأيام الفعلية:</label>
                  <input
                    type="number"
                    value={checkoutData.days}
                    onChange={(e) => setCheckoutData({...checkoutData, days: e.target.value})}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-2">السعر الإجمالي الجديد سيكون: {Number(checkoutData.days || 0) * Number(checkoutData.booking.pricePerNight)} ر.س</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">سبب المغادرة المبكرة:</label>
                <textarea
                  value={checkoutData.notes}
                  onChange={(e) => setCheckoutData({...checkoutData, notes: e.target.value})}
                  rows="3"
                  placeholder="اكتب سبب الخروج هنا... سيتم حفظه في ملاحظات النزيل"
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 text-sm"
                ></textarea>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => { setCheckoutModalOpen(false); setCheckoutData({ id: null, option: 'keep', days: '', notes: '', booking: null }); }}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmCheckout}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-500/30"
              >
                تأكيد تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-100 dark:border-red-900/30 transform transition-all">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-5">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                تأكيد الحذف
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                هل أنت متأكد من حذف هذا النزيل؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex space-x-reverse space-x-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-red-200 dark:shadow-none"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-transparent hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-bold transition-all border border-gray-300 dark:border-slate-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Options Modal */}
      {printSelectorBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setPrintSelectorBooking(null)}></div>
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-800 transform transition-all">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-black text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <Printer size={20} className="text-blue-600 dark:text-blue-500" />
                خيارات الطباعة
              </h3>
              <button onClick={() => setPrintSelectorBooking(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <button
                onClick={() => {
                  setPrintBooking({ booking: printSelectorBooking, type: 'voucher' });
                  setPrintSelectorBooking(null);
                }}
                className="w-full flex items-center justify-between p-4 border-2 border-transparent bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-2xl transition-all group"
              >
                <div className="flex flex-col text-right">
                  <span className="font-black text-lg mb-1 group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">طباعة تقرير مالي</span>
                  <span className="text-sm opacity-80 font-medium text-blue-700 dark:text-blue-300">سند قبض للمبالغ المدفوعة</span>
                </div>
                <div className="bg-blue-200/50 dark:bg-blue-800/50 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Printer size={24} />
                </div>
              </button>

              <button
                onClick={() => {
                  setPrintBooking({ booking: printSelectorBooking, type: 'confirmation' });
                  setPrintSelectorBooking(null);
                }}
                className="w-full flex items-center justify-between p-4 border-2 border-transparent bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 rounded-2xl transition-all group"
              >
                <div className="flex flex-col text-right">
                  <span className="font-black text-lg mb-1 group-hover:text-emerald-900 dark:group-hover:text-emerald-100 transition-colors">طباعة تأكيد الحجز</span>
                  <span className="text-sm opacity-80 font-medium text-emerald-700 dark:text-emerald-300">تفاصيل الحجز وشروطه</span>
                </div>
                <div className="bg-emerald-200/50 dark:bg-emerald-800/50 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Printer size={24} />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

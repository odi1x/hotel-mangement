import { useState, useEffect } from 'react';
import { Phone, Printer, Trash2, Search, Edit2, MessageSquare, LogOut, X, AlertTriangle, Wallet, ArrowLeftRight, CalendarDays, Users } from 'lucide-react';
import { useData } from '../../context/DataContext';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import PrintAgreement from '../ui/PrintAgreement';
import EmptyState from '../ui/EmptyState';
import { computeBookingTotals } from '../../lib/paymentUtils';
import toast from 'react-hot-toast';

export default function ResidentsView({ openBookingForm }) {
  const { apartments, bookings, deleteBooking, checkoutBooking, updateBooking, fetchBookings, fetchApartments } = useData(); // eslint-disable-line no-unused-vars
  const { user } = useAuth();
  const [printBooking, setPrintBooking] = useState(null);
  const [printSelectorBooking, setPrintSelectorBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 18;
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
      <div className="flex-1 bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden flex flex-col min-h-0">
        <div className="p-5 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center">
          <h3 className="font-semibold tracking-tight text-ink dark:text-white">سجلات الحجز الكاملة</h3>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الجوال..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="input-field pl-10 pr-4 py-2"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-muted-soft" />
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 h-full min-h-0">
          <table className="w-full text-right">
            <thead>
              <tr className="text-xs font-semibold text-muted dark:text-body-dark border-b border-hairline-soft dark:border-hairline-dark">
                <th className="px-6 py-4">النزيل</th>
                <th className="px-6 py-4">الاتصال</th>
                <th className="px-6 py-4">الوحدة</th>
                <th className="px-6 py-4">الفترة</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-soft dark:divide-hairline-dark flex-1">
              {isLoading ? (
                Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse border-b border-hairline-soft dark:border-hairline-dark">
                    <td className="px-6 py-4"><div className="h-4 bg-surface-card dark:bg-surface-dark-elevated rounded w-24"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-surface-card dark:bg-surface-dark-elevated rounded w-32 mb-2"></div>
                      <div className="h-3 bg-surface-card dark:bg-surface-dark-elevated rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 bg-surface-card dark:bg-surface-dark-elevated rounded w-28"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-surface-card dark:bg-surface-dark-elevated rounded w-24 mb-2"></div>
                      <div className="h-3 bg-surface-card dark:bg-surface-dark-elevated rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-6 bg-surface-card dark:bg-surface-dark-elevated rounded-full w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-surface-card dark:bg-surface-dark-elevated rounded-md w-24"></div></td>
                  </tr>
                ))
              ) : currentBookings.map((booking) => {
                const apt = apartments.find(a => a.id === booking.apartmentId);
                const isCurrent = isDateBetween(new Date(), booking.startDate, booking.endDate);
                const isFuture = isFutureBooking(booking.startDate);
                return (
                  <tr key={booking.id} className="hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink dark:text-white flex items-center">
                        {booking.residentName}

                      </div>
                      <div className="text-2xs text-muted-soft mt-0.5">عبر: {booking.source}</div>
                      {booking.creatorName && (
                        <div className="text-2xs text-muted mt-0.5">بواسطة: {booking.creatorName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium flex items-center text-body dark:text-body-dark"><Phone size={14} className="ml-1.5 text-muted-soft"/> {booking.phone}</div>
                      <div className="text-xs text-muted dark:text-body-dark mt-1">هوية: {booking.residentId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-ink dark:text-white">{apt?.name || 'وحدة محذوفة'}</div>
                      <div className="text-xs text-accent font-semibold mt-1">{booking.pricePerNight} ر.س / ليلة</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-body dark:text-body-dark">{formatDate(booking.startDate)} <span className="mx-1 text-muted-soft">←</span> {formatDate(booking.endDate)}</div>
                      <div className="badge-pill text-2xs font-semibold mt-1">{calculateNights(booking.startDate, booking.endDate)} ليالي</div>
                    </td>
                    <td className="px-6 py-4">
                      {booking.status === 'checked_out_early' ? (
                          <span className="badge-pill badge-dashed text-xs font-semibold">خروج مبكر</span>
                      ) : isCurrent ? (
                        <span className="badge-pill badge-solid text-xs font-semibold">مقيم حالياً</span>
                      ) : isFuture ? (
                        <span className="badge-pill badge-outline text-xs font-semibold">متوقع وصوله</span>
                      ) : (
                        <span className="badge-pill badge-ghost text-xs font-semibold">مغادر</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-reverse space-x-1">
                        {isCurrent && booking.status !== 'checked_out_early' && (
                          <button
                            onClick={() => handleCheckout(booking)}
                            className="icon-action hover:text-accent"
                            title="تسجيل خروج مبكر"
                          >
                            <LogOut size={18} />
                          </button>
                        )}

                        <button
                          onClick={() => setPrintSelectorBooking(booking)}
                          className="icon-action hover:text-accent"
                          title="طباعة العقد"
                        >
                          <Printer size={18} />
                        </button>
                        {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                          <button
                            onClick={() => openNoteModal(booking)}
                            className={`icon-action hover:text-accent ${booking.notes && booking.notes.trim() !== '' ? 'opacity-100 text-accent' : ''}`}
                            title="ملاحظات النزيل"
                          >
                            <MessageSquare size={18} />
                          </button>
                        )}
                        {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                          <button
                            onClick={() => openBookingForm(booking)}
                            className="icon-action hover:text-accent"
                            title="تعديل الحجز"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        {(user?.role === 'admin' || user?.permissions?.canDelete) && (
                          <button onClick={() => handleDelete(booking.id)} className="icon-action hover:text-accent" title="حذف الحجز">
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
                  <td colSpan="6" className="px-6 py-4">
                    <EmptyState
                      icon={Users}
                      title="لا توجد حجوزات مطابقة"
                      subtitle="جرّب تعديل الفلاتر أو مصطلح البحث للعثور على النزلاء."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls — Cal.com capsule group */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-hairline-soft dark:border-hairline-dark mt-auto shrink-0">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-secondary h-9 px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <div className="nav-pill-group">
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
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-canvas text-ink shadow-pill dark:bg-hairline-dark-soft dark:text-white'
                        : page === '...'
                        ? 'text-muted-soft cursor-default'
                        : 'text-muted hover:text-ink dark:hover:text-white'
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
              className="btn-secondary h-9 px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-canvas dark:bg-surface-dark rounded-xl w-full max-w-md shadow-soft border border-hairline dark:border-hairline-dark-soft overflow-hidden flex flex-col">
            <div className="p-5 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center">
              <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white flex items-center">
                <MessageSquare className="ml-2 text-muted" size={20} />
                ملاحظات النزيل
              </h2>
            </div>

            <div className="p-6">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="أضف ملاحظات تخص هذا النزيل..."
                className="input-field h-32 resize-none"
              ></textarea>
            </div>

            <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark flex space-x-reverse space-x-3">
              <button
                onClick={handleSaveNote}
                className="btn-primary flex-1"
              >
                حفظ الملاحظة
              </button>
              <button
                onClick={() => setEditingNoteId(null)}
                className="btn-secondary flex-1"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutModalOpen && checkoutData.booking && (() => {
        // Live math for the modal — computed on each render so the preview
        // updates instantly as the user changes the day count.
        const bk = checkoutData.booking;
        // computeBookingTotals returns { totalDue, totalReceived, balanceDue, status, nights }
        // Alias locally to the names used in the modal below.
        const { totalDue: totalOwed, totalReceived: paid } = computeBookingTotals(bk);
        const startDate = new Date(bk.startDate);
        const now = new Date();
        const nightsStayedActual = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));

        const newTotal = checkoutData.option === 'recalculate'
          ? Number(checkoutData.days || 0) * Number(bk.pricePerNight)
          : Number(totalOwed);

        // If the guest already paid more than the new total, we'll auto-refund the difference.
        const refundAmount = checkoutData.option === 'recalculate' && paid > newTotal
          ? paid - newTotal
          : 0;

        // If the new total is less than what they've paid, they overpaid.
        // If greater, guest still owes.
        const remainingAfter = newTotal - paid;

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => { setCheckoutModalOpen(false); setCheckoutData({ id: null, option: 'keep', days: '', notes: '', booking: null }); }}></div>
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-lg overflow-hidden border border-hairline dark:border-hairline-dark-soft max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center shrink-0">
              <h3 className="font-semibold tracking-tight text-ink dark:text-white text-lg flex items-center gap-2">
                <LogOut size={20} />
                تأكيد مغادرة مبكرة
              </h3>
              <button onClick={() => { setCheckoutModalOpen(false); setCheckoutData({ id: null, option: 'keep', days: '', notes: '', booking: null }); }} className="icon-action hover:text-accent">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto min-h-0">
              <div className="bg-surface-card dark:bg-surface-dark-elevated text-ink dark:text-white p-3 rounded-lg text-sm font-medium">
                أنت على وشك تسجيل خروج للنزيل ({checkoutData.booking.residentName}) قبل موعده. هذا الإجراء سيقوم بإتاحة الشقة فوراً.
              </div>

              {/* Financial context — the operator needs this to make an informed choice */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-soft/60 dark:bg-surface-dark-elevated rounded-md p-3">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted-soft mb-1 flex items-center gap-1">
                    <Wallet size={10} />
                    مدفوع حتى الآن
                  </p>
                  <p className="text-sm font-bold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {paid.toLocaleString()} <span className="text-2xs text-muted-soft font-medium">ر.س</span>
                  </p>
                </div>
                <div className="bg-surface-soft/60 dark:bg-surface-dark-elevated rounded-md p-3">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted-soft mb-1 flex items-center gap-1">
                    <CalendarDays size={10} />
                    ليالٍ مقضية
                  </p>
                  <p className="text-sm font-bold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {nightsStayedActual}
                  </p>
                </div>
                <div className="bg-surface-soft/60 dark:bg-surface-dark-elevated rounded-md p-3">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted-soft mb-1 flex items-center gap-1">
                    <ArrowLeftRight size={10} />
                    إجمالي الحجز
                  </p>
                  <p className="text-sm font-bold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number(totalOwed).toLocaleString()} <span className="text-2xs text-muted-soft font-medium">ر.س</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-body dark:text-body-dark mb-3">خيارات احتساب المبلغ:</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-hairline dark:border-hairline-dark-soft rounded-md cursor-pointer hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors">
                    <input
                      type="radio"
                      name="financialOption"
                      value="keep"
                      checked={checkoutData.option === 'keep'}
                      onChange={() => setCheckoutData({...checkoutData, option: 'keep'})}
                      className="w-4 h-4 accent-black"
                    />
                    <span className="text-sm font-semibold text-ink dark:text-white">الاحتفاظ بالمبلغ كامل (القيمة الأصلية)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-hairline dark:border-hairline-dark-soft rounded-md cursor-pointer hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors">
                    <input
                      type="radio"
                      name="financialOption"
                      value="recalculate"
                      checked={checkoutData.option === 'recalculate'}
                      onChange={() => setCheckoutData({...checkoutData, option: 'recalculate'})}
                      className="w-4 h-4 accent-black"
                    />
                    <span className="text-sm font-semibold text-ink dark:text-white">تعديل المبلغ بناءً على الأيام</span>
                  </label>
                </div>
              </div>

              {checkoutData.option === 'recalculate' && (
                <div className="animate-fade-in space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-body dark:text-body-dark mb-2">عدد الأيام الفعلية:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={checkoutData.days}
                        onChange={(e) => setCheckoutData({...checkoutData, days: e.target.value})}
                        className="input-field"
                        min="1"
                      />
                      {Number(checkoutData.days) !== nightsStayedActual && (
                        <button
                          type="button"
                          onClick={() => setCheckoutData({...checkoutData, days: String(nightsStayedActual)})}
                          className="text-xs text-accent-strong font-semibold hover:underline whitespace-nowrap"
                          title="الأيام الفعلية المقضية من تاريخ الوصول حتى اليوم"
                        >
                          استخدم {nightsStayedActual}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-2">
                      السعر الإجمالي الجديد:{' '}
                      <span className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {Number(newTotal).toLocaleString()} ر.س
                      </span>
                    </p>
                  </div>

                  {/* Refund / owing summary — the whole point of the enhancement */}
                  {refundAmount > 0 && (
                    <div className="border border-dashed border-accent/60 bg-accent-soft rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded-md bg-accent/15 text-accent-strong shrink-0 mt-0.5">
                          <ArrowLeftRight size={12} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-accent-strong mb-0.5">
                            سيتم إنشاء استرداد تلقائي
                          </p>
                          <p className="text-xs text-body dark:text-body-dark">
                            المدفوع ({paid.toLocaleString()} ر.س) أكبر من الإجمالي الجديد ({Number(newTotal).toLocaleString()} ر.س).
                            سيُسجَّل استرداد بمقدار{' '}
                            <span className="font-bold text-accent-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {refundAmount.toLocaleString()} ر.س
                            </span>{' '}
                            في سجل المدفوعات.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {refundAmount === 0 && remainingAfter > 0 && (
                    <div className="border border-hairline dark:border-hairline-dark-soft rounded-md p-3 text-xs text-muted dark:text-body-dark">
                      لا استرداد. النزيل لا يزال مديناً بـ{' '}
                      <span className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {remainingAfter.toLocaleString()} ر.س
                      </span>{' '}
                      بعد المغادرة.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-body dark:text-body-dark mb-2">سبب المغادرة المبكرة:</label>
                <textarea
                  value={checkoutData.notes}
                  onChange={(e) => setCheckoutData({...checkoutData, notes: e.target.value})}
                  rows="3"
                  placeholder="اكتب سبب الخروج هنا... سيتم حفظه في ملاحظات النزيل"
                  className="input-field resize-none"
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setCheckoutModalOpen(false); setCheckoutData({ id: null, option: 'keep', days: '', notes: '', booking: null }); }}
                className="btn-secondary h-10 px-5"
              >
                إلغاء
              </button>
              <button
                onClick={confirmCheckout}
                className="btn-primary h-10 px-5"
              >
                تأكيد تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-sm overflow-hidden border border-hairline dark:border-hairline-dark-soft transform transition-all">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-surface-card dark:bg-surface-dark-elevated mb-5">
                <AlertTriangle className="h-8 w-8 text-ink dark:text-white" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-ink dark:text-white mb-2">
                تأكيد الحذف
              </h3>
              <p className="text-sm text-muted dark:text-body-dark font-medium">
                هل أنت متأكد من حذف هذا النزيل؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark flex space-x-reverse space-x-3">
              <button
                onClick={confirmDelete}
                className="btn-primary flex-1"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary flex-1"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Options Modal */}
      {printSelectorBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setPrintSelectorBooking(null)}></div>
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-md overflow-hidden border border-hairline dark:border-hairline-dark-soft transform transition-all">
            <div className="px-6 py-5 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center">
              <h3 className="font-semibold tracking-tight text-ink dark:text-white text-lg flex items-center gap-2">
                <Printer size={20} className="text-ink dark:text-white" />
                خيارات الطباعة
              </h3>
              <button onClick={() => setPrintSelectorBooking(null)} className="icon-action hover:text-accent">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <button
                onClick={() => {
                  setPrintBooking({ booking: printSelectorBooking, type: 'voucher' });
                  setPrintSelectorBooking(null);
                }}
                className="w-full flex items-center justify-between p-4 bg-surface-card hover:bg-surface-strong/60 dark:bg-surface-dark-elevated dark:hover:bg-hairline-dark text-ink dark:text-white rounded-lg transition-colors group"
              >
                <div className="flex flex-col text-right">
                  <span className="font-semibold text-lg mb-1 tracking-tight">طباعة تقرير مالي</span>
                  <span className="text-sm text-muted dark:text-body-dark">سند قبض للمبالغ المدفوعة</span>
                </div>
                <div className="bg-canvas dark:bg-surface-dark p-3 rounded-md border border-hairline dark:border-hairline-dark-soft">
                  <Printer size={24} />
                </div>
              </button>

              <button
                onClick={() => {
                  setPrintBooking({ booking: printSelectorBooking, type: 'confirmation' });
                  setPrintSelectorBooking(null);
                }}
                className="w-full flex items-center justify-between p-4 bg-surface-card hover:bg-surface-strong/60 dark:bg-surface-dark-elevated dark:hover:bg-hairline-dark text-ink dark:text-white rounded-lg transition-colors group"
              >
                <div className="flex flex-col text-right">
                  <span className="font-semibold text-lg mb-1 tracking-tight">طباعة تأكيد الحجز</span>
                  <span className="text-sm text-muted dark:text-body-dark">تفاصيل الحجز وشروطه</span>
                </div>
                <div className="bg-canvas dark:bg-surface-dark p-3 rounded-md border border-hairline dark:border-hairline-dark-soft">
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

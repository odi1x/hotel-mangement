import {  useState, useMemo , useRef, useLayoutEffect } from 'react';
import { ChevronRight, ChevronLeft, Calendar, Plus, Home, User, Phone, Receipt, X, MessageSquare } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const DayCell = ({ dayObj, isToday, dateStr, dayBookings, apartments, setSelectedDayBookings, setSelectedBookingDetails }) => {
  const cellRef = useRef(null);
  const [maxVisible, setMaxVisible] = useState(Math.min(dayBookings.length, 3));

  useLayoutEffect(() => {
    if (!cellRef.current) return;

    let timeoutId = null;

    const calculateVisibleItems = () => {
      // Measure the full height of the outer cell
      const cellHeight = cellRef.current.clientHeight;

      // Early return if DOM hasn't fully painted
      if (cellHeight === 0) return;

      // Approximate heights:
      // cell padding: 16px (p-2 is 8px top+bottom)
      // header (day number): ~28px + 8px mb-2 = 36px
      const headerSpace = 30; // Reduced to allow more items
      const availableHeight = cellHeight - headerSpace;

      const itemHeight = 22; // Booking item height + gap

      if (availableHeight < itemHeight) {
         setMaxVisible(dayBookings.length > 0 ? 1 : 0);
         return;
      }

      let fitCount = Math.floor(availableHeight / itemHeight);

      // Since the "+X" label floats, we don't need to subtract its height

      // Force a minimum of 1 visible item if there are bookings
      if (fitCount <= 0 && dayBookings.length > 0) {
        fitCount = 1;
      }

      setMaxVisible(Math.max(0, fitCount));
    };

    const debouncedCalculate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateVisibleItems, 50);
    };

    const observer = new ResizeObserver(debouncedCalculate);
    observer.observe(cellRef.current);

    // Initial calculation immediately (without debounce)
    calculateVisibleItems();

    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [dayBookings.length]);

  const visibleBookings = dayBookings.slice(0, maxVisible);
  const hiddenCount = dayBookings.length - maxVisible;

  return (
    <div
      ref={cellRef}
      className={`flex flex-col min-h-0 h-full p-2 border-b border-l border-[1px] border-gray-100 dark:border-[#242424] last:border-l-0 relative group transition-colors overflow-hidden
        ${!dayObj.isCurrentMonth ? 'bg-surface-soft/60 dark:bg-surface-dark-elevated/40' : 'bg-canvas dark:bg-surface-dark hover:bg-surface-soft dark:hover:bg-surface-dark-elevated/60'}
      `}
      onClick={() => setSelectedDayBookings({ date: dayObj.date, bookings: dayBookings })}
    >
      <div className="flex justify-between items-start mb-1 shrink-0">
        <span className={`text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full
          ${isToday ? 'bg-accent text-white' :
            !dayObj.isCurrentMonth ? 'text-muted-soft dark:text-[#555]' : 'text-body dark:text-[#a1a1aa]'
          }
        `}>{dayObj.date.getDate()}</span>
        {isToday && <span className="text-[10px] font-semibold text-accent">اليوم</span>}
      </div>

      <div className="w-full flex flex-col gap-1 overflow-hidden relative">
        {visibleBookings.map(booking => {
          const apt = apartments.find(a => a.id === booking.apartmentId);
          if (!apt) return null;
          const isPending = booking.status === 'pending';
          const isStart = new Date(booking.startDate).toDateString() === dateStr;
          const isEnd = new Date(booking.endDate).toDateString() === dateStr;
          return (
            <div key={booking.id} title={`${apt.name} - ${booking.residentName}`}
              className={`text-[10px] px-1.5 py-0.5 rounded flex items-center h-5 font-semibold truncate cursor-pointer transition-opacity hover:opacity-70 shrink-0 w-full
                ${isPending
                  ? 'bg-surface-soft text-muted border border-dashed border-hairline dark:bg-surface-dark-elevated dark:text-[#a1a1aa] dark:border-[#3a3a3a]'
                  : 'bg-surface-card text-ink border border-hairline-soft dark:bg-surface-dark-elevated dark:text-white dark:border-[#2e2e2e]'}
                ${isStart ? 'rounded-r-md ml-0.5' : ''} ${isEnd ? 'rounded-l-md mr-0.5' : ''}`}
              onClick={(e) => { e.stopPropagation(); setSelectedBookingDetails(booking); }}
            ><span className="opacity-60 ml-1 truncate">{apt.name}:</span><span className="truncate">{booking.residentName}</span></div>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <div className="flex items-center text-[10px] font-semibold text-muted dark:text-[#a1a1aa] absolute bottom-1 left-1 bg-canvas/95 dark:bg-surface-dark-elevated/95 rounded-full px-1.5 py-0.5 z-10 border border-hairline dark:border-[#2e2e2e] backdrop-blur-sm">
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

export default function AvailabilityView({ openBookingForm }) {
  const { apartments, bookings, deleteBooking } = useData();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApartmentFilter, setSelectedApartmentFilter] = useState("all");

  // Modals state
  const [selectedDayBookings, setSelectedDayBookings] = useState(null); // { date, bookings }
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month padding
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month, daysInMonth, firstDayOfMonth]);

  const isDateBetween = (date, start, end) => {
    const d = new Date(date).setHours(0,0,0,0);
    const s = new Date(start).setHours(0,0,0,0);
    const e = new Date(end).setHours(0,0,0,0);
    return d >= s && d <= e;
  };

  const getBookingsForDate = (date) => {
    let filteredBookings = bookings;
    if (selectedApartmentFilter !== "all") {
      filteredBookings = bookings.filter(b => b.apartmentId === selectedApartmentFilter);
    }
    return filteredBookings.filter(b => isDateBetween(date, b.startDate, b.endDate));
  };

  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };


  const formatDateAr = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <div className="flex-1 min-h-0 h-full w-full bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-[#242424] overflow-hidden flex flex-col">
      <div className="p-4 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-center bg-canvas dark:bg-surface-dark">
        <div className="flex items-center space-x-reverse space-x-4">
          <h3 className="font-semibold text-ink dark:text-white flex items-center text-lg tracking-tight">
            <Calendar size={20} className="ml-2 text-ink dark:text-white" />
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center space-x-reverse space-x-1 bg-canvas dark:bg-surface-dark-elevated border border-hairline dark:border-[#2e2e2e] rounded-md p-1 mr-4">
            <button onClick={handleNextMonth} className="p-1 hover:bg-surface-soft dark:hover:bg-[#242424] rounded text-muted hover:text-ink dark:hover:text-white transition-colors"><ChevronRight size={18} /></button>
            <button onClick={handleToday} className="px-4 text-xs font-semibold text-body dark:text-[#a1a1aa] hover:bg-surface-soft dark:hover:bg-[#242424] hover:text-ink dark:hover:text-white rounded py-1 transition-colors">اليوم</button>
            <button onClick={handlePrevMonth} className="p-1 hover:bg-surface-soft dark:hover:bg-[#242424] rounded text-muted hover:text-ink dark:hover:text-white transition-colors"><ChevronLeft size={18} /></button>
          </div>
        </div>
        <div className="flex items-center space-x-reverse space-x-4">
          <p className="badge-pill text-muted dark:text-[#a1a1aa]">
            اضغط على أي يوم لإضافة حجز او عرض جميع الحجوزات
          </p>
          <select
            className="text-xs text-ink dark:text-white font-medium bg-canvas dark:bg-surface-dark-elevated px-3 py-1.5 rounded-md border border-hairline dark:border-[#2e2e2e] outline-none focus:border-ink dark:focus:border-white transition-colors cursor-pointer"
            value={selectedApartmentFilter}
            onChange={(e) => setSelectedApartmentFilter(e.target.value)}
          >
            <option value="all">جميع الوحدات</option>
            {apartments.map(apt => (
              <option key={apt.id} value={apt.id}>{apt.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-canvas dark:bg-surface-dark">
        <div className="grid grid-cols-7 border-b border-[1px] border-gray-100 dark:border-[#242424] bg-canvas dark:bg-surface-dark sticky top-0 z-10">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
            <div key={day} className="py-3 px-1 text-center text-xs font-semibold text-muted dark:text-[#a1a1aa] whitespace-nowrap border-l border-gray-100 dark:border-[#242424] last:border-l-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${calendarDays.length / 7}, minmax(0, 1fr))` }}>
          {calendarDays.map((dayObj, i) => {
            const dateStr = dayObj.date.toDateString();
            const isToday = dateStr === new Date().toDateString();
            const dayBookings = getBookingsForDate(dayObj.date);
            return (
              <DayCell
                key={i}
                dayObj={dayObj}
                isToday={isToday}
                dateStr={dateStr}
                dayBookings={dayBookings}
                apartments={apartments}
                setSelectedDayBookings={setSelectedDayBookings}
                setSelectedBookingDetails={setSelectedBookingDetails}
              />
            );
          })}
        </div>
      </div>

      {/* First Modal: List of bookings for the selected day */}
      {selectedDayBookings && !selectedBookingDetails && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-canvas dark:bg-surface-dark rounded-xl w-full max-w-md shadow-soft border border-hairline dark:border-[#2e2e2e] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-center">
              <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white">حجوزات يوم {formatDateAr(selectedDayBookings.date)}</h2>
              <button onClick={() => setSelectedDayBookings(null)} className="icon-action">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {selectedDayBookings.bookings.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayBookings.bookings.map((booking) => {
                    const apt = apartments.find(a => a.id === booking.apartmentId);
                    return (
                      <div
                        key={booking.id}
                        onClick={() => setSelectedBookingDetails(booking)}
                        className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg cursor-pointer hover:bg-surface-strong/60 dark:hover:bg-[#242424] transition-colors group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-ink dark:text-white">{apt?.name || 'وحدة غير معروفة'}</span>
                          {booking.status === 'pending' ? (
                            <span className="badge-pill text-muted border border-dashed border-hairline dark:border-[#3a3a3a]">طلب معلق</span>
                          ) : (
                            <span className="badge-pill font-semibold">{booking.pricePerNight} ر.س</span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-muted dark:text-[#a1a1aa]">
                          <User size={14} className="ml-1" />
                          {booking.residentName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-muted dark:text-[#a1a1aa] font-medium">لا توجد حجوزات في هذا اليوم</div>
              )}
            </div>

            {(user?.role === 'admin' || user?.permissions?.canBook) && (
              <div className="p-4 border-t border-hairline-soft dark:border-[#242424] flex justify-between">
                <button
                  onClick={() => {
                    setSelectedDayBookings(null);
                    openBookingForm({ startDate: selectedDayBookings.date.toISOString().split('T')[0] });
                  }}
                  className="btn-primary text-sm h-9 px-4"
                >
                  <Plus size={16} />
                  <span>إضافة حجز جديد في هذا اليوم</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Second Modal: Specific Booking Details */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-canvas dark:bg-surface-dark rounded-xl w-full max-w-md shadow-soft border border-hairline dark:border-[#2e2e2e] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-center">
              <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white">تفاصيل الحجز</h2>
              <button onClick={() => setSelectedBookingDetails(null)} className="icon-action">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-reverse space-x-3 bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg">
                <Home size={24} className="text-ink dark:text-white" />
                <div>
                  <div className="text-xs text-muted dark:text-[#a1a1aa]">الوحدة المحجوزة</div>
                  <div className="font-semibold text-ink dark:text-white">
                    {apartments.find(a => a.id === selectedBookingDetails.apartmentId)?.name || 'غير معروف'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-card dark:bg-surface-dark-elevated p-3 rounded-lg">
                  <div className="text-xs text-muted dark:text-[#a1a1aa] flex items-center mb-1"><User size={12} className="ml-1"/> اسم النزيل</div>
                  <div className="font-semibold text-sm text-ink dark:text-white">{selectedBookingDetails.residentName}</div>
                </div>
                <div className="bg-surface-card dark:bg-surface-dark-elevated p-3 rounded-lg">
                  <div className="text-xs text-muted dark:text-[#a1a1aa] flex items-center mb-1"><Phone size={12} className="ml-1"/> رقم التواصل</div>
                  <div className="font-semibold text-sm text-ink dark:text-white" dir="ltr">{selectedBookingDetails.phone}</div>
                </div>
              </div>

              <div className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg">
                <div className="text-xs text-muted dark:text-[#a1a1aa] flex items-center mb-2"><Calendar size={12} className="ml-1"/> فترة الحجز</div>
                <div className="flex justify-between items-center text-sm font-semibold text-ink dark:text-white">
                  <span>{new Date(selectedBookingDetails.startDate).toLocaleDateString('ar-EG')}</span>
                  <span className="text-muted-soft">إلى</span>
                  <span>{new Date(selectedBookingDetails.endDate).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>

              <div className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg">
                <div className="text-xs text-muted dark:text-[#a1a1aa] flex items-center mb-1"><Receipt size={12} className="ml-1"/> السعر لليلة</div>
                <div className="font-semibold text-lg text-ink dark:text-white">{selectedBookingDetails.pricePerNight} ر.س</div>
              </div>

              {selectedBookingDetails.customerRequest && selectedBookingDetails.customerRequest.trim() !== '' && (
                <div className="bg-surface-soft dark:bg-surface-dark-elevated p-4 rounded-lg border border-hairline dark:border-[#2e2e2e]">
                  <div className="text-xs text-muted dark:text-[#a1a1aa] flex items-center mb-1"><MessageSquare size={12} className="ml-1"/> طلب النزيل الإضافي</div>
                  <div className="text-sm font-semibold text-ink dark:text-white">{selectedBookingDetails.customerRequest}</div>
                </div>
              )}

              {selectedBookingDetails.notes && selectedBookingDetails.notes.trim() !== '' && (
                <div className="bg-surface-soft dark:bg-surface-dark-elevated p-4 rounded-lg border border-hairline dark:border-[#2e2e2e]">
                  <div className="text-xs text-muted dark:text-[#a1a1aa] flex items-center mb-1"><MessageSquare size={12} className="ml-1"/> ملاحظات داخلية (للموظفين)</div>
                  <div className="text-sm font-medium text-body dark:text-[#a1a1aa]">{selectedBookingDetails.notes}</div>
                </div>
              )}

              {selectedBookingDetails.creatorName && (
                <div className="text-xs text-muted dark:text-[#a1a1aa] text-center">
                  تم إضافة الحجز بواسطة: <span className="font-semibold text-ink dark:text-white">{selectedBookingDetails.creatorName}</span>
                </div>
              )}
            </div>

            <div className={`p-4 border-t border-hairline-soft dark:border-[#242424] grid gap-3 ${user?.role === 'admin' || user?.permissions?.canEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                <button
                  onClick={() => {
                    const bookingToEdit = selectedBookingDetails;
                    setSelectedBookingDetails(null);
                    openBookingForm(bookingToEdit);
                  }}
                  className="btn-primary w-full text-sm h-10"
                >
                  تعديل الحجز
                </button>
              )}
              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="btn-secondary w-full text-sm h-10"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import {  useState, useMemo , useRef, useLayoutEffect } from 'react';
import { ChevronRight, ChevronLeft, Calendar, Plus, Home, User, Phone, Receipt, X, MessageSquare } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// Curated soft per-unit palette — muted pastels, calm not neon.
// Green is deliberately excluded so it never collides with the emerald
// accent (which stays reserved for "today" + money). Each unit maps
// deterministically by its index in the apartments list.
const UNIT_PALETTE = [
  { bg:'#eff6ff', tx:'#1e40af', bd:'#dbeafe', dbg:'rgba(59,130,246,0.16)',  dtx:'#93c5fd', dbd:'rgba(59,130,246,0.32)' },
  { bg:'#f5f3ff', tx:'#5b21b6', bd:'#ede9fe', dbg:'rgba(139,92,246,0.16)',  dtx:'#c4b5fd', dbd:'rgba(139,92,246,0.32)' },
  { bg:'#fff7ed', tx:'#9a3412', bd:'#ffedd5', dbg:'rgba(249,115,22,0.16)',  dtx:'#fdba74', dbd:'rgba(249,115,22,0.32)' },
  { bg:'#fff1f2', tx:'#9f1239', bd:'#ffe4e6', dbg:'rgba(244,63,94,0.16)',   dtx:'#fda4af', dbd:'rgba(244,63,94,0.32)' },
  { bg:'#ecfeff', tx:'#155e75', bd:'#cffafe', dbg:'rgba(6,182,212,0.16)',   dtx:'#67e8f9', dbd:'rgba(6,182,212,0.32)' },
  { bg:'#eef2ff', tx:'#3730a3', bd:'#e0e7ff', dbg:'rgba(99,102,241,0.16)',  dtx:'#a5b4fc', dbd:'rgba(99,102,241,0.32)' },
  { bg:'#fdf4ff', tx:'#86198f', bd:'#fae8ff', dbg:'rgba(217,70,239,0.16)',  dtx:'#f0abfc', dbd:'rgba(217,70,239,0.32)' },
  { bg:'#fffbeb', tx:'#92400e', bd:'#fef3c7', dbg:'rgba(245,158,11,0.16)',  dtx:'#fcd34d', dbd:'rgba(245,158,11,0.32)' },
];

const DayCell = ({ dayObj, isToday, dateStr, dayBookings, apartments, unitIndex, darkMode, setSelectedDayBookings, setSelectedBookingDetails }) => {
  const cellRef = useRef(null);
  const [maxVisible, setMaxVisible] = useState(Math.min(dayBookings.length, 3));

  useLayoutEffect(() => {
    if (!cellRef.current) return;

    let timeoutId = null;

    const calculateVisibleItems = () => {
      const cellHeight = cellRef.current.clientHeight;
      if (cellHeight === 0) return;

      // Real geometry: chip 22px + 3px gap = 25px stride. The day-number
      // header + cell padding eats ~48px. When there's overflow we must
      // reserve a line (~20px) for the "+N" counter so it never collides.
      const STRIDE = 25;
      const HEADER = 48;
      const BADGE = 20;
      const total = dayBookings.length;

      const avail = cellHeight - HEADER;
      let fit = Math.floor((avail + 3) / STRIDE);        // +3: last chip has no trailing gap
      if (fit < total) {
        fit = Math.floor((avail - BADGE + 3) / STRIDE);  // reserve the counter line
      }
      fit = Math.max(total > 0 ? 1 : 0, Math.min(fit, total));
      setMaxVisible(fit);
    };

    const debouncedCalculate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateVisibleItems, 50);
    };

    const observer = new ResizeObserver(debouncedCalculate);
    observer.observe(cellRef.current);
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
      className={`flex flex-col min-h-0 h-full p-2.5 border-b border-l border-[1px] border-gray-100 dark:border-[#242424] last:border-l-0 relative group transition-colors overflow-hidden
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

      <div className="flex-1 min-h-0 w-full flex flex-col gap-[3px] overflow-hidden">
        {visibleBookings.map(booking => {
          const apt = apartments.find(a => a.id === booking.apartmentId);
          if (!apt) return null;
          const isPending = booking.status === 'pending';
          const pal = UNIT_PALETTE[(unitIndex[booking.apartmentId] ?? 0) % UNIT_PALETTE.length];
          const style = isPending
            ? undefined
            : (darkMode
                ? { backgroundColor: pal.dbg, color: pal.dtx, borderColor: pal.dbd }
                : { backgroundColor: pal.bg, color: pal.tx, borderColor: pal.bd });
          return (
            <div key={booking.id} title={`${apt.name} - ${booking.residentName}`}
              style={style}
              className={`text-[11px] px-2 rounded-md flex items-center h-[22px] font-semibold truncate cursor-pointer transition-opacity hover:opacity-80 shrink-0 w-full border
                ${isPending
                  ? 'bg-surface-soft text-muted border-dashed border-hairline dark:bg-surface-dark-elevated dark:text-[#a1a1aa] dark:border-[#3a3a3a]'
                  : 'border-solid'}`}
              onClick={(e) => { e.stopPropagation(); setSelectedBookingDetails(booking); }}
            ><span className="opacity-70 ml-1 truncate">{apt.name}:</span><span className="truncate">{booking.residentName}</span></div>
          );
        })}
        {hiddenCount > 0 && (
          <div className="shrink-0 mt-auto text-[10px] font-semibold text-muted dark:text-[#a1a1aa] px-1.5 py-0.5">
            +{hiddenCount} أخرى
          </div>
        )}
      </div>
    </div>
  );
};

export default function AvailabilityView({ openBookingForm }) {
  const { apartments, bookings, deleteBooking } = useData();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApartmentFilter, setSelectedApartmentFilter] = useState("all");

  // Stable apartment → palette-slot mapping (by position in the list)
  const unitIndex = useMemo(() => {
    const m = {};
    apartments.forEach((a, i) => { m[a.id] = i % UNIT_PALETTE.length; });
    return m;
  }, [apartments]);

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
                unitIndex={unitIndex}
                darkMode={darkMode}
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
                          <span className="font-semibold text-ink dark:text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: UNIT_PALETTE[(unitIndex[booking.apartmentId] ?? 0) % UNIT_PALETTE.length].tx }}></span>
                            {apt?.name || 'وحدة غير معروفة'}
                          </span>
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

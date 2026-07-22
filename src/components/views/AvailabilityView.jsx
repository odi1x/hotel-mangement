import {  useState, useMemo , useRef, useLayoutEffect, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, Calendar, Plus, Home, User, Phone, Receipt, X, MessageSquare, Filter, Check } from 'lucide-react';
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
      className={`flex flex-col min-h-0 h-full p-2.5 border-b border-l border-[1px] border-hairline-soft dark:border-hairline-dark last:border-l-0 relative group transition-colors overflow-hidden
        ${!dayObj.isCurrentMonth ? 'bg-surface-soft/60 dark:bg-surface-dark-elevated/40' : 'bg-canvas dark:bg-surface-dark hover:bg-surface-soft dark:hover:bg-surface-dark-elevated/60'}
      `}
      onClick={() => setSelectedDayBookings({ date: dayObj.date, bookings: dayBookings })}
    >
      <div className="flex justify-between items-start mb-1 shrink-0">
        <span className={`text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full
          ${isToday ? 'bg-accent text-white' :
            !dayObj.isCurrentMonth ? 'text-muted-soft dark:text-[#555]' : 'text-body dark:text-body-dark'
          }
        `}>{dayObj.date.getDate()}</span>
        {isToday && <span className="text-2xs font-semibold text-accent">اليوم</span>}
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
              className={`text-xs px-2 rounded-md flex items-center h-[22px] font-semibold truncate cursor-pointer transition-opacity hover:opacity-80 shrink-0 w-full border
                ${isPending
                  ? 'bg-surface-soft text-muted border-dashed border-hairline dark:bg-surface-dark-elevated dark:text-body-dark dark:border-[#3a3a3a]'
                  : 'border-solid'}`}
              onClick={(e) => { e.stopPropagation(); setSelectedBookingDetails(booking); }}
            ><span className="opacity-70 ml-1 truncate">{apt.name}:</span><span className="truncate">{booking.residentName}</span></div>
          );
        })}
        {hiddenCount > 0 && (
          <div className="shrink-0 mt-auto text-2xs font-semibold text-muted dark:text-body-dark px-1.5 py-0.5">
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
  const canSeePrices = user?.role === 'admin' || user?.permissions?.canViewPrices !== false;
  const { darkMode } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApartmentFilter, setSelectedApartmentFilter] = useState("all");
  const [viewMode, setViewMode] = useState('month');
  const [filterOpen, setFilterOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [unitFilter, setUnitFilter] = useState([]); // [] = all units
  const [dragSel, setDragSel] = useState(null);      // { aptId, startIdx, curIdx }
  const filterRef = useRef(null);
  const dragRef = useRef(null);
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

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

  // ---- View mode: week / half-month / month ----
  const range = useMemo(() => {
    const d = new Date(currentDate);
    const mk = (yy, mm, dd) => new Date(yy, mm, dd);
    if (viewMode === 'week') {
      const start = new Date(d); start.setDate(d.getDate() - d.getDay());
      return Array.from({ length: 7 }, (_, i) => mk(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    if (viewMode === 'half') {
      const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const first = d.getDate() <= 15;
      const s = first ? 1 : 16, e = first ? 15 : dim;
      return Array.from({ length: e - s + 1 }, (_, i) => mk(d.getFullYear(), d.getMonth(), s + i));
    }
    // Month mode is a rolling 30-day view starting 3 days before `currentDate`,
    // NOT the calendar month 1-30. Past bookings matter far less than the near
    // future, so we anchor slightly behind today and show the next ~27 days.
    // When user navigates ← / → we shift by 30 days (see shiftRange below).
    const start = new Date(d);
    start.setDate(d.getDate() - 3);
    return Array.from({ length: 30 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [currentDate, viewMode]);

  const rangeStart = range[0];
  const rangeEnd = range[range.length - 1];

  const shiftRange = (dir) => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else if (viewMode === 'half') d.setDate(d.getDate() + dir * 15);
    else d.setDate(d.getDate() + dir * 30); // month = rolling 30-day window
    setCurrentDate(d);
  };
  const handlePrevMonth = () => shiftRange(1);   // RTL: chevron-right = forward
  const handleNextMonth = () => shiftRange(-1);
  const handleToday = () => setCurrentDate(new Date());

  // Abbreviated month names for mobile — need shorter labels to fit next to
  // navigation controls + view mode dropdown + filter button in one row.
  const monthNamesShort = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'دسم'];

  // Full label — used on desktop where there's plenty of horizontal space.
  // Month mode is now rolling 30 days so it needs a range like the others.
  const rangeLabel = `${rangeStart.getDate()} ${monthNames[rangeStart.getMonth()]} – ${rangeEnd.getDate()} ${monthNames[rangeEnd.getMonth()]}`;

  // Short label — mobile only. Uses 3-letter month abbreviations.
  const rangeLabelShort = `${rangeStart.getDate()} ${monthNamesShort[rangeStart.getMonth()]} – ${rangeEnd.getDate()} ${monthNamesShort[rangeEnd.getMonth()]}`;

  useEffect(() => { dragRef.current = dragSel; }, [dragSel]);

  useEffect(() => {
    if (!filterOpen) return;
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [filterOpen]);

  useEffect(() => {
    const up = () => {
      const cur = dragRef.current;
      if (cur) {
        const lo = Math.min(cur.startIdx, cur.curIdx);
        const hi = Math.max(cur.startIdx, cur.curIdx);
        const sd = range[lo], ed = range[hi];
        if (sd) openBookingForm({ apartmentId: cur.aptId, startDate: fmtDate(sd), ...(hi > lo ? { endDate: fmtDate(ed) } : {}) });
      }
      setDragSel(null);
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleUnit = (id, checked) => {
    setUnitFilter(prev => {
      const base = prev.length === 0 ? apartments.map(a => a.id) : prev;
      const next = checked ? Array.from(new Set([...base, id])) : base.filter(x => x !== id);
      return next.length === apartments.length ? [] : next;
    });
  };
  const unitFilterLabel = unitFilter.length === 0 ? 'كل الوحدات' : `${unitFilter.length} وحدات`;

  const formatDateAr = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <div className="flex-1 min-h-0 h-full w-full bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden flex flex-col">
      <div className="p-3 md:p-4 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center gap-2 bg-canvas dark:bg-surface-dark">
        <div className="flex items-center space-x-reverse space-x-2 md:space-x-4 min-w-0">
          <h3 className="font-semibold text-ink dark:text-white flex items-center gap-1 md:gap-2 text-xs md:text-lg tracking-tight leading-tight whitespace-nowrap shrink-0">
            <Calendar size={14} className="text-ink dark:text-white shrink-0 md:hidden" />
            <Calendar size={20} className="text-ink dark:text-white shrink-0 hidden md:block" />
            <span className="md:hidden">{rangeLabelShort}</span>
            <span className="hidden md:inline">{rangeLabel}</span>
          </h3>
          <div className="flex items-center space-x-reverse space-x-1 bg-canvas dark:bg-surface-dark-elevated border border-hairline dark:border-hairline-dark-soft rounded-md p-0.5 md:p-1 mr-0 md:mr-4 shrink-0">
            <button onClick={handleNextMonth} className="p-1 hover:bg-surface-soft dark:hover:bg-hairline-dark rounded text-muted hover:text-ink dark:hover:text-white transition-colors"><ChevronRight size={14} className="md:hidden" /><ChevronRight size={18} className="hidden md:block" /></button>
            <button onClick={handleToday} className="px-1.5 md:px-4 text-xs font-semibold text-body dark:text-body-dark hover:bg-surface-soft dark:hover:bg-hairline-dark hover:text-ink dark:hover:text-white rounded py-0.5 md:py-1 transition-colors">اليوم</button>
            <button onClick={handlePrevMonth} className="p-1 hover:bg-surface-soft dark:hover:bg-hairline-dark rounded text-muted hover:text-ink dark:hover:text-white transition-colors"><ChevronLeft size={14} className="md:hidden" /><ChevronLeft size={18} className="hidden md:block" /></button>
          </div>

          {/* View mode: pills on both platforms. Compact sizing on mobile so
              all three options stay visible and no dropdown menu covers the
              availability grid below. */}
          <div className="nav-pill-group shrink-0">
            {[{ id: 'week', t: 'أسبوع' }, { id: 'half', t: 'نصف شهر' }, { id: 'month', t: 'شهر' }].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`nav-pill text-2xs md:text-xs px-1.5 md:px-3 py-1 md:py-1.5 ${viewMode === v.id ? 'nav-pill-active' : ''}`}
              >
                {v.t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-reverse space-x-4 shrink-0">
          <p className="badge-pill text-muted dark:text-body-dark hidden lg:inline-flex">
            اسحب على الخلايا الفارغة لإنشاء حجز
          </p>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => { setPickerMonth(new Date(currentDate)); setFilterOpen(o => !o); }}
              className={`btn-secondary h-8 md:h-9 px-2 md:px-3 text-xs shrink-0 ${filterOpen ? 'border-ink dark:border-white' : ''}`}
              aria-label={unitFilterLabel}
            >
              <Filter size={14} className="md:hidden" />
              <Filter size={15} className="hidden md:block" />
              <span className="hidden md:inline">{unitFilterLabel}</span>
            </button>

            {filterOpen && (
              <div className="absolute left-0 mt-2 w-[calc(100vw-3rem)] md:w-72 max-w-[320px] bg-canvas dark:bg-surface-dark border border-hairline dark:border-hairline-dark-soft rounded-xl shadow-soft z-50 p-4">
                {/* mini calendar — jump to date */}
                <div className="text-xs font-semibold text-muted mb-2">الانتقال إلى تاريخ</div>
                {(() => {
                  const py = pickerMonth.getFullYear(), pm = pickerMonth.getMonth();
                  const firstDow = new Date(py, pm, 1).getDay();
                  const dim = new Date(py, pm + 1, 0).getDate();
                  const todayStr = new Date().toDateString();
                  const selStr = new Date(currentDate).toDateString();
                  const cells = [];
                  for (let i = 0; i < firstDow; i++) cells.push(null);
                  for (let d = 1; d <= dim; d++) cells.push(d);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <button onClick={() => setPickerMonth(new Date(py, pm - 1, 1))} className="icon-action p-1"><ChevronRight size={16} /></button>
                        <span className="text-sm font-semibold text-ink dark:text-white">{monthNames[pm]} {py}</span>
                        <button onClick={() => setPickerMonth(new Date(py, pm + 1, 1))} className="icon-action p-1"><ChevronLeft size={16} /></button>
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 text-center">
                        {['أ','ن','ث','ر','خ','ج','س'].map((w, i) => <div key={i} className="text-2xs text-muted-soft py-1">{w}</div>)}
                        {cells.map((d, i) => {
                          if (d === null) return <div key={`e${i}`}></div>;
                          const dt = new Date(py, pm, d);
                          const isToday = dt.toDateString() === todayStr;
                          const isSel = dt.toDateString() === selStr;
                          return (
                            <button key={i} onClick={() => { setCurrentDate(dt); setFilterOpen(false); }}
                              className={`text-xs w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSel ? 'bg-accent text-white font-semibold' : isToday ? 'text-accent font-bold' : 'text-body dark:text-body-dark hover:bg-surface-soft dark:hover:bg-surface-dark-elevated'}`}>
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* unit filter — MUI-style resources */}
                <div className="border-t border-hairline-soft dark:border-hairline-dark mt-3 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted">الوحدات</span>
                    {unitFilter.length > 0 && <button onClick={() => setUnitFilter([])} className="text-xs link-accent">عرض الكل</button>}
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-0.5 pl-0.5">
                    {apartments.map(a => {
                      const pal = UNIT_PALETTE[(unitIndex[a.id] ?? 0) % UNIT_PALETTE.length];
                      const checked = unitFilter.length === 0 || unitFilter.includes(a.id);
                      return (
                        <label key={a.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-soft dark:hover:bg-surface-dark-elevated cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={(e) => toggleUnit(a.id, e.target.checked)} className="w-4 h-4 accent-black rounded" />
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: darkMode ? pal.dtx : pal.tx }}></span>
                          <span className="text-sm text-ink dark:text-white truncate">{a.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const wd = ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'];
        const N = range.length;
        const canBook = user?.role === 'admin' || user?.permissions?.canBook;
        const visibleUnits = unitFilter.length === 0 ? apartments : apartments.filter(a => unitFilter.includes(a.id));
        const pad = n => String(n).padStart(2, '0');
        const minCol = viewMode === 'week' ? 90 : viewMode === 'half' ? 60 : 40;
        const rowH = 46;

        // Unit column narrower on mobile (100px) than desktop (150px) so
        // more date columns fit within the visible viewport before needing
        // to scroll horizontally.
        const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
        const unitCol = isMobile ? 100 : 150;

        const dayMs = 86400000;
        const floorDay = dt => Math.floor(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime() / dayMs);
        const d0 = floorDay(rangeStart);
        const dEnd = floorDay(rangeEnd);
        const todayN = floorDay(new Date());
        const isWknd = (dt) => { const g = dt.getDay(); return g === 5 || g === 6; };
        const cellBg = (today, wknd, r) => {
          if (today) return darkMode ? 'rgb(var(--accent-rgb) / 0.13)' : 'rgb(var(--accent-rgb) / 0.06)';
          if (wknd)  return darkMode ? 'rgba(255,255,255,0.035)' : 'rgba(17,17,17,0.028)';
          if (r % 2 === 1) return darkMode ? 'rgba(255,255,255,0.018)' : 'rgba(17,17,17,0.014)';
          return undefined;
        };
        const frozenShadow = { boxShadow: '-6px 0 10px -8px rgba(0,0,0,0.12)' };
        const neutralFill = darkMode ? '#201e1c' : '#ffffff';
        const neutralBorder = darkMode ? '#33302c' : '#e5e7eb';

        return (
          <div className="flex-1 min-h-0 overflow-auto bg-canvas dark:bg-surface-dark select-none pt-2 md:pt-0 pb-24 md:pb-0">
            <div style={{ display: 'grid', gridTemplateColumns: `${unitCol}px repeat(${N}, minmax(${minCol}px, 1fr))`, minWidth: 'min-content' }}>
              {/* corner */}
              <div className="sticky top-0 right-0 z-40 bg-canvas dark:bg-surface-dark border-b border-l border-hairline-soft dark:border-hairline-dark flex items-center justify-center text-xs font-semibold text-muted dark:text-body-dark" style={{ gridColumn: 1, gridRow: 1, height: 46, ...frozenShadow }}>
                الوحدة
              </div>
              {/* day headers */}
              {range.map((dt, i) => {
                const isToday = floorDay(dt) === todayN;
                const wknd = isWknd(dt);
                return (
                  <div key={`h${i}`} className="sticky top-0 z-30 bg-canvas dark:bg-surface-dark border-b border-l border-hairline-soft dark:border-hairline-dark flex flex-col items-center justify-center" style={{ gridColumn: 2 + i, gridRow: 1, height: 46, ...(isToday ? { borderLeft: '2px solid rgb(var(--accent-rgb))' } : {}) }}>
                    <span className={`text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-accent text-white' : wknd ? 'text-muted-soft' : 'text-body dark:text-body-dark'}`}>{dt.getDate()}</span>
                    <span className="text-2xs mt-0.5 text-muted-soft">{wd[dt.getDay()]}</span>
                  </div>
                );
              })}

              {/* unit rows */}
              {visibleUnits.map((apt, r) => {
                const row = r + 2;
                const pal = UNIT_PALETTE[(unitIndex[apt.id] ?? 0) % UNIT_PALETTE.length];
                const unitColor = darkMode ? pal.dtx : pal.tx;
                const aptBookings = bookings.filter(b => b.apartmentId === apt.id);
                return (
                  <Fragment key={apt.id}>
                    {/* sticky unit label */}
                    <div className="sticky right-0 z-20 border-b border-l border-hairline-soft dark:border-hairline-dark flex items-center gap-2 px-3" style={{ gridColumn: 1, gridRow: row, height: rowH, ...frozenShadow, backgroundColor: r % 2 === 1 ? (darkMode ? '#161514' : '#fcfcfb') : (darkMode ? '#101010' : '#ffffff') }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: unitColor }}></span>
                      <span className="text-sm font-semibold text-ink dark:text-white truncate">{apt.name}</span>
                    </div>
                    {/* empty day cells — click or drag to create */}
                    {range.map((dt, i) => {
                      const isToday = floorDay(dt) === todayN;
                      const wknd = isWknd(dt);
                      const inDrag = dragSel && dragSel.aptId === apt.id && i >= Math.min(dragSel.startIdx, dragSel.curIdx) && i <= Math.max(dragSel.startIdx, dragSel.curIdx);
                      return (
                        <div
                          key={`c${apt.id}-${i}`}
                          onMouseDown={canBook ? (ev) => { ev.preventDefault(); setDragSel({ aptId: apt.id, startIdx: i, curIdx: i }); } : undefined}
                          onMouseEnter={canBook ? () => setDragSel(prev => (prev && prev.aptId === apt.id) ? { ...prev, curIdx: i } : prev) : undefined}
                          className={`border-b border-l border-hairline-soft dark:border-hairline-dark transition-colors ${canBook ? 'cursor-pointer hover:bg-surface-soft dark:hover:bg-surface-dark-elevated/60' : ''}`}
                          style={{ gridColumn: 2 + i, gridRow: row, height: rowH, backgroundColor: inDrag ? 'rgb(var(--accent-rgb) / 0.14)' : cellBg(isToday, wknd, r), ...(isToday ? { borderLeft: '2px solid rgb(var(--accent-rgb))' } : {}) }}
                          title={canBook ? 'اسحب لإنشاء حجز' : ''}
                        ></div>
                      );
                    })}
                    {/* booking bars */}
                    {aptBookings.map(b => {
                      const bs = floorDay(new Date(b.startDate));
                      const be = floorDay(new Date(b.endDate));
                      if (be < d0 || bs > dEnd) return null;
                      const startIdx = Math.max(0, bs - d0);
                      const endIdx = Math.min(N - 1, be - d0);
                      const span = Math.max(1, endIdx - startIdx + 1);
                      const contStart = bs < d0;
                      const contEnd = be > dEnd;
                      const isPending = b.status === 'pending';
                      const isCurrent = !isPending && bs <= todayN && be >= todayN;
                      const isPast = !isPending && be < todayN;

                      let fill = neutralFill, brd = neutralBorder, txt = darkMode ? '#e7e5e4' : '#1c1917';
                      if (isCurrent) { fill = darkMode ? 'rgb(var(--accent-rgb) / 0.24)' : 'rgb(var(--accent-rgb) / 0.12)'; brd = 'rgb(var(--accent-rgb))'; txt = darkMode ? '#ffffff' : 'var(--accent-strong)'; }

                      const style = {
                        gridColumn: `${2 + startIdx} / span ${span}`,
                        gridRow: row,
                        zIndex: 1,
                        margin: '7px 2px',
                        overflow: 'hidden',
                        borderRadius: 7,
                        borderTopRightRadius: contStart ? 0 : 7,
                        borderBottomRightRadius: contStart ? 0 : 7,
                        borderTopLeftRadius: contEnd ? 0 : 7,
                        borderBottomLeftRadius: contEnd ? 0 : 7,
                        opacity: isPast ? 0.5 : 1,
                        ...(isPending
                          ? {}
                          : { backgroundColor: fill, color: txt, border: `1px solid ${brd}`,
                              borderRight: contStart ? `1px solid ${brd}` : `4px solid ${isCurrent ? 'rgb(var(--accent-rgb))' : unitColor}` }),
                      };
                      const nights = Math.max(1, be - bs);
                      const statusTxt = isPending ? 'طلب معلّق' : isCurrent ? 'مقيم حالياً' : isPast ? 'مغادر' : 'قادم';
                      const tip = `${apt.name} — ${b.residentName}\n${new Date(b.startDate).toLocaleDateString('ar-EG')} ← ${new Date(b.endDate).toLocaleDateString('ar-EG')} · ${nights} ليالٍ\n${canSeePrices ? `${b.pricePerNight} ر.س/ليلة · ` : ''}${statusTxt}`;
                      return (
                        <div
                          key={b.id}
                          onClick={(ev) => { ev.stopPropagation(); setSelectedBookingDetails(b); }}
                          onMouseDown={(ev) => ev.stopPropagation()}
                          title={tip}
                          className={`self-center flex items-center gap-1 pr-2.5 pl-2 h-[32px] text-[12px] font-semibold cursor-pointer transition-all hover:brightness-95 ${isPending ? 'bg-transparent text-muted border border-dashed border-hairline dark:text-body-dark dark:border-[#4a463f]' : ''}`}
                          style={style}
                        >
                          {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" title="مقيم حالياً"></span>}
                          <span className="truncate">{b.residentName}</span>
                          {isPending && <span className="text-2xs opacity-70 shrink-0">(معلّق)</span>}
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>

            {visibleUnits.length === 0 && (
              <div className="text-center py-16 text-muted font-medium">لا توجد وحدات لعرضها</div>
            )}
          </div>
        );
      })()}

      {/* First Modal: List of bookings for the selected day */}
      {selectedDayBookings && !selectedBookingDetails && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex z-50 items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active>
          <div className="bg-canvas dark:bg-surface-dark rounded-xl w-full max-w-md shadow-soft border border-hairline dark:border-hairline-dark-soft overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center">
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
                        className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg cursor-pointer hover:bg-surface-strong/60 dark:hover:bg-hairline-dark transition-colors group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-ink dark:text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: UNIT_PALETTE[(unitIndex[booking.apartmentId] ?? 0) % UNIT_PALETTE.length].tx }}></span>
                            {apt?.name || 'وحدة غير معروفة'}
                          </span>
                          {booking.status === 'pending' ? (
                            <span className="badge-pill text-muted border border-dashed border-hairline dark:border-[#3a3a3a]">طلب معلق</span>
                          ) : canSeePrices ? (
                            <span className="badge-pill font-semibold">{booking.pricePerNight} ر.س</span>
                          ) : null}
                        </div>
                        <div className="flex items-center text-sm text-muted dark:text-body-dark">
                          <User size={14} className="ml-1" />
                          {booking.residentName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-muted dark:text-body-dark font-medium">لا توجد حجوزات في هذا اليوم</div>
              )}
            </div>

            {(user?.role === 'admin' || user?.permissions?.canBook) && (
              <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark flex justify-between">
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
      , document.body)}

      {/* Second Modal: Specific Booking Details */}
      {selectedBookingDetails && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex z-50 items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active>
          <div className="bg-canvas dark:bg-surface-dark rounded-xl w-full max-w-md shadow-soft border border-hairline dark:border-hairline-dark-soft overflow-hidden flex flex-col">
            <div className="p-5 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center">
              <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white">تفاصيل الحجز</h2>
              <button onClick={() => setSelectedBookingDetails(null)} className="icon-action">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-reverse space-x-3 bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg">
                <Home size={24} className="text-ink dark:text-white" />
                <div>
                  <div className="text-xs text-muted dark:text-body-dark">الوحدة المحجوزة</div>
                  <div className="font-semibold text-ink dark:text-white">
                    {apartments.find(a => a.id === selectedBookingDetails.apartmentId)?.name || 'غير معروف'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-card dark:bg-surface-dark-elevated p-3 rounded-lg">
                  <div className="text-xs text-muted dark:text-body-dark flex items-center mb-1"><User size={12} className="ml-1"/> اسم النزيل</div>
                  <div className="font-semibold text-sm text-ink dark:text-white">{selectedBookingDetails.residentName}</div>
                </div>
                <div className="bg-surface-card dark:bg-surface-dark-elevated p-3 rounded-lg">
                  <div className="text-xs text-muted dark:text-body-dark flex items-center mb-1"><Phone size={12} className="ml-1"/> رقم التواصل</div>
                  <div className="font-semibold text-sm text-ink dark:text-white" dir="ltr">{selectedBookingDetails.phone}</div>
                </div>
              </div>

              <div className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg">
                <div className="text-xs text-muted dark:text-body-dark flex items-center mb-2"><Calendar size={12} className="ml-1"/> فترة الحجز</div>
                <div className="flex justify-between items-center text-sm font-semibold text-ink dark:text-white">
                  <span>{new Date(selectedBookingDetails.startDate).toLocaleDateString('ar-EG')}</span>
                  <span className="text-muted-soft">إلى</span>
                  <span>{new Date(selectedBookingDetails.endDate).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>

              {canSeePrices && (
                <div className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg">
                  <div className="text-xs text-muted dark:text-body-dark flex items-center mb-1"><Receipt size={12} className="ml-1"/> السعر لليلة</div>
                  <div className="font-semibold text-lg text-ink dark:text-white">{selectedBookingDetails.pricePerNight} ر.س</div>
                </div>
              )}

              {selectedBookingDetails.customerRequest && selectedBookingDetails.customerRequest.trim() !== '' && (
                <div className="bg-surface-soft dark:bg-surface-dark-elevated p-4 rounded-lg border border-hairline dark:border-hairline-dark-soft">
                  <div className="text-xs text-muted dark:text-body-dark flex items-center mb-1"><MessageSquare size={12} className="ml-1"/> طلب النزيل الإضافي</div>
                  <div className="text-sm font-semibold text-ink dark:text-white">{selectedBookingDetails.customerRequest}</div>
                </div>
              )}

              {selectedBookingDetails.notes && selectedBookingDetails.notes.trim() !== '' && (
                <div className="bg-surface-soft dark:bg-surface-dark-elevated p-4 rounded-lg border border-hairline dark:border-hairline-dark-soft">
                  <div className="text-xs text-muted dark:text-body-dark flex items-center mb-1"><MessageSquare size={12} className="ml-1"/> ملاحظات داخلية (للموظفين)</div>
                  <div className="text-sm font-medium text-body dark:text-body-dark">{selectedBookingDetails.notes}</div>
                </div>
              )}

              {selectedBookingDetails.creatorName && (
                <div className="text-xs text-muted dark:text-body-dark text-center">
                  تم إضافة الحجز بواسطة: <span className="font-semibold text-ink dark:text-white">{selectedBookingDetails.creatorName}</span>
                </div>
              )}
            </div>

            <div className={`p-4 border-t border-hairline-soft dark:border-hairline-dark grid gap-3 ${user?.role === 'admin' || user?.permissions?.canEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
      , document.body)}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { UNIT_PALETTE } from '../../lib/unitPalette';
import { formatSAR } from '../../lib/paymentUtils';

/**
 * MonthlyGridSchedule — the second layout for جدول التوفر.
 *
 * The timeline answers "what happens on this span of days" — it is the right
 * shape for a front desk scanning the next 30 days. But when a property has
 * many units across several buildings, the question becomes "how is this
 * building's month shaped?" — and a month is easier to read as a calendar
 * than as a strip.
 *
 * So this view groups units by building/location. Under each building name
 * there is a RAIL of the building's units — one small photo plate each — and
 * exactly one of them is open, showing its month grid. The photo is the
 * index; the calendar is the answer. Listing every unit's calendar at once
 * put four full calendars on screen where the operator needs one.
 *
 *   - The plate shows the unit's photo; the name surfaces on hover/focus
 *     (and stays for the open unit) so the rail itself stays quiet.
 *   - Day cells carry the day number and the nightly price.
 *   - Reservations render as continuous rounded pills that span the days
 *     they occupy, breaking only at a week boundary (the way a calendar
 *     grid physically has to break).
 *   - An empty day opens the booking form; a booked day opens that
 *     booking's details. Dragging across empty days creates a stay.
 *
 * It is deliberately a separate component: the timeline stays byte-for-byte
 * intact and remains the default layout.
 *
 * Geometry notes (the fiddly part):
 *   - The grid is a CSS grid with 7 columns and one row per week of the
 *     month. Because the app is RTL, grid column 1 is the RIGHT-most
 *     column, and Sunday sits in column 1 — matching the mini calendar in
 *     the toolbar, so the two read as the same calendar.
 *   - Every cell and every pill is placed explicitly (grid-row /
 *     grid-column), which is what lets a pill overlap the day cells it
 *     covers.
 *   - A booking that crosses a week boundary becomes two pills. The first
 *     keeps its rounded "start" edge, the last keeps its rounded "end"
 *     edge, and the joint between them stays square so the run reads as
 *     one continuous reservation.
 */

const WEEKDAYS_FULL = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const WEEKDAYS_MINI  = ['أ', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

const NO_LOCATION = '__no_location__';

const dayMs = 86400000;
const floorDay = (dt) => Math.floor(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime() / dayMs);
const pad2 = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Slice every booking that touches the visible grid into per-week segments.
 *
 * Returns a Map keyed by apartment id:
 *   { segments: [{ row, col, span, first, last, booking }]
 *     cellBooking: Map<'row:col' → booking>
 *     blocked: Set<cell index> — days a range selection may not cross }
 */
function buildUnitBookings(bookings, cells, weekCount) {
  const map = new Map();
  if (!bookings || !cells.length) return map;

  const gridStartDay = floorDay(cells[0].date);
  const gridEndDay = floorDay(cells[cells.length - 1].date);

  (bookings || []).forEach((b) => {
    if (!b.apartmentId || b.status === 'cancelled' || b.status === 'checked_out_early') return;

    const bs = floorDay(new Date(b.startDate));
    const be = floorDay(new Date(b.endDate));
    if (be < gridStartDay || bs > gridEndDay) return;

    const segments = [];
    for (let w = 0; w < weekCount; w++) {
      const rowStart = floorDay(cells[w * 7].date);
      const rowEnd = floorDay(cells[w * 7 + 6].date);
      const segStart = Math.max(bs, rowStart);
      const segEnd = Math.min(be, rowEnd);
      if (segStart > segEnd) continue;
      segments.push({
        row: w + 2,
        col: segStart - rowStart + 1,
        span: segEnd - segStart + 1,
        booking: b,
      });
    }
    if (!segments.length) return;

    segments.forEach((seg, i) => {
      seg.first = i === 0;
      seg.last = i === segments.length - 1;
    });

    const cellBooking = new Map();
    segments.forEach((seg) => {
      for (let c = seg.col; c < seg.col + seg.span; c++) {
        const key = `${seg.row}:${c}`;
        if (!cellBooking.has(key)) cellBooking.set(key, b);
      }
    });

    const existing = map.get(b.apartmentId);
    if (existing) {
      existing.segments.push(...segments);
      cellBooking.forEach((value, key) => {
        if (!existing.cellBooking.has(key)) existing.cellBooking.set(key, value);
      });
    } else {
      map.set(b.apartmentId, { segments, cellBooking });
    }
  });

  // A range selection may not run through a night that is already sold, nor
  // through the spill-over days of the neighbouring months. Both become
  // walls the drag stops at.
  map.forEach((entry) => {
    const blocked = new Set();
    cells.forEach((cell, i) => {
      if (!cell.inMonth || entry.cellBooking.has(`${cell.row}:${cell.col}`)) blocked.add(i);
    });
    entry.blocked = blocked;
  });

  return map;
}

/**
 * The stretch of free days around `anchor` — the run a drag may grow into.
 * The drag itself picks a narrower slice of it; this only supplies the walls.
 */
function emptyRun(anchor, blocked, total) {
  let lo = anchor;
  let hi = anchor;
  while (lo - 1 >= 0 && !blocked.has(lo - 1)) lo--;
  while (hi + 1 < total && !blocked.has(hi + 1)) hi++;
  return { lo, hi };
}

/**
 * The run a drag currently covers: the days between the anchor and the
 * cursor, clipped to the free run around the anchor.
 */
function selectionRange(drag, blocked, total) {
  if (!drag || drag.anchor === drag.cur) return null;
  const walls = emptyRun(drag.anchor, blocked, total);
  const lo = Math.max(Math.min(drag.anchor, drag.cur), walls.lo);
  const hi = Math.min(Math.max(drag.anchor, drag.cur), walls.hi);
  return hi >= lo ? { lo, hi } : null;
}

/** The mark on a plate that has no photo — its own number if it has one. */
function plateFallback(name) {
  const digits = (name || '').match(/\d+/);
  if (digits) return digits[0].slice(0, 3);
  return (name || '?').trim().charAt(0);
}

export default function MonthlyGridSchedule({
  apartments,
  bookings,
  month,
  unitIndex,
  darkMode,
  canSeePrices,
  canBook,
  onOpenBooking,
  onOpenBookingDetails,
}) {
  const [collapsed, setCollapsed] = useState({});
  // Which unit is open inside each building. Defaults to the building's
  // first unit so the screen opens on a real calendar instead of a void.
  const [openUnits, setOpenUnits] = useState({});
  // The drag in progress: { aptId, anchor, cur } — cell indices, not dates.
  const [drag, setDrag] = useState(null);

  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const onOpenBookingRef = useRef(onOpenBooking);

  useEffect(() => { onOpenBookingRef.current = onOpenBooking; }, [onOpenBooking]);

  const year = month.getFullYear();
  const mon = month.getMonth();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const firstDow = new Date(year, mon, 1).getDay();
  const weekCount = Math.ceil((firstDow + daysInMonth) / 7);

  // The month skeleton — identical for every unit, so it's computed once.
  const cells = useMemo(() => {
    const out = [];
    const gridStart = new Date(year, mon, 1 - firstDow);
    for (let i = 0; i < weekCount * 7; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      out.push({
        date: d,
        day: d.getDate(),
        inMonth: d.getMonth() === mon,
        row: Math.floor(i / 7) + 2, // row 1 is the weekday header
        col: (i % 7) + 1,
      });
    }
    return out;
  }, [year, mon, firstDow, weekCount]);

  const byUnit = useMemo(() => buildUnitBookings(bookings, cells, weekCount), [bookings, cells, weekCount]);

  // Units grouped by their location. A unit with no location still gets a
  // home so it never disappears from the calendar.
  const groups = useMemo(() => {
    const map = new Map();
    (apartments || []).forEach((a) => {
      const raw = (a.location || '').trim();
      const key = raw || NO_LOCATION;
      if (!map.has(key)) map.set(key, { key, name: raw || 'بدون موقع', units: [] });
      map.get(key).units.push(a);
    });
    // Units with no location sort last: they are a fallback bucket, not a
    // building, and leading with an empty "بدون موقع" group reads like a
    // rendering mistake.
    return Array.from(map.values()).sort((x, y) => {
      if (x.key === NO_LOCATION) return 1;
      if (y.key === NO_LOCATION) return -1;
      return x.name.localeCompare(y.name, 'ar');
    });
  }, [apartments]);

  const todayDay = floorDay(new Date());
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed[g.key]);

  const toggleGroup = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsed({});
      return;
    }
    const next = {};
    groups.forEach((g) => { next[g.key] = true; });
    setCollapsed(next);
  };

  /* ---- range drag -------------------------------------------------- */

  // The live drag lives in a ref, not in state: the run is read the moment
  // the button comes up, and a drag that starts and ends inside one frame
  // must not depend on a render having happened in between.
  const handleDragStart = useCallback((aptId, idx) => {
    suppressClickRef.current = false;
    dragRef.current = { aptId, anchor: idx, cur: idx };
    setDrag(dragRef.current);
  }, []);

  const handleDragEnter = useCallback((aptId, idx) => {
    const cur = dragRef.current;
    if (!cur || cur.aptId !== aptId) return;
    dragRef.current = { ...cur, cur: idx };
    setDrag(dragRef.current);
  }, []);

  const handleCellClick = useCallback((aptId, dateStr) => {
    // A drag that ended on this cell already opened the booking form for
    // the whole run — the click that follows it must not open a second one.
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onOpenBookingRef.current({ apartmentId: aptId, startDate: dateStr });
  }, []);

  // The run is read when the button comes up, so a drag across a whole
  // fortnight becomes one stay rather than two.
  useEffect(() => {
    const up = () => {
      const cur = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!cur) return;

      const entry = byUnit.get(cur.aptId);
      const blocked = entry?.blocked || new Set();
      const range = selectionRange(cur, blocked, cells.length);
      if (!range) return;

      const first = cells[range.lo];
      const last = cells[range.hi];
      if (!first || !last) return;

      suppressClickRef.current = true;
      onOpenBookingRef.current({
        apartmentId: cur.aptId,
        startDate: fmtDate(first.date),
        endDate: fmtDate(last.date),
      });
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [cells, byUnit]);

  if (!groups.length) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-canvas dark:bg-surface-dark">
        <div className="text-center py-16 text-muted dark:text-body-dark font-medium">لا توجد وحدات لعرضها</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-canvas dark:bg-surface-dark pb-24 md:pb-0">
      {/* Summary strip — sticky so the collapse-all control stays reachable
          while scrolling a long property. */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-3 md:px-4 py-2 bg-canvas/90 dark:bg-surface-dark/90 backdrop-blur-sm border-b border-hairline-soft dark:border-hairline-dark-soft">
        <span className="text-xs text-muted dark:text-body-dark">
          {groups.reduce((n, g) => n + g.units.length, 0)} وحدة · {groups.length} موقع
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="mr-auto text-xs font-semibold text-accent-strong hover:underline underline-offset-2 transition-colors"
        >
          {allCollapsed ? 'فتح الكل' : 'طي الكل'}
        </button>
      </div>

      <div className="p-3 md:p-4 space-y-5">
        {groups.map((group, gi) => {
          const isCollapsed = !!collapsed[group.key];
          const openId = openUnits[group.key] || group.units[0]?.id;
          const openApt = group.units.find((u) => u.id === openId);
          const panelId = `mg-cal-${gi}`;

          return (
            <section key={group.key}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={!isCollapsed}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface-card dark:bg-surface-dark-elevated border border-hairline dark:border-hairline-dark-soft text-right transition-colors active:scale-[0.99]"
              >
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`shrink-0 text-muted transition-transform duration-200 ${isCollapsed ? 'rotate-90' : 'rotate-0'}`}
                  style={{ transitionTimingFunction: 'var(--ease-out)' }}
                />
                <Building2 size={16} aria-hidden="true" className="shrink-0 text-muted" />
                <span className="text-sm font-semibold text-ink dark:text-white truncate">{group.name}</span>
                <span className="mr-auto text-2xs font-semibold text-muted dark:text-body-dark shrink-0">
                  {group.units.length} وحدة
                </span>
              </button>

              <div className="mg-collapse" data-collapsed={isCollapsed ? 'true' : 'false'}>
                <div className="overflow-hidden min-h-0">
                  {/* The rail of units, and the one calendar they open. */}
                  <div className="pt-3 grid gap-3 md:gap-4 md:grid-cols-[auto_minmax(0,1fr)] items-start">
                    <div
                      className="md:w-[72px] grid grid-cols-5 gap-2 md:grid-cols-1 scrollbar-none"
                      role="group"
                      aria-label={`وحدات ${group.name}`}
                    >
                      {group.units.map((apt) => {
                        const pal = UNIT_PALETTE[(unitIndex?.[apt.id] ?? 0) % UNIT_PALETTE.length];
                        return (
                          <UnitPlate
                            key={apt.id}
                            apt={apt}
                            pal={pal}
                            darkMode={darkMode}
                            active={apt.id === openId}
                            panelId={panelId}
                            onSelect={() => setOpenUnits((prev) => ({ ...prev, [group.key]: apt.id }))}
                          />
                        );
                      })}
                    </div>

                    <div className="min-w-0">
                      {openApt ? (
                        <UnitMonthCard
                          apt={openApt}
                          cells={cells}
                          weekCount={weekCount}
                          segments={byUnit.get(openApt.id)?.segments || []}
                          cellBooking={byUnit.get(openApt.id)?.cellBooking}
                          blocked={byUnit.get(openApt.id)?.blocked || new Set()}
                          drag={drag}
                          unitIndex={unitIndex}
                          darkMode={darkMode}
                          canSeePrices={canSeePrices}
                          canBook={canBook}
                          todayDay={todayDay}
                          onDragStart={handleDragStart}
                          onDragEnter={handleDragEnter}
                          onCellClick={handleCellClick}
                          onOpenBookingDetails={onOpenBookingDetails}
                        />
                      ) : (
                        <div className="rounded-lg border border-dashed border-hairline dark:border-hairline-dark px-4 py-12 text-center">
                          <p className="text-sm font-semibold text-ink dark:text-white">اختر وحدة</p>
                          <p className="text-xs text-muted dark:text-body-dark mt-1">اضغط صورة الوحدة لعرض تقويمها</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- one unit in the rail ---------------- */

function UnitPlate({ apt, pal, darkMode, active, panelId, onSelect }) {
  const photo = apt.coverPhoto || (apt.images && apt.images[0]) || null;
  const bg = darkMode ? pal.dbg : pal.bg;
  const fg = darkMode ? pal.dtx : pal.tx;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-expanded={active}
      aria-controls={panelId}
      aria-label={apt.name}
      data-active={active ? 'true' : 'false'}
      className={`mg-plate relative block w-full aspect-square rounded-lg overflow-hidden border transition-[transform,box-shadow] duration-150 active:scale-[0.97] motion-reduce:transition-none ${
        active
          ? 'border-accent ring-2 ring-accent/25'
          : 'border-hairline dark:border-hairline-dark'
      }`}
    >
      {photo ? (
        <img src={photo} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <span
          className="w-full h-full flex items-center justify-center text-xs font-bold tabular-nums"
          style={{ backgroundColor: bg, color: fg }}
        >
          {plateFallback(apt.name)}
        </span>
      )}      <span className="mg-plate-name pointer-events-none absolute inset-x-0 bottom-0 bg-ink/85 text-white text-[10px] font-semibold leading-tight px-1.5 py-1 truncate">
        {apt.name}
      </span>
    </button>
  );
}

/* ---------------- one unit's month ---------------- */

function UnitMonthCard({
  apt,
  cells,
  weekCount,
  segments,
  cellBooking,
  blocked,
  drag,
  unitIndex,
  darkMode,
  canSeePrices,
  canBook,
  todayDay,
  onDragStart,
  onDragEnter,
  onCellClick,
  onOpenBookingDetails,
}) {
  const pal = UNIT_PALETTE[(unitIndex?.[apt.id] ?? 0) % UNIT_PALETTE.length];
  const unitColor = darkMode ? pal.dtx : pal.tx;
  const basePrice = Number(apt.basePrice) || 0;

  // The card sits on `bg-canvas` (#ffffff), so a white bar would vanish into
  // it and the reservation would read as loose floating text. The grid gives
  // its neutral bars a stone fill instead — heavier than the timeline's, on
  // purpose: here a bar is the only thing that says "this night is taken".
  const neutralFill = darkMode ? '#201e1c' : '#f5f5f5';
  const neutralBorder = darkMode ? '#3b3835' : '#d6d3d1';

  const cellBg = (isToday, isWeekend) => {
    if (isToday) return darkMode ? 'rgb(var(--accent-rgb) / 0.13)' : 'rgb(var(--accent-rgb) / 0.06)';
    if (isWeekend) return darkMode ? 'rgba(255,255,255,0.035)' : 'rgba(17,17,17,0.028)';
    return undefined;
  };

  const sel = selectionRange(drag && drag.aptId === apt.id ? drag : null, blocked, cells.length);

  return (
    <article className="rounded-lg border border-hairline dark:border-hairline-dark bg-canvas dark:bg-surface-dark overflow-hidden">
      {/* Unit header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-hairline-soft dark:border-hairline-dark-soft">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: unitColor }} aria-hidden="true" />
        <span className="text-sm font-semibold text-ink dark:text-white truncate">{apt.name}</span>
        {apt.type && (
          <span className="text-2xs text-muted-soft dark:text-body-dark truncate shrink-0">{apt.type}</span>
        )}
        {canSeePrices && basePrice > 0 && (
          <span className="mr-auto text-2xs font-semibold text-muted dark:text-body-dark tabular-nums shrink-0">
            {formatSAR(basePrice)} ر.س
          </span>
        )}
      </div>

      {/* The month grid — weekday header + week rows share one grid so the
          columns can never drift apart. */}
      <div
        className="mg-grid grid grid-cols-7"
        style={{ gridTemplateRows: `auto repeat(${weekCount}, var(--mg-row-h))` }}
      >
        {WEEKDAYS_FULL.map((label, i) => (
          <div
            key={label}
            style={{ gridRow: 1, gridColumn: i + 1 }}
            className={`text-center text-2xs font-semibold text-muted-soft dark:text-body-dark py-1.5
              ${i < 6 ? 'border-l border-hairline-soft dark:border-hairline-dark-soft' : ''}`}
          >
            <span className="md:hidden">{WEEKDAYS_MINI[i]}</span>
            <span className="hidden md:inline">{label}</span>
          </div>
        ))}

        {/* Day cells */}
        {cells.map((cell) => {
          const key = `${cell.row}:${cell.col}`;
          const idx = (cell.row - 2) * 7 + (cell.col - 1);
          const booking = cellBooking?.get(key);
          const isToday = floorDay(cell.date) === todayDay;
          const isWeekend = cell.date.getDay() === 5 || cell.date.getDay() === 6;
          const isLastCol = cell.col === 7;
          const isLastRow = cell.row === weekCount + 1;
          const inSel = !!sel && idx >= sel.lo && idx <= sel.hi;

          const dateLabel = cell.date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
          const ariaLabel = booking
            ? `${dateLabel} — ${booking.residentName} — ${booking.status === 'pending' ? 'طلب معلّق' : 'محجوز'}`
            : `${dateLabel} — متاح`;

          const cellClasses = [
            'relative flex flex-col justify-start p-1 select-none min-w-0',
            isLastCol ? '' : 'border-l border-hairline-soft dark:border-hairline-dark-soft',
            isLastRow ? '' : 'border-b border-hairline-soft dark:border-hairline-dark-soft',
          ].join(' ');

          // The number and the price share one line at the top of the cell.
          // Split across opposite corners they read as two separate things
          // on a wide grid — and the price cannot sit under the number
          // either, because the bottom of the cell belongs to the booking
          // pill.
          const inner = (
            <span className="flex items-center gap-1.5 min-w-0">
              <span
                className={`text-[11px] leading-none font-semibold tabular-nums shrink-0 ${
                  isToday
                    ? 'bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center'
                    : cell.inMonth
                      ? 'text-body dark:text-body-dark'
                      : 'text-muted-soft/70 dark:text-[#4a4a4a]'
                }`}
              >
                {cell.day}
              </span>
              {!booking && cell.inMonth && canSeePrices && basePrice > 0 && (
                <span className="text-[9px] leading-none font-medium text-muted-soft dark:text-body-dark tabular-nums truncate">
                  {formatSAR(basePrice)}
                </span>
              )}
            </span>
          );

          const style = {
            gridRow: cell.row,
            gridColumn: cell.col,
            backgroundColor: inSel
              ? 'rgb(var(--accent-rgb) / 0.14)'
              : cell.inMonth
                ? cellBg(isToday, isWeekend)
                : (darkMode ? 'rgba(255,255,255,0.028)' : 'rgba(17,17,17,0.022)'),
            // The run's two ends are marked; the middle of the run stays
            // open, the way a booking bar breaks at a week boundary.
            boxShadow: inSel
              ? [
                idx === sel.lo ? 'inset -2px 0 0 rgb(var(--accent-rgb))' : '',
                idx === sel.hi ? 'inset 2px 0 0 rgb(var(--accent-rgb))' : '',
              ].filter(Boolean).join(', ')
              : undefined,
          };

          if (!cell.inMonth) {
            return (
              <div key={key} style={style} className={cellClasses} aria-hidden="true">
                {inner}
              </div>
            );
          }

          if (!booking && !canBook) {
            return (
              <div key={key} style={style} className={cellClasses}>
                {inner}
              </div>
            );
          }

          if (booking) {
            return (
              <button
                key={key}
                type="button"
                style={style}
                title={ariaLabel}
                aria-label={ariaLabel}
                onClick={() => onOpenBookingDetails(booking)}
                onMouseEnter={canBook ? () => onDragEnter(apt.id, idx) : undefined}
                className={`${cellClasses} text-right transition-colors active:scale-[0.97]
                  hover:bg-surface-soft dark:hover:bg-surface-dark-elevated/60`}
              >
                {inner}
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              style={style}
              title={ariaLabel}
              aria-label={ariaLabel}
              onMouseDown={canBook ? (ev) => { ev.preventDefault(); onDragStart(apt.id, idx); } : undefined}
              onMouseEnter={canBook ? () => onDragEnter(apt.id, idx) : undefined}
              onClick={() => onCellClick(apt.id, fmtDate(cell.date))}
              className={`${cellClasses} text-right transition-colors active:scale-[0.97]
                hover:bg-surface-soft dark:hover:bg-surface-dark-elevated/60 cursor-pointer`}
            >
              {inner}
            </button>
          );
        })}

        {/* Reservation pills — painted over the cells they cover. */}
        {segments.map((seg) => {
          const b = seg.booking;
          const bs = floorDay(new Date(b.startDate));
          const be = floorDay(new Date(b.endDate));
          const isPending = b.status === 'pending';
          const isCurrent = !isPending && bs <= todayDay && be >= todayDay;
          const isPast = !isPending && be < todayDay;

          let fill = neutralFill;
          let brd = neutralBorder;
          let txt = darkMode ? '#e7e5e4' : '#1c1917';
          if (isCurrent) {
            fill = darkMode ? 'rgb(var(--accent-rgb) / 0.24)' : 'rgb(var(--accent-rgb) / 0.12)';
            brd = 'rgb(var(--accent-rgb))';
            txt = darkMode ? '#ffffff' : 'var(--accent-strong)';
          }

          const nights = Math.max(1, be - bs);
          const statusTxt = isPending ? 'طلب معلّق' : isCurrent ? 'مقيم حالياً' : isPast ? 'مغادر' : 'قادم';
          const tip = `${apt.name} — ${b.residentName}\n${new Date(b.startDate).toLocaleDateString('ar-EG')} ← ${new Date(b.endDate).toLocaleDateString('ar-EG')} · ${nights} ليالٍ\n${canSeePrices ? `${formatSAR(b.pricePerNight)} ر.س/ليلة · ` : ''}${statusTxt}`;

          const radius = seg.first && seg.last
            ? 'rounded-md'
            : seg.first
              ? 'rounded-s-md rounded-e-none'
              : seg.last
                ? 'rounded-e-md rounded-s-none'
                : 'rounded-none';

          return (
            <div
              key={`${b.id}-${seg.row}-${seg.col}`}
              style={{
                gridRow: seg.row,
                gridColumn: `${seg.col} / span ${seg.span}`,
                height: 'var(--mg-pill-h)',
                backgroundColor: isPending ? 'transparent' : fill,
                color: isPending ? undefined : txt,
                border: isPending
                  ? `1px dashed ${darkMode ? '#4a463f' : '#d6d3d1'}`
                  : `1px solid ${brd}`,
                borderRight: isPending || !seg.first ? undefined : `4px solid ${isCurrent ? 'rgb(var(--accent-rgb))' : unitColor}`,
                opacity: isPast ? 0.55 : 1,
              }}
              title={tip}
              aria-hidden="true"
              className={`pointer-events-none self-end z-[1] mb-[3px] flex items-center gap-1 px-1.5 overflow-hidden ${radius}`}
            >
              {isCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              )}
              <span className="text-[10px] md:text-[11px] font-semibold truncate leading-none">{b.residentName}</span>
              {canSeePrices && (
                <span className="text-[9px] md:text-[10px] font-medium opacity-70 shrink-0 tabular-nums leading-none">
                  {formatSAR(b.pricePerNight)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

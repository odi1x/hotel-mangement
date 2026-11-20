import { useMemo, useState } from 'react';
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
 * So this view groups units by building/location and gives every unit its
 * own traditional 7-column (Sun–Sat) month grid:
 *
 *   - Day cells carry the day number and the nightly price.
 *   - Reservations render as continuous rounded pills that span the days
 *     they occupy, breaking only at a week boundary (the way a calendar
 *     grid physically has to break).
 *   - An empty day opens the booking form; a booked day opens that
 *     booking's details.
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
 *   { segments: [{ row, col, span, first, last, booking }],
 *     cellBooking: Map<'row:col' → booking> }
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

  return map;
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
        {groups.map((group) => {
          const isCollapsed = !!collapsed[group.key];
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
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2 2xl:grid-cols-3 pt-3">
                    {group.units.map((apt) => (
                      <UnitMonthCard
                        key={apt.id}
                        apt={apt}
                        cells={cells}
                        weekCount={weekCount}
                        segments={byUnit.get(apt.id)?.segments || []}
                        cellBooking={byUnit.get(apt.id)?.cellBooking}
                        unitIndex={unitIndex}
                        darkMode={darkMode}
                        canSeePrices={canSeePrices}
                        canBook={canBook}
                        todayDay={todayDay}
                        onOpenBooking={onOpenBooking}
                        onOpenBookingDetails={onOpenBookingDetails}
                      />
                    ))}
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

/* ---------------- one unit's month ---------------- */

function UnitMonthCard({
  apt,
  cells,
  weekCount,
  segments,
  cellBooking,
  unitIndex,
  darkMode,
  canSeePrices,
  canBook,
  todayDay,
  onOpenBooking,
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
          const booking = cellBooking?.get(key);
          const isToday = floorDay(cell.date) === todayDay;
          const isWeekend = cell.date.getDay() === 5 || cell.date.getDay() === 6;
          const isLastCol = cell.col === 7;
          const isLastRow = cell.row === weekCount + 1;

          const dateLabel = cell.date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
          const ariaLabel = booking
            ? `${dateLabel} — ${booking.residentName} — ${booking.status === 'pending' ? 'طلب معلّق' : 'محجوز'}`
            : `${dateLabel} — متاح`;

          const cellClasses = [
            'relative flex flex-col justify-between p-1 select-none min-w-0',
            isLastCol ? '' : 'border-l border-hairline-soft dark:border-hairline-dark-soft',
            isLastRow ? '' : 'border-b border-hairline-soft dark:border-hairline-dark-soft',
          ].join(' ');

          const inner = (
            <>
              <span
                className={`self-start text-[11px] leading-none font-semibold tabular-nums ${
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
                <span className="self-end text-[9px] leading-none font-medium text-muted-soft dark:text-body-dark tabular-nums">
                  {formatSAR(basePrice)}
                </span>
              )}
            </>
          );

          const style = {
            gridRow: cell.row,
            gridColumn: cell.col,
            backgroundColor: cell.inMonth ? cellBg(isToday, isWeekend) : (darkMode ? 'rgba(255,255,255,0.028)' : 'rgba(17,17,17,0.022)'),
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

          return (
            <button
              key={key}
              type="button"
              style={style}
              title={ariaLabel}
              aria-label={ariaLabel}
              onClick={() => {
                if (booking) onOpenBookingDetails(booking);
                else onOpenBooking({ apartmentId: apt.id, startDate: fmtDate(cell.date) });
              }}
              className={`${cellClasses} text-right transition-colors active:scale-[0.97]
                hover:bg-surface-soft dark:hover:bg-surface-dark-elevated/60`}
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

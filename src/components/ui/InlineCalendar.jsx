import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function InlineCalendar({ value, onChange, minDate }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value?.startDate) return new Date(value.startDate);
    if (minDate) return new Date(minDate);
    return new Date();
  });

  const [hoverDate, setHoverDate] = useState(null);

  const normalizeDate = (d) => {
    if (!d) return null;
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const startDate = normalizeDate(value?.startDate);
  const endDate = normalizeDate(value?.endDate);
  const minDateNormalized = normalizeDate(minDate);

  const handleNextMonth = (e) => {
    e.preventDefault();
    // In RTL, the "Next" logical month (future) is typically on the left, but standard chevrons usually mean "Forward in time" = Left chevron.
    // However, the user specifically mentioned:
    // "Verify that the Next/Previous chevrons (< and >) shift the months in the correct intuitive direction under RTL conditions."
    // In RTL, ChevronLeft (<) means Forward/Next. ChevronRight (>) means Backward/Previous.
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handlePrevMonth = (e) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleDateClick = (day) => {
    if (minDateNormalized && day < minDateNormalized) return;

    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: formatDate(day), endDate: null });
    } else {
      if (day < startDate) {
        onChange({ startDate: formatDate(day), endDate: null });
      } else {
        onChange({ startDate: formatDate(startDate), endDate: formatDate(day) });
      }
    }
  };

  const formatDate = (d) => {
    if (!d) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const days = new Date(year, month + 1, 0).getDate();

    // In Arabic RTL, Sunday is usually the first day. 0 = Sunday.
    const result = [];
    for (let i = 0; i < firstDay; i++) {
      result.push(null);
    }
    for (let i = 1; i <= days; i++) {
      result.push(new Date(year, month, i));
    }
    return result;
  }, [currentMonth]);

  const monthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const dayNames = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

  const isSelected = (day) => {
    if (!day) return false;
    const dTime = day.getTime();
    if (startDate && dTime === startDate.getTime()) return true;
    if (endDate && dTime === endDate.getTime()) return true;
    return false;
  };

  const isInRange = (day) => {
    if (!day || !startDate || !endDate) return false;
    const dTime = day.getTime();
    return dTime > startDate.getTime() && dTime < endDate.getTime();
  };

  const isHoverRange = (day) => {
    if (!day || !startDate || endDate || !hoverDate) return false;
    const dTime = day.getTime();
    const hTime = hoverDate.getTime();
    const sTime = startDate.getTime();
    if (hTime > sTime) {
      return dTime > sTime && dTime <= hTime;
    }
    return false;
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 font-zain" dir="rtl">
      {/* Right Side / Top: Calendar Grid */}
      <div className="flex-1 bg-canvas rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-ink">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <div className="flex gap-2">
            {/* In RTL: Right Chevron is Previous, Left Chevron is Next */}
            <button onClick={handlePrevMonth} className="p-2 hover:bg-surface-soft rounded-full transition-colors text-ink">
              <ChevronRight size={20} />
            </button>
            <button onClick={handleNextMonth} className="p-2 hover:bg-surface-soft rounded-full transition-colors text-ink">
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center">
          {dayNames.map(d => (
            <div key={d} className="text-xs sm:text-sm text-muted font-semibold mb-2 truncate">{d}</div>
          ))}

          {daysInMonth.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;

            const disabled = minDateNormalized && day < minDateNormalized;
            const selected = isSelected(day);
            const inRange = isInRange(day);
            const hoverR = isHoverRange(day);

            let baseClasses = "h-10 flex items-center justify-center text-sm transition-colors cursor-pointer relative z-10";

            let bgClasses = "";
            if (selected) {
              baseClasses += " text-on-primary font-bold";
            } else if (inRange || hoverR) {
              baseClasses += " text-ink";
              bgClasses = "absolute inset-0 bg-surface-soft";
            } else if (disabled) {
              baseClasses += " text-primary-disabled cursor-not-allowed";
            } else {
              baseClasses += " text-ink hover:bg-surface-soft rounded-full";
            }

            if (selected) {
                if (startDate && !endDate && hoverDate && hoverDate > startDate) {
                    bgClasses = "absolute inset-0 bg-surface-soft left-0 w-1/2";
                } else if (startDate && endDate) {
                    if (day.getTime() === startDate.getTime()) {
                        bgClasses = "absolute inset-0 bg-surface-soft left-0 w-1/2";
                    } else if (day.getTime() === endDate.getTime()) {
                        bgClasses = "absolute inset-0 bg-surface-soft right-0 w-1/2";
                    }
                }
            }

            return (
              <div
                key={day.toISOString()}
                className="relative"
                onMouseEnter={() => !disabled && setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
                onClick={() => !disabled && handleDateClick(day)}
              >
                {(inRange || hoverR || selected) && <div className={bgClasses} />}
                <div className={`${baseClasses} ${selected ? 'bg-primary rounded-full' : ''}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Left Side: Summary / Slideout */}
      <div className="md:w-64 bg-surface-card rounded-lg p-6 flex flex-col">
        <h4 className="text-lg font-semibold text-ink mb-4">تفاصيل الحجز</h4>
        {!startDate ? (
          <div className="text-muted text-sm flex-1 flex items-center justify-center text-center">
            اختر تاريخ الوصول لعرض المواعيد المتاحة
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-canvas rounded-md border border-hairline">
              <span className="text-xs text-muted block mb-1">الوصول</span>
              <span className="text-ink font-semibold">{formatDate(startDate)}</span>
            </div>
            {endDate ? (
              <div className="p-3 bg-canvas rounded-md border border-hairline">
                <span className="text-xs text-muted block mb-1">المغادرة</span>
                <span className="text-ink font-semibold">{formatDate(endDate)}</span>
              </div>
            ) : (
              <div className="p-3 bg-canvas rounded-md border border-hairline opacity-50">
                <span className="text-xs text-muted block mb-1">المغادرة</span>
                <span className="text-ink font-semibold">--/--/--</span>
              </div>
            )}

            {startDate && endDate && (
                <div className="mt-6 pt-4 border-t border-hairline">
                    <span className="text-sm text-success font-bold flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success"></div>
                        متاح للحجز
                    </span>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

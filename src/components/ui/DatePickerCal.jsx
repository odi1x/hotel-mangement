import { useState } from 'react';
import { ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const AR_MONTHS_SHORT = ['ينا','فبر','مار','أبر','ماي','يون','يول','أغس','سبت','أكت','نوف','ديس'];
const AR_DOW = ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'];
const pad = (n) => String(n).padStart(2, '0');
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { if (!s) return null; const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); };
const dayNum = (d) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);

// A clean single-month check-in → check-out picker.
// value = { startDate: 'YYYY-MM-DD'|null, endDate: 'YYYY-MM-DD'|null }
//
// The month/year label at the top is a button — click it to jump to any month/year
// (essential for pricing rules that span 12+ months).
export default function DatePickerCal({ value, onChange }) {
  const start = parse(value?.startDate);
  const end = parse(value?.endDate);
  const [view, setView] = useState(start || new Date());
  const [mode, setMode] = useState('days'); // 'days' | 'months'
  // In 'months' mode, we navigate a year at a time before picking a month
  const [pickerYear, setPickerYear] = useState((start || new Date()).getFullYear());

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d));

  const todayN = dayNum(new Date());
  const sN = start ? dayNum(start) : null;
  const eN = end ? dayNum(end) : null;
  const nights = (sN != null && eN != null) ? (eN - sN) : 0;

  const pick = (d) => {
    const dn = dayNum(d);
    if (sN == null || eN != null) {
      onChange({ startDate: toStr(d), endDate: null });
    } else if (dn <= sN) {
      onChange({ startDate: toStr(d), endDate: null });
    } else {
      onChange({ startDate: value.startDate, endDate: toStr(d) });
    }
  };

  const openMonthPicker = () => {
    setPickerYear(y);
    setMode('months');
  };

  const pickMonth = (monthIdx) => {
    setView(new Date(pickerYear, monthIdx, 1));
    setMode('days');
  };

  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth();

  return (
    <div className="w-full select-none">
      {/* Header: prev arrow | month/year label (clickable) | next arrow */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => mode === 'months' ? setPickerYear(pickerYear - 1) : setView(new Date(y, m - 1, 1))}
          className="icon-action p-1.5"
          aria-label={mode === 'months' ? 'السنة السابقة' : 'الشهر السابق'}
        >
          <ChevronRight size={18} />
        </button>

        <button
          type="button"
          onClick={() => mode === 'months' ? setMode('days') : openMonthPicker()}
          className="flex items-center gap-1.5 text-base font-semibold text-ink dark:text-white hover:bg-surface-soft dark:hover:bg-surface-dark-elevated rounded-md px-3 py-1 transition-colors"
        >
          <span>
            {mode === 'months' ? pickerYear : `${AR_MONTHS[m]} ${y}`}
          </span>
          <ChevronDown
            size={14}
            className={`text-muted transition-transform ${mode === 'months' ? 'rotate-180' : ''}`}
          />
        </button>

        <button
          type="button"
          onClick={() => mode === 'months' ? setPickerYear(pickerYear + 1) : setView(new Date(y, m + 1, 1))}
          className="icon-action p-1.5"
          aria-label={mode === 'months' ? 'السنة التالية' : 'الشهر التالي'}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {mode === 'days' ? (
        <div className="grid grid-cols-7">
          {AR_DOW.map((w, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-muted-soft py-2">{w}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} className="h-11" />;
            const dn = dayNum(d);
            const isStart = dn === sN;
            const isEnd = dn === eN;
            const inRange = sN != null && eN != null && dn > sN && dn < eN;
            const endpoint = isStart || isEnd;
            const isToday = dn === todayN;
            const banded = inRange || (endpoint && eN != null);
            return (
              <div
                key={i}
                className={`h-11 flex items-center justify-center ${banded ? 'bg-accent-soft' : ''} ${isStart && eN != null ? 'rounded-s-full' : ''} ${isEnd ? 'rounded-e-full' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => pick(d)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors
                    ${endpoint ? 'bg-accent text-white font-semibold'
                      : inRange ? 'text-accent-strong font-medium'
                      : isToday ? 'text-accent font-bold'
                      : 'text-body dark:text-body-dark hover:bg-surface-soft dark:hover:bg-surface-dark-elevated'}`}
                >
                  {d.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        // Month picker: 3×4 grid of month names for the currently-viewed year.
        // Highlights: the currently-viewed month (of any year), and today's month.
        <div className="py-2">
          <div className="grid grid-cols-3 gap-2">
            {AR_MONTHS_SHORT.map((label, monthIdx) => {
              const isCurrentView = monthIdx === m && pickerYear === y;
              const isThisMonth = monthIdx === nowMonth && pickerYear === nowYear;
              return (
                <button
                  key={monthIdx}
                  type="button"
                  onClick={() => pickMonth(monthIdx)}
                  className={`h-14 rounded-md text-sm font-semibold transition-colors border
                    ${isCurrentView
                      ? 'bg-accent text-white border-accent'
                      : isThisMonth
                        ? 'bg-accent-soft text-accent-strong border-accent/40'
                        : 'bg-canvas text-body border-hairline hover:border-accent/40 hover:text-ink dark:bg-surface-dark-elevated dark:text-body-dark dark:border-hairline-dark-soft'}`}
                >
                  <div>{AR_MONTHS[monthIdx]}</div>
                </button>
              );
            })}
          </div>
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => { const now = new Date(); setView(new Date(now.getFullYear(), now.getMonth(), 1)); setPickerYear(now.getFullYear()); setMode('days'); }}
              className="text-xs text-accent font-semibold hover:underline"
            >
              العودة إلى الشهر الحالي
            </button>
          </div>
        </div>
      )}

      {/* Summary footer — only shown in day mode; hidden in month picker mode to save vertical space */}
      {mode === 'days' && (
        <div className="mt-4 pt-3 border-t border-hairline-soft dark:border-hairline-dark">
          {sN != null ? (
            <div className="flex items-center justify-center gap-3 text-sm">
              <div className="text-center">
                <div className="text-2xs text-muted-soft mb-0.5">الوصول</div>
                <div className="font-semibold text-ink dark:text-white">{start.getDate()} {AR_MONTHS[start.getMonth()]}</div>
              </div>
              <span className="text-muted-soft">←</span>
              <div className="text-center">
                <div className="text-2xs text-muted-soft mb-0.5">المغادرة</div>
                <div className={`font-semibold ${eN != null ? 'text-ink dark:text-white' : 'text-muted-soft'}`}>{eN != null ? `${end.getDate()} ${AR_MONTHS[end.getMonth()]}` : 'اختر'}</div>
              </div>
              {nights > 0 && <span className="badge-pill bg-accent-soft text-accent-strong font-semibold">{nights} ليالٍ</span>}
            </div>
          ) : (
            <div className="text-center text-muted text-sm">اختر تاريخ الوصول ثم المغادرة</div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react';

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const AR_MONTHS_SHORT = ['ينا','فبر','مار','أبر','ماي','يون','يول','أغس','سبت','أكت','نوف','ديس'];

function formatMonthYM(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return '—';
  const [y, m] = ym.split('-').map(Number);
  return `${AR_MONTHS[m - 1]} ${y}`;
}

function laterYM(a, b) {
  return !a || a < b ? b : a;
}

// A design-system month picker: a button showing the selected month, which opens
// a dropdown with a year stepper + 3×4 grid of months. value = "YYYY-MM".
export default function MonthPicker({ value, onChange, max }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const v = value?.split('-').map(Number)[0] || new Date().getFullYear();
    return v;
  });
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef(null);

  const nowYear = new Date().getFullYear();
  const nowMonthIdx = new Date().getMonth();

  const effectiveMax = max || new Date().toISOString().slice(0, 7);

  // Sync viewYear to the selected value whenever it opens or changes
  useEffect(() => {
    if (value) {
      const vy = Number(value.split('-')[0]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewYear(vy);
    }
  }, [value]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      const rootEl = rootRef.current;
      const menuEl = document.getElementById('monthpicker-menu');
      if (rootEl && !rootEl.contains(e.target) && menuEl && !menuEl.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, anchor.width]);

  const openMenu = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(o => !o);
  };

  const pickMonth = (monthIdx) => {
    const ym = `${viewYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    if (ym > effectiveMax) return;
    onChange(ym);
    setOpen(false);
  };

  const goYear = (delta) => {
    setViewYear(v => v + delta);
  };

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        onClick={openMenu}
        className="input-field w-full flex items-center justify-between gap-2 text-right cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{formatMonthYM(value)}</span>
        <CalendarDays size={16} className="text-muted dark:text-body-dark shrink-0" />
      </button>

      {open && createPortal(
        <div id="monthpicker-menu" dir="rtl"
          style={{ position: 'fixed', top: anchor.top, left: anchor.left, width: Math.max(anchor.width, 288), zIndex: 90 }}
          className="bg-canvas dark:bg-surface-dark border border-hairline dark:border-hairline-dark-soft rounded-xl shadow-soft p-3 anim-pop select-none">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => goYear(-1)} className="icon-action p-1.5" aria-label="السنة السابقة">
              <ChevronRight size={18} />
            </button>
            <span className="text-base font-semibold text-ink dark:text-white">{viewYear}</span>
            <button type="button" onClick={() => goYear(1)} className="icon-action p-1.5" aria-label="السنة التالية">
              <ChevronLeft size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {AR_MONTHS_SHORT.map((label, monthIdx) => {
              const ym = `${viewYear}-${String(monthIdx + 1).padStart(2, '0')}`;
              const isSelected = ym === value;
              const isThisMonth = monthIdx === nowMonthIdx && viewYear === nowYear;
              const isDisabled = ym > effectiveMax;
              return (
                <button
                  key={monthIdx}
                  type="button"
                  onClick={() => !isDisabled && pickMonth(monthIdx)}
                  disabled={isDisabled}
                  className={`h-12 rounded-md text-sm font-semibold transition-colors border
                    ${isSelected
                      ? 'bg-accent text-white border-accent'
                      : isThisMonth
                        ? 'bg-accent-soft text-accent-strong border-accent/40'
                        : isDisabled
                          ? 'bg-surface-soft text-muted-soft border-hairline cursor-not-allowed opacity-50'
                          : 'bg-canvas text-body border-hairline hover:border-accent/40 hover:text-ink dark:bg-surface-dark-elevated dark:text-body-dark dark:border-hairline-dark-soft'}`}
                >
                  {AR_MONTHS[monthIdx]}
                </button>
              );
            })}
          </div>

          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => { setOpen(false); onChange(laterYM(value, effectiveMax)); }}
              className="text-xs text-accent font-semibold hover:underline"
            >
              الأحدث: {formatMonthYM(effectiveMax)}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

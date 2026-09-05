import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react';

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const AR_DOW = ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'];
const AR_DOW_MIN = ['أ','ن','ث','ر','خ','ج','س'];

const pad = (n) => String(n).padStart(2, '0');
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { if (!s) return null; const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); };
const dayNum = (d) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);

function formatDateShort(s) {
  const d = parse(s);
  if (!d) return '—';
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
}

// A compact single-date picker matching the app's mini-calendar (as seen in
// the availability page). value = "YYYY-MM-DD". Opens a small dropdown with a
// month navigation + day grid.
export default function SingleDatePicker({ value, onChange, max }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parse(value) || new Date());
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef(null);

  const todayNum = dayNum(new Date());
  const maxNum = max ? dayNum(parse(max)) : null;

  // Sync view to value when it changes externally
  useEffect(() => {
    if (value) {
      const d = parse(value);
      if (d) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setView(d);
      }
    }
  }, [value]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      const rootEl = rootRef.current;
      const menuEl = document.getElementById('singledate-menu');
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
  }, [open]);

  const openMenu = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(o => !o);
  };

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d));

  const pick = (d) => {
    if (maxNum != null && dayNum(d) > maxNum) return;
    onChange(toStr(d));
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        onClick={openMenu}
        className="input-field w-full flex items-center justify-between gap-2 text-right cursor-pointer"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{formatDateShort(value)}</span>
        <CalendarDays size={16} className="text-muted dark:text-body-dark shrink-0" />
      </button>

      {open && createPortal(
        <div id="singledate-menu" dir="rtl"
          style={{ position: 'fixed', top: anchor.top, left: anchor.left, width: Math.max(anchor.width, 288), zIndex: 90 }}
          className="bg-canvas dark:bg-surface-dark border border-hairline dark:border-hairline-dark-soft rounded-xl shadow-soft p-3 anim-pop select-none">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setView(new Date(y, m - 1, 1))} className="icon-action p-1.5" aria-label="الشهر السابق">
              <ChevronRight size={18} />
            </button>
            <span className="text-sm font-semibold text-ink dark:text-white">
              {AR_MONTHS[m]} {y}
            </span>
            <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} className="icon-action p-1.5" aria-label="الشهر التالي">
              <ChevronLeft size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {AR_DOW_MIN.map((w, i) => <div key={i} className="text-2xs text-muted-soft py-1">{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} className="h-9" />;
              const dn = dayNum(d);
              const isSel = dn === dayNum(parse(value));
              const isToday = dn === todayNum;
              const isDisabled = maxNum != null && dn > maxNum;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !isDisabled && pick(d)}
                  disabled={isDisabled}
                  className={`text-xs h-9 rounded-full flex items-center justify-center transition-colors
                    ${isSel ? 'bg-accent text-white font-semibold'
                      : isToday ? 'text-accent font-bold'
                      : isDisabled ? 'text-muted-soft opacity-40 cursor-not-allowed'
                      : 'text-body dark:text-body-dark hover:bg-surface-soft dark:hover:bg-surface-dark-elevated'}`}
                  title={AR_DOW[d.getDay()]}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => { setView(new Date()); onChange(toStr(new Date())); setOpen(false); }}
              className="text-xs text-accent font-semibold hover:underline"
            >
              اليوم
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

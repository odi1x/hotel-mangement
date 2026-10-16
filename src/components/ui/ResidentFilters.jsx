import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, Check, RotateCcw } from 'lucide-react';
import { STATUS_OPTIONS, PAYMENT_OPTIONS } from '../../lib/residentFilters';

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-semibold
        border whitespace-nowrap transition-colors
        ${active
          ? 'bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white'
          : 'bg-canvas dark:bg-surface-dark-elevated text-body dark:text-body-dark border-hairline dark:border-hairline-dark hover:bg-surface-soft dark:hover:bg-hairline-dark'}`}
    >
      {active && <Check size={14} className="shrink-0" />}
      {label}
    </button>
  );
}

export default function ResidentFilters({ filters, onChange, onReset, apartments = [], showPayment = false }) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const activeCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.apartmentId !== 'all' ? 1 : 0) +
    (showPayment && filters.payment !== 'all' ? 1 : 0);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Escape to close + lock background scroll while the mobile sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    if (!isDesktop) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isDesktop]);

  const openPanel = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      setPanelPos({
        top: r.bottom + 8,
        right: Math.max(8, window.innerWidth - r.right),
      });
    }
    setOpen(true);
    // Move focus into the dialog for keyboard users.
    requestAnimationFrame(() => panelRef.current?.focus());
  };

  const close = () => setOpen(false);
  const toggle = () => (open ? close() : openPanel());
  const set = (key, value) => onChange({ [key]: value });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`تصفية النزلاء${activeCount > 0 ? ` (${activeCount})` : ''}`}
        className={`shrink-0 inline-flex items-center justify-center gap-2 h-11 px-3 rounded-md border
          text-sm font-semibold transition-colors
          ${activeCount > 0
            ? 'border-accent/50 bg-accent-soft text-accent-strong'
            : 'bg-canvas dark:bg-surface-dark-elevated text-ink dark:text-white border-hairline dark:border-hairline-dark hover:bg-surface-soft dark:hover:bg-hairline-dark'}`}
      >
        <SlidersHorizontal size={17} />
        <span className="hidden sm:inline">تصفية</span>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-2xs font-bold tabular-nums">
            {activeCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          data-modal-active
          onClick={close}
          className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="تصفية النزلاء"
            onClick={(e) => e.stopPropagation()}
            style={isDesktop ? { top: panelPos.top, right: panelPos.right } : undefined}
            className={`absolute z-10 bg-canvas dark:bg-surface-dark shadow-soft flex flex-col outline-none
              ${isDesktop
                ? 'w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-hairline dark:border-hairline-dark-soft max-h-[70vh] anim-dropdown'
                : 'inset-x-0 bottom-0 w-full rounded-t-2xl border-t border-hairline dark:border-hairline-dark-soft max-h-[85vh] anim-sheet'}`}
          >
            {!isDesktop && <div className="sheet-handle" />}

            <div className="flex items-center justify-between px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark-soft shrink-0">
              <h3 className="font-semibold tracking-tight text-ink dark:text-white text-base flex items-center gap-2">
                <SlidersHorizontal size={18} />
                تصفية
              </h3>
              <div className="flex items-center gap-1">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-1 px-2 h-9 rounded-md text-xs font-semibold text-muted hover:text-ink dark:hover:text-white transition-colors"
                  >
                    <RotateCcw size={13} />
                    مسح
                  </button>
                )}
                <button type="button" onClick={close} className="icon-action hover:text-accent" aria-label="إغلاق">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-5">
              <div>
                <p className="eyebrow mb-2.5">الحالة</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <FilterChip key={opt.value} active={filters.status === opt.value} onClick={() => set('status', opt.value)} label={opt.label} />
                  ))}
                </div>
              </div>

              <div>
                <p className="eyebrow mb-2.5">الوحدة</p>
                <select value={filters.apartmentId} onChange={(e) => set('apartmentId', e.target.value)} className="input-field">
                  <option value="all">كل الوحدات</option>
                  {apartments.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {showPayment && (
                <div>
                  <p className="eyebrow mb-2.5">حالة الدفع</p>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_OPTIONS.map((opt) => (
                      <FilterChip key={opt.value} active={filters.payment === opt.value} onClick={() => set('payment', opt.value)} label={opt.label} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-hairline-soft dark:border-hairline-dark-soft shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={close} className="btn-primary w-full">
                عرض النتائج
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

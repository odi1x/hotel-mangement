import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, ExternalLink, Link2, Tags } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ShareLinkModal — the redesigned share flow.
 *
 * Replaces the "رابط الحجز المباشر للعملاء" inline card that used to sit in
 * the toolbar. Now sharing is a one-click discoverable action: an icon
 * button in the toolbar opens this modal.
 *
 * The sharer can optionally target one economic category (الفئة) — e.g.
 * "VIP" or "غرف" — so the shared link only shows guests the units of that
 * category. Category names come from the user's settings; passing none
 * renders the modal exactly as before (all units).
 *
 * Portaled to document.body so its `fixed inset-0` reaches the true
 * viewport — the header blurs behind it on mobile, same as any other
 * modal in the app.
 */
export default function ShareLinkModal({ link, businessName, categories = [], onClose }) {
  const [isCopied, setIsCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  const activeLink = selectedCategory
    ? `${link}${link.includes('?') ? '&' : '?'}category=${encodeURIComponent(selectedCategory)}`
    : link;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeLink);
      setIsCopied(true);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      toast.error('فشل نسخ الرابط');
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: `${businessName || 'صفحة الحجز'} — منصة الحجز الإلكتروني`,
        text: `احجز عبر ${businessName || 'صفحتنا'}:`,
        url: activeLink,
      });
    } catch (err) {
      // User cancelled — silent
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4"
      dir="rtl"
      data-modal-active
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft w-full max-w-md overflow-hidden border border-hairline dark:border-hairline-dark-soft flex flex-col max-h-[92vh] anim-sheet">
        <div className="sheet-handle" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark-soft flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent-strong flex items-center justify-center shrink-0">
            <Link2 size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold tracking-tight text-ink dark:text-white leading-tight text-base">
              رابط الحجز المباشر
            </h2>
            <p className="text-xs text-muted dark:text-body-dark mt-0.5">
              شارك هذا الرابط مع عملائك
            </p>
          </div>
          <button
            onClick={onClose}
            className="icon-action shrink-0"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* URL display — code-style card. Selectable, monospace-ish. */}
          <div className="bg-surface-soft dark:bg-surface-dark-elevated border border-hairline-soft dark:border-hairline-dark-soft rounded-lg px-3 py-2.5">
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark mb-1">
              الرابط
            </p>
            <input
              type="text"
              readOnly
              value={activeLink}
              onFocus={(e) => e.target.select()}
              className="w-full bg-transparent border-none outline-none text-sm text-ink dark:text-white font-medium tracking-tight text-left truncate p-0"
              dir="ltr"
            />
          </div>

          {/* Category targeting — pick which unit category this link shows.
              Shown only when the account has configured economic categories. */}
          {categories.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Tags size={14} className="text-muted-soft" />
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark">
                    الفئة المستهدفة
                  </p>
                </div>
                <p className="text-2xs text-muted-soft">
                  {selectedCategory ? 'وحدات هذه الفئة فقط' : 'جميع الوحدات'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="الفئة المستهدفة">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('')}
                  className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    selectedCategory === ''
                      ? 'bg-ink text-white dark:bg-white dark:text-ink'
                      : 'bg-surface-soft text-muted dark:bg-surface-dark-elevated dark:text-body-dark hover:text-ink dark:hover:text-white'
                  }`}
                >
                  الكل
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === c ? '' : c)}
                    className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                      selectedCategory === c
                        ? 'bg-ink text-white dark:bg-white dark:text-ink'
                        : 'bg-surface-soft text-muted dark:bg-surface-dark-elevated dark:text-body-dark hover:text-ink dark:hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Primary: copy button, full width, big. */}
          <button
            onClick={handleCopy}
            className={`w-full h-11 rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors ${
              isCopied
                ? 'bg-accent-strong text-white'
                : 'bg-ink text-white dark:bg-white dark:text-ink hover:opacity-90'
            }`}
          >
            {isCopied ? (
              <>
                <Check size={16} />
                <span>تم النسخ</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>نسخ الرابط</span>
              </>
            )}
          </button>

          {/* Secondary actions row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Native share (mobile browsers with Web Share API) or fallback to copy */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={handleNativeShare}
                className="h-10 rounded-lg text-xs font-semibold border border-hairline dark:border-hairline-dark-soft text-body dark:text-body-dark hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Link2 size={14} />
                <span>مشاركة</span>
              </button>
            )}
            <a
              href={activeLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`h-10 rounded-lg text-xs font-semibold border border-hairline dark:border-hairline-dark-soft text-body dark:text-body-dark hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors inline-flex items-center justify-center gap-1.5 ${
                typeof navigator === 'undefined' || !navigator.share ? 'col-span-2' : ''
              }`}
            >
              <ExternalLink size={14} />
              <span>معاينة</span>
            </a>
          </div>

          {/* Helper */}
          <p className="text-2xs text-muted-soft leading-relaxed text-center px-2">
            {selectedCategory
              ? `سيرى ضيفك وحدات فئة «${selectedCategory}» فقط عبر هذا الرابط.`
              : 'العملاء يستطيعون تصفح الوحدات والحجز مباشرة عبر هذا الرابط.'}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

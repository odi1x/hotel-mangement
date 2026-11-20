import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pager — page navigation for a list.
 *
 * Page numbers used to live inside a segmented-control track, which made
 * them read as tabs: switching "views" rather than moving through one
 * list. A pager gets its own plain form instead.
 *
 * Two shapes:
 *   compact — `‹ صفحة 3 من 12 ›`  (Apartments)
 *   full    — `السابق | 1 2 3 … 12 | التالي`  (Residents)
 *
 * In RTL, "previous" is the right-pointing chevron: going back moves
 * toward the start of the line, which is to the right.
 *
 * @param {number} page — current page, 1-based
 * @param {number} pageCount — total pages
 * @param {(page: number) => void} onPageChange
 * @param {'compact' | 'full'} [variant]
 * @param {string} [className]
 */
export default function Pager({
  page,
  pageCount,
  onPageChange,
  variant = 'compact',
  className = '',
}) {
  if (pageCount <= 1) return null;

  if (variant === 'full') {
    const maxVisible = 5;
    const pages = [];
    if (pageCount <= maxVisible) {
      for (let i = 1; i <= pageCount; i += 1) pages.push(i);
    } else if (page <= 3) {
      pages.push(1, 2, 3, 4, '…', pageCount);
    } else if (page >= pageCount - 2) {
      pages.push(1, '…', pageCount - 3, pageCount - 2, pageCount - 1, pageCount);
    } else {
      pages.push(1, '…', page - 1, page, page + 1, '…', pageCount);
    }

    return (
      <div className={`flex items-center justify-between gap-3 ${className}`}>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="btn-secondary h-9 px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          السابق
        </button>
        <div className="flex items-center gap-1">
          {pages.map((entry, index) => (
            <button
              key={`${entry}-${index}`}
              type="button"
              onClick={() => typeof entry === 'number' && onPageChange(entry)}
              disabled={typeof entry !== 'number'}
              aria-current={entry === page ? 'page' : undefined}
              className={`pager-num ${entry === page ? 'pager-num-active' : ''} ${typeof entry !== 'number' ? 'text-muted-soft' : ''}`}
            >
              {entry}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="btn-secondary h-9 px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          التالي
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="الصفحة السابقة"
        className="pager-btn"
      >
        <ChevronRight size={18} />
      </button>
      <span className="px-3 text-sm font-semibold text-muted dark:text-body-dark tabular-nums">
        صفحة {page} من {pageCount}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        aria-label="الصفحة التالية"
        className="pager-btn"
      >
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}

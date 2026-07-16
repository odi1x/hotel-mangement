import { useMemo, useState } from 'react';
import { Wallet, Phone, ArrowDownWideNarrow, ArrowUpNarrowWide, Printer } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { computeBookingTotals, formatSAR } from '../../lib/paymentUtils';
import PaymentStatusBadge from '../ui/PaymentStatusBadge';
import PaymentLedgerModal from '../ui/PaymentLedgerModal';
import PrintAgreement from '../ui/PrintAgreement';
import EmptyState from '../ui/EmptyState';

/**
 * The dues queue.
 *
 * Only shows bookings with balance > 0. Two sorts: soonest-out first (chase
 * the guest before they leave), or biggest-balance first (chase the money).
 * Each row is one-tap: open ledger to record a payment.
 */
export default function BalancesView() {
  const { bookings, apartments } = useData();
  const [sort, setSort] = useState('checkout'); // 'checkout' | 'amount'
  const [ledgerBooking, setLedgerBooking] = useState(null);
  const [printBooking, setPrintBooking] = useState(null);

  const dues = useMemo(() => {
    return bookings
      .map(b => ({ booking: b, totals: computeBookingTotals(b) }))
      .filter(x => x.totals.balanceDue > 0.01)
      .sort((a, b) => {
        if (sort === 'amount') return b.totals.balanceDue - a.totals.balanceDue;
        // Default: soonest checkout first
        return new Date(a.booking.endDate) - new Date(b.booking.endDate);
      });
  }, [bookings, sort]);

  const summary = useMemo(() => {
    const totalOutstanding = dues.reduce((s, x) => s + x.totals.balanceDue, 0);
    const totalCollected = bookings.reduce((s, b) => s + computeBookingTotals(b).totalReceived, 0);
    return { totalOutstanding, totalCollected, count: dues.length };
  }, [dues, bookings]);

  const dateFormat = (d) => new Date(d).toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const daysUntil = (endDate) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(0, 0, 0, 0);
    return Math.round((end - today) / (1000 * 60 * 60 * 24));
  };

  const daysLabel = (d) => {
    if (d < 0) return `مضت ${Math.abs(d)} يوم على المغادرة`;
    if (d === 0) return 'يغادر اليوم';
    if (d === 1) return 'يغادر غداً';
    return `يغادر خلال ${d} أيام`;
  };

  return (
    <>
      {/* Summary strip — the money at a glance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
              <Wallet size={14} className="text-muted dark:text-body-dark" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark">
              إجمالي المستحقات
            </p>
          </div>
          <p
            className="text-3xl font-bold tracking-tight text-ink dark:text-white leading-none"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatSAR(summary.totalOutstanding)}
            <span className="text-sm font-medium text-muted mr-1.5">ر.س</span>
          </p>
          <p className="text-xs text-muted-soft mt-2">
            على {summary.count} {summary.count === 1 ? 'حجز' : 'حجزاً'}
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-accent-soft">
              <Wallet size={14} className="text-accent-strong" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark">
              إجمالي المحصَّل
            </p>
          </div>
          <p
            className="text-3xl font-bold tracking-tight text-accent-strong leading-none"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatSAR(summary.totalCollected)}
            <span className="text-sm font-medium text-accent-strong/70 mr-1.5">ر.س</span>
          </p>
          <p className="text-xs text-muted-soft mt-2">
            على مدى جميع الحجوزات
          </p>
        </div>

        <div className="card-surface p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark mb-2">
              الترتيب
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSort('checkout')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-semibold transition-colors ${
                sort === 'checkout'
                  ? 'bg-ink text-white dark:bg-white dark:text-ink'
                  : 'bg-surface-soft text-muted hover:text-ink dark:bg-surface-dark-elevated dark:text-body-dark'
              }`}
            >
              <ArrowUpNarrowWide size={13} />
              الأقرب مغادرة
            </button>
            <button
              onClick={() => setSort('amount')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-semibold transition-colors ${
                sort === 'amount'
                  ? 'bg-ink text-white dark:bg-white dark:text-ink'
                  : 'bg-surface-soft text-muted hover:text-ink dark:bg-surface-dark-elevated dark:text-body-dark'
              }`}
            >
              <ArrowDownWideNarrow size={13} />
              الأكبر مبلغاً
            </button>
          </div>
        </div>
      </div>

      {/* Dues list */}
      <div className="flex-1 bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden flex flex-col min-h-0">
        <div className="p-5 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center shrink-0">
          <h3 className="font-semibold tracking-tight text-ink dark:text-white">
            الحجوزات ذات المبالغ المستحقة
          </h3>
          <span className="badge-pill text-xs font-semibold">
            {dues.length} {dues.length === 1 ? 'حجز' : 'حجوزات'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {dues.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="لا توجد مستحقات معلّقة"
              subtitle="جميع الحجوزات مسدَّدة بالكامل. عمل ممتاز."
            />
          ) : (
            <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
              {dues.map(({ booking, totals }) => {
                const apt = apartments.find(a => a.id === booking.apartmentId);
                const days = daysUntil(booking.endDate);
                const urgent = days <= 2 && days >= -1;

                return (
                  <li
                    key={booking.id}
                    className="px-6 py-4 hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors"
                  >
                    <div className="flex items-center gap-5">
                      {/* Guest & unit */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-ink dark:text-white truncate">
                            {booking.residentName}
                          </p>
                          <PaymentStatusBadge status={totals.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted dark:text-body-dark">
                          <span className="truncate">{apt?.name || 'وحدة محذوفة'}</span>
                          <span className="text-muted-soft">·</span>
                          <span className="flex items-center gap-1">
                            <Phone size={11} />{booking.phone}
                          </span>
                        </div>
                        <div className={`text-xs mt-1.5 font-medium ${
                          urgent
                            ? 'text-accent-strong'
                            : days < 0
                              ? 'text-muted'
                              : 'text-muted-soft'
                        }`}>
                          {daysLabel(days)} <span className="mx-1 text-muted-soft">·</span> {dateFormat(booking.endDate)}
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="text-left shrink-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-soft mb-0.5">
                          المتبقّي
                        </p>
                        <p
                          className="text-xl font-bold tracking-tight text-ink dark:text-white leading-none"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatSAR(totals.balanceDue)}
                          <span className="text-xs font-medium text-muted mr-1">ر.س</span>
                        </p>
                        <p
                          className="text-[10px] text-muted-soft mt-1"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          من {formatSAR(totals.totalDue)} ر.س
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setPrintBooking(booking)}
                          className="icon-action hover:text-accent"
                          title="طباعة سند"
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={() => setLedgerBooking(booking)}
                          className="btn-accent h-9 px-4"
                        >
                          <Wallet size={14} />
                          <span>تسجيل دفعة</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {ledgerBooking && (
        <PaymentLedgerModal
          booking={ledgerBooking}
          apartment={apartments.find(a => a.id === ledgerBooking.apartmentId)}
          onClose={() => setLedgerBooking(null)}
        />
      )}

      {printBooking && (
        <PrintAgreement
          booking={printBooking}
          documentType="voucher"
          onClose={() => setPrintBooking(null)}
        />
      )}
    </>
  );
}

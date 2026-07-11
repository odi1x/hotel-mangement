import { useState } from 'react';
import { X, Plus, Trash2, Wallet, Banknote, Building2, Smartphone, CreditCard, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  computeBookingTotals,
  formatSAR,
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  methodLabel,
  typeLabel
} from '../../lib/paymentUtils';
import PaymentStatusBadge from './PaymentStatusBadge';

const methodIcon = {
  cash:          Banknote,
  bank_transfer: Building2,
  stc_pay:       Smartphone,
  mada:          CreditCard
};

const todayIso = () => new Date().toISOString().split('T')[0];

/**
 * Payment ledger.
 *
 * Signature: this is designed to feel like a *paper receipt tape* — vertical
 * strip, tabular numerals, dashed hairlines between transactions, a running
 * total footer that reads like the totals block on a shop receipt. That's the
 * one place we spend our boldness (per frontend-design skill: pick one thing).
 * Everything around it stays quiet: standard modal frame, hairline dividers,
 * the same input-field/btn-* utilities used elsewhere in the app.
 */
export default function PaymentLedgerModal({ booking, apartment, onClose }) {
  const { addPayment, deletePayment } = useData();
  const { user } = useAuth();
  const canDelete = user?.role === 'admin' || user?.permissions?.canDelete;

  const { totalDue, totalReceived, balanceDue, status } = computeBookingTotals(booking);
  const payments = booking.payments || [];

  const [showAdd, setShowAdd] = useState(payments.length === 0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: balanceDue > 0 ? balanceDue.toString() : '',
    method: 'cash',
    type: 'payment',
    date: todayIso(),
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) === 0) return;
    setSubmitting(true);
    try {
      await addPayment(booking.id, form);
      setForm({
        amount: '',
        method: form.method,       // keep last-used method for streak entry
        type: 'payment',
        date: todayIso(),
        notes: ''
      });
      setShowAdd(false);
    } catch { /* toast handled in context */ } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePayment(booking.id, id);
      setConfirmDeleteId(null);
    } catch { /* toast handled */ }
  };

  const dateFormat = (d) => new Date(d).toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-2xl overflow-hidden border border-hairline dark:border-[#2e2e2e] flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-accent-soft">
              <Wallet size={18} className="text-accent-strong" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight text-ink dark:text-white text-lg leading-tight">
                سجل المدفوعات
              </h3>
              <p className="text-xs text-muted dark:text-[#a1a1aa] mt-0.5">
                {booking.residentName} <span className="text-muted-soft">·</span> {apartment?.name || 'وحدة'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="icon-action hover:text-accent">
            <X size={20} />
          </button>
        </div>

        {/* Totals strip — the big numbers, three columns, hairline separators. */}
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-hairline-soft dark:divide-[#242424] border-b border-hairline-soft dark:border-[#242424] shrink-0">
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa] mb-1.5">
              إجمالي الحجز
            </p>
            <p
              className="text-2xl font-bold tracking-tight text-ink dark:text-white leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatSAR(totalDue)}
              <span className="text-xs font-medium text-muted mr-1">ر.س</span>
            </p>
          </div>
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa] mb-1.5">
              المدفوع
            </p>
            <p
              className="text-2xl font-bold tracking-tight text-accent-strong leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatSAR(totalReceived)}
              <span className="text-xs font-medium text-accent-strong/70 mr-1">ر.س</span>
            </p>
          </div>
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa] mb-1.5">
              المتبقّي
            </p>
            <p
              className={`text-2xl font-bold tracking-tight leading-none ${
                balanceDue > 0 ? 'text-ink dark:text-white' : 'text-muted-soft'
              }`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatSAR(balanceDue)}
              <span className="text-xs font-medium text-muted mr-1">ر.س</span>
            </p>
            <div className="mt-2">
              <PaymentStatusBadge status={status} />
            </div>
          </div>
        </div>

        {/* Body: scrolling receipt tape */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {payments.length > 0 ? (
            <ul>
              {payments.map((p, idx) => {
                const MethodIcon = methodIcon[p.method] || Banknote;
                const isRefund = p.type === 'refund';
                const amt = Number(p.amount);
                return (
                  <li
                    key={p.id}
                    className={`px-6 py-4 flex items-center gap-4 group hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors ${
                      idx !== 0 ? 'border-t border-dashed border-hairline dark:border-[#2e2e2e]' : ''
                    }`}
                  >
                    <div className={`shrink-0 h-9 w-9 rounded-md flex items-center justify-center ${
                      isRefund
                        ? 'bg-surface-card text-muted dark:bg-surface-dark-elevated'
                        : 'bg-accent-soft text-accent-strong'
                    }`}>
                      <MethodIcon size={16} strokeWidth={2.25} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink dark:text-white">
                          {typeLabel(p.type)}
                        </span>
                        <span className="text-[11px] text-muted-soft">·</span>
                        <span className="text-xs text-muted dark:text-[#a1a1aa]">
                          {methodLabel(p.method)}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-soft mt-0.5">
                        {dateFormat(p.date)}
                        {p.collectedBy && <> <span className="mx-1">·</span> بواسطة {p.collectedBy}</>}
                      </div>
                      {p.notes && (
                        <div className="text-[11px] text-muted dark:text-[#a1a1aa] mt-1 italic">
                          {p.notes}
                        </div>
                      )}
                    </div>

                    <div
                      className={`text-base font-bold tracking-tight shrink-0 ${
                        isRefund ? 'text-muted' : 'text-ink dark:text-white'
                      }`}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {isRefund && '−'}{formatSAR(Math.abs(amt))}
                      <span className="text-[11px] font-medium text-muted mr-1">ر.س</span>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="icon-action opacity-0 group-hover:opacity-100 hover:text-accent shrink-0"
                        title="حذف الدفعة"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-surface-soft dark:bg-surface-dark-elevated flex items-center justify-center mb-4">
                <Wallet size={22} className="text-muted-soft" />
              </div>
              <p className="text-sm font-semibold text-ink dark:text-white mb-1">
                لم يتم تسجيل أي دفعات بعد
              </p>
              <p className="text-xs text-muted dark:text-[#a1a1aa]">
                سجّل الدفعة الأولى لبدء سجل هذا الحجز.
              </p>
            </div>
          )}
        </div>

        {/* Add-payment: either the button that opens the form, or the form itself */}
        <div className="border-t border-hairline-soft dark:border-[#242424] shrink-0">
          {!showAdd ? (
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="text-xs text-muted dark:text-[#a1a1aa]">
                {payments.length} {payments.length === 1 ? 'حركة مسجّلة' : 'حركة مسجّلة'}
              </div>
              <button
                onClick={() => {
                  setForm(f => ({
                    ...f,
                    amount: balanceDue > 0 ? balanceDue.toString() : '',
                    date: todayIso()
                  }));
                  setShowAdd(true);
                }}
                className="btn-accent h-9 px-4"
              >
                <Plus size={16} />
                <span>إضافة دفعة</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 bg-surface-soft/50 dark:bg-surface-dark-elevated/40">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-body dark:text-[#a1a1aa] mb-1.5">
                    المبلغ (ر.س)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="input-field"
                    placeholder="0.00"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-body dark:text-[#a1a1aa] mb-1.5">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-body dark:text-[#a1a1aa] mb-1.5">
                    طريقة الدفع
                  </label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="input-field"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-body dark:text-[#a1a1aa] mb-1.5">
                    نوع الحركة
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="input-field"
                  >
                    {PAYMENT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-body dark:text-[#a1a1aa] mb-1.5">
                  ملاحظة (اختياري)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-field"
                  placeholder="مثال: دفعة عربون التأكيد"
                />
              </div>

              {form.type === 'refund' && (
                <p className="text-[11px] text-muted mb-3 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  سيتم تسجيل هذه الحركة كاسترداد وخصمها من إجمالي المدفوع.
                </p>
              )}

              <div className="flex justify-end gap-2">
                {payments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="btn-secondary h-9 px-4"
                  >
                    إلغاء
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting || !form.amount}
                  className="btn-accent h-9 px-5"
                >
                  {submitting ? 'جارٍ الحفظ…' : 'تسجيل الدفعة'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Nested confirm-delete */}
        {confirmDeleteId && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-sm border border-hairline dark:border-[#2e2e2e] overflow-hidden">
              <div className="p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-surface-card dark:bg-surface-dark-elevated mb-4">
                  <AlertTriangle className="h-7 w-7 text-ink dark:text-white" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-ink dark:text-white mb-1.5">
                  حذف هذه الدفعة؟
                </h3>
                <p className="text-sm text-muted dark:text-[#a1a1aa]">
                  سيتم حذف هذه الحركة من السجل. يفضّل تسجيل استرداد بدلاً من الحذف للحفاظ على تسلسل السجل.
                </p>
              </div>
              <div className="p-4 border-t border-hairline-soft dark:border-[#242424] flex gap-3">
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="btn-primary flex-1"
                >
                  تأكيد الحذف
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="btn-secondary flex-1"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

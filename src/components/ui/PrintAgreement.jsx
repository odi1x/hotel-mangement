import { Printer, Check } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { computeBookingTotals, formatSAR, methodLabel, typeLabel } from '../../lib/paymentUtils';

/**
 * Two documents in one component:
 *
 *   documentType="confirmation" → عقد إيجار وحدات سكنية
 *     A binding legal contract. All parties/property/period/terms sections.
 *     Payments shown as a compact *summary* only (total, paid, balance).
 *     Two signature lines. Terms & conditions paragraph.
 *
 *   documentType="voucher" → سند قبض / كشف حساب
 *     A financial record. Title flips to "سند قبض" if fully paid, otherwise
 *     "كشف حساب" (statement of account). Compact identity block, then the
 *     FULL payments ledger as the main content. Single "received by"
 *     signature line. No T&Cs.
 *
 * Both tuned to fit one A4 page via the print CSS block below.
 */
export default function PrintAgreement({ booking, documentType = 'confirmation', onClose }) {
  const { apartments } = useData();
  const { user } = useAuth();
  const apartment = apartments.find(a => a.id === booking.apartmentId);
  const licenseNumber = apartment?.licenseNumber || user?.tourismLicense;
  const isVoucher = documentType === 'voucher';

  const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const calculateNights = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  const nights = calculateNights(booking.startDate, booking.endDate);
  const subtotal = parseFloat(booking.pricePerNight) * nights;
  const taxAmount = user?.taxEnabled && user?.taxPercentage
    ? (subtotal * parseFloat(user.taxPercentage)) / 100
    : 0;
  const total = subtotal + taxAmount;

  const { totalReceived, balanceDue, status } = computeBookingTotals(booking);
  const payments = (booking.payments || []).slice().sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const stamp = status === 'paid'
    ? { label: 'مسدَّد بالكامل', tone: 'paid' }
    : status === 'overpaid'
      ? { label: 'دفع زائد', tone: 'paid' }
      : status === 'partial'
        ? { label: 'سداد جزئي', tone: 'partial' }
        : { label: 'لم يُسدَّد', tone: 'unpaid' };

  // Voucher title flips based on payment reality
  const voucherTitle = balanceDue < 0.01 && payments.length > 0
    ? 'سند قبض'
    : 'كشف حساب';

  const handlePrint = () => {
    const aptName = apartment?.name ? apartment.name.replace(/\s+/g, '_') : 'شقة';
    const resName = booking.residentName ? booking.residentName.replace(/\s+/g, '_') : 'نزيل';
    const startDateStr = booking.startDate ? new Date(booking.startDate).toISOString().split('T')[0] : '';
    const prefix = isVoucher ? 'سند' : 'عقد';
    document.title = `${prefix}_${resName}_${aptName}${startDateStr ? '_' + startDateStr : ''}`;
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center p-8 overflow-y-auto" dir="rtl">

      {/* Print CSS — A4, tight margins, colors preserved, one page. */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm 14mm 12mm 14mm;
          }
          html, body {
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #agreement-paper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .no-print { display: none !important; }
          .print-avoid-break { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-3xl w-full bg-white border shadow-sm p-10 print:p-0 print:shadow-none print:border-none" id="agreement-paper">

        {/* ────────────────────────────────────────────────────────────────
            HEADER — shared, but title & subtitle differ per doc type
            ──────────────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6 print-avoid-break">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 leading-none">
              {isVoucher ? voucherTitle : 'عقد إيجار وحدات سكنية'}
            </h1>
            <p className="text-xs text-gray-500 font-bold mt-1.5">
              {isVoucher ? 'إقرار مالي وتوثيق الحركات' : 'وثيقة تعاقدية بين المؤجر والمستأجر'}
              <span className="mx-1.5 text-gray-300">·</span>
              المرجع #{booking.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="text-left flex flex-col items-end">
            {user?.logoUrl && (
              <img src={user.logoUrl} alt="Logo" className="h-12 mb-1.5 object-contain" />
            )}
            <p className="font-black text-base text-gray-900 leading-tight">
              {user?.businessName || 'رنت فلو العقارية'}
            </p>
            {licenseNumber && (
              <p className="text-[10px] text-gray-500 italic font-medium mt-0.5">
                ترخيص رقم: {licenseNumber}
              </p>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            CONTRACT BODY (عقد إيجار)
            ════════════════════════════════════════════════════════════════ */}
        {!isVoucher && (
          <div className="space-y-5 text-gray-800 text-sm">

            <section className="print-avoid-break">
              <h3 className="font-black text-[11px] bg-gray-100 px-2.5 py-2 uppercase mb-3 border-r-4 border-accent">
                أولاً: أطراف العقد
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">المؤجر / المدير</p>
                  <p className="font-bold text-gray-900">{user?.businessName || 'مجموعة رنت فلو العقارية'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">المستأجر / النزيل</p>
                  <p className="font-black text-gray-900">{booking.residentName}</p>
                  <p className="text-xs font-medium mt-0.5">
                    هوية: {booking.residentId} <span className="text-gray-400 mx-1">·</span> هاتف: {booking.phone}
                  </p>
                  {booking.address && (
                    <p className="text-[11px] text-gray-500 mt-0.5">{booking.address}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="print-avoid-break">
              <h3 className="font-black text-[11px] bg-gray-100 px-2.5 py-2 uppercase mb-3 border-r-4 border-accent">
                ثانياً: العقار ومدة الإيجار
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">بيانات الوحدة</p>
                  <p className="font-bold text-gray-900">{apartment?.name}</p>
                  <p className="text-xs italic font-medium text-gray-600">{apartment?.type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">فترة الإيجار</p>
                  <p className="font-bold text-gray-900">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</p>
                  <p className="text-xs font-black text-accent mt-0.5">{nights} ليلة إجمالية</p>
                </div>
              </div>
            </section>

            <section className="print-avoid-break">
              <h3 className="font-black text-[11px] bg-gray-100 px-2.5 py-2 uppercase mb-3 border-r-4 border-accent">
                ثالثاً: الشروط المالية
              </h3>
              <div className="grid grid-cols-4 gap-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">سعر الليلة</p>
                  <p className="font-bold text-gray-900">{formatSAR(booking.pricePerNight)} ر.س</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">المبلغ الأساسي</p>
                  <p className="font-bold text-gray-900">{formatSAR(subtotal)} ر.س</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">
                    الضريبة {user?.taxEnabled && user?.taxPercentage ? `(${user.taxPercentage}%)` : ''}
                  </p>
                  <p className="font-bold text-gray-900">{formatSAR(taxAmount)} ر.س</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">الإجمالي الشامل</p>
                  <p className="text-base font-black text-accent">{formatSAR(total)} ر.س</p>
                </div>
              </div>
            </section>

            {/* Compact payments SUMMARY (no ledger table — this is a contract, not a receipt) */}
            <section className="print-avoid-break">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-black text-[11px] bg-gray-100 px-2.5 py-2 uppercase border-r-4 border-accent flex-1">
                  رابعاً: حالة السداد
                </h3>
                <div
                  className={`shrink-0 ${
                    stamp.tone === 'paid'
                      ? 'border-2 border-accent text-accent bg-accent/5'
                      : stamp.tone === 'partial'
                        ? 'border-2 border-dashed border-accent text-accent bg-white'
                        : 'border-2 border-dashed border-gray-400 text-gray-500 bg-white'
                  } rounded-md px-3 py-1.5 -rotate-3 transform origin-center flex items-center gap-1.5`}
                  style={{ letterSpacing: '0.02em' }}
                >
                  {stamp.tone === 'paid' && <Check size={13} strokeWidth={3} />}
                  <span className="font-black text-xs uppercase">{stamp.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border border-gray-200 rounded-md px-4 py-2.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">المستحَق</p>
                  <p className="text-sm font-black text-gray-900">
                    {formatSAR(total)} <span className="text-[10px] text-gray-500 font-bold">ر.س</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">المُستَلَم</p>
                  <p className="text-sm font-black text-accent">
                    {formatSAR(totalReceived)} <span className="text-[10px] text-accent/70 font-bold">ر.س</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">المتبقّي</p>
                  <p className={`text-sm font-black ${balanceDue > 0.01 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {formatSAR(balanceDue)} <span className="text-[10px] font-bold text-gray-500">ر.س</span>
                  </p>
                </div>
              </div>

              {balanceDue > 0.01 && (
                <div className="mt-2 border border-dashed border-gray-400 rounded-md px-3 py-2 bg-gray-50 text-[11px] text-gray-700 font-medium leading-relaxed">
                  يُقرّ المستأجر بأن هنالك مبلغاً متبقّياً قدره <span className="font-black text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatSAR(balanceDue)} ر.س</span> مستحقاً للمؤجر، ويلتزم بسداده وفق ما يتم الاتفاق عليه.
                </div>
              )}
            </section>

            {/* Terms + signatures */}
            <section className="pt-4 border-t border-dashed border-gray-200 print-avoid-break">
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed text-justify whitespace-pre-wrap">
                {user?.customTerms
                  ? user.customTerms
                  : 'يقر المستأجر بموجب هذا العقد بالالتزام بكافة لوائح المبنى والحفاظ على الوحدة السكنية بحالة جيدة وإخلائها في موعد تسجيل الخروج المحدد. أي تلفيات تلحق بالوحدة سيتحمل المستأجر تكاليف إصلاحها. تم إعداد هذا العقد لتوثيق فترة الإقامة وحقوق الطرفين.'}
              </p>

              <div className="flex justify-between mt-10 gap-16">
                <div className="flex-1 border-t-2 border-gray-300 pt-2 text-center relative">
                  {user?.stampUrl && (
                    <img
                      src={user.stampUrl}
                      alt="Stamp"
                      className="absolute -top-14 left-1/2 transform -translate-x-1/2 h-16 opacity-80 mix-blend-multiply"
                    />
                  )}
                  <p className="text-[10px] font-bold text-gray-500 relative z-10">توقيع وختم المؤجر</p>
                </div>
                <div className="flex-1 border-t-2 border-gray-300 pt-2 text-center">
                  <p className="text-[10px] font-bold text-gray-500">توقيع المستأجر</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            VOUCHER BODY (سند قبض / كشف حساب)
            Compact identity → totals strip → ledger table → single signature
            ════════════════════════════════════════════════════════════════ */}
        {isVoucher && (
          <div className="space-y-5 text-gray-800 text-sm">

            {/* Compact identity — one row, four fields */}
            <section className="grid grid-cols-4 gap-4 border border-gray-200 rounded-md px-4 py-3 print-avoid-break">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">النزيل</p>
                <p className="font-black text-gray-900 truncate">{booking.residentName}</p>
                <p className="text-[11px] text-gray-500">هوية: {booking.residentId}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">الهاتف</p>
                <p className="font-bold text-gray-900">{booking.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">الوحدة</p>
                <p className="font-bold text-gray-900 truncate">{apartment?.name}</p>
                <p className="text-[11px] text-gray-500 italic">{apartment?.type}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">الفترة</p>
                <p className="font-bold text-gray-900 text-[12px] leading-tight">
                  {formatDate(booking.startDate)}
                </p>
                <p className="text-[11px] text-gray-500">
                  ← {formatDate(booking.endDate)} <span className="font-black text-accent">({nights} ليلة)</span>
                </p>
              </div>
            </section>

            {/* Big totals strip with stamp — the money at a glance */}
            <section className="relative print-avoid-break">
              <div className="grid grid-cols-3 gap-4 border-2 border-gray-900 rounded-md p-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">إجمالي المستحَق</p>
                  <p className="text-xl font-black text-gray-900 leading-none">
                    {formatSAR(total)}
                    <span className="text-xs text-gray-500 font-bold mr-1">ر.س</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">إجمالي المُستَلَم</p>
                  <p className="text-xl font-black text-accent leading-none">
                    {formatSAR(totalReceived)}
                    <span className="text-xs text-accent/70 font-bold mr-1">ر.س</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">المبلغ المتبقّي</p>
                  <p className={`text-xl font-black leading-none ${balanceDue > 0.01 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {formatSAR(balanceDue)}
                    <span className="text-xs text-gray-500 font-bold mr-1">ر.س</span>
                  </p>
                </div>
              </div>

              {/* Stamp — floats over the top-left corner of the totals block */}
              <div
                className={`absolute -top-2 -left-2 ${
                  stamp.tone === 'paid'
                    ? 'border-2 border-accent text-accent bg-white'
                    : stamp.tone === 'partial'
                      ? 'border-2 border-dashed border-accent text-accent bg-white'
                      : 'border-2 border-dashed border-gray-400 text-gray-500 bg-white'
                } rounded-md px-3 py-1.5 -rotate-6 transform origin-center flex items-center gap-1.5 shadow-sm`}
                style={{ letterSpacing: '0.03em' }}
              >
                {stamp.tone === 'paid' && <Check size={14} strokeWidth={3} />}
                <span className="font-black text-xs uppercase">{stamp.label}</span>
              </div>
            </section>

            {/* Payments ledger — the main content of a receipt */}
            <section className="print-avoid-break">
              <h3 className="font-black text-[11px] bg-gray-100 px-2.5 py-2 uppercase mb-2 border-r-4 border-accent">
                تفاصيل الحركات المالية
              </h3>

              {payments.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-md px-4 py-4 text-center text-xs text-gray-500 font-medium">
                  لم يتم تسجيل أي دفعات على هذا الحجز حتى تاريخ إصدار هذا الكشف.
                </div>
              ) : (
                <table className="w-full text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <thead>
                    <tr className="text-[9px] font-bold text-gray-400 uppercase border-b-2 border-gray-300">
                      <th className="py-1.5 text-right pr-1 w-8">#</th>
                      <th className="py-1.5 text-right">التاريخ</th>
                      <th className="py-1.5 text-right">نوع الحركة</th>
                      <th className="py-1.5 text-right">طريقة الدفع</th>
                      <th className="py-1.5 text-right">المُستلِم</th>
                      <th className="py-1.5 text-left pl-1">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => {
                      const isRefund = p.type === 'refund';
                      const amt = Math.abs(Number(p.amount));
                      return (
                        <tr
                          key={p.id}
                          className={`${i !== 0 ? 'border-t border-dashed border-gray-200' : ''}`}
                        >
                          <td className="py-1.5 pr-1 text-gray-400 font-bold">{i + 1}</td>
                          <td className="py-1.5 text-gray-800 font-medium">{formatDate(p.date)}</td>
                          <td className="py-1.5 text-gray-800 font-medium">{typeLabel(p.type)}</td>
                          <td className="py-1.5 text-gray-600">{methodLabel(p.method)}</td>
                          <td className="py-1.5 text-gray-600">{p.collectedBy || '—'}</td>
                          <td className="py-1.5 pl-1 text-left font-black text-gray-900">
                            {isRefund && '−'}{formatSAR(amt)} <span className="text-[9px] text-gray-500 font-bold">ر.س</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-900">
                      <td colSpan="5" className="py-2 text-right font-black text-gray-900 text-[11px] uppercase">
                        الإجمالي المُستَلَم
                      </td>
                      <td className="py-2 text-left font-black text-accent">
                        {formatSAR(totalReceived)} <span className="text-[9px] font-bold text-accent/70">ر.س</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {balanceDue > 0.01 && (
                <div className="mt-3 border border-dashed border-gray-400 rounded-md px-3 py-2 bg-gray-50 text-[11px] text-gray-700 font-medium leading-relaxed">
                  يُقرّ المستأجر بأن هنالك مبلغاً متبقّياً قدره <span className="font-black text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatSAR(balanceDue)} ر.س</span> مستحقاً للمؤجر بعد صرف هذا الكشف.
                </div>
              )}
            </section>

            {/* Single "received by" signature — receipts don't need dual signatures */}
            <section className="pt-3 border-t border-dashed border-gray-200 print-avoid-break">
              <div className="flex justify-between items-end gap-16 mt-8">
                <div className="flex-1 text-[10px] text-gray-500 font-medium leading-relaxed">
                  <p>حُرِّر هذا السند بتاريخ {formatDate(new Date())}.</p>
                  <p className="mt-0.5">يُعتبر هذا المستند إثباتاً للمبالغ المُستَلَمة والمُتبقّية على الحجز.</p>
                </div>
                <div className="flex-1 border-t-2 border-gray-300 pt-2 text-center relative max-w-[220px]">
                  {user?.stampUrl && (
                    <img
                      src={user.stampUrl}
                      alt="Stamp"
                      className="absolute -top-14 left-1/2 transform -translate-x-1/2 h-16 opacity-80 mix-blend-multiply"
                    />
                  )}
                  <p className="text-[10px] font-bold text-gray-500 relative z-10">توقيع وختم المُستلِم</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Action buttons — hidden in print */}
      <div className="mt-6 flex space-x-reverse space-x-4 no-print">
        <button
          onClick={handlePrint}
          className="bg-accent hover:bg-accent-strong text-white px-8 py-3 rounded-md font-semibold flex items-center space-x-reverse space-x-2 transition-colors active:scale-95"
        >
          <Printer size={20} />
          <span className="mr-2">طباعة المستند</span>
        </button>
        <button
          onClick={onClose}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold border border-gray-200 transition-all"
        >
          إغلاق المعاينة
        </button>
      </div>
    </div>
  );
}

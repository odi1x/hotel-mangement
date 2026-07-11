import { Printer, Check } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { computeBookingTotals, formatSAR, methodLabel, typeLabel } from '../../lib/paymentUtils';

export default function PrintAgreement({ booking, documentType = 'confirmation', onClose }) {
  const { apartments } = useData();
  const { user } = useAuth();
  const apartment = apartments.find(a => a.id === booking.apartmentId);
  const licenseNumber = apartment?.licenseNumber || user?.tourismLicense;

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

  // Payment reality — derived from the ledger.
  const { totalReceived, balanceDue, status } = computeBookingTotals(booking);
  const payments = (booking.payments || []).slice().sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const handlePrint = () => {

    const aptName = apartment?.name ? apartment.name.replace(/\s+/g, '_') : 'شقة';
    const resName = booking.residentName ? booking.residentName.replace(/\s+/g, '_') : 'نزيل';
    const startDateStr = booking.startDate ? new Date(booking.startDate).toISOString().split('T')[0] : '';

    document.title = `حجز_${resName}_${aptName}${startDateStr ? '_' + startDateStr : ''}`;

    setTimeout(() => {
      window.print();

    }, 100); // slight delay to let the browser register the title change before print dialog
  };

  const stamp = status === 'paid'
    ? { label: 'مسدَّد بالكامل', tone: 'paid' }
    : status === 'overpaid'
      ? { label: 'دفع زائد', tone: 'paid' }
      : status === 'partial'
        ? { label: 'سداد جزئي', tone: 'partial' }
        : { label: 'لم يُسدَّد', tone: 'unpaid' };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center p-10 overflow-y-auto" dir="rtl">
      <div className="max-w-3xl w-full bg-white border shadow-sm p-12 print:shadow-none print:border-none" id="agreement-paper">
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
            <div>
                <h1 className="text-3xl font-black tracking-tighter text-gray-900">
                  {documentType === 'voucher' ? 'سند قبض / تقرير مالي' : 'عقد إيجار وحدات سكنية'}
                </h1>
                <p className="text-gray-500 font-bold">المرجع: #{booking.id.toUpperCase()}</p>
            </div>
            <div className="text-left flex flex-col items-end">
                {user?.logoUrl && (
                  <img src={user.logoUrl} alt="Logo" className="h-16 mb-2 object-contain" />
                )}
                <p className="font-black text-xl text-gray-900">{user?.businessName || 'رنت فلو العقارية'}</p>
                {licenseNumber && (
                  <p className="text-sm text-gray-500 italic font-medium">ترخيص رقم: {licenseNumber}</p>
                )}
            </div>
        </div>

        <div className="space-y-8 text-gray-800">
            <section>
                <h3 className="font-black text-sm bg-gray-100 p-2.5 uppercase mb-4 border-r-4 border-accent">أولاً: أطراف العقد</h3>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">المؤجر / المدير</p>
                        <p className="font-bold text-gray-900">{user?.businessName || 'مجموعة رنت فلو العقارية'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">المستأجر / النزيل</p>
                        <p className="font-black uppercase text-gray-900">{booking.residentName}</p>
                        <p className="text-sm font-medium mt-1">رقم الهوية: {booking.residentId}</p>
                        <p className="text-sm font-medium">هاتف: {booking.phone}</p>
                        <p className="text-xs text-gray-500 mt-1">{booking.address}</p>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="font-black text-sm bg-gray-100 p-2.5 uppercase mb-4 border-r-4 border-accent">ثانياً: العقار ومدة الإيجار</h3>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">بيانات الوحدة</p>
                        <p className="font-bold text-gray-900">{apartment?.name}</p>
                        <p className="text-sm italic font-medium text-gray-600">{apartment?.type}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">فترة الإيجار</p>
                        <p className="font-bold text-gray-900">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</p>
                        <p className="text-sm font-black text-accent mt-1">{nights} ليلة إجمالية</p>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="font-black text-sm bg-gray-100 p-2.5 uppercase mb-4 border-r-4 border-accent">ثالثاً: الشروط المالية</h3>
                <div className="grid grid-cols-4 gap-6">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">سعر الليلة</p>
                        <p className="font-bold text-gray-900">{booking.pricePerNight} ر.س</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">المبلغ الأساسي</p>
                        <p className="font-bold text-gray-900">{subtotal} ر.س</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                          الضريبة {user?.taxEnabled && user?.taxPercentage ? `(${user.taxPercentage}%)` : ''}
                        </p>
                        <p className="font-bold text-gray-900">{taxAmount.toFixed(2)} ر.س</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">الإجمالي الشامل</p>
                        <p className="text-xl font-black text-accent">{total.toFixed(2)} ر.س</p>
                    </div>
                </div>
            </section>

            {/* Payments ledger + balance — always renders. Shows a friendly line
                when no payments have been recorded so the doc explicitly says so. */}
            <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-sm bg-gray-100 p-2.5 uppercase border-r-4 border-accent flex-1">رابعاً: المدفوعات وحالة السداد</h3>
                  {/* Status stamp — treatment-based (matches app's badge language) */}
                  <div
                    className={`shrink-0 mr-4 ${
                      stamp.tone === 'paid'
                        ? 'border-2 border-accent text-accent bg-accent/5'
                        : stamp.tone === 'partial'
                          ? 'border-2 border-dashed border-accent text-accent bg-white'
                          : 'border-2 border-dashed border-gray-400 text-gray-500 bg-white'
                    } rounded-md px-4 py-2 -rotate-3 transform origin-center flex items-center gap-2 print:mr-4`}
                    style={{ letterSpacing: '0.02em' }}
                  >
                    {stamp.tone === 'paid' && <Check size={16} strokeWidth={3} />}
                    <span className="font-black text-sm uppercase">{stamp.label}</span>
                  </div>
                </div>

                {payments.length === 0 ? (
                  <div className="border border-dashed border-gray-300 rounded-md px-4 py-6 text-center text-sm text-gray-500 font-medium">
                    لم يتم تسجيل أي دفعات على هذا الحجز حتى تاريخه.
                  </div>
                ) : (
                  <table className="w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-200">
                        <th className="py-2 text-right pr-2">التاريخ</th>
                        <th className="py-2 text-right">نوع الحركة</th>
                        <th className="py-2 text-right">طريقة الدفع</th>
                        <th className="py-2 text-right">المُستلِم</th>
                        <th className="py-2 text-left pl-2">المبلغ</th>
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
                            <td className="py-2.5 pr-2 text-gray-800 font-medium">{formatDate(p.date)}</td>
                            <td className="py-2.5 text-gray-800 font-medium">{typeLabel(p.type)}</td>
                            <td className="py-2.5 text-gray-600">{methodLabel(p.method)}</td>
                            <td className="py-2.5 text-gray-600 text-xs">{p.collectedBy || '—'}</td>
                            <td className="py-2.5 pl-2 text-left font-bold text-gray-900">
                              {isRefund && '−'}{formatSAR(amt)} <span className="text-[10px] text-gray-500 font-medium">ر.س</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Totals block — always shown so the reader sees paid/balance explicitly. */}
                <div className="mt-6 border-t-2 border-gray-900 pt-4">
                  <div className="grid grid-cols-3 gap-6" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">إجمالي المستحَق</p>
                      <p className="text-lg font-black text-gray-900">{formatSAR(total)} <span className="text-xs text-gray-500 font-bold">ر.س</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">إجمالي المُستَلَم</p>
                      <p className="text-lg font-black text-accent">{formatSAR(totalReceived)} <span className="text-xs text-accent/70 font-bold">ر.س</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">المبلغ المتبقّي</p>
                      <p className={`text-lg font-black ${balanceDue > 0.01 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {formatSAR(balanceDue)} <span className="text-xs font-bold text-gray-500">ر.س</span>
                      </p>
                    </div>
                  </div>

                  {balanceDue > 0.01 && (
                    <div className="mt-4 border border-dashed border-gray-400 rounded-md px-4 py-3 bg-gray-50 text-sm text-gray-700 font-medium">
                      يُقرّ المستأجر بأن هنالك مبلغاً متبقّياً قدره <span className="font-black text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatSAR(balanceDue)} ر.س</span> مستحقاً للمؤجر، ويلتزم بسداده وفق ما يتم الاتفاق عليه.
                    </div>
                  )}
                </div>
            </section>

            {documentType !== 'voucher' && (<section className="pt-10 border-t-2 border-dashed border-gray-200 mt-10">
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed text-justify whitespace-pre-wrap">
                    {user?.customTerms
                      ? user.customTerms
                      : 'يقر المستأجر بموجب هذا العقد بالالتزام بكافة لوائح المبنى والحفاظ على الوحدة السكنية بحالة جيدة وإخلائها في موعد تسجيل الخروج المحدد. أي تلفيات تلحق بالوحدة سيتحمل المستأجر تكاليف إصلاحها. تم إعداد هذا العقد لتوثيق فترة الإقامة وحقوق الطرفين.'}
                </p>

                <div className="flex justify-between mt-20 gap-20">
                    <div className="flex-1 border-t-2 border-gray-300 pt-3 text-center relative">
                        {user?.stampUrl && (
                          <img
                            src={user.stampUrl}
                            alt="Stamp"
                            className="absolute -top-16 left-1/2 transform -translate-x-1/2 h-20 opacity-80 mix-blend-multiply"
                          />
                        )}
                        <p className="text-xs font-bold text-gray-500 relative z-10">توقيع وختم المؤجر</p>
                    </div>
                    <div className="flex-1 border-t-2 border-gray-300 pt-3 text-center">
                        <p className="text-xs font-bold text-gray-500">توقيع المستأجر</p>
                    </div>
                </div>
            </section>)}
        </div>
      </div>

      <div className="mt-8 flex space-x-reverse space-x-4 print:hidden">
        <button
            onClick={handlePrint}
            className="bg-accent hover:bg-accent-strong text-white px-8 py-3 rounded-md font-semibold flex items-center space-x-reverse space-x-2 transition-colors active:scale-95"
        >
            <Printer size={20}/>
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

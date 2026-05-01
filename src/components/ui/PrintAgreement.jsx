import { Printer } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export default function PrintAgreement({ booking, onClose }) {
  const { apartments } = useData();
  const { user } = useAuth();
  const apartment = apartments.find(a => a.id === booking.apartmentId);

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

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center p-10 overflow-y-auto" dir="rtl">
      <div className="max-w-3xl w-full bg-white border shadow-sm p-12 print:shadow-none print:border-none" id="agreement-paper">
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
            <div>
                <h1 className="text-3xl font-black tracking-tighter text-gray-900">عقد إيجار وحدات سكنية</h1>
                <p className="text-gray-500 font-bold">المرجع: #{booking.id.toUpperCase()}</p>
            </div>
            <div className="text-left flex flex-col items-end">
                {user?.logoUrl && (
                  <img src={user.logoUrl} alt="Logo" className="h-16 mb-2 object-contain" />
                )}
                <p className="font-black text-xl text-gray-900">{user?.businessName || 'رنت فلو العقارية'}</p>
                {user?.tourismLicense && (
                  <p className="text-sm text-gray-500 italic font-medium">ترخيص رقم: {user.tourismLicense}</p>
                )}
            </div>
        </div>

        <div className="space-y-8 text-gray-800">
            <section>
                <h3 className="font-black text-sm bg-gray-100 p-2.5 uppercase mb-4 border-r-4 border-blue-600">أولاً: أطراف العقد</h3>
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
                <h3 className="font-black text-sm bg-gray-100 p-2.5 uppercase mb-4 border-r-4 border-blue-600">ثانياً: العقار ومدة الإيجار</h3>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">بيانات الوحدة</p>
                        <p className="font-bold text-gray-900">{apartment?.name}</p>
                        <p className="text-sm italic font-medium text-gray-600">{apartment?.type}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">فترة الإيجار</p>
                        <p className="font-bold text-gray-900">{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</p>
                        <p className="text-sm font-black text-blue-600 mt-1">{nights} ليلة إجمالية</p>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="font-black text-sm bg-gray-100 p-2.5 uppercase mb-4 border-r-4 border-blue-600">ثالثاً: الشروط المالية</h3>
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
                        <p className="text-xl font-black text-gray-900">{total.toFixed(2)} ر.س</p>
                    </div>
                </div>
            </section>

            <section className="pt-10 border-t-2 border-dashed border-gray-200 mt-10">
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
            </section>
        </div>
      </div>

      <div className="mt-8 flex space-x-reverse space-x-4 print:hidden">
        <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-reverse space-x-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
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

const fs = require('fs');
let content = fs.readFileSync('src/components/views/ResidentsView.jsx', 'utf8');

if (!content.includes('checkoutModalOpen')) {
    // Add state for checkout modal
    content = content.replace(
      "const [noteContent, setNoteContent] = useState('');",
      "const [noteContent, setNoteContent] = useState('');\n  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);\n  const [checkoutData, setCheckoutData] = useState({ id: null, option: 'keep', days: '', notes: '', booking: null });"
    );

    // Replace handleCheckout
    const oldCheckout = `  const handleCheckout = (id) => {
    if(confirm('هل أنت متأكد من رغبتك في تسجيل خروج هذا النزيل مبكراً؟ سيتم تحديث تاريخ المغادرة للوقت الحالي مع الاحتفاظ بالقيمة المالية وإتاحة الوحدة للإيجار مجدداً.')) {
      checkoutBooking(id);
    }
  };`;

    const newCheckout = `  const handleCheckout = (booking) => {
    const s = new Date(booking.startDate);
    const today = new Date();
    const diffTime = Math.abs(today - s);
    const stayedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    setCheckoutData({
      id: booking.id,
      option: 'keep',
      days: stayedDays.toString(),
      notes: '',
      booking
    });
    setCheckoutModalOpen(true);
  };

  const confirmCheckout = async () => {
    if (checkoutData.option === 'recalculate' && !checkoutData.days) {
      return toast.error('الرجاء إدخال عدد الأيام');
    }

    try {
      await axios.put('/api/bookings', {
        id: checkoutData.id,
        isCheckout: true,
        financialOption: checkoutData.option,
        customDays: checkoutData.days,
        reasonNotes: checkoutData.notes
      });
      fetchBookings();
      fetchApartments(); // Refresh apartment status
      toast.success('تم تسجيل الخروج بنجاح');
      setCheckoutModalOpen(false);
    } catch (e) {
      toast.error('حدث خطأ أثناء الخروج');
    }
  };`;

    content = content.replace(oldCheckout, newCheckout);

    // Update the button onClick to pass the full booking object
    content = content.replace(
      `onClick={() => handleCheckout(booking.id)}`,
      `onClick={() => handleCheckout(booking)}`
    );

    // We need axios in ResidentsView.jsx
    if (!content.includes("import axios from 'axios';")) {
        content = content.replace(
            "import { useData } from '../../context/DataContext';",
            "import { useData } from '../../context/DataContext';\nimport axios from 'axios';"
        );
    }

    // Add the modal HTML before the closing </div>
    const modalHtml = `
      {/* Checkout Modal */}
      {checkoutModalOpen && checkoutData.booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-red-100 dark:border-red-900/30">
            <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center">
              <h3 className="font-bold text-red-700 dark:text-red-400 text-lg flex items-center gap-2">
                <LogOut size={20} />
                تأكيد مغادرة مبكرة
              </h3>
              <button onClick={() => setCheckoutModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 p-3 rounded-lg text-sm font-bold border border-orange-200 dark:border-orange-800/50">
                أنت على وشك تسجيل خروج للنزيل ({checkoutData.booking.residentName}) قبل موعده. هذا الإجراء سيقوم بإتاحة الشقة فوراً.
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">خيارات احتساب المبلغ:</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <input
                      type="radio"
                      name="financialOption"
                      value="keep"
                      checked={checkoutData.option === 'keep'}
                      onChange={() => setCheckoutData({...checkoutData, option: 'keep'})}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm font-bold text-gray-800 dark:text-white">الاحتفاظ بالمبلغ كامل (القيمة الأصلية)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <input
                      type="radio"
                      name="financialOption"
                      value="recalculate"
                      checked={checkoutData.option === 'recalculate'}
                      onChange={() => setCheckoutData({...checkoutData, option: 'recalculate'})}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm font-bold text-gray-800 dark:text-white">تعديل المبلغ بناءً على الأيام</span>
                  </label>
                </div>
              </div>

              {checkoutData.option === 'recalculate' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">عدد الأيام الفعلية:</label>
                  <input
                    type="number"
                    value={checkoutData.days}
                    onChange={(e) => setCheckoutData({...checkoutData, days: e.target.value})}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-2">السعر الإجمالي الجديد سيكون: {Number(checkoutData.days || 0) * Number(checkoutData.booking.pricePerNight)} ر.س</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">سبب المغادرة المبكرة:</label>
                <textarea
                  value={checkoutData.notes}
                  onChange={(e) => setCheckoutData({...checkoutData, notes: e.target.value})}
                  rows="3"
                  placeholder="اكتب سبب الخروج هنا... سيتم حفظه في ملاحظات النزيل"
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 text-sm"
                ></textarea>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmCheckout}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-500/30"
              >
                تأكيد تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );`;

    content = content.replace(/<\/div>\s*<\/div>\s*\);\s*}\s*$/, modalHtml + '\n  }\n');

    // Some minor syntax fixes in case of bad replacements
    content = content.replace(/}\s*$/, '}\n');

    fs.writeFileSync('src/components/views/ResidentsView.jsx', content, 'utf8');
    console.log('ResidentsView updated');
}

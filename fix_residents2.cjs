const fs = require('fs');
let content = fs.readFileSync('src/components/views/ResidentsView.jsx', 'utf8');

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
      )}`;

// We need to fetchBookings and fetchApartments from DataContext!
if (!content.includes('fetchApartments')) {
    content = content.replace('deleteBooking, checkoutBooking, toggleTrustedStatus, updateBooking', 'deleteBooking, checkoutBooking, toggleTrustedStatus, updateBooking, fetchBookings, fetchApartments');
}

// Inject the modal html before the final </>
if (!content.includes('تأكيد مغادرة مبكرة')) {
    content = content.replace('</>', modalHtml + '\n    </>');
    fs.writeFileSync('src/components/views/ResidentsView.jsx', content, 'utf8');
}

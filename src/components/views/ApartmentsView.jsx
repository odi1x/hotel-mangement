import { useState, useEffect } from 'react';
import { Home, Edit3, Trash2, Plus, X, ChevronRight, ChevronLeft, Image as ImageIcon, Share2, Copy } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export default function ApartmentsView() {
  const { apartments, addApartment, updateApartment, deleteApartment, licenses } = useData();
  const { user } = useAuth();

  const customTypes = user?.apartmentTypes ? user.apartmentTypes.split(',').map(t => t.trim()).filter(Boolean) : ['غرفة', 'غرفة وصالة', 'غرفتين وصالة', 'استوديو', 'شقة'];
  const defaultType = customTypes.length > 0 ? customTypes[0] : 'استوديو';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [formData, setFormData] = useState({
      name: '', type: defaultType, description: '', basePrice: '',
      rentCost: '', rentPeriod: 'monthly', cleaningType: 'salaried', cleaningCost: '',
      platformFeeType: 'percentage', platformFee: '',
      otherExpenseLabel: '', otherExpenseAmount: '', licenseId: ''
  });

  const handleOpenModal = (apt = null) => {
    if (apt) {
      setFormData({
          ...apt,
          rentCost: apt.rentCost || '',
          rentPeriod: apt.rentPeriod || 'monthly',
          cleaningType: apt.cleaningType || 'salaried',
          cleaningCost: apt.cleaningCost || '',
          platformFeeType: apt.platformFeeType || 'percentage',
          platformFee: apt.platformFee || '',
          otherExpenseLabel: apt.otherExpenseLabel || '',
          otherExpenseAmount: apt.otherExpenseAmount || '',
          licenseId: apt.licenseId || ''
      });
      setEditingId(apt.id);
    } else {
      setFormData({ name: '', type: defaultType, description: '', basePrice: '' });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingId) {
      updateApartment(formData);
    } else {
      addApartment(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if(confirm('هل أنت متأكد من حذف هذه الشقة وجميع حجوزاتها؟')) {
      deleteApartment(id);
    }
  };

  const { bookings } = useData();

  const isApartmentCurrentlyBooked = (apartmentId) => {
    const today = new Date().setHours(0,0,0,0);
    return bookings.some(b => {
      if (b.apartmentId !== apartmentId) return false;
      const start = new Date(b.startDate).setHours(0,0,0,0);
      const end = new Date(b.endDate).setHours(0,0,0,0);
      return today >= start && today <= end;
    });
  };

  const hasBookingEndedNeedsCleaning = (apt) => {
    const today = new Date().setHours(0,0,0,0);
    const lastCleaned = new Date(apt.lastCleanedAt || 0).setHours(0,0,0,0);

    return bookings.some(b => {
      if (b.apartmentId !== apt.id) return false;
      const end = new Date(b.endDate).setHours(0,0,0,0);
      return today > end && end >= lastCleaned;
    });
  };

  useEffect(() => {
    apartments.forEach(apt => {
        const isCurrentlyBooked = isApartmentCurrentlyBooked(apt.id);
        const needsCleaningAuto = hasBookingEndedNeedsCleaning(apt) && !isCurrentlyBooked;

        if (needsCleaningAuto && !apt.needsCleaning) {
            updateApartment({ ...apt, needsCleaning: true });
        }
    });
  }, [apartments, bookings, updateApartment]);

  const handleToggleCleaningStatus = async (apt) => {
    await updateApartment({ ...apt, needsCleaning: !apt.needsCleaning });
  };


  const totalPages = Math.ceil(apartments.length / itemsPerPage);
  const paginatedApartments = apartments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
        {paginatedApartments.map((apt) => {
          const isNotClean = apt.needsCleaning;

          return (
          <div key={apt.id} className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border ${isNotClean ? 'border-gray-100 dark:border-slate-800 border-r-4 border-r-amber-500' : 'border-gray-100 dark:border-slate-800'} flex flex-col h-full relative group transition-all hover:shadow-md overflow-hidden`}>
            {/* Top Half: Photo */}
            <div
                className="w-full h-40 bg-gray-200 dark:bg-slate-800 relative cursor-pointer group-hover:brightness-95 transition-all"
                onClick={() => handleOpenPhotoModal(apt)}
            >
                {apt.coverPhoto ? (
                    <>
                    <img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover" />
                    {apt.images && apt.images.length > 1 && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
                        <ImageIcon size={12} />
                        <span dir="ltr">+{apt.images.length - 1}</span>
                      </div>
                    )}
                  </>

                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon size={32} className="mb-2 opacity-50" />
                        <span className="text-xs font-bold">أضف صورة</span>
                    </div>
                )}
                {/* Overlay actions */}
                <div className="absolute top-2 right-2 flex space-x-reverse space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 rounded-lg p-1 backdrop-blur-sm">
                    {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(apt); }}
                        className="text-gray-600 dark:text-gray-300 hover:text-blue-600 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        title="تعديل"
                    >
                        <Edit3 size={16} />
                    </button>
                    )}
                    {(user?.role === 'admin' || user?.permissions?.canDelete) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }}
                        className="text-gray-600 dark:text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title="حذف"
                    >
                        <Trash2 size={16} />
                    </button>
                    )}
                </div>
                {isNotClean && (
                    <div className="absolute bottom-2 right-2">
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                            تحتاج لتنظيف
                        </span>
                    </div>
                )}
            </div>

            {/* Bottom Half: Meta */}
            <div className="p-4 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Home size={18} /></div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{apt.name}</h3>
                </div>
              </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 mt-1 font-medium line-clamp-1">{apt.type} • {apt.description}</p>

            <div className="mt-auto flex items-end justify-between pt-3 border-t border-gray-50 dark:border-slate-800">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">السعر الأساسي</p>
                <p className="text-xl font-black text-green-600 dark:text-green-400">{apt.basePrice} <span className="text-xs text-gray-400 font-bold">ر.س / ليلة</span></p>
              </div>
              {isNotClean && (
                <button
                  onClick={() => handleToggleCleaningStatus(apt)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  تم التنظيف
                </button>
              )}
            </div>
          </div>
            </div>
        );
        })}

        {(user?.role === 'admin' || user?.permissions?.canEdit) && (
          <button
            onClick={() => handleOpenModal()}
            className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 dark:hover:bg-slate-800 transition-all cursor-pointer bg-transparent min-h-[200px]"
          >
            <div className="p-3 rounded-full bg-gray-50 dark:bg-slate-800 mb-3"><Plus size={24} /></div>
            <span className="font-bold">إضافة وحدة جديدة</span>
          </button>
        )}

      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center py-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex space-x-reverse space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>
            <span className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-slate-300">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900 shrink-0">
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                {editingId ? 'تعديل بيانات الوحدة' : 'إضافة وحدة جديدة'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSave} className="space-y-6">

              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 border-b pb-2">المعلومات الأساسية</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">اسم/رقم الوحدة</label>
                <input required type="text" placeholder="مثال: شقة 101" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">النوع</label>
                      <select className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                          {customTypes.map((t, idx) => (
                            <option key={idx} value={t}>{t}</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">السعر الافتراضي</label>
                      <input required type="number" placeholder="200" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">ملاحظات/وصف</label>
                  <textarea className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-28 bg-white dark:bg-slate-800 dark:text-slate-100 resize-none transition-all" placeholder="وصف الشقة أو ملاحظات داخلية..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">ترخيص السياحة (اختياري)</label>
                    <select className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.licenseId} onChange={(e) => setFormData({...formData, licenseId: e.target.value})}>
                        <option value="">بدون ترخيص محدد</option>
                        {licenses.map(l => (
                          <option key={l.id} value={l.id}>{l.licenseNumber}</option>
                        ))}
                    </select>
                </div>
              </div>

              {/* Financials & Costs Section */}
              <div className="space-y-4 pt-4">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 border-b pb-2">التكاليف والمالية (اختياري)</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">تكلفة الإيجار</label>
                    <div className="flex space-x-reverse space-x-2">
                        <input type="number" placeholder="المبلغ" className="w-2/3 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.rentCost} onChange={(e) => setFormData({...formData, rentCost: e.target.value})} />
                        <select className="w-1/3 px-2 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all text-sm" value={formData.rentPeriod} onChange={(e) => setFormData({...formData, rentPeriod: e.target.value})}>
                            <option value="monthly">شهري</option>
                            <option value="yearly">سنوي</option>
                        </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">نوع النظافة والتكلفة</label>
                    <div className="flex gap-2 mb-3 bg-gray-50 dark:bg-slate-800 p-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, cleaningType: 'salaried'})}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${formData.cleaningType === 'salaried' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          موظف براتب
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, cleaningType: 'per_booking'})}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${formData.cleaningType === 'per_booking' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          رسوم لكل حجز
                        </button>
                    </div>
                    {formData.cleaningType === 'per_booking' && (
                        <input type="number" placeholder="تكلفة التنظيف للحجز الواحد (مثال: 50)" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.cleaningCost} onChange={(e) => setFormData({...formData, cleaningCost: e.target.value})} />
                    )}
                    {formData.cleaningType === 'salaried' && (
                        <p className="text-[10px] text-gray-400">سيتم حساب التكلفة من راتب النظافة الشهري في الإعدادات العامة ولن يتم خصم رسوم تنظيف إضافية لهذه الوحدة عند الحجز.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">عمولات المنصات (لكل حجز)</label>
                    <div className="flex space-x-reverse space-x-2">
                        <input type="number" placeholder="العمولة" className="w-2/3 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.platformFee} onChange={(e) => setFormData({...formData, platformFee: e.target.value})} />
                        <select className="w-1/3 px-2 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all text-sm" value={formData.platformFeeType} onChange={(e) => setFormData({...formData, platformFeeType: e.target.value})}>
                            <option value="percentage">نسبة %</option>
                            <option value="fixed">مبلغ ثابت</option>
                        </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">مصاريف أخرى (لكل حجز)</label>
                    <div className="flex space-x-reverse space-x-2">
                        <input type="text" placeholder="الاسم (مثال: ضيافة)" className="w-1/2 px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all text-sm" value={formData.otherExpenseLabel} onChange={(e) => setFormData({...formData, otherExpenseLabel: e.target.value})} />
                        <input type="number" placeholder="المبلغ" className="w-1/2 px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.otherExpenseAmount} onChange={(e) => setFormData({...formData, otherExpenseAmount: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 mt-4">
                {editingId ? 'تحديث البيانات' : 'حفظ الوحدة'}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

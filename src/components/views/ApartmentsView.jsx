import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import { Home, Edit3, Trash2, Plus, X, ChevronRight, ChevronLeft, Image as ImageIcon, Share2, Copy, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
export default function ApartmentsView() {
  const { apartments, addApartment, updateApartment, deleteApartment, licenses, refreshData } = useData();
  const { user } = useAuth();
  const customTypes = user?.apartmentTypes ? user.apartmentTypes.split(',').map(t => t.trim()).filter(Boolean) : ['غرفة', 'غرفة وصالة', 'غرفتين وصالة', 'استوديو', 'شقة'];
  const defaultType = customTypes.length > 0 ? customTypes[0] : 'استوديو';
  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [activeApartmentForPhotos, setActiveApartmentForPhotos] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvancedFinancials, setShowAdvancedFinancials] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;
  const [formData, setFormData] = useState({
      name: '', type: defaultType, description: '', basePrice: '',
      rentCost: '', rentPeriod: 'monthly', cleaningType: 'salaried', cleaningCost: '',
      platformFeeType: 'percentage', platformFee: '',
      otherExpenseLabel: '', otherExpenseAmount: '', licenseId: ''
  });




  const handleOpenPhotoModal = (apt) => {
    setActiveApartmentForPhotos(apt);
    setShowPhotoModal(true);
  };
  const handleSavePhotos = async (photoData) => {
    try {
      // eslint-disable-next-line no-unused-vars
      const response = await axios.put('/api/apartments', {
        ...activeApartmentForPhotos,
        images: photoData.images,
        coverPhoto: photoData.coverPhoto
      });
      refreshData();
      setShowPhotoModal(false);
      toast.success('تم تحديث الصور بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الصور');
    }
  };
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('الرجاء اختيار صورة صالحة');

    setIsUploading(true);
    try {
      const authRes = await axios.get('/api/auth?action=imagekit-auth');
      const { token, expire, signature } = authRes.data;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fileName', file.name);
      fd.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'public_dummy');
      fd.append('signature', signature);
      fd.append('expire', expire);
      fd.append('token', token);
      fd.append('folder', '/apartments');
      const uploadRes = await axios.post('https://upload.imagekit.io/api/v1/files/upload', fd);
      const imageUrl = uploadRes.data.url;
      const fileId = uploadRes.data.fileId;

      // We will append fileId to the URL as a query param so we can extract it later for deletion
      const urlWithId = `${imageUrl}?fileId=${fileId}`;

      const newImages = [...(formData.images || []), urlWithId];
      setFormData(prev => ({
        ...prev,
        images: newImages,
        coverPhoto: prev.coverPhoto || imageUrl
      }));
      toast.success('تم رفع الصورة');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الرفع');
    } finally {
      setIsUploading(false);
    }
  };
  const removeImage = async (url) => {
    // Attempt to extract fileId and delete from ImageKit
    const urlObj = new URL(url);
    const fileId = urlObj.searchParams.get('fileId');
    if (fileId) {
       try {
         await axios.delete('/api/auth?action=imagekit-delete', { data: { fileId } });
       } catch (err) {
         console.error('Failed to delete image from ImageKit', err);
       }
    }
    const newImages = formData.images.filter(img => img !== url);
    setFormData(prev => ({
      ...prev,
      images: newImages,
      coverPhoto: prev.coverPhoto === url ? (newImages[0] || null) : prev.coverPhoto
    }));
  };
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
          <div key={apt.id} className="card-surface flex flex-col h-full relative group transition-all hover:shadow-soft overflow-hidden">
            {/* Top Half: Photo */}
            <div
                className="w-full h-40 bg-surface-strong dark:bg-[#242424] relative cursor-pointer group-hover:brightness-95 transition-all"
                onClick={() => handleOpenPhotoModal(apt)}
            >
                {apt.coverPhoto ? (
                    <>
                    <img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover" />
                    {apt.images && apt.images.length > 1 && (
                      <div className="absolute bottom-2 left-2 bg-ink/70 text-white text-[10px] font-semibold px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
                        <ImageIcon size={12} />
                        <span dir="ltr">+{apt.images.length - 1}</span>
                      </div>
                    )}
                  </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-soft">
                        <ImageIcon size={32} className="mb-2 opacity-50" />
                        <span className="text-xs font-semibold">أضف صورة</span>
                    </div>
                )}
                {/* Overlay actions */}
                <div className="absolute top-2 right-2 flex space-x-reverse space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-canvas/95 dark:bg-surface-dark/95 rounded-md p-1 border border-hairline dark:border-[#2e2e2e] backdrop-blur-sm">
                    {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(apt); }}
                        className="icon-action p-1.5"
                        title="تعديل"
                    >
                        <Edit3 size={16} />
                    </button>
                    )}
                    {(user?.role === 'admin' || user?.permissions?.canDelete) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }}
                        className="icon-action p-1.5"
                        title="حذف"
                    >
                        <Trash2 size={16} />
                    </button>
                    )}
                </div>
                {isNotClean && (
                    <div className="absolute bottom-2 right-2">
                        <span className="badge-pill bg-canvas/95 text-ink border border-hairline backdrop-blur-sm text-[11px]">
                            تحتاج لتنظيف
                        </span>
                    </div>
                )}
            </div>
            {/* Bottom Half: Meta */}
            <div className="p-4 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-surface-card dark:bg-surface-dark text-ink dark:text-white"><Home size={18} /></div>
                  <h3 className="text-lg font-semibold tracking-tight text-ink dark:text-white">{apt.name}</h3>
                </div>
              </div>
            <p className="text-xs text-muted dark:text-[#a1a1aa] mb-3 mt-1 line-clamp-1">{apt.type} • {apt.description}</p>
            <div className="mt-auto flex items-end justify-between pt-3 border-t border-hairline dark:border-[#2e2e2e]">
              <div>
                <p className="text-[10px] text-muted-soft font-semibold mb-0.5">السعر الأساسي</p>
                <p className="text-xl font-semibold tracking-tight text-ink dark:text-white">{apt.basePrice} <span className="text-xs text-muted font-semibold">ر.س / ليلة</span></p>
              </div>
              {isNotClean && (
                <button
                  onClick={() => handleToggleCleaningStatus(apt)}
                  className="text-xs font-semibold text-ink dark:text-white bg-canvas dark:bg-surface-dark border border-hairline dark:border-[#2e2e2e] hover:bg-surface-soft dark:hover:bg-[#242424] px-3 py-1.5 rounded-md transition-colors"
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
            className="border border-dashed border-hairline dark:border-[#2e2e2e] rounded-lg p-6 flex flex-col items-center justify-center text-muted hover:border-ink hover:text-ink dark:hover:border-white dark:hover:text-white hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors cursor-pointer bg-transparent min-h-[200px]"
          >
            <div className="p-3 rounded-full bg-surface-card dark:bg-surface-dark-elevated mb-3"><Plus size={24} /></div>
            <span className="font-semibold">إضافة وحدة جديدة</span>
          </button>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center py-4 border-t border-hairline-soft dark:border-[#242424] shrink-0">
          <div className="nav-pill-group">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="nav-pill disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
            <span className="nav-pill nav-pill-active text-sm font-semibold">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="nav-pill disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-canvas dark:bg-surface-dark rounded-xl shadow-soft border border-hairline dark:border-[#2e2e2e] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-center shrink-0">
              <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white">
                {editingId ? 'تعديل بيانات الوحدة' : 'إضافة وحدة جديدة'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="icon-action"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-ink dark:text-white border-b border-hairline-soft dark:border-[#242424] pb-2">المعلومات الأساسية</h3>
                <div>
                  <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">اسم/رقم الوحدة</label>
                <input required type="text" placeholder="مثال: شقة 101" className="input-field" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">النوع</label>
                      <select className="input-field" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                          {customTypes.map((t, idx) => (
                            <option key={idx} value={t}>{t}</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">السعر الافتراضي</label>
                      <input required type="number" placeholder="200" className="input-field" value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">ملاحظات/وصف</label>
                  <textarea className="input-field h-28 resize-none" placeholder="وصف الشقة أو ملاحظات داخلية..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">ترخيص السياحة (اختياري)</label>
                    <select className="input-field" value={formData.licenseId} onChange={(e) => setFormData({...formData, licenseId: e.target.value})}>
                        <option value="">بدون ترخيص محدد</option>
                        {licenses.map(l => (
                          <option key={l.id} value={l.id}>{l.licenseNumber}</option>
                        ))}
                    </select>
                </div>
              </div>
              {/* Financials & Costs Section */}

              {/* Premium Image Upload Section */}
              <div className="space-y-4 pt-4 border-t border-hairline-soft dark:border-[#242424]">
                <h3 className="font-semibold text-ink dark:text-white pb-2">صور الوحدة</h3>
                <div className="border border-dashed border-hairline dark:border-[#2e2e2e] rounded-md p-6 text-center hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className={`p-3 rounded-full bg-surface-card dark:bg-surface-dark-elevated ${isUploading ? 'animate-pulse' : ''}`}>
                      <ImageIcon size={24} className="text-muted" />
                    </div>
                    <div>
                      <p className="font-semibold text-body dark:text-[#a1a1aa] text-sm">
                        {isUploading ? 'جاري الرفع...' : 'اسحب الصور هنا أو اضغط للتصفح'}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Image Previews */}
                {formData.images && formData.images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {formData.images.map((url, idx) => (
                      <div key={idx} className={`relative shrink-0 w-24 h-24 rounded-md overflow-hidden border ${formData.coverPhoto === url ? 'border-ink dark:border-white' : 'border-hairline dark:border-[#2e2e2e]'}`}>
                        <img src={url} className="w-full h-full object-cover" alt="preview" />
                        <button
                          type="button"
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 bg-ink/80 text-white p-1 rounded-md hover:bg-ink transition-colors"
                        >
                          <X size={12} />
                        </button>
                        {formData.coverPhoto !== url && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, coverPhoto: url})}
                            className="absolute bottom-1 left-1 right-1 bg-ink/70 text-white text-[10px] py-1 rounded text-center hover:bg-ink/90"
                          >
                            تعيين غلاف
                          </button>
                        )}
                        {formData.coverPhoto === url && (
                          <div className="absolute bottom-1 left-1 right-1 bg-ink text-white text-[10px] py-1 rounded text-center">
                            الصورة الرئيسية
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Collapsible Financial Section */}
              <div className="space-y-4 pt-4 border-t border-hairline-soft dark:border-[#242424]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFinancials(!showAdvancedFinancials)}
                  className="w-full flex justify-between items-center font-semibold text-ink dark:text-white pb-2"
                >
                  <span>التكاليف والمالية (إعدادات متقدمة)</span>
                  <span className="text-muted">{showAdvancedFinancials ? <ChevronLeft className="-rotate-90 transition-transform" /> : <ChevronLeft className="transition-transform" />}</span>
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${showAdvancedFinancials ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">تكلفة الإيجار</label>
                    <div className="flex space-x-reverse space-x-2">
                        <input type="number" placeholder="المبلغ" className="input-field w-2/3" value={formData.rentCost} onChange={(e) => setFormData({...formData, rentCost: e.target.value})} />
                        <select className="input-field w-1/3 px-2" value={formData.rentPeriod} onChange={(e) => setFormData({...formData, rentPeriod: e.target.value})}>
                            <option value="monthly">شهري</option>
                            <option value="yearly">سنوي</option>
                        </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">نوع النظافة والتكلفة</label>
                    <div className="nav-pill-group w-full mb-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, cleaningType: 'salaried'})}
                          className={`nav-pill flex-1 text-xs font-semibold ${formData.cleaningType === 'salaried' ? 'nav-pill-active' : ''}`}
                        >
                          موظف براتب
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, cleaningType: 'per_booking'})}
                          className={`nav-pill flex-1 text-xs font-semibold ${formData.cleaningType === 'per_booking' ? 'nav-pill-active' : ''}`}
                        >
                          رسوم لكل حجز
                        </button>
                    </div>
                    {formData.cleaningType === 'per_booking' && (
                        <input type="number" placeholder="تكلفة التنظيف للحجز الواحد (مثال: 50)" className="input-field" value={formData.cleaningCost} onChange={(e) => setFormData({...formData, cleaningCost: e.target.value})} />
                    )}
                    {formData.cleaningType === 'salaried' && (
                        <p className="text-[10px] text-muted-soft">سيتم حساب التكلفة من راتب النظافة الشهري في الإعدادات العامة ولن يتم خصم رسوم تنظيف إضافية لهذه الوحدة عند الحجز.</p>
                    )}
                  </div>
                </div>
                                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">عمولات المنصات (لكل حجز)</label>
                    <div className="flex space-x-reverse space-x-2">
                        <input type="number" placeholder="العمولة" className="input-field w-2/3" value={formData.platformFee} onChange={(e) => setFormData({...formData, platformFee: e.target.value})} />
                        <select className="input-field w-1/3 px-2" value={formData.platformFeeType} onChange={(e) => setFormData({...formData, platformFeeType: e.target.value})}>
                            <option value="percentage">نسبة %</option>
                            <option value="fixed">مبلغ ثابت</option>
                        </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">مصاريف أخرى (لكل حجز)</label>
                    <div className="flex space-x-reverse space-x-2">
                        <input type="text" placeholder="الاسم (مثال: ضيافة)" className="input-field w-1/2 px-3" value={formData.otherExpenseLabel} onChange={(e) => setFormData({...formData, otherExpenseLabel: e.target.value})} />
                        <input type="number" placeholder="المبلغ" className="input-field w-1/2 px-3" value={formData.otherExpenseAmount} onChange={(e) => setFormData({...formData, otherExpenseAmount: e.target.value})} />
                    </div>
                  </div>
                </div>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full h-11 text-base mt-4">
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

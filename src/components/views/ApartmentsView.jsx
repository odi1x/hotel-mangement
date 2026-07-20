import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import { Home, Edit3, Trash2, Plus, X, ChevronRight, ChevronLeft, Image as ImageIcon, Share2, Copy, Check, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../ui/EmptyState';
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

  const itemsPerPage = 11;
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



      <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="scroll-scrim" />
        {apartments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="لا توجد وحدات بعد"
            subtitle="ابدأ ببناء قائمة الوحدات لديك. كل وحدة يمكن ربطها بالحجوزات والصيانة والأسعار الموسمية."
            variant="dashed"
            action={
              (user?.role === 'admin' || user?.permissions?.canEdit) && (
                <button onClick={() => handleOpenModal(null)} className="btn-accent h-10 px-5">
                  <Plus size={16} />
                  <span>إضافة أول وحدة</span>
                </button>
              )
            }
          />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-4">
        {paginatedApartments.map((apt) => {
          const isNotClean = apt.needsCleaning;
          const isBooked = isApartmentCurrentlyBooked(apt.id);
          return (
          <div key={apt.id} className="card-surface flex flex-col h-full relative group transition-all duration-200 hover:shadow-soft hover:-translate-y-0.5 overflow-hidden">
            {/* Image band — compact, supporting (this is an admin tool, not a listing) */}
            <div
                className="w-full aspect-[4/3] bg-surface-card dark:bg-surface-dark relative cursor-pointer overflow-hidden"
                onClick={() => handleOpenPhotoModal(apt)}
            >
                {apt.coverPhoto ? (
                    <>
                    <img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    {apt.images && apt.images.length > 1 && (
                      <div className="absolute bottom-3 left-3 bg-ink/70 text-white text-2xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                        <ImageIcon size={12} />
                        <span dir="ltr">+{apt.images.length - 1}</span>
                      </div>
                    )}
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-soft gap-1.5">
                        <ImageIcon size={20} className="opacity-40" />
                        <span className="text-xs font-medium">أضف صورة</span>
                    </div>
                )}

                {/* Operational status — leading edge (RTL: top-right).
                    Uses design-system .badge-* variants: dashed=attention,
                    solid=occupied, outline=available. Backdrop-blur retained
                    so the pills sit legibly over the cover photo. */}
                <div className="absolute top-3 right-3">
                  {isNotClean ? (
                    <span className="badge-pill badge-dashed backdrop-blur-sm bg-canvas/90 dark:bg-surface-dark/90">تحتاج تنظيف</span>
                  ) : isBooked ? (
                    <span className="badge-pill badge-solid backdrop-blur-sm bg-ink/90 dark:bg-white/90">مشغولة</span>
                  ) : (
                    <span className="badge-pill badge-outline backdrop-blur-sm bg-canvas/90 dark:bg-surface-dark/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                      متاحة
                    </span>
                  )}
                </div>

                {/* Edit / delete — trailing edge, on hover */}
                <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(apt); }}
                        className="p-1.5 rounded-md bg-canvas/95 text-muted hover:text-ink border border-hairline backdrop-blur-sm transition-colors"
                        title="تعديل"
                    >
                        <Edit3 size={15} />
                    </button>
                    )}
                    {(user?.role === 'admin' || user?.permissions?.canDelete) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }}
                        className="p-1.5 rounded-md bg-canvas/95 text-muted hover:text-ink border border-hairline backdrop-blur-sm transition-colors"
                        title="حذف"
                    >
                        <Trash2 size={15} />
                    </button>
                    )}
                </div>
            </div>

            {/* Body — name & price lead; type is a quiet eyebrow */}
            <div className="p-5 flex flex-col flex-1">
              <p className="text-xs font-semibold text-muted-soft mb-1">{apt.type}</p>
              <h3 className="text-lg font-bold tracking-tight text-ink dark:text-white leading-tight">{apt.name}</h3>
              {apt.description && (
                <p className="text-xs text-muted dark:text-body-dark mt-1 line-clamp-1">{apt.description}</p>
              )}

              <div className="mt-auto pt-4 flex items-end justify-between border-t border-hairline-soft dark:border-[#2a2825]">
                <div>
                  <p className="text-2xs text-muted-soft font-semibold mb-1">السعر الأساسي</p>
                  <p className="text-2xl font-bold tracking-tightest text-ink dark:text-white leading-none">{apt.basePrice} <span className="text-xs text-muted font-semibold">ر.س / ليلة</span></p>
                </div>
                {isNotClean && (
                  <button
                    onClick={() => handleToggleCleaningStatus(apt)}
                    className="text-xs font-semibold text-ink dark:text-white bg-canvas dark:bg-surface-dark border border-hairline dark:border-hairline-dark-soft hover:bg-surface-soft dark:hover:bg-hairline-dark px-3 py-1.5 rounded-md transition-colors shrink-0"
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
            className="group/add border border-dashed border-hairline dark:border-hairline-dark-soft rounded-lg flex flex-col items-center justify-center gap-3 text-muted hover:border-ink hover:text-ink dark:hover:border-white dark:hover:text-white transition-colors cursor-pointer bg-transparent min-h-[240px] h-full"
          >
            <div className="w-12 h-12 rounded-full bg-surface-card dark:bg-surface-dark-elevated flex items-center justify-center transition-colors group-hover/add:bg-accent group-hover/add:text-white"><Plus size={22} /></div>
            <span className="font-semibold text-sm">إضافة وحدة جديدة</span>
          </button>
        )}
      </div>
        )}
      {totalPages > 1 && (
        <div className="flex justify-center items-center py-4 border-t border-hairline-soft dark:border-hairline-dark shrink-0">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end p-0 md:items-center md:justify-center md:p-4" dir="rtl">
          <form onSubmit={handleSave} className="bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft border border-hairline dark:border-hairline-dark-soft w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* header */}
            <div className="p-5 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center"><Home size={20} /></div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-ink dark:text-white leading-none mb-1">{editingId ? 'تعديل بيانات الوحدة' : 'إضافة وحدة جديدة'}</h2>
                  <p className="text-xs text-muted dark:text-body-dark">المعلومات، الصور، والتكاليف التشغيلية.</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="icon-action"><X size={20} /></button>
            </div>

            {/* scrollable body */}
            <div className="overflow-y-auto p-6 space-y-8 flex-1">
              {/* Basic info */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold text-muted dark:text-body-dark uppercase tracking-widest border-b border-hairline-soft dark:border-hairline-dark pb-2">المعلومات الأساسية</h3>
                <div>
                  <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">اسم / رقم الوحدة</label>
                  <input required type="text" placeholder="مثال: شقة 101" className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">النوع</label>
                    <select className="input-field" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                      {customTypes.map((t, idx) => (<option key={idx} value={t}>{t}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">السعر الأساسي</label>
                    <div className="relative">
                      <input required type="number" placeholder="200" className="input-field font-semibold pl-12" value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })} />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-soft font-medium pointer-events-none">ر.س</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">ملاحظات / وصف</label>
                  <textarea className="input-field h-24 resize-none" placeholder="وصف الشقة أو ملاحظات داخلية..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">ترخيص السياحة (اختياري)</label>
                  <select className="input-field" value={formData.licenseId} onChange={(e) => setFormData({ ...formData, licenseId: e.target.value })}>
                    <option value="">بدون ترخيص محدد</option>
                    {licenses.map(l => (<option key={l.id} value={l.id}>{l.licenseNumber}</option>))}
                  </select>
                </div>
              </section>

              {/* Images */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold text-muted dark:text-body-dark uppercase tracking-widest border-b border-hairline-soft dark:border-hairline-dark pb-2">صور الوحدة</h3>
                <div className="border border-dashed border-hairline dark:border-hairline-dark-soft rounded-lg p-6 text-center hover:bg-surface-soft dark:hover:bg-surface-dark-elevated hover:border-accent transition-colors relative">
                  <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={isUploading} />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className={`w-11 h-11 rounded-full bg-surface-card dark:bg-surface-dark-elevated flex items-center justify-center ${isUploading ? 'animate-pulse' : ''}`}>
                      <ImageIcon size={22} className="text-muted" />
                    </div>
                    <p className="font-semibold text-body dark:text-body-dark text-sm">{isUploading ? 'جاري الرفع...' : 'اسحب الصور هنا أو اضغط للتصفح'}</p>
                    <p className="text-xs text-muted-soft">أول صورة تصبح الغلاف تلقائياً — يمكنك تغييرها بالمرور على أي صورة.</p>
                  </div>
                </div>
                {formData.images && formData.images.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {formData.images.map((url, idx) => {
                      const isCover = formData.coverPhoto === url;
                      return (
                        <div key={idx} className={`group/img relative aspect-square rounded-lg overflow-hidden ${isCover ? 'ring-2 ring-accent' : 'ring-1 ring-hairline dark:ring-hairline-dark-soft'}`}>
                          <img src={url} className="w-full h-full object-cover" alt="preview" />
                          <button type="button" onClick={() => removeImage(url)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80">
                            <X size={12} />
                          </button>
                          {isCover ? (
                            <div className="absolute bottom-0 inset-x-0 bg-accent text-white text-2xs font-semibold py-1 text-center">الغلاف</div>
                          ) : (
                            <button type="button" onClick={() => setFormData({ ...formData, coverPhoto: url })} className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-2xs py-1 text-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                              تعيين كغلاف
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Financials (collapsible) */}
              <section>
                <button type="button" onClick={() => setShowAdvancedFinancials(!showAdvancedFinancials)}
                  className="w-full flex justify-between items-center text-xs font-semibold text-muted dark:text-body-dark uppercase tracking-widest border-b border-hairline-soft dark:border-hairline-dark pb-2">
                  <span>التكاليف والمالية (إعدادات متقدمة)</span>
                  <ChevronLeft size={16} className={`transition-transform ${showAdvancedFinancials ? '-rotate-90' : ''}`} />
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${showAdvancedFinancials ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-4 bg-surface-soft dark:bg-surface-dark-elevated/50 border border-hairline-soft dark:border-hairline-dark rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">تكلفة الإيجار</label>
                        <div className="flex space-x-reverse space-x-2">
                          <input type="number" placeholder="المبلغ" className="input-field w-2/3" value={formData.rentCost} onChange={(e) => setFormData({ ...formData, rentCost: e.target.value })} />
                          <select className="input-field w-1/3 px-2" value={formData.rentPeriod} onChange={(e) => setFormData({ ...formData, rentPeriod: e.target.value })}>
                            <option value="monthly">شهري</option>
                            <option value="yearly">سنوي</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">نوع النظافة والتكلفة</label>
                        <div className="nav-pill-group w-full mb-3">
                          <button type="button" onClick={() => setFormData({ ...formData, cleaningType: 'salaried' })} className={`nav-pill flex-1 text-xs font-semibold ${formData.cleaningType === 'salaried' ? 'nav-pill-active' : ''}`}>موظف براتب</button>
                          <button type="button" onClick={() => setFormData({ ...formData, cleaningType: 'per_booking' })} className={`nav-pill flex-1 text-xs font-semibold ${formData.cleaningType === 'per_booking' ? 'nav-pill-active' : ''}`}>رسوم لكل حجز</button>
                        </div>
                        {formData.cleaningType === 'per_booking' && (
                          <input type="number" placeholder="تكلفة التنظيف للحجز (مثال: 50)" className="input-field" value={formData.cleaningCost} onChange={(e) => setFormData({ ...formData, cleaningCost: e.target.value })} />
                        )}
                        {formData.cleaningType === 'salaried' && (
                          <p className="text-2xs text-muted-soft leading-relaxed">تُحتسب التكلفة من راتب النظافة الشهري في الإعدادات العامة، ولن تُخصم رسوم تنظيف إضافية لهذه الوحدة عند الحجز.</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">عمولات المنصات (لكل حجز)</label>
                        <div className="flex space-x-reverse space-x-2">
                          <input type="number" placeholder="العمولة" className="input-field w-2/3" value={formData.platformFee} onChange={(e) => setFormData({ ...formData, platformFee: e.target.value })} />
                          <select className="input-field w-1/3 px-2" value={formData.platformFeeType} onChange={(e) => setFormData({ ...formData, platformFeeType: e.target.value })}>
                            <option value="percentage">نسبة %</option>
                            <option value="fixed">مبلغ ثابت</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">مصاريف أخرى (لكل حجز)</label>
                        <div className="flex space-x-reverse space-x-2">
                          <input type="text" placeholder="الاسم (مثال: ضيافة)" className="input-field w-1/2 px-3" value={formData.otherExpenseLabel} onChange={(e) => setFormData({ ...formData, otherExpenseLabel: e.target.value })} />
                          <input type="number" placeholder="المبلغ" className="input-field w-1/2 px-3" value={formData.otherExpenseAmount} onChange={(e) => setFormData({ ...formData, otherExpenseAmount: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* sticky footer */}
            <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark shrink-0 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary h-11 px-6">إلغاء</button>
              <button type="submit" className="btn-primary flex-1 h-11 text-base">{editingId ? 'تحديث البيانات' : 'حفظ الوحدة'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
    </div>
  );
}

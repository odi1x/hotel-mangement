import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';
import { Home, Edit3, Trash2, Plus, X, ChevronRight, ChevronLeft, Image as ImageIcon, Share2, Copy, Check, Building2, ArrowDownCircle, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../ui/EmptyState';
import ShareLinkModal from '../ui/ShareLinkModal';
export default function ApartmentsView({ setView }) {
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
  const [search, setSearch] = useState('');

  // Public booking URL — computed inline so the mobile Share button
  // in this view can pass it to ShareLinkModal. Isolated from Layout's
  // desktop instance (they render the same modal component with the
  // same data, just triggered independently).
  const [isShareOpen, setIsShareOpen] = useState(false);
  const shareableLink = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${user?.adminId || user?.id}`
    : '';

  const itemsPerPage = 11;
  const [formData, setFormData] = useState({
      name: '', type: defaultType, description: '', basePrice: '',
      cleaningFeePerStay: '',
      platformFeeType: 'percentage', platformFee: '',
      licenseId: ''
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
          cleaningFeePerStay: apt.cleaningFeePerStay || '',
          platformFeeType: apt.platformFeeType || 'percentage',
          platformFee: apt.platformFee || '',
          licenseId: apt.licenseId || ''
      });
      setEditingId(apt.id);
    } else {
      setFormData({
          name: '', type: defaultType, description: '', basePrice: '',
          cleaningFeePerStay: '',
          platformFeeType: 'percentage', platformFee: '',
          licenseId: ''
      });
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
  const filteredApartments = apartments.filter(a => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (a.name || '').toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredApartments.length / itemsPerPage);
  const clampedPage = Math.min(currentPage, totalPages || 1);
  const paginatedApartments = filteredApartments.slice(
    (clampedPage - 1) * itemsPerPage,
    clampedPage * itemsPerPage
  );
  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">

      {/* Mobile-only share button. Opens ShareLinkModal (same component
          the desktop Share button opens). Sits above the grid, only for
          admin + canBook. Clean icon+label button — no ugly inline card. */}
      {(user?.role === 'admin' || user?.permissions?.canBook) && (
        <button
          onClick={() => setIsShareOpen(true)}
          className="md:hidden inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-canvas dark:bg-surface-dark-elevated border border-hairline dark:border-hairline-dark-soft text-body dark:text-body-dark hover:text-ink dark:hover:text-white transition-colors text-sm font-semibold mb-3 shrink-0 self-start"
        >
          <Share2 size={15} />
          <span>مشاركة رابط الحجز</span>
        </button>
      )}

      {/* Search — filters the grid by unit name or type. Compact field,
          same pattern as the maintenance/expenses toolbars. */}
      <div className="relative w-full sm:w-72 shrink-0 mb-4 md:mb-5">
        <input
          type="text"
          placeholder="ابحث بالاسم أو النوع..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10 pr-4 py-2 w-full"
        />
        <Search size={16} className="absolute left-3 top-2.5 text-muted-soft" />
      </div>

      <div className="flex-1 overflow-y-auto pt-2 md:pt-0 pb-24 md:pb-0">
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
        ) : filteredApartments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="لا توجد نتائج مطابقة"
            subtitle="جرّب تعديل مصطلح البحث."
            variant="dashed"
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

                {/* Edit / delete — trailing edge. Always visible on mobile
                    (touch devices don't hover); revealed on hover on desktop. */}
                <div className="absolute top-3 left-3 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(apt); }}
                        className="p-2 md:p-1.5 rounded-md bg-canvas/95 dark:bg-surface-dark-elevated/95 text-ink dark:text-white hover:text-accent border border-hairline dark:border-hairline-dark-soft backdrop-blur-sm transition-colors"
                        title="تعديل"
                    >
                        <Edit3 size={15} />
                    </button>
                    )}
                    {(user?.role === 'admin' || user?.permissions?.canDelete) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }}
                        className="p-2 md:p-1.5 rounded-md bg-canvas/95 dark:bg-surface-dark-elevated/95 text-ink dark:text-white hover:text-accent border border-hairline dark:border-hairline-dark-soft backdrop-blur-sm transition-colors"
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
              onClick={() => setCurrentPage(Math.max(1, clampedPage - 1))}
              disabled={clampedPage === 1}
              className="nav-pill disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
            <span className="nav-pill nav-pill-active text-sm font-semibold">
              صفحة {clampedPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, clampedPage + 1))}
              disabled={clampedPage === totalPages}
              className="nav-pill disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      )}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active dir="rtl">
          <form onSubmit={handleSave} className="bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft border border-hairline dark:border-hairline-dark-soft w-full max-w-2xl overflow-hidden anim-sheet flex flex-col max-h-[90vh]">
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

              {/* Pricing (collapsible) — per-booking fees only. Fixed monthly
                  costs like rent and salaried cleaning moved to the Expenses
                  tab in Phase 2. */}
              <section>
                <button type="button" onClick={() => setShowAdvancedFinancials(!showAdvancedFinancials)}
                  className="w-full flex justify-between items-center text-xs font-semibold text-muted dark:text-body-dark uppercase tracking-widest border-b border-hairline-soft dark:border-hairline-dark pb-2">
                  <span>التسعير والرسوم لكل حجز</span>
                  <ChevronLeft size={16} className={`transition-transform ${showAdvancedFinancials ? '-rotate-90' : ''}`} />
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${showAdvancedFinancials ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-4 bg-surface-soft dark:bg-surface-dark-elevated/50 border border-hairline-soft dark:border-hairline-dark rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5">رسوم التنظيف لكل حجز</label>
                        <input
                          type="number"
                          placeholder="مثال: 50"
                          className="input-field w-full"
                          value={formData.cleaningFeePerStay}
                          onChange={(e) => setFormData({ ...formData, cleaningFeePerStay: e.target.value })}
                        />
                        <p className="text-2xs text-muted-soft leading-relaxed mt-1.5">
                          يُضاف تلقائياً لكل حجز. إن كان لديك عامل نظافة براتب شهري، سجّله كمصروف متكرر في تبويب المصروفات بدلاً من هنا.
                        </p>
                      </div>
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
                    </div>

                    {/* Link to filtered expenses for this unit. Only rendered
                        when editing an existing apartment (creating one → no
                        id yet, nothing to filter by). */}
                    {editingId && (
                      <div className="pt-3 border-t border-hairline-soft dark:border-hairline-dark-soft">
                        <button
                          type="button"
                          onClick={() => {
                            setIsModalOpen(false);
                            if (typeof setView === 'function') {
                              setView('expenses', { apartmentId: editingId });
                            }
                          }}
                          className="flex items-center justify-between w-full p-3 rounded-lg border border-hairline dark:border-hairline-dark-soft hover:bg-surface-card dark:hover:bg-surface-dark transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ArrowDownCircle size={16} className="text-muted dark:text-body-dark shrink-0" />
                            <div className="text-right min-w-0">
                              <p className="text-sm font-semibold text-ink dark:text-white leading-tight">
                                شاهد مصروفات هذه الوحدة
                              </p>
                              <p className="text-2xs text-muted-soft mt-0.5">
                                إيجار، صيانة، مستلزمات — كل ما يخص هذه الوحدة
                              </p>
                            </div>
                          </div>
                          <ChevronLeft size={16} className="text-muted-soft group-hover:text-ink dark:group-hover:text-white transition-colors shrink-0" />
                        </button>
                      </div>
                    )}
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
      , document.body)}

      {isShareOpen && (
        <ShareLinkModal
          link={shareableLink}
          businessName={user?.businessName || user?.name}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </div>
    </div>
  );
}

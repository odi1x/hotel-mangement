import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ImageUpload from './ImageUpload';

export default function StaffFormModal({ staff, onClose, onSuccess }) {
  const isEditing = !!staff;
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: staff?.username || '',
    password: '',
    name: staff?.name || '',
    profilePicture: staff?.profilePicture || null,
    canBook:            staff ? staff.canBook            : true,
    canEdit:            staff ? staff.canEdit            : false,
    canDelete:          staff ? staff.canDelete          : false,
    canViewAnalytics:   staff ? staff.canViewAnalytics   : false,
    canViewSettings:    staff ? staff.canViewSettings    : false,
    canViewBalances:    staff ? staff.canViewBalances    : true,   // operational — staff usually record payments
    canViewMaintenance: staff ? staff.canViewMaintenance : true,   // operational — staff report issues from the field
    canViewPricing:     staff ? staff.canViewPricing     : false,  // sensitive — reveals pricing strategy
    canViewPrices:      staff ? staff.canViewPrices      : true,   // if turned off: receptionist mode (no prices in bookings/residents)
    canClean:           staff ? staff.canClean           : false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        // If editing, only send password if it's changed
        const dataToUpdate = { ...formData };
        if (!dataToUpdate.password) {
          delete dataToUpdate.password;
        }
        await axios.put(`/api/staff?id=${staff.id}`, dataToUpdate);
        toast.success('تم تحديث بيانات الموظف بنجاح');
      } else {
        if (!formData.password) {
          toast.error('كلمة المرور مطلوبة للموظف الجديد');
          setLoading(false);
          return;
        }
        await axios.post('/api/staff', formData);
        toast.success('تمت إضافة الموظف بنجاح');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ بيانات الموظف');
    } finally {
      setLoading(false);
    }
  };

  const permissions = [
    { name: 'canBook',            title: 'إضافة حجوزات',        desc: 'يسمح للموظف بإنشاء حجوزات جديدة' },
    { name: 'canEdit',            title: 'تعديل البيانات',       desc: 'تعديل الشقق وتفاصيل الحجوزات القائمة' },
    { name: 'canDelete',          title: 'حذف البيانات',         desc: 'حذف الحجوزات والشقق والنزلاء' },
    { name: 'canViewPrices',      title: 'عرض الأسعار',          desc: 'رؤية الأسعار الليلية والإجماليات في سجل النزلاء وتفاصيل الحجوزات. أوقفه للاستقبال والموظفين الذين لا يجب أن يرَوا المبالغ.' },
    { name: 'canViewBalances',    title: 'إدارة المستحقات',      desc: 'تسجيل الدفعات ومراجعة الأرصدة المتبقية على الحجوزات' },
    { name: 'canViewMaintenance', title: 'إدارة الصيانة',         desc: 'تسجيل بلاغات الصيانة ومتابعة حالتها حتى الحل' },
    { name: 'canViewPricing',     title: 'إدارة الأسعار الموسمية', desc: 'إنشاء وتعديل قواعد الأسعار للمواسم والفترات الخاصة' },
    { name: 'canViewAnalytics',   title: 'عرض الإحصائيات',        desc: 'الوصول إلى تقارير الأداء المالي والتحليلات' },
    { name: 'canViewSettings',    title: 'إدارة الإعدادات',       desc: 'الوصول لإعدادات النظام العامة (باستثناء الموظفين)' },
    { name: 'canClean',           title: 'قسم التنظيف',           desc: 'الوصول إلى تبويب التنظيف وإنهاء مهام تنظيف الوحدات' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active dir="rtl">
      <div className="bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl anim-sheet w-full max-w-2xl shadow-soft border border-hairline dark:border-hairline-dark-soft overflow-hidden flex flex-col max-h-[90vh]">
        <div className="sheet-handle" />

        <div className="p-5 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white">
            {isEditing ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </h2>
          <button
            onClick={onClose}
            className="icon-action"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="staff-form" onSubmit={handleSubmit} className="space-y-6">

            <div className="flex flex-col items-center mb-6">
              <label className="block text-sm font-semibold text-body dark:text-body-dark mb-3">صورة الموظف (اختياري)</label>
              <ImageUpload
                onUploadSuccess={url => setFormData(prev => ({ ...prev, profilePicture: url }))}
                currentImage={formData.profilePicture}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-body dark:text-body-dark mb-1.5">الاسم الكامل *</label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-body dark:text-body-dark mb-1.5">اسم المستخدم * (للدخول)</label>
                <input
                  required
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-field"
                  dir="ltr"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-body dark:text-body-dark mb-1.5">
                  كلمة المرور {isEditing && <span className="text-muted-soft font-normal">(اتركها فارغة إذا لم ترد تغييرها)</span>}
                  {!isEditing && <span className="text-ink dark:text-white">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!isEditing}
                    className="input-field pl-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink dark:text-body-dark dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-hairline dark:border-hairline-dark pt-6">
              <h3 className="text-lg font-semibold tracking-tight text-ink dark:text-white mb-4">صلاحيات الموظف</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {permissions.map(perm => (
                  <label key={perm.name} className="flex items-center p-3 rounded-md border border-hairline dark:border-hairline-dark-soft cursor-pointer hover:bg-surface-soft dark:hover:bg-surface-dark-elevated transition-colors">
                    <input
                      type="checkbox"
                      name={perm.name}
                      checked={formData[perm.name]}
                      onChange={handleChange}
                      className="w-5 h-5 accent-black rounded ml-3"
                    />
                    <div>
                      <div className="font-semibold text-ink dark:text-white">{perm.title}</div>
                      <div className="text-xs text-muted dark:text-body-dark">{perm.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

          </form>
        </div>

        <div className="p-5 border-t border-hairline-soft dark:border-hairline-dark flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="staff-form"
            disabled={loading}
            className="btn-primary"
          >
            <Save size={18} />
            <span>{loading ? 'جاري الحفظ...' : 'حفظ'}</span>
          </button>
        </div>

      </div>
    </div>
  ,
    document.body
  );
}

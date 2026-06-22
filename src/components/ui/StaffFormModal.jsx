import { useState } from 'react';
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
    canBook: staff ? staff.canBook : true,
    canEdit: staff ? staff.canEdit : false,
    canDelete: staff ? staff.canDelete : false,
    canViewAnalytics: staff ? staff.canViewAnalytics : false,
    canViewSettings: staff ? staff.canViewSettings : false
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {isEditing ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="staff-form" onSubmit={handleSubmit} className="space-y-6">

            <div className="flex flex-col items-center mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">صورة الموظف (اختياري)</label>
              <ImageUpload
                onUploadSuccess={url => setFormData(prev => ({ ...prev, profilePicture: url }))}
                currentImage={formData.profilePicture}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">اسم المستخدم * (للدخول)</label>
                <input
                  required
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
                  dir="ltr"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  كلمة المرور {isEditing && <span className="text-gray-400 font-normal">(اتركها فارغة إذا لم ترد تغييرها)</span>}
                  {!isEditing && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!isEditing}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 dark:border-slate-800 pt-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4">صلاحيات الموظف</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    name="canBook"
                    checked={formData.canBook}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 ml-3"
                  />
                  <div>
                    <div className="font-bold text-gray-800 dark:text-slate-200">إضافة حجوزات</div>
                    <div className="text-xs text-gray-500">يسمح للموظف بإنشاء حجوزات جديدة</div>
                  </div>
                </label>

                <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    name="canEdit"
                    checked={formData.canEdit}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 ml-3"
                  />
                  <div>
                    <div className="font-bold text-gray-800 dark:text-slate-200">تعديل البيانات</div>
                    <div className="text-xs text-gray-500">تعديل الشقق وتفاصيل الحجوزات القائمة</div>
                  </div>
                </label>

                <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    name="canDelete"
                    checked={formData.canDelete}
                    onChange={handleChange}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 ml-3"
                  />
                  <div>
                    <div className="font-bold text-gray-800 dark:text-slate-200">حذف البيانات</div>
                    <div className="text-xs text-gray-500">حذف الحجوزات والشقق والنزلاء</div>
                  </div>
                </label>

                <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    name="canViewAnalytics"
                    checked={formData.canViewAnalytics}
                    onChange={handleChange}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 ml-3"
                  />
                  <div>
                    <div className="font-bold text-gray-800 dark:text-slate-200">عرض الإحصائيات</div>
                    <div className="text-xs text-gray-500">الوصول إلى تقارير الأداء المالي والتحليلات</div>
                  </div>
                </label>

                <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    name="canViewSettings"
                    checked={formData.canViewSettings}
                    onChange={handleChange}
                    className="w-5 h-5 text-gray-600 rounded focus:ring-gray-500 ml-3"
                  />
                  <div>
                    <div className="font-bold text-gray-800 dark:text-slate-200">إدارة الإعدادات</div>
                    <div className="text-xs text-gray-500">الوصول لإعدادات النظام العامة (باستثناء الموظفين)</div>
                  </div>
                </label>
              </div>
            </div>

          </form>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="staff-form"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Save size={18} />
            <span>{loading ? 'جاري الحفظ...' : 'حفظ'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
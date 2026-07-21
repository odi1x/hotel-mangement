import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Save } from 'lucide-react';
import ImageUpload from '../ui/ImageUpload';
import toast from 'react-hot-toast';

export default function ProfileSettingsModal({ onClose }) {
  const { user, updateProfile, changePassword } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ name, profilePicture });
      toast.success('تم تحديث الملف الشخصي بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء التحديث');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('كلمات المرور الجديدة غير متطابقة');
    }
    if (newPassword.length < 6) {
      return toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm items-end p-0 md:items-center md:justify-center md:p-4" dir="rtl">
      <div className="bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 w-full max-w-xl shadow-soft border border-hairline dark:border-hairline-dark-soft overflow-hidden flex flex-col max-h-[90vh]">
        <div className="sheet-handle" />

        <div className="p-4 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white">إعدادات الحساب الشخصي</h2>
          <button
            onClick={onClose}
            className="icon-action"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">

          <form onSubmit={handleUpdateProfile} className="space-y-6 bg-surface-card dark:bg-surface-dark-elevated p-6 rounded-lg">
            <h3 className="text-lg font-semibold tracking-tight text-ink dark:text-white border-b pb-2 border-hairline dark:border-hairline-dark-soft">المعلومات الأساسية</h3>

            <div className="flex flex-col items-center">
              <label className="block text-sm font-semibold text-body dark:text-body-dark mb-3">الصورة الشخصية</label>
              <ImageUpload
                onUploadSuccess={url => setProfilePicture(url)}
                currentImage={profilePicture}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">الاسم الكامل</label>
              <input
                required
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                <Save size={18} />
                <span>{loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
              </button>
            </div>
          </form>

          <form onSubmit={handleChangePassword} className="space-y-6 bg-surface-card dark:bg-surface-dark-elevated p-6 rounded-lg">
            <h3 className="text-lg font-semibold tracking-tight text-ink dark:text-white border-b pb-2 border-hairline dark:border-hairline-dark-soft">تغيير كلمة المرور</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">كلمة المرور الحالية</label>
                <input
                  required
                  type="password"
                  className="input-field"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">كلمة المرور الجديدة</label>
                <input
                  required
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">تأكيد كلمة المرور الجديدة</label>
                <input
                  required
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="btn-secondary"
              >
                <Save size={18} />
                <span>{passwordLoading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

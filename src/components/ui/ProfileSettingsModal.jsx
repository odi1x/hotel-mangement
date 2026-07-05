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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="p-4 border-b border-hairline-soft dark:border-slate-800 flex justify-between items-center bg-canvas/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">إعدادات الحساب الشخصي</h2>
          <button
            onClick={onClose}
            className="p-2 text-muted font-zain hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">

          <form onSubmit={handleUpdateProfile} className="space-y-6 bg-canvas dark:bg-slate-800/50 p-6 rounded-lg border border-hairline-soft dark:border-slate-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200 border-b pb-2 border-hairline dark:border-slate-700">المعلومات الأساسية</h3>

            <div className="flex flex-col items-center">
              <label className="block text-sm font-semibold text-ink font-zain dark:text-slate-300 mb-3">الصورة الشخصية</label>
              <ImageUpload
                onUploadSuccess={url => setProfilePicture(url)}
                currentImage={profilePicture}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink font-zain dark:text-slate-300 mb-2">الاسم الكامل</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 border border-hairline dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-0 focus:border-ink focus:border"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold font-zain transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                <span>{loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
              </button>
            </div>
          </form>

          <form onSubmit={handleChangePassword} className="space-y-6 bg-canvas dark:bg-slate-800/50 p-6 rounded-lg border border-hairline-soft dark:border-slate-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200 border-b pb-2 border-hairline dark:border-slate-700">تغيير كلمة المرور</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink font-zain dark:text-slate-300 mb-2">كلمة المرور الحالية</label>
                <input
                  required
                  type="password"
                  className="w-full px-4 py-2.5 border border-hairline dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-0 focus:border-ink focus:border"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink font-zain dark:text-slate-300 mb-2">كلمة المرور الجديدة</label>
                <input
                  required
                  type="password"
                  className="w-full px-4 py-2.5 border border-hairline dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-0 focus:border-ink focus:border"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink font-zain dark:text-slate-300 mb-2">تأكيد كلمة المرور الجديدة</label>
                <input
                  required
                  type="password"
                  className="w-full px-4 py-2.5 border border-hairline dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-0 focus:border-ink focus:border"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-semibold font-zain transition-colors disabled:opacity-50"
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
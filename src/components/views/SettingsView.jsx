import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save, Lock } from 'lucide-react';

export default function SettingsView() {
  const { user, updateProfile, changePassword } = useAuth();

  const [formData, setFormData] = useState({
    businessName: '',
    tourismLicense: '',
    logoUrl: '',
    stampUrl: '',
    customTerms: '',
    taxEnabled: false,
    taxPercentage: '',
    apartmentTypes: 'غرفة,غرفة وصالة,غرفتين وصالة'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccessMsg, setPwdSuccessMsg] = useState('');
  const [pwdErrorMsg, setPwdErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        businessName: user.businessName || '',
        tourismLicense: user.tourismLicense || '',
        logoUrl: user.logoUrl || '',
        stampUrl: user.stampUrl || '',
        customTerms: user.customTerms || '',
        taxEnabled: user.taxEnabled || false,
        taxPercentage: user.taxPercentage || '',
        apartmentTypes: user.apartmentTypes || 'غرفة,غرفة وصالة,غرفتين وصالة'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    try {
      await updateProfile(formData);
      setSuccessMsg('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdSuccessMsg('');
    setPwdErrorMsg('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPwdErrorMsg('كلمة المرور الجديدة غير متطابقة');
      setPwdLoading(false);
      return;
    }

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPwdSuccessMsg('تم تغيير كلمة المرور بنجاح');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error(error);
      setPwdErrorMsg('فشل في تغيير كلمة المرور. تحقق من كلمة المرور الحالية.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-4">إعدادات المنشأة</h2>

        {successMsg && (
          <div className="mb-6 bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium border border-green-200">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">اسم المنشأة / العقار</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="مثال: فنادق السعادة"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">رقم رخصة السياحة / السجل التجاري</label>
              <input
                type="text"
                name="tourismLicense"
                value={formData.tourismLicense}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="مثال: 1234567890"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">شعار المنشأة (للطباعة)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'logoUrl')}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              {formData.logoUrl && <img src={formData.logoUrl} alt="Logo preview" className="mt-2 h-16 object-contain" />}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">الختم / التوقيع (للطباعة)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'stampUrl')}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              {formData.stampUrl && <img src={formData.stampUrl} alt="Stamp preview" className="mt-2 h-16 object-contain" />}
            </div>
          </div>

          <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-gray-50 dark:bg-slate-800/50">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                name="taxEnabled"
                id="taxEnabled"
                checked={formData.taxEnabled}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 ml-3"
              />
              <label htmlFor="taxEnabled" className="text-sm font-bold text-gray-700 dark:text-slate-300">تفعيل ضريبة القيمة المضافة / رسوم البلدية</label>
            </div>

            {formData.taxEnabled && (
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">النسبة المئوية (%)</label>
                <input
                  type="number"
                  name="taxPercentage"
                  value={formData.taxPercentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="15"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">الشروط والأحكام المخصصة (تظهر في العقد)</label>
            <textarea
              name="customTerms"
              value={formData.customTerms}
              onChange={handleChange}
              rows="4"
              className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="أدخل الشروط والأحكام الخاصة بمنشأتك هنا..."
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">أنواع الوحدات المتاحة</label>
            <p className="text-xs text-gray-500 mb-2">قم بفصل الأنواع بفاصلة (مثال: غرفة مفردة,جناح,شقة عائلية)</p>
            <textarea
              name="apartmentTypes"
              value={formData.apartmentTypes}
              onChange={handleChange}
              rows="2"
              className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="غرفة,غرفة وصالة,غرفتين وصالة"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-reverse space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
          >
            <Save size={18} />
            <span className="mr-2">{loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-4">تغيير كلمة المرور</h2>

        {pwdSuccessMsg && (
          <div className="mb-6 bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium border border-green-200">
            {pwdSuccessMsg}
          </div>
        )}

        {pwdErrorMsg && (
          <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200">
            {pwdErrorMsg}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">كلمة المرور الحالية</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">كلمة المرور الجديدة</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
              className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={pwdLoading}
            className="flex items-center space-x-reverse space-x-2 bg-gray-800 hover:bg-gray-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
          >
            <Lock size={18} />
            <span className="mr-2">{pwdLoading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
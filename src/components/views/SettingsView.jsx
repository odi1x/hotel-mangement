import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save } from 'lucide-react';

export default function SettingsView() {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    businessName: '',
    tourismLicense: ''
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        businessName: user.businessName || '',
        tourismLicense: user.tourismLicense || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  return (
    <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">إعدادات المنشأة</h2>

      {successMsg && (
        <div className="mb-6 bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium border border-green-200">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
  );
}
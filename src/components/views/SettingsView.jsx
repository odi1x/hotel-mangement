import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Save, Plus, Trash2, Settings, Shield } from 'lucide-react';
import StaffManagement from './settings/StaffManagement';

export default function SettingsView() {
  const { user, updateProfile } = useAuth();
  const { apartments, licenses, addLicense, deleteLicense } = useData();
  const [activeTab, setActiveTab] = useState('general');

  const [formData, setFormData] = useState({
    businessName: '',
    tourismLicense: '',
    logoUrl: '',
    stampUrl: '',
    customTerms: '',
    taxEnabled: false,
    taxPercentage: '',
    apartmentTypes: 'غرفة,غرفة وصالة,غرفتين وصالة',
    bookingSources: 'زيارة مباشرة,Booking.com,Airbnb',
    cleanerSalary: '',
    cleanerScope: '',
    generalExpenses: ''
  });

  const [apartmentTypesList, setApartmentTypesList] = useState(['غرفة', 'غرفة وصالة', 'غرفتين وصالة']);
  const [newApartmentType, setNewApartmentType] = useState('');

  const [bookingSourcesList, setBookingSourcesList] = useState(['زيارة مباشرة', 'Booking.com', 'Airbnb']);
  const [newBookingSource, setNewBookingSource] = useState('');
  const [newLicenseNumber, setNewLicenseNumber] = useState('');

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

  // Restrict access for non-admins if they don't have permission
  if (user?.role !== 'admin' && !user?.permissions?.canViewSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-slate-400">
        <Shield size={48} className="mb-4 text-gray-300 dark:text-slate-600" />
        <h2 className="text-xl font-bold">عذراً، ليس لديك صلاحية</h2>
        <p>يرجى التواصل مع مدير النظام للوصول إلى هذه الصفحة.</p>
      </div>
    );
  }

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
        apartmentTypes: user.apartmentTypes || 'غرفة,غرفة وصالة,غرفتين وصالة',
        bookingSources: user.bookingSources || 'زيارة مباشرة,Booking.com,Airbnb',
        cleanerSalary: user.cleanerSalary || '',
        cleanerScope: user.cleanerScope || '',
        generalExpenses: user.generalExpenses || ''
      });
      setApartmentTypesList(user.apartmentTypes ? user.apartmentTypes.split(',').map(s => s.trim()).filter(Boolean) : ['غرفة', 'غرفة وصالة', 'غرفتين وصالة']);
      setBookingSourcesList(user.bookingSources ? user.bookingSources.split(',').map(s => s.trim()).filter(Boolean) : ['زيارة مباشرة', 'Booking.com', 'Airbnb']);
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

  const handleAddLicense = () => {
    if (newLicenseNumber.trim()) {
      addLicense(newLicenseNumber.trim());
      setNewLicenseNumber('');
    }
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

  const handleAddApartmentType = () => {
    if (newApartmentType.trim() && !apartmentTypesList.includes(newApartmentType.trim())) {
      const updatedList = [...apartmentTypesList, newApartmentType.trim()];
      setApartmentTypesList(updatedList);
      setFormData({ ...formData, apartmentTypes: updatedList.join(',') });
      setNewApartmentType('');
    }
  };

  const handleRemoveApartmentType = (typeToRemove) => {
    const updatedList = apartmentTypesList.filter(type => type !== typeToRemove);
    setApartmentTypesList(updatedList);
    setFormData({ ...formData, apartmentTypes: updatedList.join(',') });
  };

  const handleAddBookingSource = () => {
    if (newBookingSource.trim() && !bookingSourcesList.includes(newBookingSource.trim())) {
      const updatedList = [...bookingSourcesList, newBookingSource.trim()];
      setBookingSourcesList(updatedList);
      setFormData({ ...formData, bookingSources: updatedList.join(',') });
      setNewBookingSource('');
    }
  };

  const handleRemoveBookingSource = (sourceToRemove) => {
    const updatedList = bookingSourcesList.filter(source => source !== sourceToRemove);
    setBookingSourcesList(updatedList);
    setFormData({ ...formData, bookingSources: updatedList.join(',') });
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
    <div className="max-w-5xl space-y-8 pb-12">

      {user?.role === 'admin' && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800 pb-px">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-colors flex items-center gap-2 ${
              activeTab === 'general'
                ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Settings size={18} />
            إعدادات المنشأة
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-colors flex items-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Shield size={18} />
            إدارة الموظفين
          </button>
        </div>
      )}

      {activeTab === 'staff' && user?.role === 'admin' ? (
        <StaffManagement />
      ) : (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-4">إعدادات المنشأة العامة</h2>

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
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">أرقام التراخيص (تراخيص السياحة)</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newLicenseNumber}
                  onChange={(e) => setNewLicenseNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLicense())}
                  className="flex-1 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="أضف رقم ترخيص جديد"
                />
                <button
                  type="button"
                  onClick={handleAddLicense}
                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-4 py-2 rounded-xl font-bold transition-colors flex items-center justify-center"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {licenses.map((license) => (
                  <div key={license.id} className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
                    <span className="text-sm font-medium">{license.licenseNumber}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا الترخيص؟')) {
                          deleteLicense(license.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {licenses.length === 0 && <span className="text-sm text-gray-500">لا توجد تراخيص مضافة</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-black text-gray-800 dark:text-slate-100 mb-4 border-b pb-2 border-gray-200 dark:border-slate-600">التكاليف والمصروفات التشغيلية (شهرياً)</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">راتب النظافة الشهري (Staff Payroll)</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="cleanerSalary"
                        value={formData.cleanerSalary}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                        placeholder="1500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">النطاق (Scope)</label>
                    <div className="relative">
                        <select
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors text-xs overflow-hidden text-ellipsis"
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                    setFormData({...formData, cleanerScope: ''});
                                } else {
                                    const current = formData.cleanerScope ? formData.cleanerScope.split(',') : [];
                                    if (current.includes(val)) {
                                        setFormData({...formData, cleanerScope: current.filter(id => id !== val).join(',')});
                                    } else {
                                        setFormData({...formData, cleanerScope: [...current, val].join(',')});
                                    }
                                }
                                // Reset the select back to default visual
                                e.target.value = 'default';
                            }}
                        >
                            <option value="default">{(formData.cleanerScope || '').split(',').filter(Boolean).length === 0 ? 'جميع الوحدات (الكل)' : `محدد (${formData.cleanerScope.split(',').filter(Boolean).length}) - اضغط للتعديل`}</option>
                            <option value="">-- إعادة تعيين للكل --</option>
                            {apartments.map(apt => (
                                <option key={apt.id} value={apt.id}>
                                    {formData.cleanerScope && formData.cleanerScope.includes(apt.id) ? '✓ ' : ''}{apt.name}
                                </option>
                            ))}
                        </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">مصروفات عامة أخرى (كهرباء، ماء، إنترنت)</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="generalExpenses"
                      value={formData.generalExpenses}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                      placeholder="إجمالي المصروفات الثابتة"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end text-xs text-gray-500 dark:text-slate-400">
                <p className="bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 p-3 rounded-xl">
                    ملاحظة: سيتم توزيع التكاليف الشهرية المدخلة هنا على عدد الأيام لحساب صافي الأرباح بشكل دقيق في التحليلات العامة. يتم تقسيم المصروفات العامة على جميع الوحدات بالتساوي، بينما يتم تخصيص راتب النظافة للوحدات المحددة في النطاق فقط.
                </p>
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
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newApartmentType}
                onChange={(e) => setNewApartmentType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddApartmentType())}
                className="flex-1 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="أضف نوع وحدة جديد (مثال: جناح ملكي)"
              />
              <button
                type="button"
                onClick={handleAddApartmentType}
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-4 py-2 rounded-xl font-bold transition-colors flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {apartmentTypesList.map((type, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
                  <span className="text-sm font-medium">{type}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveApartmentType(type)}
                    className="text-red-500 hover:text-red-700 transition-colors p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {apartmentTypesList.length === 0 && <span className="text-sm text-gray-500">لا توجد أنواع مضافة</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">مصادر الحجوزات</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newBookingSource}
                onChange={(e) => setNewBookingSource(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBookingSource())}
                className="flex-1 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="أضف مصدر حجز جديد (مثال: Agoda)"
              />
              <button
                type="button"
                onClick={handleAddBookingSource}
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-4 py-2 rounded-xl font-bold transition-colors flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {bookingSourcesList.map((source, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
                  <span className="text-sm font-medium">{source}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBookingSource(source)}
                    className="text-red-500 hover:text-red-700 transition-colors p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {bookingSourcesList.length === 0 && <span className="text-sm text-gray-500">لا توجد مصادر مضافة</span>}
            </div>
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
      )}
    </div>
  );
}
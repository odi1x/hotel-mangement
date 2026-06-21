import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Save, Plus, Trash2, Settings, Shield } from 'lucide-react';
import axios from 'axios';
import StaffManagement from './settings/StaffManagement';

export default function SettingsView() {
  const { user, updateProfile } = useAuth();
  const { apartments, licenses, addLicense, deleteLicense, staffExpenses, fetchStaffExpenses } = useData();
  const [newStaff, setNewStaff] = useState({ name: '', monthlySalary: '', scope: [] });
  const [activeTab, setActiveTab] = useState('general');
  const [facilityTab, setFacilityTab] = useState('identity');

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
    generalExpenses: ''
  });

  const [apartmentTypesList, setApartmentTypesList] = useState(['غرفة', 'غرفة وصالة', 'غرفتين وصالة']);
  const [newApartmentType, setNewApartmentType] = useState('');

  const [bookingSourcesList, setBookingSourcesList] = useState(['زيارة مباشرة', 'Booking.com', 'Airbnb']);
  const [newBookingSource, setNewBookingSource] = useState('');
  const [newLicenseNumber, setNewLicenseNumber] = useState('');
  const [newLicenseExpiration, setNewLicenseExpiration] = useState('');

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
      addLicense(newLicenseNumber.trim(), newLicenseExpiration);
      setNewLicenseNumber('');
      setNewLicenseExpiration('');
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">

        {/* Sub-Navigation for General Settings */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-100 dark:border-slate-800 pb-4">
            <button
              onClick={() => setFacilityTab('identity')}
              className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${
                facilityTab === 'identity'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              الهوية والمعلومات
            </button>
            <button
              onClick={() => setFacilityTab('legal')}
              className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${
                facilityTab === 'legal'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              التراخيص والعقود
            </button>
            <button
              onClick={() => setFacilityTab('finance')}
              className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${
                facilityTab === 'finance'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              المصروفات والتشغيل
            </button>
            <button
              onClick={() => setFacilityTab('system')}
              className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${
                facilityTab === 'system'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              خيارات النظام
            </button>
        </div>

        {successMsg && (
          <div className="mb-6 bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium border border-green-200">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

          {/* Identity Tab */}
          {facilityTab === 'identity' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">اسم المنشأة / العقار</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="مثال: فنادق السعادة"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">شعار المنشأة (للطباعة)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logoUrl')}
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                    {formData.logoUrl && <img src={formData.logoUrl} alt="Logo preview" className="mt-4 h-20 object-contain rounded-lg border border-gray-100 dark:border-slate-700 p-2" />}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">الختم / التوقيع (للطباعة)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'stampUrl')}
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                    {formData.stampUrl && <img src={formData.stampUrl} alt="Stamp preview" className="mt-4 h-20 object-contain rounded-lg border border-gray-100 dark:border-slate-700 p-2" />}
                  </div>
                </div>
              </div>
          )}

          {/* Legal & Licenses Tab */}
          {facilityTab === 'legal' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">أرقام التراخيص (تراخيص السياحة)</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newLicenseNumber}
                      onChange={(e) => setNewLicenseNumber(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLicense())}
                      className="flex-1 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أضف رقم ترخيص جديد"
                    />
                    <button
                      type="button"
                      onClick={handleAddLicense}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {licenses.map((license) => (
                      <div key={license.id} className="flex justify-between items-center bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                        <div className="flex flex-col"><span className="text-sm font-bold">{license.licenseNumber}</span>{license.expirationDate && <span className="text-xs text-gray-500">ينتهي في: {new Date(license.expirationDate).toLocaleDateString('ar-SA')}</span>}</div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا الترخيص؟')) {
                              deleteLicense(license.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {licenses.length === 0 && <span className="text-sm text-gray-500 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-center">لا توجد تراخيص مضافة</span>}
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-5 bg-gray-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      name="taxEnabled"
                      id="taxEnabled"
                      checked={formData.taxEnabled}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-slate-700 dark:border-gray-600 ml-3"
                    />
                    <label htmlFor="taxEnabled" className="text-sm font-bold text-gray-700 dark:text-slate-300 cursor-pointer">تفعيل ضريبة القيمة المضافة / رسوم البلدية</label>
                  </div>

                  {formData.taxEnabled && (
                    <div className="w-1/2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">النسبة المئوية (%)</label>
                      <input
                        type="number"
                        name="taxPercentage"
                        value={formData.taxPercentage}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                    rows="5"
                    className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors leading-relaxed"
                    placeholder="أدخل الشروط والأحكام الخاصة بمنشأتك هنا..."
                  ></textarea>
                </div>
              </div>
          )}

          {/* Finance Tab */}
          {facilityTab === 'finance' && (
              <div className="space-y-6 animate-in fade-in duration-300 flex flex-col min-h-[400px]">
                <div className="bg-gray-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-black text-gray-800 dark:text-slate-100 mb-6 flex items-center border-b border-gray-200 dark:border-slate-700 pb-3">التكاليف والمصروفات التشغيلية الثابتة (شهرياً)</h3>

                  <div className="flex flex-col gap-6 mb-6">
                                        {/* Staff Expenses Management */}
                    <div className="mt-8 border-t border-gray-100 dark:border-slate-800 pt-8">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">الرواتب والموظفين</h3>

                      <div className="space-y-4 mb-6">
                        {staffExpenses?.map(staff => (
                          <div key={staff.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">{staff.name}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">الراتب: {staff.monthlySalary} ر.س | النطاق: {staff.scope === 'all' ? 'جميع الوحدات' : staff.scope?.split(',').length + ' وحدات'}</p>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await axios.delete(`/api/staff-expenses?id=${staff.id}`);
                                  fetchStaffExpenses();
                                  toast.success('تم الحذف بنجاح');
                                } catch(e) {
                                  toast.error('حدث خطأ');
                                }
                              }}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-4">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300">إضافة مصروف راتب +</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <input
                              type="text"
                              value={newStaff.name}
                              onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                              placeholder="المسمى الوظيفي / الاسم"
                              className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={newStaff.monthlySalary}
                              onChange={(e) => setNewStaff({...newStaff, monthlySalary: e.target.value})}
                              placeholder="الراتب الشهري (ر.س)"
                              className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div className="relative">
                            <select
                                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-bold"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') {
                                        setNewStaff({...newStaff, scope: []});
                                    } else {
                                        const current = [...newStaff.scope];
                                        if (current.includes(val)) {
                                            setNewStaff({...newStaff, scope: current.filter(id => id !== val)});
                                        } else {
                                            setNewStaff({...newStaff, scope: [...current, val]});
                                        }
                                    }
                                }}
                                value=""
                            >
                                <option value="" disabled className="font-bold">تحديد النطاق (اختر الشقق)...</option>
                                <option value="" className="font-bold text-blue-600">-- جميع الوحدات -- (مسح التحديد)</option>
                                {apartments.map(apt => (
                                    <option key={apt.id} value={apt.id} className="font-bold">
                                        {newStaff.scope.includes(apt.id) ? '✓ ' : ''}{apt.name}
                                    </option>
                                ))}
                            </select>

                            {newStaff.scope.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {newStaff.scope.map(id => {
                                        const apt = apartments.find(a => a.id === id);
                                        return apt ? (
                                            <span key={id} className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold">
                                                {apt.name}
                                                <button type="button" onClick={() => setNewStaff({...newStaff, scope: newStaff.scope.filter(s => s !== id)})} className="hover:text-blue-900">×</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if(!newStaff.name || !newStaff.monthlySalary) return toast.error('أكمل البيانات');
                            try {
                              await axios.post('/api/staff-expenses', {
                                name: newStaff.name,
                                monthlySalary: newStaff.monthlySalary,
                                scope: newStaff.scope.length ? newStaff.scope.join(',') : 'all'
                              });
                              setNewStaff({ name: '', monthlySalary: '', scope: [] });
                              fetchStaffExpenses();
                              toast.success('تم الإضافة بنجاح');
                            } catch(e) { toast.error('حدث خطأ'); }
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors w-full md:w-auto"
                        >
                          إضافة الموظف +
                        </button>
                      </div>
                    </div>

                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">مصروفات عامة أخرى (إيجارات، كهرباء، ماء، إنترنت)</label>
                    <div className="relative md:w-1/2">
                      <input
                        type="number"
                        name="generalExpenses"
                        value={formData.generalExpenses}
                        onChange={handleChange}
                        className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors font-bold"
                        placeholder="إجمالي المصروفات الثابتة"
                      />
                      <span className="absolute left-4 top-3 text-xs font-bold text-gray-400">ر.س / شهر</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6 text-xs text-blue-700 dark:text-blue-300">
                    <p className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl leading-relaxed border border-blue-100 dark:border-blue-800/30">
                        <span className="font-bold block mb-1">كيفية الحساب:</span>
                        يقوم النظام تلقائياً بتجزئة المصروفات الشهرية الثابتة وتحويلها إلى تكلفة يومية تضاف على الحجوزات بشكل دقيق. يتم تقسيم المصروفات العامة على جميع الوحدات بالتساوي، بينما يتم تخصيص رواتب الموظفين للوحدات المحددة في نطاق عملهم فقط.
                    </p>
                </div>
              </div>
          )}

          {/* System Tab */}
          {facilityTab === 'system' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">أنواع الوحدات المتاحة</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newApartmentType}
                      onChange={(e) => setNewApartmentType(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddApartmentType())}
                      className="flex-1 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أضف نوع وحدة جديد (مثال: جناح ملكي)"
                    />
                    <button
                      type="button"
                      onClick={handleAddApartmentType}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {apartmentTypesList.map((type, index) => (
                      <div key={index} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm group">
                        <span className="text-sm font-bold">{type}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveApartmentType(type)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {apartmentTypesList.length === 0 && <span className="text-sm text-gray-500">لا توجد أنواع مضافة</span>}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">مصادر الحجوزات</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newBookingSource}
                      onChange={(e) => setNewBookingSource(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBookingSource())}
                      className="flex-1 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أضف مصدر حجز جديد (مثال: Agoda)"
                    />
                    <button
                      type="button"
                      onClick={handleAddBookingSource}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bookingSourcesList.map((source, index) => (
                      <div key={index} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm group">
                        <span className="text-sm font-bold">{source}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBookingSource(source)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {bookingSourcesList.length === 0 && <span className="text-sm text-gray-500">لا توجد مصادر مضافة</span>}
                  </div>
                </div>
              </div>
          )}

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
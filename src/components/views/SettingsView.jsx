/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useData } from '../../context/DataContext';
import {  Save, Plus, Trash2, Settings, Shield , BellRing, UploadCloud, Check } from 'lucide-react';
import { ACCENTS, applyAccent, getAccentId } from '../../lib/accent';
import axios from 'axios';
import toast from 'react-hot-toast';
import StaffManagement from './settings/StaffManagement';

export default function SettingsView() {
  const { user, updateProfile, changePassword } = useAuth();
  const { subscribeToPushNotifications } = useNotifications();

  const [pushStatus, setPushStatus] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const { apartments, licenses, addLicense, deleteLicense, staffExpenses, fetchStaffExpenses } = useData();
  const [newStaff, setNewStaff] = useState({ name: '', monthlySalary: '', scope: [] });
  const [activeTab, setActiveTab] = useState('general');
  const [accentId, setAccentId] = useState(getAccentId());
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



  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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


  const handleEnablePush = async () => {
    const success = await subscribeToPushNotifications();
    if (success) {
      setPushStatus('granted');
      toast.success('تم تفعيل إشعارات المتصفح بنجاح');
    } else {
      setPushStatus('denied');
      toast.error('لم يتم تفعيل إشعارات المتصفح. قد تكون محظورة من المتصفح.');
    }
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
      console.error(error);
      setPwdErrorMsg('فشل في تغيير كلمة المرور. تحقق من كلمة المرور الحالية.');
    } finally {
      setPwdLoading(false);
    }
  };

  const facilitySubTabs = [
    { id: 'identity', label: 'الهوية والمعلومات', shortLabel: 'الهوية' },
    { id: 'legal',    label: 'التراخيص والعقود',   shortLabel: 'التراخيص' },
    { id: 'finance',  label: 'المصروفات والتشغيل', shortLabel: 'المصروفات' },
    { id: 'system',   label: 'خيارات النظام',      shortLabel: 'النظام' },
  ];

  return (
    <div className="h-full overflow-hidden flex flex-col w-full max-w-6xl mx-auto">

      {user?.role === 'admin' && (
        <div className="flex gap-6 border-b border-hairline dark:border-hairline-dark">
          <button
            onClick={() => setActiveTab('general')}
            className={`tab-underline flex items-center gap-2 ${activeTab === 'general' ? 'tab-underline-active' : ''}`}
          >
            <Settings size={18} />
            إعدادات المنشأة
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`tab-underline flex items-center gap-2 ${activeTab === 'staff' ? 'tab-underline-active' : ''}`}
          >
            <Shield size={18} />
            إدارة الموظفين
          </button>
        </div>
      )}

      {activeTab === 'staff' && user?.role === 'admin' ? (
        <div className="pt-4 flex-1 min-h-0 overflow-y-auto">
          <StaffManagement />
        </div>
      ) : (
      <div className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark flex flex-col flex-1 min-h-0 overflow-hidden mt-4">

        {/* Sub-Navigation for General Settings — 4 pills fit on mobile using
            shortened Arabic labels, no scroll needed. Full labels return on
            desktop where there's plenty of space. */}
        <div className="p-3 md:p-8 pb-0 shrink-0">
          <div className="mb-4 border-b border-hairline-soft dark:border-hairline-dark pb-4">
            <div className="nav-pill-group">
              {facilitySubTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFacilityTab(tab.id)}
                  className={`nav-pill text-xs md:text-sm font-semibold ${facilityTab === tab.id ? 'nav-pill-active' : ''}`}
                >
                  <span className="md:hidden">{tab.shortLabel}</span>
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </div>
        </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-8 pt-4 pb-6">
            <div className="space-y-6 max-w-3xl">
              {successMsg && (
                <div className="mb-6 bg-surface-card dark:bg-surface-dark-elevated text-ink dark:text-white p-3 rounded-md text-sm font-medium border border-hairline dark:border-hairline-dark-soft">
                  {successMsg}
                </div>
              )}

          {/* Identity Tab */}
          {facilityTab === 'identity' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">اسم المنشأة / العقار</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="مثال: فنادق السعادة"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">شعار المنشأة (للطباعة)</label>
                    <label className="border border-dashed border-hairline dark:border-hairline-dark-soft rounded-md p-4 flex flex-col items-center justify-center bg-surface-soft dark:bg-surface-dark-elevated hover:bg-surface-card dark:hover:bg-hairline-dark transition cursor-pointer">
                      <UploadCloud size={24} className="text-muted mb-2" />
                      <span className="text-sm font-medium text-muted dark:text-body-dark">اضغط هنا لرفع الشعار</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'logoUrl')}
                        className="hidden"
                      />
                    </label>
                    {formData.logoUrl && <img src={formData.logoUrl} alt="Logo preview" className="mt-4 h-20 object-contain rounded-md border border-hairline dark:border-hairline-dark-soft p-2" />}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">الختم / التوقيع (للطباعة)</label>
                    <label className="border border-dashed border-hairline dark:border-hairline-dark-soft rounded-md p-4 flex flex-col items-center justify-center bg-surface-soft dark:bg-surface-dark-elevated hover:bg-surface-card dark:hover:bg-hairline-dark transition cursor-pointer">
                      <UploadCloud size={24} className="text-muted mb-2" />
                      <span className="text-sm font-medium text-muted dark:text-body-dark">اضغط هنا لرفع الختم</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'stampUrl')}
                        className="hidden"
                      />
                    </label>
                    {formData.stampUrl && <img src={formData.stampUrl} alt="Stamp preview" className="mt-4 h-20 object-contain rounded-md border border-hairline dark:border-hairline-dark-soft p-2" />}
                  </div>
                </div>
              </div>
          )}

          {/* Legal & Licenses Tab */}
          {facilityTab === 'legal' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">أرقام التراخيص (تراخيص السياحة)</label>
                  <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <input
                      type="text"
                      value={newLicenseNumber}
                      onChange={(e) => setNewLicenseNumber(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLicense())}
                      className="input-field flex-1"
                      placeholder="أضف رقم ترخيص جديد"
                    />
                    <input
                      type="date"
                      value={newLicenseExpiration}
                      onChange={(e) => setNewLicenseExpiration(e.target.value)}
                      className="input-field flex-1"
                      title="تاريخ الانتهاء"
                    />
                    <button
                      type="button"
                      onClick={handleAddLicense}
                      className="btn-primary h-11 md:h-auto px-5 shrink-0"
                    >
                      <Plus size={20} />
                      <span className="md:hidden">إضافة</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {licenses.map((license) => (
                      <div key={license.id} className="flex justify-between items-center bg-surface-card dark:bg-surface-dark-elevated text-ink dark:text-white px-4 py-3 rounded-md">
                        <div className="flex flex-col"><span className="text-sm font-semibold">{license.licenseNumber}</span>{license.expirationDate && <span className="text-xs text-muted">ينتهي في: {new Date(license.expirationDate).toLocaleDateString('ar-SA')}</span>}</div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا الترخيص؟')) {
                              deleteLicense(license.id);
                            }
                          }}
                          className="icon-action"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {licenses.length === 0 && <span className="text-sm text-muted p-4 bg-surface-soft dark:bg-surface-dark-elevated rounded-md border border-dashed border-hairline dark:border-hairline-dark-soft text-center">لا توجد تراخيص مضافة</span>}
                  </div>
                </div>

                <div className="border border-hairline dark:border-hairline-dark-soft rounded-lg p-5 bg-surface-soft dark:bg-surface-dark-elevated">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      name="taxEnabled"
                      id="taxEnabled"
                      checked={formData.taxEnabled}
                      onChange={handleChange}
                      className="w-5 h-5 accent-black bg-white border-hairline rounded ml-3"
                    />
                    <label htmlFor="taxEnabled" className="text-sm font-semibold text-body dark:text-body-dark cursor-pointer">تفعيل ضريبة القيمة المضافة / رسوم البلدية</label>
                  </div>

                  {formData.taxEnabled && (
                    <div className="w-1/2">
                      <label className="block text-xs font-semibold text-muted dark:text-body-dark mb-2">النسبة المئوية (%)</label>
                      <input
                        type="number"
                        name="taxPercentage"
                        value={formData.taxPercentage}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        className="input-field"
                        placeholder="15"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">الشروط والأحكام المخصصة (تظهر في العقد)</label>
                  <textarea
                    name="customTerms"
                    value={formData.customTerms}
                    onChange={handleChange}
                    rows="5"
                    className="input-field leading-relaxed"
                    placeholder="أدخل الشروط والأحكام الخاصة بمنشأتك هنا..."
                  ></textarea>
                </div>
              </div>
          )}

          {/* Finance Tab */}
          {facilityTab === 'finance' && (
              <div className="space-y-6 animate-in fade-in duration-300 flex flex-col min-h-[400px]">
                <div className="bg-surface-soft dark:bg-surface-dark-elevated p-6 rounded-lg border border-hairline dark:border-hairline-dark-soft">
                  <h3 className="text-sm font-semibold text-ink dark:text-white mb-6 flex items-center border-b border-hairline dark:border-hairline-dark-soft pb-3">التكاليف والمصروفات التشغيلية الثابتة (شهرياً)</h3>

                  <div className="flex flex-col gap-6 mb-6">
                                        {/* Staff Expenses Management */}
                    <div className="mt-8 border-t border-hairline dark:border-hairline-dark pt-8">
                      <h3 className="text-base font-semibold text-ink dark:text-white mb-6">الرواتب والموظفين</h3>

                      {/* Desktop: table view */}
                      <div className="mb-6 rounded-lg border border-hairline dark:border-hairline-dark-soft overflow-hidden hidden md:block">
                        <table className="w-full text-right">
                          <thead className="bg-canvas dark:bg-surface-dark border-b border-hairline dark:border-hairline-dark-soft">
                            <tr>
                              <th className="px-4 py-3 text-sm font-semibold text-body dark:text-body-dark">الاسم / المسمى</th>
                              <th className="px-4 py-3 text-sm font-semibold text-body dark:text-body-dark">الراتب الشهري</th>
                              <th className="px-4 py-3 text-sm font-semibold text-body dark:text-body-dark">النطاق</th>
                              <th className="px-4 py-3 text-sm font-semibold text-body dark:text-body-dark">إجراء</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-hairline-soft dark:divide-hairline-dark bg-canvas dark:bg-surface-dark">
                            {staffExpenses?.map(staff => (
                              <tr key={staff.id} className="hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-ink dark:text-white">{staff.name}</td>
                                <td className="px-4 py-3 text-sm text-muted dark:text-body-dark">{staff.monthlySalary} ر.س</td>
                                <td className="px-4 py-3 text-sm text-muted dark:text-body-dark">{staff.scope === 'all' ? 'جميع الوحدات' : staff.scope?.split(',').length + ' وحدات'}</td>
                                <td className="px-4 py-3 text-sm">
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
                                    className="icon-action"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {(!staffExpenses || staffExpenses.length === 0) && (
                              <tr>
                                <td colSpan="4" className="px-4 py-6 text-center text-sm text-muted dark:text-body-dark">لا يوجد موظفين مضافين</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: card list — same data, stacked layout so nothing clips */}
                      <div className="mb-6 md:hidden space-y-2">
                        {staffExpenses?.length > 0 ? staffExpenses.map(staff => (
                          <div key={staff.id} className="rounded-lg border border-hairline dark:border-hairline-dark-soft bg-canvas dark:bg-surface-dark p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-ink dark:text-white truncate">{staff.name}</p>
                                <div className="flex items-center gap-1.5 text-xs text-muted dark:text-body-dark mt-1">
                                  <span className="font-semibold text-accent-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>{staff.monthlySalary} ر.س</span>
                                  <span className="text-muted-soft">·</span>
                                  <span>{staff.scope === 'all' ? 'جميع الوحدات' : staff.scope?.split(',').length + ' وحدات'}</span>
                                </div>
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
                                className="icon-action p-2 shrink-0"
                                aria-label={`حذف ${staff.name}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-lg border border-hairline dark:border-hairline-dark-soft bg-canvas dark:bg-surface-dark px-4 py-8 text-center text-sm text-muted dark:text-body-dark">
                            لا يوجد موظفين مضافين
                          </div>
                        )}
                      </div>

                      <div className="bg-canvas dark:bg-surface-dark p-4 rounded-lg border border-hairline dark:border-hairline-dark-soft space-y-4">
                        <h4 className="text-sm font-semibold text-body dark:text-body-dark">إضافة مصروف راتب +</h4>
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-grow">
                            <input
                              type="text"
                              value={newStaff.name}
                              onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                              placeholder="المسمى الوظيفي / الاسم"
                              className="input-field h-11"
                            />
                          </div>
                          <div className="w-full md:w-40 shrink-0">
                            <input
                              type="number"
                              value={newStaff.monthlySalary}
                              onChange={(e) => setNewStaff({...newStaff, monthlySalary: e.target.value})}
                              placeholder="الراتب (ر.س)"
                              className="input-field h-11"
                            />
                          </div>
                          <div className="w-full md:w-56 shrink-0 relative">
                            <select
                                className="input-field h-11 font-semibold"
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
                                <option value="" disabled className="font-semibold">النطاق...</option>
                                <option value="" className="font-semibold">جميع الوحدات</option>
                                {apartments.map(apt => (
                                    <option key={apt.id} value={apt.id} className="font-semibold">
                                        {newStaff.scope.includes(apt.id) ? '✓ ' : ''}{apt.name}
                                    </option>
                                ))}
                            </select>
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
                            className="btn-primary h-11 px-6 shrink-0"
                          >
                            إضافة +
                          </button>
                        </div>
                        {newStaff.scope.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 px-1">
                              {newStaff.scope.map(id => {
                                  const apt = apartments.find(a => a.id === id);
                                  return apt ? (
                                      <span key={id} className="badge-pill">
                                          {apt.name}
                                          <button type="button" onClick={() => setNewStaff({...newStaff, scope: newStaff.scope.filter(s => s !== id)})} className="hover:text-muted transition-colors mr-1">×</button>
                                      </span>
                                  ) : null;
                              })}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-body dark:text-body-dark mb-2">مصروفات عامة أخرى (إيجارات، كهرباء، ماء، إنترنت)</label>
                    <div className="relative md:w-1/2">
                      <input
                        type="number"
                        name="generalExpenses"
                        value={formData.generalExpenses}
                        onChange={handleChange}
                        className="input-field font-semibold"
                        placeholder="إجمالي المصروفات الثابتة"
                      />
                      <span className="absolute left-4 top-3 text-xs font-semibold text-muted-soft">ر.س / شهر</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6 text-xs text-body dark:text-body-dark">
                    <p className="bg-surface-card dark:bg-surface-dark-elevated p-4 rounded-lg leading-relaxed">
                        <span className="font-semibold text-ink dark:text-white block mb-1">كيفية الحساب:</span>
                        يقوم النظام تلقائياً بتجزئة المصروفات الشهرية الثابتة وتحويلها إلى تكلفة يومية تضاف على الحجوزات بشكل دقيق. يتم تقسيم المصروفات العامة على جميع الوحدات بالتساوي، بينما يتم تخصيص رواتب الموظفين للوحدات المحددة في نطاق عملهم فقط.
                    </p>
                </div>
              </div>
          )}

          {/* System Tab */}
          {facilityTab === 'system' && (
              <div className="space-y-8 animate-in fade-in duration-300">

                  {/* Push Notifications Toggle */}
                  <div className="bg-surface-card dark:bg-surface-dark-elevated p-5 rounded-lg flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-semibold text-ink dark:text-white flex items-center gap-2">
                        <BellRing size={18} className="text-ink dark:text-white" />
                        إشعارات المتصفح
                      </h3>
                      <p className="text-xs text-muted dark:text-body-dark mt-1">تلقي تنبيهات فورية حتى عند إغلاق التطبيق</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={pushStatus === 'granted'}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                        pushStatus === 'granted'
                          ? 'bg-ink dark:bg-white cursor-not-allowed'
                          : 'bg-surface-strong dark:bg-hairline-dark-soft hover:bg-muted-soft cursor-pointer'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-ink shadow-micro transition-transform ${
                          pushStatus === 'granted' ? '-translate-x-6' : '-translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Accent color theme */}
                  <div className="bg-surface-card dark:bg-surface-dark-elevated p-5 rounded-lg mb-6">
                    <h3 className="font-semibold text-ink dark:text-white flex items-center gap-2 mb-1">
                      <span className="w-4 h-4 rounded-full bg-accent inline-block"></span>
                      لون النظام
                    </h3>
                    <p className="text-xs text-muted dark:text-body-dark mb-4">يُطبَّق فوراً على الأزرار والتقويم والتنبيهات وشريط التمرير.</p>
                    <div className="flex flex-wrap gap-3">
                      {ACCENTS.map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => { applyAccent(a.id); setAccentId(a.id); }}
                          title={a.name}
                          className={`w-9 h-9 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${accentId === a.id ? 'ring-2 ring-offset-2 ring-offset-surface-card dark:ring-offset-surface-dark-elevated' : ''}`}
                          style={{ backgroundColor: a.hex, boxShadow: accentId === a.id ? `0 0 0 2px ${a.hex}` : 'none' }}
                        >
                          {accentId === a.id && <Check size={16} className="text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                <div>
                  <label className="block text-sm font-semibold text-body dark:text-body-dark mb-3">أنواع الوحدات المتاحة</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newApartmentType}
                      onChange={(e) => setNewApartmentType(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddApartmentType())}
                      className="input-field flex-1"
                      placeholder="أضف نوع وحدة جديد (مثال: جناح ملكي)"
                    />
                    <button
                      type="button"
                      onClick={handleAddApartmentType}
                      className="btn-primary h-auto px-5"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {apartmentTypesList.map((type, index) => (
                      <div key={index} className="badge-pill">
                        <span className="text-sm font-semibold">{type}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveApartmentType(type)}
                          className="text-muted-soft hover:text-ink dark:hover:text-white transition-colors mr-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {apartmentTypesList.length === 0 && <span className="text-sm text-muted">لا توجد أنواع مضافة</span>}
                  </div>
                </div>

                <div className="pt-4 border-t border-hairline-soft dark:border-hairline-dark">
                  <label className="block text-sm font-semibold text-body dark:text-body-dark mb-3">مصادر الحجوزات</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newBookingSource}
                      onChange={(e) => setNewBookingSource(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBookingSource())}
                      className="input-field flex-1"
                      placeholder="أضف مصدر حجز جديد (مثال: Agoda)"
                    />
                    <button
                      type="button"
                      onClick={handleAddBookingSource}
                      className="btn-primary h-auto px-5"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bookingSourcesList.map((source, index) => (
                      <div key={index} className="badge-pill">
                        <span className="text-sm font-semibold">{source}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBookingSource(source)}
                          className="text-muted-soft hover:text-ink dark:hover:text-white transition-colors mr-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {bookingSourcesList.length === 0 && <span className="text-sm text-muted">لا توجد مصادر مضافة</span>}
                  </div>
                </div>
              </div>
          )}

            </div>
          </div>
          <div className="shrink-0 p-3 md:p-8 border-t border-hairline-soft dark:border-hairline-dark flex justify-start">
            <button
              type="submit"
            disabled={loading}
            className="btn-primary h-11 px-6"
          >
            <Save size={18} />
              <span>{loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}

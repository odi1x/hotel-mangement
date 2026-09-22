/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useData } from '../../context/DataContext';
import {  Save, Plus, Trash2, Settings, Shield , BellRing, UploadCloud, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { ACCENTS, applyAccent, getAccentId } from '../../lib/accent';
import axios from 'axios';
import toast from 'react-hot-toast';
import StaffManagement from './settings/StaffManagement';

export default function SettingsView() {
  const { user, updateProfile, changePassword } = useAuth();
  const { subscribeToPushNotifications } = useNotifications();

  const [pushStatus, setPushStatus] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const { apartments, licenses, addLicense, deleteLicense } = useData();
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
    economicCategories: 'اقتصادية,فاخرة',
    locations: '',
    locationDetails: [],
    whatsappMessage: '',
    whatsappMessagePreliminary: '',
    whatsappMessageConfirmed: '',
    generalExpenses: ''
  });

  const [apartmentTypesList, setApartmentTypesList] = useState(['غرفة', 'غرفة وصالة', 'غرفتين وصالة']);
  const [newApartmentType, setNewApartmentType] = useState('');

  const [economicCategoriesList, setEconomicCategoriesList] = useState(['اقتصادية', 'فاخرة']);
  const [newEconomicCategory, setNewEconomicCategory] = useState('');

  const [locationsList, setLocationsList] = useState([]);
  const [newLocation, setNewLocation] = useState('');

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
  const [uploadingLocation, setUploadingLocation] = useState(null);

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
        economicCategories: user.economicCategories || 'اقتصادية,فاخرة',
        locations: user.locations || '',
        locationDetails: Array.isArray(user.locationDetails) ? user.locationDetails : [],
        whatsappMessage: user.whatsappMessage || '',
        whatsappMessagePreliminary: user.whatsappMessagePreliminary || '',
        whatsappMessageConfirmed: user.whatsappMessageConfirmed || '',
        generalExpenses: user.generalExpenses || ''
      });
      setApartmentTypesList(user.apartmentTypes ? user.apartmentTypes.split(',').map(s => s.trim()).filter(Boolean) : ['غرفة', 'غرفة وصالة', 'غرفتين وصالة']);
      setBookingSourcesList(user.bookingSources ? user.bookingSources.split(',').map(s => s.trim()).filter(Boolean) : ['زيارة مباشرة', 'Booking.com', 'Airbnb']);
      setEconomicCategoriesList(user.economicCategories ? user.economicCategories.split(',').map(s => s.trim()).filter(Boolean) : ['اقتصادية', 'فاخرة']);
      setLocationsList(user.locations ? user.locations.split(',').map(s => s.trim()).filter(Boolean) : []);
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

  const handleAddEconomicCategory = () => {
    if (newEconomicCategory.trim() && !economicCategoriesList.includes(newEconomicCategory.trim())) {
      const updatedList = [...economicCategoriesList, newEconomicCategory.trim()];
      setEconomicCategoriesList(updatedList);
      setFormData({ ...formData, economicCategories: updatedList.join(',') });
      setNewEconomicCategory('');
    }
  };

  const handleRemoveEconomicCategory = (categoryToRemove) => {
    const updatedList = economicCategoriesList.filter(category => category !== categoryToRemove);
    setEconomicCategoriesList(updatedList);
    setFormData({ ...formData, economicCategories: updatedList.join(',') });
  };

  const handleAddLocation = () => {
    if (newLocation.trim() && !locationsList.includes(newLocation.trim())) {
      const updatedList = [...locationsList, newLocation.trim()];
      setLocationsList(updatedList);
      setFormData({
        ...formData,
        locations: updatedList.join(','),
        locationDetails: [...(formData.locationDetails || []), { name: newLocation.trim(), link: '', photoUrl: '' }]
      });
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (locationToRemove) => {
    const updatedList = locationsList.filter(location => location !== locationToRemove);
    setLocationsList(updatedList);
    setFormData({
      ...formData,
      locations: updatedList.join(','),
      locationDetails: (formData.locationDetails || []).filter(d => d.name !== locationToRemove)
    });
  };

  const handleLocationLinkChange = (name, link) => {
    setFormData({
      ...formData,
      locationDetails: (formData.locationDetails || []).map(d => d.name === name ? { ...d, link } : d)
    });
  };

  const setLocationPhoto = (name, photoUrl) => {
    setFormData({
      ...formData,
      locationDetails: (formData.locationDetails || []).map(d => d.name === name ? { ...d, photoUrl } : d)
    });
  };

  // Each location's photo uploads directly to ImageKit so the stored value is
  // a real URL — it's shared as a link in the WhatsApp message, where a data
  // URL would blow up the message length. Mirrors ApartmentsView's upload flow.
  const handleLocationPhotoUpload = async (name, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('الرجاء اختيار صورة صالحة');

    setUploadingLocation(name);
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
      fd.append('folder', '/locations');
      const uploadRes = await axios.post('https://upload.imagekit.io/api/v1/files/upload', fd);
      const fileId = uploadRes.data.fileId;
      // fileId rides along in the URL so "remove" can purge it from ImageKit.
      setLocationPhoto(name, `${uploadRes.data.url}?fileId=${fileId}`);
      toast.success('تم رفع صورة الموقع');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingLocation(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveLocationPhoto = async (name) => {
    const detail = (formData.locationDetails || []).find(d => d.name === name);
    const url = detail?.photoUrl;
    if (!url) return;
    try {
      const fileId = new URL(url).searchParams.get('fileId');
      if (fileId) await axios.delete('/api/auth?action=imagekit-delete', { data: { fileId } });
    } catch (err) {
      console.error('Failed to delete location photo from ImageKit', err);
    }
    setLocationPhoto(name, '');
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
              <div className="space-y-6 anim-tab">
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
              <div className="space-y-6 anim-tab">
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

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-body dark:text-body-dark mb-2">رسالة واتساب عند الضغط على رقم النزيل</label>
                    <p className="text-xs text-muted dark:text-body-dark mb-3">تُفتح المحادثة برسالة الترحيب عند الضغط على رقم النزيل في قائمة النزلاء</p>
                    <div>
                      <label className="block text-2xs font-semibold uppercase tracking-wider text-muted dark:text-body-dark mb-2">
                        الرموز: <span className="font-mono normal-case">{'{name}'}</span> لاسم النزيل,
                        <span className="font-mono normal-case"> {'{businessName}'}</span> لاسم المنشأة,
                        <span className="font-mono normal-case"> {'{apartment}'}</span> لاسم الشقة,
                        <span className="font-mono normal-case"> {'{ref}'}</span> لرقم المرجع,
                        <span className="font-mono normal-case"> {'{LocationLink}'}</span> لرابط الموقع,
                        <span className="font-mono normal-case"> {'{BuildingPhoto}'}</span> لصورة المبنى
                      </label>
                      <textarea
                        name="whatsappMessage"
                        value={formData.whatsappMessage}
                        onChange={handleChange}
                        rows="4"
                        className="input-field leading-relaxed"
                        placeholder="مثال: مرحباً {name}، نرحب بك في {businessName}..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* Finance tab removed — expenses moved to their own top-level tab.
              Old sub-tab id was 'finance'; if a stored preference points there,
              the tabs list won't render it and the user lands on the identity tab. */}

          {/* System Tab */}
          {facilityTab === 'system' && (
              <div className="space-y-8 anim-tab">

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

                  {/* Partners Revenue Sharing Toggle */}
                  <div className="bg-surface-card dark:bg-surface-dark-elevated p-5 rounded-lg flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-semibold text-ink dark:text-white flex items-center gap-2">
                        <Shield size={18} className="text-ink dark:text-white" />
                        وحدة الشركاء وتقاسم الإيرادات
                      </h3>
                      <p className="text-xs text-muted dark:text-body-dark mt-1">تفعيل ميزة إدارة الشركاء وحساب التسويات المالية</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleChange({ target: { name: 'partnersRevenueSharingEnabled', type: 'checkbox', checked: !formData.partnersRevenueSharingEnabled } }); }}
                      disabled={loading}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                        formData.partnersRevenueSharingEnabled
                          ? 'bg-ink dark:bg-white'
                          : 'bg-surface-strong dark:bg-hairline-dark-soft hover:bg-muted-soft cursor-pointer'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-ink shadow-micro transition-transform ${
                          formData.partnersRevenueSharingEnabled ? '-translate-x-6' : '-translate-x-1'
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
                  <label className="block text-sm font-semibold text-body dark:text-body-dark mb-3">الفئات الاقتصادية</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newEconomicCategory}
                      onChange={(e) => setNewEconomicCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEconomicCategory())}
                      className="input-field flex-1"
                      placeholder="أضف فئة اقتصادية جديدة (مثال: فاخرة)"
                    />
                    <button
                      type="button"
                      onClick={handleAddEconomicCategory}
                      className="btn-primary h-auto px-5"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {economicCategoriesList.map((category, index) => (
                      <div key={index} className="badge-pill">
                        <span className="text-sm font-semibold">{category}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEconomicCategory(category)}
                          className="text-muted-soft hover:text-ink dark:hover:text-white transition-colors mr-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {economicCategoriesList.length === 0 && <span className="text-sm text-muted">لا توجد فئات مضافة</span>}
                  </div>
                </div>

                <div className="pt-4 border-t border-hairline-soft dark:border-hairline-dark">
                  <label className="block text-sm font-semibold text-body dark:text-body-dark mb-1">المواقع</label>
                  <p className="text-xs text-muted dark:text-body-dark mb-3">لكل موقع رابط وصورة خاصة به — تُستخدم تلقائياً في رسائل واتساب عبر <span className="font-mono normal-case">{'{LocationLink}'}</span> و <span className="font-mono normal-case">{'{BuildingPhoto}'}</span> حسب موقع شقة النزيل</p>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                      className="input-field flex-1"
                      placeholder="أضف موقع جديد (مثال: حي الياسمين، الرياض)"
                    />
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className="btn-primary h-auto px-5"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {locationsList.length === 0 ? (
                    <span className="text-sm text-muted">لا توجد مواقع مضافة</span>
                  ) : (
                    <div className="space-y-3">
                      {locationsList.map(location => {
                        const detail = (formData.locationDetails || []).find(d => d.name === location) || { name: location, link: '', photoUrl: '' };
                        const uploading = uploadingLocation === location;
                        return (
                          <div key={location} className="rounded-lg border border-hairline dark:border-hairline-dark-soft bg-surface-soft dark:bg-surface-dark-elevated/40 p-3 md:p-4">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="font-semibold text-sm text-ink dark:text-white">{location}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLocation(location)}
                                className="icon-action h-7 w-7 text-accent-strong"
                                title="حذف الموقع"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <label className="block text-2xs font-semibold text-muted dark:text-body-dark mb-1.5">رابط الموقع <span className="font-mono normal-case">{'{LocationLink}'}</span></label>
                            <input
                              type="url"
                              dir="ltr"
                              value={detail.link}
                              onChange={(e) => handleLocationLinkChange(location, e.target.value)}
                              className="input-field h-9 text-xs w-full mb-3"
                              placeholder="https://maps.google.com/?q=..."
                            />

                            <div className="flex items-center gap-3">
                              <label className={`shrink-0 border border-dashed border-hairline dark:border-hairline-dark-soft rounded-md p-2.5 flex flex-col items-center justify-center bg-canvas dark:bg-surface-dark hover:bg-surface-card dark:hover:bg-hairline-dark transition cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploading ? (
                                  <Loader2 size={18} className="text-muted animate-spin" />
                                ) : (
                                  <ImageIcon size={18} className="text-muted" />
                                )}
                                <span className="text-2xs font-medium text-muted dark:text-body-dark mt-1">{uploading ? 'جارِ الرفع...' : detail.photoUrl ? 'تغيير الصورة' : 'صورة المبنى'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleLocationPhotoUpload(location, e)}
                                  className="hidden"
                                />
                              </label>
                              {detail.photoUrl && (
                                <div className="relative">
                                  <img
                                    src={detail.photoUrl.split('?')[0]}
                                    alt={location}
                                    className="w-24 h-20 object-cover rounded-md border border-hairline dark:border-hairline-dark-soft"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLocationPhoto(location)}
                                    className="absolute -top-2 -left-2 icon-action h-7 w-7 text-accent-strong bg-canvas dark:bg-surface-dark-elevated shadow-micro"
                                    title="إزالة الصورة"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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

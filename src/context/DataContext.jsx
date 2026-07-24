import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { token } = useAuth();

  const [apartments, setApartments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [maintenanceIssues, setMaintenanceIssues] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalNights: 0, occupancyRate: 0, sourceCounts: {}, count: 0, dailyTrend: [] });
  const [analyticsFilter, setAnalyticsFilter] = useState({});
  const [loading] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);

  const API_BASE_URL = '/api';

  const fetchApartments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/apartments`);
      setApartments(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchLicenses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/licenses`);
      setLicenses(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/bookings`);
      setBookings(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMaintenance = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin-resources?resource=maintenance`);
      setMaintenanceIssues(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPricingRules = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin-resources?resource=pricing-rules`);
      setPricingRules(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin-resources?resource=expenses`);
      setExpenses(res.data);
    } catch (err) { console.error(err); }
  };

  const createExpense = async (data) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin-resources?resource=expenses`, data);
      setExpenses(prev => [res.data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
      return res.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateExpense = async (data) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/admin-resources?resource=expenses`, data);
      setExpenses(prev => prev.map(e => e.id === data.id ? res.data : e));
      return res.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteExpense = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/admin-resources?resource=expenses&id=${id}`);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const fetchAnalytics = async () => {
    setIsAnalyticsLoading(true);
    try {
      const params = {};
      if (analyticsFilter.apartmentIds?.length > 0) {
        params.apartmentIds = analyticsFilter.apartmentIds.join(',');
      }
      if (analyticsFilter.startDate && analyticsFilter.endDate) {
        params.startDate = analyticsFilter.startDate;
        params.endDate = analyticsFilter.endDate;
      }
      const res = await axios.get(`${API_BASE_URL}/analytics`, { params });
      setAnalytics(res.data);
    } catch (err) { console.error(err); }
    finally { setIsAnalyticsLoading(false); }
  };

  useEffect(() => {
    if (token) {
      fetchApartments();
      fetchBookings();
      fetchLicenses();
      fetchMaintenance();
      fetchPricingRules();
      fetchExpenses();
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, analyticsFilter, bookings]);

  const addApartment = async (apartmentData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/apartments`, apartmentData);
      setApartments([res.data, ...apartments]);
    } catch (err) { console.error(err); }
  };

  const addLicense = async (licenseNumber, expirationDate) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/licenses`, { licenseNumber, expirationDate });
      setLicenses([res.data, ...licenses]);
      toast.success('تمت إضافة الترخيص بنجاح');
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء إضافة الترخيص'); }
  };

  const deleteLicense = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/licenses?id=${id}`);
      setLicenses(licenses.filter(l => l.id !== id));
      toast.success('تم حذف الترخيص بنجاح');
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء حذف الترخيص'); }
  };

  const updateApartment = async (apartmentData) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/apartments`, apartmentData);
      setApartments(apartments.map(a => a.id === apartmentData.id ? res.data : a));
    } catch (err) { console.error(err); }
  };

  const deleteApartment = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/apartments?id=${id}`);
      setApartments(apartments.filter(a => a.id !== id));
      fetchBookings();
    } catch (err) { console.error(err); }
  };

  const addBooking = async (bookingData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/bookings`, bookingData);
      setBookings([res.data, ...bookings]);
    } catch (err) { console.error(err); throw err; }
  };

  const updateBooking = async (bookingData) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/bookings`, bookingData);
      setBookings(bookings.map(b => b.id === bookingData.id ? res.data : b));
    } catch (err) { console.error(err); throw err; }
  };

  const checkoutBooking = async (id) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/bookings`, { id, isCheckout: true });
      setBookings(bookings.map(b => b.id === id ? res.data : b));
      toast.success('تم تسجيل الخروج المبكر بنجاح');
      fetchApartments();
    } catch (err) { console.error(err); toast.error('حدث خطأ أثناء تسجيل الخروج'); throw err; }
  };

  const deleteBooking = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/bookings?id=${id}`);
      setBookings(bookings.filter(b => b.id !== id));
    } catch (err) { console.error(err); }
  };

  /* ------------------------------------------------------------------ */
  /*  Payments                                                          */
  /* ------------------------------------------------------------------ */

  const addPayment = async (bookingId, paymentData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/payments`, { bookingId, ...paymentData });
      setBookings(prev => prev.map(b => (
        b.id === bookingId
          ? { ...b, payments: [res.data, ...(b.payments || [])] }
          : b
      )));
      toast.success('تم تسجيل الدفعة');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'حدث خطأ أثناء تسجيل الدفعة');
      throw err;
    }
  };

  const deletePayment = async (bookingId, paymentId) => {
    try {
      await axios.delete(`${API_BASE_URL}/payments?id=${paymentId}`);
      setBookings(prev => prev.map(b => (
        b.id === bookingId
          ? { ...b, payments: (b.payments || []).filter(p => p.id !== paymentId) }
          : b
      )));
      toast.success('تم حذف الدفعة');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'حدث خطأ أثناء الحذف');
      throw err;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Maintenance                                                       */
  /* ------------------------------------------------------------------ */

  const addMaintenanceIssue = async (data) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin-resources?resource=maintenance`, data);
      setMaintenanceIssues(prev => [res.data, ...prev]);
      toast.success('تم إضافة البلاغ');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في إضافة البلاغ');
      throw err;
    }
  };

  const updateMaintenanceIssue = async (data) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/admin-resources?resource=maintenance`, data);
      setMaintenanceIssues(prev => prev.map(i => i.id === data.id ? res.data : i));
      toast.success('تم تحديث البلاغ');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في تحديث البلاغ');
      throw err;
    }
  };

  const deleteMaintenanceIssue = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/admin-resources?resource=maintenance&id=${id}`);
      setMaintenanceIssues(prev => prev.filter(i => i.id !== id));
      toast.success('تم حذف البلاغ');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في الحذف');
      throw err;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Pricing rules                                                     */
  /* ------------------------------------------------------------------ */

  const addPricingRule = async (data) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin-resources?resource=pricing-rules`, data);
      setPricingRules(prev => [...prev, res.data].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)));
      toast.success('تم إنشاء القاعدة السعرية');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في إنشاء القاعدة');
      throw err;
    }
  };

  const updatePricingRule = async (data) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/admin-resources?resource=pricing-rules`, data);
      setPricingRules(prev => prev.map(r => r.id === data.id ? res.data : r));
      toast.success('تم حفظ التعديلات');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في الحفظ');
      throw err;
    }
  };

  const deletePricingRule = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/admin-resources?resource=pricing-rules&id=${id}`);
      setPricingRules(prev => prev.filter(r => r.id !== id));
      toast.success('تم حذف القاعدة');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في الحذف');
      throw err;
    }
  };

  return (
    <DataContext.Provider value={{
      apartments,
      licenses,
      bookings,
      analytics,
      analyticsFilter,
      setAnalyticsFilter,
      addApartment,
      updateApartment,
      deleteApartment,
      addLicense,
      deleteLicense,
      addBooking,
      updateBooking,
      deleteBooking,
      checkoutBooking,
      fetchBookings,
      fetchApartments,
      addPayment,
      deletePayment,

      maintenanceIssues,
      fetchMaintenance,
      addMaintenanceIssue,
      updateMaintenanceIssue,
      deleteMaintenanceIssue,

      pricingRules,
      fetchPricingRules,
      addPricingRule,
      updatePricingRule,
      deletePricingRule,

      expenses,
      fetchExpenses,
      createExpense,
      updateExpense,
      deleteExpense,

      loading,
      isAnalyticsLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

// Client-side fetch TTL cache (per-endpoint, keyed by URL + params)
// Prevents redundant re-fetches when switching tabs within a short window.
const FETCH_TTL_MS = 10_000;
const fetchCache = new Map();

function getFetchCache(key) {
  const entry = fetchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    fetchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setFetchCache(key, data) {
  fetchCache.set(key, { data, expiresAt: Date.now() + FETCH_TTL_MS });
}

export const DataProvider = ({ children }) => {
  const { token, user } = useAuth();

  const [apartments, setApartments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [maintenanceIssues, setMaintenanceIssues] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cleaningTasks, setCleaningTasks] = useState([]);
  const [partners, setPartners] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalNights: 0, occupancyRate: 0, sourceCounts: {}, count: 0, dailyTrend: [] });
  const [analyticsFilter, setAnalyticsFilter] = useState({});
  const [loading] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);

  const API_BASE_URL = '/api';

  const isAdmin = user?.role === 'admin';
  const perms = user?.permissions || {};

  const shouldFetchAnalytics = isAdmin || perms.canViewAnalytics;
  const shouldFetchPricing = isAdmin || perms.canViewPricing;
  const shouldFetchMaintenance = isAdmin || perms.canViewMaintenance;
  const shouldFetchCleaning = isAdmin || perms.canClean;
  const shouldFetchExpenses = isAdmin || perms.canViewAnalytics; // expenses share analytics permission
  const shouldFetchBalances = isAdmin || perms.canViewBalances;
  const shouldFetchPartners = isAdmin && user?.partnersRevenueSharingEnabled;

  const buildBookingsUrl = (params = {}) => {
    const url = new URL(`${API_BASE_URL}/bookings`, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    return url.toString();
  };

  const fetchWithTTL = async (url, setter, cacheKey) => {
    const cached = getFetchCache(cacheKey || url);
    if (cached) {
      setter(cached);
      return cached;
    }
    try {
      const res = await axios.get(url);
      setFetchCache(cacheKey || url, res.data);
      setter(res.data);
      return res.data;
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApartments = async () => {
    await fetchWithTTL(`${API_BASE_URL}/apartments`, setApartments, 'apartments');
  };

  const fetchLicenses = async () => {
    await fetchWithTTL(`${API_BASE_URL}/licenses`, setLicenses, 'licenses');
  };

  const fetchBookings = async (options = {}) => {
    const { from, to, force = false } = options;
    const params = {};
    if (from) params.startDate = from;
    if (to) params.endDate = to;
    const url = buildBookingsUrl(params);
    const cacheKey = `bookings:${from || 'all'}:${to || 'all'}`;
    if (!force) {
      const cached = getFetchCache(cacheKey);
      if (cached) {
        setBookings(cached);
        return cached;
      }
    }
    try {
      const res = await axios.get(url);
      setFetchCache(cacheKey, res.data);
      setBookings(res.data);
      return res.data;
    } catch (err) { console.error(err); }
  };

  const fetchMaintenance = async () => {
    if (!shouldFetchMaintenance) return;
    await fetchWithTTL(
      `${API_BASE_URL}/admin-resources?resource=maintenance`,
      setMaintenanceIssues,
      'maintenance'
    );
  };

  const fetchPricingRules = async () => {
    if (!shouldFetchPricing) return;
    await fetchWithTTL(
      `${API_BASE_URL}/admin-resources?resource=pricing-rules`,
      setPricingRules,
      'pricing-rules'
    );
  };

  const fetchExpenses = async () => {
    if (!shouldFetchExpenses) return;
    await fetchWithTTL(
      `${API_BASE_URL}/admin-resources?resource=expenses`,
      setExpenses,
      'expenses'
    );
  };

  const fetchCleaningTasks = async () => {
    if (!shouldFetchCleaning) return;
    await fetchWithTTL(
      `${API_BASE_URL}/admin-resources?resource=cleaning`,
      setCleaningTasks,
      'cleaning'
    );
  };

  const fetchPartners = async () => {
    if (!shouldFetchPartners) return;
    await fetchWithTTL(
      `${API_BASE_URL}/admin-resources?resource=partners&action=list`,
      setPartners,
      'partners'
    );
  };

  const fetchPartnerDetail = async (id) => {
    if (!shouldFetchPartners) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/admin-resources?resource=partners&id=${id}`);
      return res.data;
    } catch (err) { console.error(err); }
  };

  const fetchPartnerSettlements = async (id) => {
    if (!shouldFetchPartners) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/admin-resources?resource=partners&id=${id}`);
      setSettlements(res.data.settlements || []);
      return res.data.settlements || [];
    } catch (err) { console.error(err); }
  };

  const calculatePartnerSettlement = async (id, periodStart, periodEnd) => {
    if (!shouldFetchPartners) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/admin-resources?resource=partners&action=calculate&id=${id}&periodStart=${periodStart}&periodEnd=${periodEnd}`);
      return res.data;
    } catch (err) { console.error(err); }
  };

  const createCleaningTask = async (data) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin-resources?resource=cleaning`, data);
      setCleaningTasks(prev => [res.data, ...prev]);
      fetchApartments();
      return res.data;
    } catch (err) { console.error(err); throw err; }
  };

  const updateCleaningTask = async (id, patch) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/admin-resources?resource=cleaning&id=${id}`, patch);
      setCleaningTasks(prev => prev.map(t => t.id === id ? { ...t, ...res.data } : t));
      if (patch.action === 'complete') fetchApartments();
      return res.data;
    } catch (err) { console.error(err); throw err; }
  };

  const deleteCleaningTask = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/admin-resources?resource=cleaning&id=${id}`);
      setCleaningTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error(err); throw err; }
  };

  const createPartner = async (data) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin-resources?resource=partners`, data);
      setPartners(prev => [res.data, ...prev]);
      toast.success('تم إنشاء الشريك بنجاح');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في إنشاء الشريك');
      throw err;
    }
  };

  const updatePartner = async (data) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/admin-resources?resource=partners&id=${data.id}`, data);
      setPartners(prev => prev.map(p => p.id === data.id ? res.data : p));
      toast.success('تم حفظ التعديلات');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في الحفظ');
      throw err;
    }
  };

  const deletePartner = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/admin-resources?resource=partners&id=${id}`);
      setPartners(prev => prev.filter(p => p.id !== id));
      toast.success('تم حذف الشريك');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في الحذف');
      throw err;
    }
  };

  const settlePartner = async (id, periodStart, periodEnd, memo) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin-resources?resource=partners&action=settle&id=${id}`, { periodStart, periodEnd, memo });
      toast.success('تم إنشاء التسوية (مسودة)');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في إنشاء التسوية');
      throw err;
    }
  };

  const markSettlementPaid = async (settlementId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin-resources?resource=partners&action=mark-paid&settlementId=${settlementId}`);
      setSettlements(prev => prev.map(s => s.id === settlementId ? res.data : s));
      toast.success('تم تحديد التسوية كمدفوعة');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في التحديث');
      throw err;
    }
  };

  const voidSettlement = async (settlementId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/admin-resources?resource=partners&action=void-settlement&settlementId=${settlementId}`);
      setSettlements(prev => prev.map(s => s.id === settlementId ? res.data : s));
      toast.success('تم إلغاء التسوية');
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'فشل في الإلغاء');
      throw err;
    }
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
    if (!shouldFetchAnalytics) return;
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

  // Initial bootstrap — gated by permissions
  useEffect(() => {
    if (!token) return;

    // Core data everyone needs
    fetchApartments();
    fetchBookings(); // full history for Balances/Excel export
    fetchLicenses();

    // Permission-gated data
    if (shouldFetchMaintenance) fetchMaintenance();
    if (shouldFetchPricing) fetchPricingRules();
    if (shouldFetchExpenses) fetchExpenses();
    if (shouldFetchCleaning) fetchCleaningTasks();
    if (shouldFetchPartners) fetchPartners();
  }, [token, shouldFetchMaintenance, shouldFetchPricing, shouldFetchExpenses, shouldFetchCleaning, shouldFetchPartners]);

  // Analytics fetch — gated and dependent on filter
  useEffect(() => {
    if (token && shouldFetchAnalytics) fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, analyticsFilter, bookings, shouldFetchAnalytics]);

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

      cleaningTasks,
      fetchCleaningTasks,
      createCleaningTask,
      updateCleaningTask,
      deleteCleaningTask,

      partners,
      settlements,
      fetchPartners,
      fetchPartnerDetail,
      fetchPartnerSettlements,
      calculatePartnerSettlement,
      createPartner,
      updatePartner,
      deletePartner,
      settlePartner,
      markSettlementPaid,
      voidSettlement,

      loading,
      isAnalyticsLoading,
      // Expose permission flags so views can conditionally render
      permissions: {
        isAdmin,
        canViewAnalytics: shouldFetchAnalytics,
        canViewPricing: shouldFetchPricing,
        canViewMaintenance: shouldFetchMaintenance,
        canViewCleaning: shouldFetchCleaning,
        canViewExpenses: shouldFetchExpenses,
        canViewBalances: shouldFetchBalances,
        canViewPartners: shouldFetchPartners,
      }
    }}>
      {children}
    </DataContext.Provider>
  );
};
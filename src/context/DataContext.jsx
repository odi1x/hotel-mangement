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
  const [staffExpenses, setStaffExpenses] = useState([]);
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalNights: 0, occupancyRate: 0, sourceCounts: {}, count: 0, dailyTrend: [] });
  const [analyticsFilter, setAnalyticsFilter] = useState({});
  const [loading] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);

  const API_BASE_URL = '/api'; // Configured via Vite proxy locally or direct path on Vercel

  const fetchApartments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/apartments`);
      setApartments(res.data);
    } catch (err) {
      console.error(err);
    }
  };


  const fetchStaffExpenses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/staff-expenses`);
      setStaffExpenses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLicenses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/licenses`);
      setLicenses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/bookings`);
      setBookings(res.data);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchApartments();

      fetchBookings();

      fetchLicenses();

      fetchStaffExpenses();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAnalytics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, analyticsFilter, bookings]);

  const addApartment = async (apartmentData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/apartments`, apartmentData);
      setApartments([res.data, ...apartments]);
    } catch (err) {
      console.error(err);
    }
  };

  const addLicense = async (licenseNumber, expirationDate) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/licenses`, { licenseNumber, expirationDate });
      setLicenses([res.data, ...licenses]);
      toast.success('تمت إضافة الترخيص بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء إضافة الترخيص');
    }
  };

  const deleteLicense = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/licenses?id=${id}`);
      setLicenses(licenses.filter(l => l.id !== id));
      toast.success('تم حذف الترخيص بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء حذف الترخيص');
    }
  };

  const updateApartment = async (apartmentData) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/apartments`, apartmentData);
      setApartments(apartments.map(a => a.id === apartmentData.id ? res.data : a));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteApartment = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/apartments?id=${id}`);
      setApartments(apartments.filter(a => a.id !== id));
      // Re-fetch bookings as cascading delete happens on server
      fetchBookings();
    } catch (err) {
      console.error(err);
    }
  };

  const addBooking = async (bookingData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/bookings`, bookingData);
      setBookings([res.data, ...bookings]);
    } catch (err) {
      console.error(err);
      throw err; // Re-throw to allow form to catch and display error
    }
  };

  const updateBooking = async (bookingData) => {
      try {
        const res = await axios.put(`${API_BASE_URL}/bookings`, bookingData);
        setBookings(bookings.map(b => b.id === bookingData.id ? res.data : b));
      } catch (err) {
        console.error(err);
        throw err;
      }
  };

  const checkoutBooking = async (id) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/bookings`, { id, isCheckout: true });
      setBookings(bookings.map(b => b.id === id ? res.data : b));
      toast.success('تم تسجيل الخروج المبكر بنجاح');
      fetchApartments(); // re-fetch apartments to update needsCleaning status
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
      throw err;
    }
  };

  const deleteBooking = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/bookings?id=${id}`);
      setBookings(bookings.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Payments                                                          */
  /* ------------------------------------------------------------------ */

  // Add a payment against a booking. On success, splice the new payment into
  // the corresponding booking's `payments` array so any UI reading from
  // context (badges, dues view, ledger modal) updates immediately.
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
      staffExpenses,
      fetchStaffExpenses,
      addPayment,
      deletePayment,
      loading,
      isAnalyticsLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};

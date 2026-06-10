import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalNights: 0, occupancyRate: 0, sourceCounts: {}, count: 0 });
  const [analyticsFilter, setAnalyticsFilter] = useState({});
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = '/api'; // Configured via Vite proxy locally or direct path on Vercel

  const fetchApartments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/apartments`);
      setApartments(res.data);
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
    }
  };

  useEffect(() => {
    if (token) {
      fetchApartments();
      fetchBookings();
      fetchLicenses();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAnalytics();
    }
  }, [token, analyticsFilter, bookings]);

  const addApartment = async (apartmentData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/apartments`, apartmentData);
      setApartments([res.data, ...apartments]);
    } catch (err) {
      console.error(err);
    }
  };

  const addLicense = async (licenseNumber) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/licenses`, { licenseNumber });
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

  const toggleTrustedStatus = async (phone, currentStatus) => {
    try {
      // Find all bookings with this phone number to update them in the local state
      const updatedBookings = bookings.map(b =>
        b.phone === phone ? { ...b, trusted: !currentStatus } : b
      );

      setBookings(updatedBookings);

      await axios.put(`${API_BASE_URL}/bookings/trusted`, { phone, trusted: !currentStatus });
      toast.success(currentStatus ? 'تم إزالة حالة الموثوقية' : 'تم تعيين النزيل كموثوق');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحديث حالة النزيل');
      // fetchBookings will implicitly re-fetch
      fetchBookings();
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
      toggleTrustedStatus,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};

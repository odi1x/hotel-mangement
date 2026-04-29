import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { token } = useAuth();

  const [apartments, setApartments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalNights: 0, sourceCounts: {}, count: 0 });
  const [analyticsFilter, setAnalyticsFilter] = useState('all');
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
      const res = await axios.get(`${API_BASE_URL}/analytics`, {
        params: { apartmentId: analyticsFilter }
      });
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchApartments();
      fetchBookings();
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

  return (
    <DataContext.Provider value={{
      apartments,
      bookings,
      analytics,
      analyticsFilter,
      setAnalyticsFilter,
      addApartment,
      updateApartment,
      deleteApartment,
      addBooking,
      deleteBooking,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};

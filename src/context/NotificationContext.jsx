import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';


const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const API_BASE_URL = '/api';

  const fetchNotifications = async () => {
    if (!token) return;
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/notifications`);
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();

    if (token) {
      const interval = setInterval(fetchNotifications, 60000); // Poll every 60 seconds
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const markAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      await axios.put(`${API_BASE_URL}/notifications`, { id, isRead: true });
    } catch (err) {
      console.error(err);
      fetchNotifications(); // Revert on failure
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await axios.post(`${API_BASE_URL}/notifications/mark-all-read`);
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  const clearAll = async () => {
    try {
      // Optimistically remove read notifications from the UI list
      setNotifications(notifications.filter(n => !n.isRead));
      await axios.post(`${API_BASE_URL}/notifications/clear-all`);
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
      fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

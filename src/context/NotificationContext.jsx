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
      await axios.post(`${API_BASE_URL}/notifications?action=mark-all-read`);
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };


  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported by the browser.');
      return false;
    }

    try {
      // 1. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Permission for notifications was denied');
        return false;
      }

// 2. Register Service Worker using exact origin
      const registration = await navigator.serviceWorker.register(`${window.location.origin}/sw.js`)
        .then(reg => {
          console.log('Service Worker registered on correct origin:', reg.scope);
          return reg;
        })
        .catch(err => {
          console.error('Service Worker Registration Failed:', err);
          throw err;
        });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // 3. Get VAPID public key from backend
      const vapidRes = await axios.get(`${API_BASE_URL}/notifications?action=push`);
      const publicVapidKey = vapidRes.data.publicKey;
      if (!publicVapidKey) {
          throw new Error('No VAPID public key returned from server.');
      }

      // 4. Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
      console.log('Push subscription generated:', subscription);

      // 5. Send subscription to backend
      await axios.post(`${API_BASE_URL}/notifications?action=push`, {
        subscription: subscription
      });
      console.log('Subscription successfully saved to DB');

      return true;
    } catch (err) {
      console.error('Failed to subscribe to push notifications', err);
      return false;
    }
  };

  const clearAll = async () => {
    try {
      // Optimistically remove read notifications from the UI list
      setNotifications(notifications.filter(n => !n.isRead));
      await axios.post(`${API_BASE_URL}/notifications?action=clear-all`);
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
      subscribeToPushNotifications,
      fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

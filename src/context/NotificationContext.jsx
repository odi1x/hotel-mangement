import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';


const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const API_BASE_URL = '/api';

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/notifications`);
      const list = Array.isArray(res.data) ? res.data : res.data.notifications;
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length);
      setHasMore(Array.isArray(res.data) ? false : Boolean(res.data.hasMore));
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const loadMore = async () => {
    if (!token || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/notifications`, {
        params: { skip: notifications.length, take: 20 },
      });
      const list = Array.isArray(res.data) ? res.data : res.data.notifications;
      setNotifications(prev => [...prev, ...list]);
      setHasMore(Array.isArray(res.data) ? false : Boolean(res.data.hasMore));
    } catch (err) {
      console.error('Failed to load more notifications', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (!token) return;
    // Polling every 60s (was 20s) — that's ~1,440 fetches/day per open tab
    // instead of ~4,320. Skip entirely when the tab is hidden: nobody's
    // looking, no point burning DB compute. focus/visibilitychange listeners
    // still refresh instantly when the user returns, so notifications never
    // feel stale in practice.
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchNotifications();
    }, 60000);
    const onFocus = () => fetchNotifications();
    const onVisible = () => { if (!document.hidden) fetchNotifications(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
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

  const subscribeToPushNotifications = async ({ interactive = true } = {}) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported by the browser.');
      return false;
    }

    try {
      // 1. Permission — only prompt when the user explicitly asked (interactive).
      // Auto-resubscribe on load must never surface a permission prompt.
      let permission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
      if (permission !== 'granted') {
        if (!interactive) return false;
        permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Permission for notifications was denied');
          return false;
        }
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

      // 4. Reuse an existing subscription when present so a browser-rotated
      // endpoint gets re-synced; only create a new one if none exists.
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
        console.log('Push subscription generated:', subscription);
      }

      // 5. Send subscription to backend (idempotent by endpoint)
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

  // Best-effort self-heal: if the user already granted notification permission,
  // make sure this browser has a live subscription registered server-side.
  // Runs quietly on login — never prompts and never throws.
  useEffect(() => {
    if (!token) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    subscribeToPushNotifications({ interactive: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      hasMore,
      loadingMore,
      loadMore,
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

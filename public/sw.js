/* global self, clients */
const ICON = '/favicon.svg';

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const title = data.title || 'تنبيه جديد';
  const options = {
    body: data.body || '',
    icon: ICON,
    badge: ICON,
    dir: 'rtl',
    lang: 'ar',
    data: {
      link: data.link || null,
      tag: data.tag || null,
    },
  };

  if (data.tag) options.tag = data.tag;
  if (data.urgent) {
    options.requireInteraction = true;
    options.vibrate = [200, 100, 200, 100, 200];
  } else {
    options.vibrate = [100, 50, 100];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = (event.notification.data && event.notification.data.link) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((focused) => {
            focused.postMessage({ type: 'navigate', link: target });
            return focused;
          });
        }
      }
      return clients.openWindow(target);
    })
  );
});

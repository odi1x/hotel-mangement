/* global clients */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'تنبيه جديد', body: '' };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/vite.svg', // Ensure an icon path exists
      badge: '/vite.svg',
      vibrate: [100, 50, 100],
      dir: 'rtl'
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

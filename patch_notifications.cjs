const fs = require('fs');
let code = fs.readFileSync('src/context/NotificationContext.jsx', 'utf8');

const sseEffect = `
  // Real-time SSE listener
  useEffect(() => {
    if (!user) return;

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    let eventSource;
    let reconnectTimeout;

    const connectSSE = () => {
      eventSource = new EventSource(\`/api/notifications/sse?token=\${localStorage.getItem('token')}\`);

      eventSource.onmessage = (event) => {
        try {
          const newNotif = JSON.parse(event.data);

          // Trigger browser notification
          if (Notification.permission === 'granted') {
            const browserNotif = new Notification('نظام إدارة الشقق', {
              body: newNotif.message,
              icon: '/favicon.ico', // or logo
              dir: 'rtl'
            });
            browserNotif.onclick = () => {
              window.focus();
              // Navigate or focus logic here
            };
          }

          // Trigger toast
          toast(newNotif.message, { icon: '🔔' });

          // Refresh notifications list
          fetchNotifications();
        } catch (e) {
          console.error('Error parsing SSE data', e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // Vercel serverless might close connections; attempt to reconnect
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user]);
`;

if (!code.includes('api/notifications/sse')) {
    code = code.replace("fetchNotifications();\n  }, [user]);", "fetchNotifications();\n  }, [user]);\n" + sseEffect);
}

fs.writeFileSync('src/context/NotificationContext.jsx', code);

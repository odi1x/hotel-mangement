const fs = require('fs');

let pubCode = fs.readFileSync('src/components/views/PublicBookingView.jsx', 'utf8');
pubCode = pubCode.replace(/\/api\/public\/apartments/g, '/api/public?action=apartments');
pubCode = pubCode.replace(/\/api\/public\/book/g, '/api/public?action=book');
fs.writeFileSync('src/components/views/PublicBookingView.jsx', pubCode);

let modalCode = fs.readFileSync('src/components/ui/PhotoManagementModal.jsx', 'utf8');
modalCode = modalCode.replace(/\/api\/imagekit-auth/g, '/api/auth?action=imagekit-auth');
fs.writeFileSync('src/components/ui/PhotoManagementModal.jsx', modalCode);

let notifCode = fs.readFileSync('src/context/NotificationContext.jsx', 'utf8');
notifCode = notifCode.replace(/\/api\/notifications\/sse/g, '/api/notifications?action=sse');
fs.writeFileSync('src/context/NotificationContext.jsx', notifCode);

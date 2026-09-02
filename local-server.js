import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authHandler from './api/auth.js';
import staffExpensesHandler from './api/staff-expenses.js';
import apartmentsHandler from './api/apartments.js';
import bookingsHandler from './api/bookings.js';
import licensesHandler from './api/licenses.js';
import notificationsHandler from './api/notifications.js';
import dailyCronHandler from './api/cron/daily.js';
import analyticsHandler from './api/analytics.js';
import staffHandler from './api/staff.js';

const app = express();
app.use(cors());
app.use(express.json());

const adaptHandler = (handler) => (req, res) => {
    return handler(req, res);
};

app.all('/api/auth', adaptHandler(authHandler));
app.all('/api/staff-expenses', adaptHandler(staffExpensesHandler));
app.all('/api/apartments', adaptHandler(apartmentsHandler));
app.all('/api/bookings', adaptHandler(bookingsHandler));
app.all('/api/licenses', adaptHandler(licensesHandler));
app.all('/api/notifications', adaptHandler(notificationsHandler));
app.all('/api/cron/daily', adaptHandler(dailyCronHandler));
app.all('/api/analytics', adaptHandler(analyticsHandler));
app.all('/api/staff', adaptHandler(staffHandler));

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Local dev API server running at http://localhost:${PORT}`);
});

import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authHandler from './api/auth.js';
import staffExpensesHandler from './api/staff-expenses.js';
import apartmentsHandler from './api/apartments.js';
import bookingsHandler from './api/bookings.js';
import trustedBookingsHandler from './api/bookings/trusted.js';
import licensesHandler from './api/licenses.js';
import analyticsHandler from './api/analytics.js';
import uploadAuthHandler from './api/upload/auth.js';
import staffHandler from './api/staff.js';
import staffIdHandler from './api/staff/[id].js';

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
app.all('/api/bookings/trusted', adaptHandler(trustedBookingsHandler));
app.all('/api/analytics', adaptHandler(analyticsHandler));
app.get('/api/upload/auth', adaptHandler(uploadAuthHandler));
app.all('/api/staff', adaptHandler(staffHandler));
app.all('/api/staff/:id', (req, res) => {
    // Basic simulation of Next.js / Vercel dynamic routing for local dev
    adaptHandler(staffIdHandler)(req, res);
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Local dev API server running at http://localhost:${PORT}`);
});

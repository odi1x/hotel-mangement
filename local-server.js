import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import registerHandler from './api/auth/register.js';
import loginHandler from './api/auth/login.js';
import meHandler from './api/auth/me.js';
import apartmentsHandler from './api/apartments.js';
import bookingsHandler from './api/bookings.js';
import analyticsHandler from './api/analytics.js';

const app = express();
app.use(cors());
app.use(express.json());

const adaptHandler = (handler) => (req, res) => {
    return handler(req, res);
};

app.post('/api/auth/register', adaptHandler(registerHandler));
app.post('/api/auth/login', adaptHandler(loginHandler));
app.all('/api/auth/me', adaptHandler(meHandler));
app.all('/api/apartments', adaptHandler(apartmentsHandler));
app.all('/api/bookings', adaptHandler(bookingsHandler));
app.all('/api/analytics', adaptHandler(analyticsHandler));

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Local dev API server running at http://localhost:${PORT}`);
});

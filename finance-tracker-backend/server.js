// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// --- Configuration ---
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;

// ─── Security: Helmet (HTTP headers) ──────────────────────────────────────────
// Adds 11+ security headers: XSS protection, nosniff, HSTS, etc.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images from other origins
  contentSecurityPolicy: false, // Disabled — frontend is served separately
}));

// ─── Security: Rate Limiting ───────────────────────────────────────────────────
// Auth routes: strict limit to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 requests per IP per 15 min
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test', // Skip in test env
});

// General API limit: prevent abuse on all endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 300,             // 300 requests per minute (generous for single-user dev)
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Limit JSON body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Health Check (public, before auth) ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    server: 'running',
    database: dbStates[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// ─── MongoDB Connection ────────────────────────────────────────────────────────
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('FATAL: MONGODB_URI is not set in .env file!');
  process.exit(1);
}

// ── Import Routes ─────────────────────────────────────────────────────────────
const passport          = require('./config/passport');
const authRouter         = require('./routes/auth');
const transactionRouter  = require('./routes/transactions');
const goalRouter         = require('./routes/goals');
const budgetRouter       = require('./routes/budgets');
const userRouter         = require('./routes/users');
const subscriptionRouter = require('./routes/subscriptions');
const walletRouter       = require('./routes/wallets');

// ── Initialize Passport (must come before routes) ──────────────────────────
app.use(passport.initialize());

// ─── Import & Start Cron Jobs ──────────────────────────────────────────────────
const { startRecurringCron, runRecurringJob } = require('./cron/recurringJob');

// ─── Mount Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',          authRouter);         // Public + limited
app.use('/api/transactions',  transactionRouter);  // Protected
app.use('/api/goals',         goalRouter);         // Protected
app.use('/api/budgets',       budgetRouter);       // Protected
app.use('/api/users',         userRouter);         // Protected — profile management
app.use('/api/subscriptions', subscriptionRouter); // Protected — subscription tracking
app.use('/api/wallets',       walletRouter);       // Protected — wallet/account management

// ─── Dev: Manual Trigger for Cron ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/admin/run-recurring', async (req, res) => {
    try {
      await runRecurringJob();
      res.json({ message: 'Recurring job executed successfully.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Don't expose stack traces in production
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
});

// ─── Start Server after DB connects ───────────────────────────────────────────
mongoose.connect(uri)
  .then(() => {
    console.log('✅ MongoDB database connection established successfully');
    startRecurringCron();
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`   Health: http://localhost:${port}/api/health`);
      console.log(`   Security: Helmet ✓ | Rate Limiting ✓ | Zod Validation ✓`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   → Check your MONGODB_URI in the .env file.');
    process.exit(1);
  });
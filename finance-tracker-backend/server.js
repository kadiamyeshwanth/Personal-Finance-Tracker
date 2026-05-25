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
app.set('trust proxy', 1);
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
  max: 100,                  // 100 requests per IP per 15 min
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for local development to avoid lockouts during testing
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') return true;
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
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
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  'https://personal-finance-tracker-jet-delta.vercel.app',
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));


// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' })); // Increased for CSV import payloads
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

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
const passport           = require('./config/passport');
const authRouter         = require('./routes/auth');
const transactionRouter  = require('./routes/transactions');
const goalRouter         = require('./routes/goals');
const budgetRouter       = require('./routes/budgets');
const userRouter         = require('./routes/users');
const subscriptionRouter = require('./routes/subscriptions');
const walletRouter       = require('./routes/wallets');
const categoryRouter     = require('./routes/categories');
const notificationRouter = require('./routes/notifications');
const insightRouter      = require('./routes/insights');
const aiRouter           = require('./routes/ai');
const moodRouter         = require('./routes/mood');
const journalRouter      = require('./routes/journal');
const streakRouter       = require('./routes/streaks');
const investmentRouter   = require('./routes/investments');
const importRouter       = require('./routes/import');
const familyRouter       = require('./routes/family');
const wrappedRouter      = require('./routes/wrapped');
const smsRouter          = require('./routes/sms');

// ── Initialize Passport (must come before routes) ──────────────────────────
app.use(passport.initialize());

// ─── Import & Start Cron Jobs ──────────────────────────────────────────────────
const { startRecurringCron, runRecurringJob } = require('./cron/recurringJob');
const { startStreakCron, runStreakJob }        = require('./cron/streakJob');
const { runBudgetAlerts }                     = require('./cron/budgetAlertJob');
const cron = require('node-cron');

// ─── Mount Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',          authRouter);         // Public + limited
app.use('/api/transactions',  transactionRouter);  // Protected
app.use('/api/goals',         goalRouter);         // Protected
app.use('/api/budgets',       budgetRouter);       // Protected
app.use('/api/users',         userRouter);         // Protected — profile management
app.use('/api/subscriptions', subscriptionRouter); // Protected — subscription tracking
app.use('/api/wallets',       walletRouter);       // Protected — wallet/account management
app.use('/api/categories',    categoryRouter);     // Protected — custom categories
app.use('/api/notifications', notificationRouter); // Protected — in-app notifications
app.use('/api/insights',      insightRouter);      // Protected — AI insights
app.use('/api/ai',            aiRouter);           // Protected — AI chat, roast, advice
app.use('/api/mood',          moodRouter);         // Protected — mood tracking
app.use('/api/journal',       journalRouter);      // Protected — financial journal
app.use('/api/streaks',       streakRouter);       // Protected — streak tracking
app.use('/api/investments',   investmentRouter);   // Protected — investment portfolio
app.use('/api/wrapped',       wrappedRouter);      // Protected — monthly wrapped
app.use('/api/import',        importRouter);       // Protected — CSV bank statement import
app.use('/api/family',        familyRouter);       // Protected — family finance groups
app.use('/api/sms',           smsRouter);          // Public webhook + protected setup

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
    // Start all cron jobs
    startRecurringCron();
    startStreakCron();
    // Budget alerts — run at 9 AM IST every day
    cron.schedule('0 9 * * *', runBudgetAlerts, { timezone: 'Asia/Kolkata' });
    console.log('⏰ Budget alert cron scheduled (runs daily at 9 AM IST).');
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`   Health: http://localhost:${port}/api/health`);
      console.log(`   Security: Helmet ✓ | Rate Limiting ✓ | Zod Validation ✓`);
      console.log(`   New routes: categories ✓ | notifications ✓ | insights ✓ | ai ✓ | mood ✓ | journal ✓ | streaks ✓ | investments ✓ | wrapped ✓`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   → Check your MONGODB_URI in the .env file.');
    process.exit(1);
  });
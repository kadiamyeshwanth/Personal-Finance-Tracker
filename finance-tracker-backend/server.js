// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // for reliable .env file pathing

// --- Configuration ---
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;

// --- Middleware ---
// Allow CORS from the configured frontend origin
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman) or matching origin
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Parses incoming JSON requests
app.use(express.json());

// --- Health Check Endpoint ---
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    server: 'running',
    database: dbStates[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// --- MongoDB Connection ---
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('FATAL: MONGODB_URI is not set in .env file! Please configure it.');
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => console.log('✅ MongoDB database connection established successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   → Check your MONGODB_URI in the .env file.');
    console.error('   → Ensure your IP is whitelisted in MongoDB Atlas Network Access.');
    console.error('   → Ensure the cluster is active (not paused) in MongoDB Atlas.');
    // Server keeps running so you can still test health endpoint
  });

// --- Import Routes ---
const transactionRouter = require('./routes/transactions');
const goalRouter = require('./routes/goals');
const budgetRouter = require('./routes/budgets');

app.use('/api/transactions', transactionRouter);
app.use('/api/goals', goalRouter);
app.use('/api/budgets', budgetRouter);

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`🚀 Server is running on port: ${port}`);
  console.log(`   Health check: http://localhost:${port}/api/health`);
});
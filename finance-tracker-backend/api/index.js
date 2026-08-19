// api/index.js — Vercel Serverless Entry Point
//
// Vercel runs each request as a serverless function invocation.
// To avoid opening a new MongoDB connection on every request, we cache
// the connection in the global scope (persists across warm invocations).

const mongoose = require('mongoose');
const path = require('path');

// Load env vars (only used locally; Vercel uses dashboard env vars)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import the configured Express app (does NOT start listening — just the app)
const app = require('../server');

// ─── Cached MongoDB Connection ────────────────────────────────────────────────
// `global.mongooseCache` persists across warm Lambda invocations on Vercel,
// preventing a new connection from being opened on every request.
let cached = global.mongooseCache;
if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is not set');

    cached.promise = mongoose.connect(uri).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ─── Serverless Handler ───────────────────────────────────────────────────────
// Vercel calls this function for every incoming request.
module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};

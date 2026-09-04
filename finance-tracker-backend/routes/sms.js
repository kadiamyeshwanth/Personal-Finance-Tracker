/**
 * routes/sms.js — SMS Forwarder Webhook
 *
 * How it works:
 *  1. User opens Settings → SMS Auto-Import → copies their unique webhook URL
 *  2. User installs an SMS-forwarder app (SMS Forwarder, MacroDroid, Tasker, etc.)
 *  3. App is configured to POST every bank/UPI SMS to our webhook URL
 *  4. We parse the SMS, AI-categorize, and auto-create a transaction
 *
 * Endpoints:
 *   POST /api/sms/webhook/:token   — receives SMS from forwarder app (no JWT, token-based)
 *   GET  /api/sms/setup            — returns user's webhook URL + token (JWT protected)
 *   POST /api/sms/token/regenerate — regenerates the webhook token (JWT protected)
 *   GET  /api/sms/history          — last 20 SMS-imported transactions (JWT protected)
 */

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const protect  = require('../middleware/protect');
const User     = require('../models/User');
const Transaction = require('../models/Transaction');
const { suggestCategory } = require('../utils/categorizer');
const { detectFlags } = require('../utils/fraudDetector');

// ── Helpers ───────────────────────────────────────────────────────────────────

const genToken = () => crypto.randomBytes(24).toString('hex');

// Indian bank / UPI sender IDs to accept (whitelist to skip spam)
const BANK_SENDERS = [
  'hdfcbk', 'sbiinb', 'sbipsg', 'icicib', 'icicit', 'axisbk', 'kotakb',
  'pnbsms', 'boiind', 'canbnk', 'unionb', 'indbnk', 'idbibk', 'yesbk',
  'paytmb', 'phonepe', 'gpay', 'googlepay', 'amazon', 'airtel',
  'jioind', 'barodabank', 'centralbk', 'syndicatebank',
  'tm-hdfcbk', 'vm-hdfcbk', 'ad-sbiupi', 'vd-icicit',
];

const isBankSender = (sender = '') => {
  const s = sender.toLowerCase().replace(/[^a-z]/g, '');
  return BANK_SENDERS.some(b => s.includes(b.replace(/[^a-z]/g, '')));
};

// ── SMS Amount Parser ─────────────────────────────────────────────────────────
const parseAmount = (sms) => {
  const m = sms.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const amt = parseFloat(m[1].replace(/,/g, ''));
  return isNaN(amt) || amt <= 0 ? null : amt;
};

// ── Date Parser ───────────────────────────────────────────────────────────────
const MON_MAP = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

const parseDate = (sms) => {
  let m;
  // DD-MM-YYYY or DD/MM/YYYY
  m = sms.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);
  }
  // DD Mon YYYY (e.g. 31 May 2026)
  m = sms.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/i);
  if (m) {
    const mo = MON_MAP[m[2].toLowerCase()];
    if (mo) return new Date(`${m[3]}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}`);
  }
  // Mon DD, YYYY
  m = sms.match(/([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const mo = MON_MAP[m[1].toLowerCase()];
    if (mo) return new Date(`${m[3]}-${String(mo).padStart(2,'0')}-${m[2].padStart(2,'0')}`);
  }
  // YYYY-MM-DD
  m = sms.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(m[0]);
  return new Date(); // fallback: now
};

// ── Transaction Type ──────────────────────────────────────────────────────────
const getType = (sms) => {
  const lower = sms.toLowerCase();
  const creditWords = ['credited', 'received', 'credit', 'added', 'cashback', 'refund', 'reversed'];
  const debitWords  = ['debited', 'paid', 'sent', 'debit', 'withdrawn', 'charged', 'deducted', 'payment'];
  const cScore = creditWords.filter(w => lower.includes(w)).length;
  const dScore = debitWords.filter(w => lower.includes(w)).length;
  return cScore > dScore ? 'income' : 'expense';
};

// ── Merchant / Payee Extractor ────────────────────────────────────────────────
const extractMerchant = (sms) => {
  let m;
  // "to VPA merchant@upi"
  m = sms.match(/to\s+(?:VPA\s+)?([A-Za-z0-9._-]+@[A-Za-z0-9]+)/i);
  if (m) return m[1].split('@')[0].replace(/[._]/g, ' ').trim();
  // "paid to Name" / "sent to Name"
  m = sms.match(/(?:paid|sent)\s+to\s+([A-Za-z\s&'.]{2,30}?)(?:\s+(?:via|on|using|at|\d)|$)/i);
  if (m) return m[1].trim();
  // "credited from Name"
  m = sms.match(/credited\s+(?:by|from)\s+([A-Za-z\s&'.]{2,30}?)(?:\s+(?:via|on|using|at|\d)|$)/i);
  if (m) return m[1].trim();
  // "at Merchant"
  m = sms.match(/at\s+([A-Za-z\s&'.]{2,30}?)(?:\s+on\s+\d|$)/i);
  if (m) return m[1].trim();
  return '';
};

// ── Main SMS Parser ───────────────────────────────────────────────────────────
const parseSMS = (smsText, sender = '') => {
  const amount = parseAmount(smsText);
  if (!amount) return null;

  const date     = parseDate(smsText);
  const type     = getType(smsText);
  const merchant = extractMerchant(smsText);
  const desc     = merchant || (type === 'income' ? 'UPI Credit' : 'UPI Payment');
  const category = suggestCategory(desc + ' ' + smsText) || (type === 'income' ? 'Other Income' : 'Other');

  return { amount, date, type, merchant, description: desc, category, sender };
};

// ── POST /api/sms/webhook/:token ─────────────────────────────────────────────
// Public endpoint (no JWT) — authenticated by per-user webhook token in URL
// Accepts: JSON body or form-encoded body (varies by SMS forwarder app)
router.post('/webhook/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(401).json({ error: 'Token required' });

    // Look up user by their SMS webhook token
    const user = await User.findOne({ smsWebhookToken: token });
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    // Extract SMS fields — different apps use different field names
    const body    = req.body || {};
    const smsText = String(
      body.message || body.sms || body.text || body.body || body.content || ''
    ).trim();
    const sender  = String(
      body.from || body.sender || body.address || body.number || ''
    ).trim();
    const timestampRaw = body.timestamp || body.sentStamp || body.receivedStamp || body.time || '';

    if (!smsText) {
      return res.status(400).json({ error: 'No message body found in request' });
    }

    // Optional: skip non-bank SMS if sender is provided and doesn't match
    // (some apps forward all SMS; we filter to bank/UPI senders only)
    if (sender && !isBankSender(sender)) {
      return res.status(200).json({ status: 'skipped', reason: 'non-bank sender' });
    }

    // Parse the SMS
    const parsed = parseSMS(smsText, sender);
    if (!parsed) {
      return res.status(200).json({ status: 'skipped', reason: 'no transaction data found' });
    }

    // Duplicate check: same userId + date ± 1 day + amount + type
    const dateFrom = new Date(parsed.date);
    dateFrom.setDate(dateFrom.getDate() - 1);
    const dateTo   = new Date(parsed.date);
    dateTo.setDate(dateTo.getDate() + 1);

    const dup = await Transaction.findOne({
      userId: user._id,
      amount: parsed.amount,
      type:   parsed.type,
      date:   { $gte: dateFrom, $lte: dateTo },
    });
    if (dup) {
      return res.status(200).json({ status: 'skipped', reason: 'duplicate transaction' });
    }

    // Create the transaction
    const txn = await Transaction.create({
      userId:      user._id,
      username:    user.username,
      type:        parsed.type,
      amount:      parsed.amount,
      date:        parsed.date,
      category:    parsed.category,
      description: parsed.description,
      merchant:    parsed.merchant,
      tags:        ['sms-auto'],
      // Same reason as the CSV importer: without these the personality engine
      // never sees impulse or late-night behaviour for SMS-imported spending,
      // which is the majority of it for anyone using the Android forwarder.
      flags:       parsed.type === 'expense'
        ? await detectFlags({ userId: user._id, amount: parsed.amount, category: parsed.category, type: parsed.type, date: parsed.date })
        : [],
      isRecurring: false,
      source:      'sms_webhook',
      smsSender:   sender,
      smsRaw:      smsText.slice(0, 500), // store original SMS (truncated)
    });

    console.log(`[SMS webhook] User ${user.username}: ₹${parsed.amount} ${parsed.type} → ${parsed.category}`);
    return res.status(201).json({ status: 'created', transactionId: txn._id });

  } catch (err) {
    console.error('[sms/webhook]', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── GET /api/sms/setup ────────────────────────────────────────────────────────
// Returns the user's webhook URL + token. Generates token if not set yet.
router.get('/setup', protect, async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Auto-generate token on first call
    if (!user.smsWebhookToken) {
      user.smsWebhookToken = genToken();
      await user.save({ validateBeforeSave: false });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const webhookUrl = `${backendUrl}/api/sms/webhook/${user.smsWebhookToken}`;

    res.json({
      token:      user.smsWebhookToken,
      webhookUrl,
      isActive:   true,
    });
  } catch (err) {
    console.error('[sms/setup]', err);
    res.status(500).json({ error: 'Failed to get SMS setup info' });
  }
});

// ── POST /api/sms/token/regenerate ───────────────────────────────────────────
// Regenerates the webhook token (invalidates the old one immediately)
router.post('/token/regenerate', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.smsWebhookToken = genToken();
    await user.save({ validateBeforeSave: false });

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const webhookUrl = `${backendUrl}/api/sms/webhook/${user.smsWebhookToken}`;

    res.json({ token: user.smsWebhookToken, webhookUrl });
  } catch (err) {
    console.error('[sms/token/regenerate]', err);
    res.status(500).json({ error: 'Failed to regenerate token' });
  }
});

// ── GET /api/sms/history ──────────────────────────────────────────────────────
// Returns the last 30 auto-imported SMS transactions for this user
router.get('/history', protect, async (req, res) => {
  try {
    // Match on `source` (set since the provenance fields were added to the
    // schema) OR the legacy 'sms-auto' tag, so rows imported before that fix
    // still show up in the user's history.
    const txns = await Transaction.find({
      userId: req.user.id,
      $or: [{ source: 'sms_webhook' }, { tags: 'sms-auto' }],
    }).sort({ createdAt: -1 }).limit(30).lean();

    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SMS history' });
  }
});

module.exports = router;

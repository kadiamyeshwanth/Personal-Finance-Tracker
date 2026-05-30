/**
 * fraudDetector.js — Flags suspicious transactions automatically.
 * Fully local — no external API needed.
 *
 * Flags:
 *  'late-night'  — Transaction recorded between 10pm–5am
 *  'impulse'     — Small purchase in discretionary category at late night
 *  'duplicate'   — Same amount + category + user within 24 hours
 *  'abnormal'    — Amount > 3x user's average for that category
 */

const Transaction = require('../models/Transaction');
const { isLateNight, isImpulse } = require('./categorizer');

/**
 * Detect flags for a new transaction before/after saving.
 *
 * @param {Object} txnData  - { userId, amount, category, type, date }
 * @param {Array}  existing - existing transactions for this user (optional, for performance)
 * @returns {Promise<string[]>} - array of flag strings
 */
const detectFlags = async ({ userId, amount, category, type, date }) => {
  const flags = [];
  const txnDate = new Date(date);

  // 1. Late night flag
  if (isLateNight(txnDate)) {
    flags.push('late-night');
  }

  // 2. Impulse flag
  if (type === 'expense' && isImpulse(amount, category, txnDate)) {
    flags.push('impulse');
  }

  // 3. Duplicate detection — same amount + category in last 24h
  const dayAgo = new Date(txnDate.getTime() - 24 * 60 * 60 * 1000);
  const duplicate = await Transaction.findOne({
    userId,
    category,
    amount,
    type,
    date: { $gte: dayAgo, $lte: new Date(txnDate.getTime() + 60000) },
  });
  if (duplicate) {
    flags.push('duplicate');
  }

  // 4. Abnormal amount — > 3x category average
  if (type === 'expense') {
    const past = await Transaction.find({
      userId, category, type: 'expense',
      date: { $gte: new Date(txnDate.getTime() - 90 * 24 * 60 * 60 * 1000) }, // last 90 days
    });
    if (past.length >= 3) {
      const avg = past.reduce((s, t) => s + t.amount, 0) / past.length;
      if (amount > avg * 3) {
        flags.push('abnormal');
      }
    }
  }

  return flags;
};

module.exports = { detectFlags };

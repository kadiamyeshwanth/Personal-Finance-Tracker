/**
 * routes/import.js — Bank CSV Statement Importer
 * POST /api/import/csv  →  bulk import transactions from parsed CSV data
 *
 * Accepts pre-parsed transaction array from frontend (after column mapping).
 * Handles:
 *   - Date parsing (multiple formats: DD/MM/YYYY, MM-DD-YYYY, YYYY-MM-DD, ISO)
 *   - Duplicate detection (same userId + date + amount + type within 1 day)
 *   - Auto-categorization via the existing categorizer utility
 *   - Bulk MongoDB insert (insertMany with ordered:false for partial success)
 */

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/protect');
const Transaction  = require('../models/Transaction');
const { suggestCategory } = require('../utils/categorizer');

// ── Date parser — handles multiple bank formats ───────────────────────────────
const parseDate = (str) => {
  if (!str) return null;
  const s = String(str).trim();

  // ISO: 2025-01-15 or 2025-01-15T...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  // DD/MM/YYYY or DD-MM-YYYY (most Indian banks)
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    let [, day, month, year] = dmy;
    if (year.length === 2) year = '20' + year;
    const d = new Date(`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`);
    return isNaN(d) ? null : d;
  }

  // MM/DD/YYYY (some formats)
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const [, month, day, year] = mdy;
    const d = new Date(`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`);
    return isNaN(d) ? null : d;
  }

  // Fallback: let JS try
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

// ── POST /api/import/csv ──────────────────────────────────────────────────────
router.post('/csv', auth, async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions provided' });
    }

    // Hard limit: max 1000 rows per import
    const rows = transactions.slice(0, 1000);

    // Fetch existing transactions for this user to detect duplicates
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existingTxns = await Transaction.find({
      userId: req.user.id,
      date:   { $gte: thirtyDaysAgo },
    }).select('date amount type').lean();

    // Build a quick lookup set: "YYYY-MM-DD|amount|type"
    const existingKeys = new Set(
      existingTxns.map(t => {
        const d = new Date(t.date);
        return `${d.toISOString().split('T')[0]}|${t.amount}|${t.type}`;
      })
    );

    let inserted = 0;
    let skipped  = 0;
    let failed   = 0;
    const toInsert = [];

    for (const row of rows) {
      try {
        // Parse date
        const date = parseDate(row.date);
        if (!date) { failed++; continue; }

        // Parse amount
        const amount = parseFloat(String(row.amount || '').replace(/[₹,\s]/g, ''));
        if (!amount || amount <= 0) { skipped++; continue; }

        const type = row.type === 'income' ? 'income' : 'expense';

        // Duplicate check
        const key = `${date.toISOString().split('T')[0]}|${amount}|${type}`;
        if (existingKeys.has(key)) { skipped++; continue; }

        // Auto-categorize
        const description = String(row.description || '').trim();
        const category    = suggestCategory(description) || (type === 'income' ? 'Salary' : 'Other');

        toInsert.push({
          userId:      req.user.id,
          type,
          amount,
          date,
          category,
          description,
          merchant:    description.split(' ')[0] || '',   // use first word as merchant hint
          tags:        [],
          flags:       [],
          isRecurring: false,
          source:      'csv_import',
        });

        // Add to seen set to prevent duplicates within same import batch
        existingKeys.add(key);
      } catch {
        failed++;
      }
    }

    // Bulk insert
    if (toInsert.length > 0) {
      try {
        const result = await Transaction.insertMany(toInsert, { ordered: false });
        inserted = result.length;
      } catch (bulkErr) {
        // ordered:false — partial success is possible
        inserted = bulkErr.result?.nInserted || 0;
        failed  += toInsert.length - inserted;
      }
    }

    skipped += (rows.length - toInsert.length - failed);

    res.json({
      inserted,
      skipped:  Math.max(0, skipped),
      failed,
      total:    rows.length,
      message:  `Imported ${inserted} of ${rows.length} transactions`,
    });
  } catch (err) {
    console.error('[import/csv]', err);
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;

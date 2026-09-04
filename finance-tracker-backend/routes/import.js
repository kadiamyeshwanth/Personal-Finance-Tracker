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
    const toInsert = [];
    // Per-row outcomes so the UI can tell the user exactly which rows didn't
    // make it and why — "Imported 45 of 50" on its own is not actionable.
    const errors  = [];   // rows that could not be parsed
    const skipped = [];   // rows deliberately not imported (duplicates)

    // `row` index is 0-based; +2 converts it to the line number the user sees
    // in their spreadsheet (1-based, plus the header row).
    const lineNo = (i) => i + 2;
    const label  = (row) => String(row?.description || row?.date || '').trim().slice(0, 60);

    rows.forEach((row, i) => {
      try {
        // Parse date
        const date = parseDate(row.date);
        if (!date) {
          errors.push({ row: lineNo(i), reason: `Unrecognised date "${String(row.date ?? '').slice(0, 30)}"`, description: label(row) });
          return;
        }

        // Parse amount
        const amount = parseFloat(String(row.amount || '').replace(/[₹,\s]/g, ''));
        if (!amount || amount <= 0 || !isFinite(amount)) {
          errors.push({ row: lineNo(i), reason: `Invalid amount "${String(row.amount ?? '').slice(0, 30)}"`, description: label(row) });
          return;
        }

        const type = row.type === 'income' ? 'income' : 'expense';

        // Duplicate check
        const key = `${date.toISOString().split('T')[0]}|${amount}|${type}`;
        if (existingKeys.has(key)) {
          skipped.push({ row: lineNo(i), reason: 'Duplicate — already in your transactions', description: label(row) });
          return;
        }

        // Auto-categorize
        const description = String(row.description || '').trim();
        const category    = suggestCategory(description) || (type === 'income' ? 'Salary' : 'Other');

        toInsert.push({
          userId:      req.user.id,
          // `username` is required by the Transaction schema — omitting it made
          // every insertMany() below fail validation, so no CSV row ever landed.
          username:    req.user.username,
          type,
          amount,
          date,
          category,
          description,
          merchant:    description.split(' ')[0] || '',   // use first word as merchant hint
          tags:        ['csv-import'],
          flags:       [],
          isRecurring: false,
          source:      'csv_import',
          _row:        lineNo(i),   // stripped before insert; used to map failures back to rows
        });

        // Add to seen set to prevent duplicates within same import batch
        existingKeys.add(key);
      } catch (rowErr) {
        errors.push({ row: lineNo(i), reason: rowErr.message || 'Could not parse row', description: label(row) });
      }
    });

    // Bulk insert
    if (toInsert.length > 0) {
      const docs = toInsert.map(({ _row, ...doc }) => doc);
      try {
        const result = await Transaction.insertMany(docs, { ordered: false });
        inserted = result.length;
      } catch (bulkErr) {
        // ordered:false — Mongo/Mongoose inserts what it can and reports the rest.
        inserted = bulkErr.insertedDocs?.length ?? bulkErr.result?.nInserted ?? 0;

        // Map each write/validation failure back to its original CSV line.
        const failures = [
          ...(bulkErr.writeErrors || []),
          ...Object.values(bulkErr.errors || {}),
        ];
        if (failures.length > 0) {
          failures.forEach((f) => {
            const idx = f.index ?? f.err?.index;
            const src = idx != null ? toInsert[idx] : null;
            errors.push({
              row:         src?._row ?? null,
              reason:      (f.errmsg || f.message || 'Database rejected the row').slice(0, 140),
              description: src?.description || '',
            });
          });
        } else if (inserted < docs.length) {
          errors.push({ row: null, reason: bulkErr.message?.slice(0, 140) || 'Bulk insert failed', description: '' });
        }
      }
    }

    res.json({
      inserted,
      skipped: skipped.length,
      failed:  errors.length,
      total:   rows.length,
      // Capped so a badly-formatted 1000-row file can't return a giant payload.
      errors:      errors.slice(0, 50),
      skippedRows: skipped.slice(0, 50),
      truncated:   errors.length > 50 || skipped.length > 50,
      message: inserted === rows.length
        ? `Imported all ${inserted} transactions`
        : `Imported ${inserted} of ${rows.length} transactions`,
    });
  } catch (err) {
    console.error('[import/csv]', err);
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;

/**
 * routes/journal.js — Financial journal entries
 * All routes require JWT.
 */
const router       = require('express').Router();
const JournalEntry = require('../models/JournalEntry');
const Transaction  = require('../models/Transaction');
const protect      = require('../middleware/protect');

router.use(protect);

// ── POST /api/journal ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { content, mood, date } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required.' });

    const entryDate = date ? new Date(date) : new Date();
    entryDate.setHours(12, 0, 0, 0);

    const dayStart = new Date(entryDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(entryDate); dayEnd.setHours(23, 59, 59, 999);

    // Auto-calculate day's spending
    const dayTxns = await Transaction.find({ userId: req.user.id, date: { $gte: dayStart, $lte: dayEnd }, isRecurring: false });
    const totalSpentToday   = dayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalIncomeToday  = dayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    // Upsert — one entry per day
    const entry = await JournalEntry.findOneAndUpdate(
      { userId: req.user.id, date: { $gte: dayStart, $lte: dayEnd } },
      { userId: req.user.id, content, mood: mood || null, date: entryDate, totalSpentToday, totalIncomeToday },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/journal ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const entries = await JournalEntry.find({ userId: req.user.id }).sort({ date: -1 }).limit(100);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/journal/:date ───────────────────────────────────────────────────
router.get('/:date', async (req, res) => {
  try {
    const d = new Date(req.params.date);
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const entry = await JournalEntry.findOne({ userId: req.user.id, date: { $gte: dayStart, $lte: dayEnd } });
    if (!entry) return res.status(404).json({ error: 'No journal entry for this date.' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/journal/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const entry = await JournalEntry.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!entry) return res.status(404).json({ error: 'Journal entry not found.' });
    res.json({ message: 'Entry deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

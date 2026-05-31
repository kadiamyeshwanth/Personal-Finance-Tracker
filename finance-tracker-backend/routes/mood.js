/**
 * routes/mood.js — Mood tracking and spending correlation
 * All routes require JWT.
 */
const router  = require('express').Router();
const MoodLog = require('../models/MoodLog');
const Transaction = require('../models/Transaction');
const protect = require('../middleware/protect');

router.use(protect);

// ── POST /api/mood ────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { mood, note, date } = req.body;
    if (!mood) return res.status(400).json({ error: 'Mood is required.' });

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(12, 0, 0, 0); // normalize to noon

    // Upsert — one mood per day
    const log = await MoodLog.findOneAndUpdate(
      { userId: req.user.id, date: { $gte: new Date(logDate.toDateString()), $lt: new Date(new Date(logDate).setDate(logDate.getDate() + 1)) } },
      { userId: req.user.id, mood, note: note || '', date: logDate },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/mood ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { limit = 90 } = req.query;
    const logs = await MoodLog.find({ userId: req.user.id })
      .sort({ date: -1 }).limit(Number(limit));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/mood/correlation ──────────────────────────────────────────────
// Returns average daily spend per mood type
router.get('/correlation', async (req, res) => {
  try {
    const logs = await MoodLog.find({ userId: req.user.id });
    const transactions = await Transaction.find({ userId: req.user.id, type: 'expense', isRecurring: false });

    const moodSpend = {};
    const moodCount = {};

    for (const log of logs) {
      const dayStart = new Date(log.date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(log.date); dayEnd.setHours(23, 59, 59, 999);
      const daySpend = transactions
        .filter(t => new Date(t.date) >= dayStart && new Date(t.date) <= dayEnd)
        .reduce((s, t) => s + t.amount, 0);

      moodSpend[log.mood] = (moodSpend[log.mood] || 0) + daySpend;
      moodCount[log.mood] = (moodCount[log.mood] || 0) + 1;
    }

    const correlation = Object.entries(moodSpend).map(([mood, total]) => ({
      mood,
      avgSpend: Math.round(total / (moodCount[mood] || 1)),
      totalSpend: Math.round(total),
      count: moodCount[mood],
    })).sort((a, b) => b.avgSpend - a.avgSpend);

    res.json(correlation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

/**
 * routes/insights.js — AI-driven financial insights endpoints
 * All routes require JWT.
 */
const router    = require('express').Router();
const protect   = require('../middleware/protect');
const Transaction = require('../models/Transaction');
const Budget    = require('../models/Budget');
const Goal      = require('../models/Goal');
const Subscription = require('../models/Subscription');
const { getPersonality, getPredictions } = require('../utils/personalityEngine');
const { suggestCategory } = require('../utils/categorizer');

router.use(protect);

// ── GET /api/insights/personality ──────────────────────────────────────────
router.get('/personality', async (req, res) => {
  try {
    const [transactions, budgets] = await Promise.all([
      Transaction.find({ userId: req.user.id, isRecurring: false }),
      Budget.find({ userId: req.user.id }),
    ]);
    const personality = getPersonality(transactions, budgets);
    res.json(personality);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/insights/predictions ──────────────────────────────────────────
router.get('/predictions', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id, isRecurring: false });
    const predictions = getPredictions(transactions);
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/insights/spending-patterns ─────────────────────────────────────
router.get('/spending-patterns', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id, isRecurring: false });
    const expenses = transactions.filter(t => t.type === 'expense');

    const now = new Date();
    const thisMonth = (t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = (t) => {
      const d = new Date(t.date);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    };

    // Weekend vs weekday
    const weekendExp = expenses.filter(t => { const d = new Date(t.date).getDay(); return d === 0 || d === 6; });
    const weekdayExp = expenses.filter(t => { const d = new Date(t.date).getDay(); return d > 0 && d < 6; });
    const weekendAvg = weekendExp.length > 0 ? weekendExp.reduce((s, t) => s + t.amount, 0) / weekendExp.length : 0;
    const weekdayAvg = weekdayExp.length > 0 ? weekdayExp.reduce((s, t) => s + t.amount, 0) / weekdayExp.length : 0;

    // Day-of-week totals
    const dayTotals = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      total: expenses.filter(t => new Date(t.date).getDay() === day).reduce((s, t) => s + t.amount, 0),
    }));

    // Worst spending day
    const worstDay = [...dayTotals].sort((a, b) => b.total - a.total)[0];

    // MoM change
    const thisMonthTotal = expenses.filter(thisMonth).reduce((s, t) => s + t.amount, 0);
    const lastMonthTotal = expenses.filter(lastMonth).reduce((s, t) => s + t.amount, 0);
    const momChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    res.json({
      weekendAvgSpend: Math.round(weekendAvg),
      weekdayAvgSpend: Math.round(weekdayAvg),
      weekendPremium: weekdayAvg > 0 ? Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100) : 0,
      dayOfWeekTotals: dayTotals,
      worstSpendingDay: worstDay,
      thisMonthTotal,
      lastMonthTotal,
      momChangePercent: Math.round(momChange),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/insights/heatmap ────────────────────────────────────────────────
// Returns hour-of-day × day-of-week spending matrix
router.get('/heatmap', async (req, res) => {
  try {
    const expenses = await Transaction.find({ userId: req.user.id, type: 'expense', isRecurring: false });

    // 7 days × 24 hours grid (day=0 Sun, hour=0–23)
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    expenses.forEach(t => {
      const d = new Date(t.date);
      const day  = d.getDay();
      const hour = d.getHours();
      grid[day][hour] += t.amount;
    });

    res.json({ grid, days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/insights/recurring-suggestions ─────────────────────────────────
// Detect potential recurring expenses from transaction history
router.get('/recurring-suggestions', async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const transactions = await Transaction.find({
      userId: req.user.id, type: 'expense', isRecurring: false,
      date: { $gte: sixMonthsAgo },
    });

    // Group by category + approximate amount (within 20% tolerance)
    const groups = {};
    transactions.forEach(t => {
      const key = `${t.category}__${Math.round(t.amount / 100) * 100}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    // A recurring pattern = same category + similar amount appearing >= 2 times
    const suggestions = Object.entries(groups)
      .filter(([, txns]) => txns.length >= 2)
      .map(([key, txns]) => {
        const [category] = key.split('__');
        const avgAmount = txns.reduce((s, t) => s + t.amount, 0) / txns.length;
        const dates = txns.map(t => new Date(t.date)).sort((a, b) => a - b);
        const gapDays = dates.length > 1
          ? (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24) / (dates.length - 1)
          : 30;
        const frequency = gapDays <= 2 ? 'daily' : gapDays <= 10 ? 'weekly' : gapDays <= 35 ? 'monthly' : 'yearly';
        return { category, avgAmount: Math.round(avgAmount), frequency, occurrences: txns.length, merchant: txns[0].merchant || txns[0].description || category };
      })
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 8);

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/insights/suggest-category ────────────────────────────────────
router.post('/suggest-category', async (req, res) => {
  try {
    const { merchant, description } = req.body;
    const text = merchant || description || '';
    const category = suggestCategory(text);
    res.json({ category, found: !!category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

/**
 * routes/wrapped.js — Monthly Wrapped data endpoint
 * Returns a curated monthly financial summary for the "Wrapped" feature.
 * All routes require JWT.
 */
const router     = require('express').Router();
const protect    = require('../middleware/protect');
const Transaction= require('../models/Transaction');
const Goal       = require('../models/Goal');
const Budget     = require('../models/Budget');
const MoodLog    = require('../models/MoodLog');
const { getPersonality } = require('../utils/personalityEngine');

router.use(protect);

// ── GET /api/wrapped?month=5&year=2026 ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const now   = new Date();
    const month = parseInt(req.query.month ?? now.getMonth());     // 0-indexed
    const year  = parseInt(req.query.year  ?? now.getFullYear());

    const start = new Date(year, month, 1);
    const end   = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const [transactions, budgets, goals, moods] = await Promise.all([
      Transaction.find({ userId: req.user.id, isRecurring: false, date: { $gte: start, $lte: end } }),
      Budget.find({ userId: req.user.id }),
      Goal.find({ userId: req.user.id }),
      MoodLog.find({ userId: req.user.id, date: { $gte: start, $lte: end } }),
    ]);

    const expenses = transactions.filter(t => t.type === 'expense');
    const income   = transactions.filter(t => t.type === 'income');
    const totalInc = income.reduce((s, t) => s + t.amount, 0);
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
    const net      = totalInc - totalExp;
    const savingsRate = totalInc > 0 ? Math.round((net / totalInc) * 100) : 0;

    // Category breakdown
    const catMap = {};
    expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    // Biggest single transaction
    const biggest = [...expenses].sort((a, b) => b.amount - a.amount)[0];

    // Worst day
    const dayMap = {};
    expenses.forEach(t => {
      const day = new Date(t.date).toDateString();
      dayMap[day] = (dayMap[day] || 0) + t.amount;
    });
    const worstDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];

    // Worst hour
    const hourMap = new Array(24).fill(0);
    expenses.forEach(t => { hourMap[new Date(t.date).getHours()] += t.amount; });
    const worstHour = hourMap.indexOf(Math.max(...hourMap));

    // Most visited merchant
    const merchantMap = {};
    expenses.forEach(t => { if (t.merchant) merchantMap[t.merchant] = (merchantMap[t.merchant] || 0) + 1; });
    const topMerchant = Object.entries(merchantMap).sort((a, b) => b[1] - a[1])[0];

    // Mood summary
    const moodCounts = {};
    moods.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1; });
    const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

    // Personality
    const personality = getPersonality(transactions, budgets);

    // Fun title
    const getTitles = () => {
      if (savingsRate > 30) return { title: 'The Silent Saver 🐢', subtitle: 'You barely spent a rupee. Legendary.' };
      if (totalExp > totalInc) return { title: 'The Chaos Champion 🌪️', subtitle: 'Money in, money out — mostly out.' };
      if (topCats[0]?.[0] === 'Food') return { title: 'The Foodie 🍕', subtitle: 'You ate your way through this month.' };
      if (topCats[0]?.[0] === 'Shopping') return { title: 'The Shopaholic 🛍️', subtitle: 'Amazon should send you a thank-you card.' };
      if (topCats[0]?.[0] === 'Entertainment') return { title: 'The Entertainer 🎬', subtitle: 'You watched, listened, and played.' };
      return { title: 'The Balanced One ⚖️', subtitle: 'A steady month, well done.' };
    };

    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    res.json({
      month: MONTH_NAMES[month],
      year,
      totalIncome:   totalInc,
      totalExpenses: totalExp,
      netSavings:    net,
      savingsRate,
      transactionCount: transactions.length,
      topCategories: topCats.slice(0, 5).map(([name, amount]) => ({ name, amount })),
      biggestTransaction: biggest ? { amount: biggest.amount, category: biggest.category, merchant: biggest.merchant || biggest.description || biggest.category } : null,
      worstSpendingDay:  worstDay  ? { date: worstDay[0], amount: Math.round(worstDay[1]) } : null,
      worstSpendingHour: worstHour,
      topMerchant:  topMerchant  ? { name: topMerchant[0], visits: topMerchant[1] } : null,
      dominantMood: dominantMood ? { mood: dominantMood[0], count: dominantMood[1] } : null,
      personality,
      ...getTitles(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

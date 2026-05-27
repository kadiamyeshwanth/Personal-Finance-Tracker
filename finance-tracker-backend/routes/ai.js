/**
 * routes/ai.js — AI Chat, Roast, Investment Advice
 * All routes require JWT. Fully local — no OpenAI API needed.
 */
const router      = require('express').Router();
const protect     = require('../middleware/protect');
const Transaction = require('../models/Transaction');
const Budget      = require('../models/Budget');
const Goal        = require('../models/Goal');
const Subscription= require('../models/Subscription');
const { generateResponse } = require('../utils/chatEngine');
const { getPersonality }   = require('../utils/personalityEngine');

router.use(protect);

// ── POST /api/ai/chat ────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Fetch user's data for context
    const [transactions, budgets, goals, subscriptions] = await Promise.all([
      Transaction.find({ userId: req.user.id, isRecurring: false }).sort({ date: -1 }).limit(500),
      Budget.find({ userId: req.user.id }),
      Goal.find({ userId: req.user.id }),
      Subscription.find({ userId: req.user.id }),
    ]);

    // Add monthlyEquivalent to subscriptions
    const enrichedSubs = subscriptions.map(s => ({
      ...s.toObject(),
      monthlyEquivalent: s.billingCycle === 'yearly' ? s.amount / 12 : s.billingCycle === 'weekly' ? s.amount * 4.33 : s.amount,
    }));

    const reply = generateResponse(message, {
      transactions, budgets, goals, subscriptions: enrichedSubs,
    });

    res.json({
      message: reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/roast ────────────────────────────────────────────────────────
// Generates funny "roast" commentary on user's spending habits
router.post('/roast', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id, isRecurring: false }).sort({ date: -1 }).limit(200);
    const expenses = transactions.filter(t => t.type === 'expense');
    const income   = transactions.filter(t => t.type === 'income');

    const totalInc = income.reduce((s, t) => s + t.amount, 0);
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
    const savingsRate = totalInc > 0 ? Math.round(((totalInc - totalExp) / totalInc) * 100) : 0;

    const catMap = {};
    expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    const topMerchants = {};
    expenses.forEach(t => {
      if (t.merchant) topMerchants[t.merchant] = (topMerchants[t.merchant] || 0) + 1;
    });
    const topMerchant = Object.entries(topMerchants).sort((a, b) => b[1] - a[1])[0];
    const lateNight = expenses.filter(t => t.flags && t.flags.includes('late-night')).length;
    const impulse = expenses.filter(t => t.flags && t.flags.includes('impulse')).length;

    const roasts = [];

    // Dynamic roasts based on actual data
    if (topCat) {
      const [cat, amt] = topCat;
      const pct = totalInc > 0 ? Math.round((amt / totalInc) * 100) : 0;
      const catRoasts = {
        Food:          `You've spent ₹${amt.toLocaleString('en-IN')} on ${cat}. Your taste buds are thriving. Your savings account is crying. 😭`,
        Entertainment: `₹${amt.toLocaleString('en-IN')} on entertainment. You're out here funding Netflix's new jet while your emergency fund has ₹0. 🍿`,
        Shopping:      `₹${amt.toLocaleString('en-IN')} on shopping. Your wardrobe has more value than your investment portfolio right now. 👜`,
        Travel:        `₹${amt.toLocaleString('en-IN')} on travel. You're exploring the world while your savings is still at the airport. ✈️`,
      };
      roasts.push(catRoasts[cat] || `You spent ₹${amt.toLocaleString('en-IN')} on ${cat} — that's ${pct}% of your income. Yikes. 💸`);
    }

    if (topMerchant) {
      roasts.push(`You've visited **${topMerchant[0]}** ${topMerchant[1]} times. They should give you a loyalty card... or a therapist. 🏆`);
    }

    if (lateNight > 3) {
      roasts.push(`${lateNight} late-night purchases detected. 11 PM you and Financial Advisor you need to have a serious conversation. 🌙`);
    }

    if (savingsRate < 5) {
      roasts.push(`Your savings rate is ${savingsRate}%. That's technically a number. Just... not a good one. Even a piggy bank would be judging you right now. 🐷`);
    } else if (savingsRate > 30) {
      roasts.push(`${savingsRate}% savings rate?! You're either a finance genius or you have zero fun. Possibly both. 🤓`);
    }

    if (impulse > 5) {
      roasts.push(`${impulse} impulse purchases detected. Your wallet has trust issues with you now. It's considering therapy. 💳`);
    }

    if (totalExp > totalInc) {
      roasts.push(`You spent more than you earned. Money goes in, money goes out — but mostly out. You're a human expense account. 📉`);
    }

    // Fallback if not enough data
    if (roasts.length < 2) {
      roasts.push(`Not enough spending data to roast you properly. Add more transactions so I can judge your life choices in detail. 😏`);
    }

    // Always end with something constructive
    roasts.push(`...But seriously, check the **AI Insights** tab for real advice. You've got this! 💪`);

    res.json({ roasts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai/investment-advice ───────────────────────────────────────────
router.get('/investment-advice', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id, isRecurring: false });
    const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const surplus  = income - expenses;
    const months   = new Set(transactions.map(t => `${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`)).size || 1;
    const monthlyAvgInc = income / months;
    const monthlyAvgExp = expenses / months;
    const monthlySurplus = monthlyAvgInc - monthlyAvgExp;
    const safeInvestment = Math.max(0, monthlySurplus * 0.5);

    const riskProfile = surplus / (income || 1) > 0.25 ? 'Moderate-Aggressive' : surplus / (income || 1) > 0.1 ? 'Moderate' : 'Conservative';

    res.json({
      monthlyIncome: Math.round(monthlyAvgInc),
      monthlyExpenses: Math.round(monthlyAvgExp),
      monthlySurplus: Math.round(monthlySurplus),
      safeMonthlyInvestment: Math.round(safeInvestment),
      riskProfile,
      emergencyFundTarget: Math.round(monthlyAvgExp * 6),
      recommendations: [
        { priority: 1, label: 'Emergency Fund', desc: `Build ${Math.round(monthlyAvgExp * 6).toLocaleString('en-IN')} (6 months expenses) in liquid FD/savings`, type: 'fd' },
        { priority: 2, label: 'Index Fund SIP', desc: `Start ₹${Math.round(safeInvestment * 0.5).toLocaleString('en-IN')}/month in a Nifty 50 index fund`, type: 'mutual_fund' },
        { priority: 3, label: 'PPF / NPS', desc: `Invest ₹${Math.round(safeInvestment * 0.3).toLocaleString('en-IN')}/month for tax benefits (80C)`, type: 'ppf' },
        { priority: 4, label: 'Direct Equity', desc: `Only allocate ₹${Math.round(safeInvestment * 0.2).toLocaleString('en-IN')} to individual stocks if comfortable with risk`, type: 'stocks' },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

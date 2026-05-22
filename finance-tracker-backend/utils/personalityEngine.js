/**
 * personalityEngine.js — Classify user's financial personality and generate insights.
 * Fully local — no external API needed.
 *
 * Personalities:
 *  🌪️ Chaos Spender    — impulsive, high frequency, many late-night purchases
 *  🥷 Budget Ninja      — sticks to budgets, consistent spending
 *  💎 Luxury Addict     — high average transaction amount, premium categories
 *  🐢 Silent Saver      — high savings rate, low discretionary spend
 *  ⚡ Impulse King/Queen — frequent small purchases in Food/Entertainment
 *  ⚖️  Balanced Spender  — moderate savings, diverse categories
 */

/**
 * Analyse transactions and budgets to determine financial personality.
 *
 * @param {Array}  transactions - user's transactions (non-recurring)
 * @param {Array}  budgets      - user's budgets
 * @returns {Object} { type, emoji, title, description, traits[] }
 */
const getPersonality = (transactions, budgets) => {
  if (!transactions || transactions.length < 5) {
    return {
      type: 'unknown',
      emoji: '🌱',
      title: 'New Explorer',
      description: 'Add more transactions to discover your financial personality.',
      traits: ['Just getting started'],
      color: '#6366f1',
    };
  }

  const expenses = transactions.filter(t => t.type === 'expense');
  const income   = transactions.filter(t => t.type === 'income');

  const totalInc = income.reduce((s, t) => s + t.amount, 0);
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;

  // Count impulse + late-night flags
  const impulseTxns   = expenses.filter(t => t.flags && t.flags.includes('impulse')).length;
  const lateNightTxns = expenses.filter(t => t.flags && t.flags.includes('late-night')).length;
  const impulseRate   = expenses.length > 0 ? (impulseTxns / expenses.length) * 100 : 0;

  // Average transaction value
  const avgExpense = expenses.length > 0 ? totalExp / expenses.length : 0;

  // Budget adherence
  const catSpend = {};
  expenses.forEach(t => { catSpend[t.category] = (catSpend[t.category] || 0) + t.amount; });
  const budgetAdherence = budgets.length > 0
    ? budgets.filter(b => (catSpend[b.category] || 0) <= b.limit).length / budgets.length
    : 0.5;

  // Category diversity
  const uniqueCats = new Set(expenses.map(t => t.category)).size;

  // Scoring logic
  let scores = {
    chaos:    0,
    ninja:    0,
    luxury:   0,
    saver:    0,
    impulse:  0,
    balanced: 0,
  };

  // Chaos Spender
  if (impulseRate > 30)        scores.chaos += 3;
  if (lateNightTxns > 5)       scores.chaos += 2;
  if (budgetAdherence < 0.3)   scores.chaos += 2;
  if (savingsRate < 5)         scores.chaos += 1;

  // Budget Ninja
  if (budgetAdherence > 0.8)   scores.ninja += 4;
  if (budgets.length >= 3)     scores.ninja += 2;
  if (savingsRate > 15)        scores.ninja += 2;

  // Luxury Addict
  if (avgExpense > 3000)       scores.luxury += 4;
  if (catSpend['Shopping'] > totalExp * 0.3) scores.luxury += 2;
  if (catSpend['Entertainment'] > totalExp * 0.2) scores.luxury += 1;

  // Silent Saver
  if (savingsRate > 30)        scores.saver += 5;
  if (savingsRate > 20)        scores.saver += 2;
  if (impulseTxns === 0)       scores.saver += 2;
  if (uniqueCats < 4)          scores.saver += 1;

  // Impulse King/Queen
  if (impulseRate > 20)        scores.impulse += 3;
  if (lateNightTxns > 3)       scores.impulse += 2;
  if (avgExpense < 500)        scores.impulse += 2;

  // Balanced Spender
  if (savingsRate >= 15 && savingsRate <= 30) scores.balanced += 4;
  if (uniqueCats >= 4)         scores.balanced += 2;
  if (budgetAdherence > 0.5)   scores.balanced += 2;

  // Find winner
  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

  const PERSONALITY_MAP = {
    chaos: {
      type: 'chaos',
      emoji: '🌪️',
      title: 'Chaos Spender',
      description: 'You spend freely and spontaneously! Life is exciting, but your wallet might disagree. Setting a few budgets could make a huge difference.',
      traits: ['Impulsive purchases', 'Late-night spending', 'Budget overruns'],
      color: '#c4554d',
    },
    ninja: {
      type: 'ninja',
      emoji: '🥷',
      title: 'Budget Ninja',
      description: 'You are the master of your finances! You set budgets and actually stick to them. Other people need your advice.',
      traits: ['Budget disciplined', 'Consistent spending', 'Savings-oriented'],
      color: '#0f7b6c',
    },
    luxury: {
      type: 'luxury',
      emoji: '💎',
      title: 'Luxury Addict',
      description: 'You have expensive taste! You spend big on premium things. Just make sure your income supports your lifestyle.',
      traits: ['High-value purchases', 'Premium brands', 'Lifestyle spender'],
      color: '#9065b0',
    },
    saver: {
      type: 'saver',
      emoji: '🐢',
      title: 'Silent Saver',
      description: 'You are quietly building wealth! Your savings rate is impressive. The tortoise wins the race in personal finance.',
      traits: ['High savings rate', 'Minimal impulse buys', 'Long-term thinker'],
      color: '#2383e2',
    },
    impulse: {
      type: 'impulse',
      emoji: '⚡',
      title: 'Impulse King',
      description: 'You live in the moment! Small purchases add up fast though. A ₹500 limit per impulse buy rule could save you thousands.',
      traits: ['Frequent small buys', 'Late-night purchases', 'Low avg transaction'],
      color: '#d9730d',
    },
    balanced: {
      type: 'balanced',
      emoji: '⚖️',
      title: 'Balanced Spender',
      description: 'You have found the sweet spot! You spend on what matters, save for the future, and don\'t stress too much. Keep it up!',
      traits: ['Healthy savings rate', 'Diverse spending', 'Budget-conscious'],
      color: '#6366f1',
    },
  };

  return PERSONALITY_MAP[winner] || PERSONALITY_MAP.balanced;
};

/**
 * Generate predictions for end-of-month finances.
 */
const getPredictions = (transactions) => {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth  = now.getDate();
  const daysLeft    = daysInMonth - dayOfMonth;

  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !t.isRecurring;
  });

  const monthInc = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExp = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const dailyRate = dayOfMonth > 0 ? monthExp / dayOfMonth : 0;
  const projectedExp = monthExp + (dailyRate * daysLeft);
  const projectedSavings = monthInc - projectedExp;

  let risk = 0;
  if (projectedSavings < 0) risk = 90;
  else if (projectedSavings < monthInc * 0.1) risk = 65;
  else if (projectedSavings < monthInc * 0.2) risk = 35;
  else risk = 10;

  return {
    currentIncome:    monthInc,
    currentExpense:   monthExp,
    dailySpendRate:   Math.round(dailyRate),
    projectedExpense: Math.round(projectedExp),
    projectedSavings: Math.round(projectedSavings),
    daysLeft,
    overspendingRisk: risk,
    riskLabel: risk >= 80 ? 'Danger Zone' : risk >= 50 ? 'At Risk' : risk >= 25 ? 'Caution' : 'On Track',
  };
};

module.exports = { getPersonality, getPredictions };

/**
 * HealthScore — Animated circular "financial health" score (0–100).
 *
 * Score is computed from:
 *   - Savings rate (30 pts max)   — income > 0, (net/income) >= 20% is full marks
 *   - Budget adherence (30 pts)   — how many budgets are under limit
 *   - Goal progress (20 pts)      — avg % progress across all goals
 *   - Activity (20 pts)           — has transactions in the past 30 days
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const SIZE = 120;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const getColor = (score) => {
  if (score >= 75) return { stroke: '#0f7b6c', bg: 'rgba(15,123,108,0.08)', label: 'Excellent', text: 'var(--green)' };
  if (score >= 50) return { stroke: '#2383e2', bg: 'rgba(35,131,226,0.08)', label: 'Good',      text: 'var(--blue)' };
  if (score >= 30) return { stroke: '#d9730d', bg: 'rgba(217,115,13,0.08)',  label: 'Fair',      text: 'var(--yellow)' };
  return             { stroke: '#c4554d', bg: 'rgba(196,85,77,0.08)',        label: 'Needs work', text: 'var(--red)' };
};

const computeScore = ({ transactions, budgets, goals }) => {
  const txns    = transactions.filter(t => !t.isRecurring);
  const income  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net     = income - expenses;
  let score = 0;

  // 1. Savings rate (30 pts)
  if (income > 0) {
    const rate = net / income;
    if (rate >= 0.20)      score += 30;
    else if (rate >= 0.10) score += 20;
    else if (rate >= 0)    score += 10;
    // negative rate = 0 pts
  }

  // 2. Budget adherence (30 pts)
  if (budgets.length > 0) {
    const spendMap = txns
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    const underBudget = budgets.filter(b => (spendMap[b.category] || 0) < b.limit).length;
    score += Math.round((underBudget / budgets.length) * 30);
  } else {
    score += 15; // Neutral if no budgets set
  }

  // 3. Goal progress (20 pts)
  if (goals.length > 0) {
    const avgPct = goals.reduce((s, g) => s + Math.min((g.currentAmount / g.targetAmount) * 100, 100), 0) / goals.length;
    score += Math.round((avgPct / 100) * 20);
  } else {
    score += 10; // Neutral if no goals set
  }

  // 4. Recent activity (20 pts)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCount = txns.filter(t => new Date(t.date) >= thirtyDaysAgo).length;
  if (recentCount >= 10)     score += 20;
  else if (recentCount >= 5) score += 14;
  else if (recentCount >= 1) score += 8;

  return Math.min(100, Math.max(0, score));
};

const HealthScore = ({ transactions = [], budgets = [], goals = [] }) => {
  const score  = useMemo(() => computeScore({ transactions, budgets, goals }), [transactions, budgets, goals]);
  const config = getColor(score);
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  // Breakdown for tooltip
  const breakdown = useMemo(() => {
    const txns    = transactions.filter(t => !t.isRecurring);
    const income  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    return { savingsRate };
  }, [transactions]);

  return (
    <div style={{
      padding: '18px 20px', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', background: 'var(--bg)',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
        Financial health
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Circular SVG */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth={STROKE}
            />
            {/* Progress */}
            <motion.circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke={config.stroke}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            />
          </svg>
          {/* Score number in centre */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ fontSize: '24px', fontWeight: 700, color: config.text, letterSpacing: '-0.03em', lineHeight: 1 }}
            >
              {score}
            </motion.span>
            <span style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.04em' }}>/ 100</span>
          </div>
        </div>

        {/* Right side */}
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 10px', borderRadius: '20px',
            background: config.bg, marginBottom: '10px',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: config.text }}>{config.label}</span>
          </div>

          {/* Score breakdown bars */}
          {[
            { label: 'Savings rate', hint: `${breakdown.savingsRate}%` },
            { label: 'Budget control',  hint: budgets.length > 0 ? `${budgets.length} set` : 'None set' },
            { label: 'Goal progress',   hint: goals.length > 0 ? `${goals.length} active` : 'None set' },
            { label: 'Recent activity', hint: `${transactions.filter(t => !t.isRecurring && new Date(t.date) >= new Date(Date.now() - 30*86400_000)).length} txns` },
          ].map(({ label, hint }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-3)', width: '90px', flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthScore;

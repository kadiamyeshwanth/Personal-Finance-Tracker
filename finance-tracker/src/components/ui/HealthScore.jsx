/**
 * HealthScore — financial health score (0–100) with a full component breakdown.
 *
 * The score is the sum of four parts; the card shows each part as a bar so the
 * number is explained, not just asserted — and points at the weakest part as
 * the thing to work on next.
 *
 *   Savings rate      30 pts   net / income
 *   Budget control    30 pts   share of budgets still under limit
 *   Goal progress     20 pts   average progress across goals
 *   Recent activity   20 pts   transactions logged in the last 30 days
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendUp } from '@phosphor-icons/react';
import { prefersReducedMotion } from '../../lib/motion';

const SIZE = 132;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/* The ring is always brand orange — it is data, and data is orange in this
   system. Only the word carries the verdict's colour. */
const band = (score) => {
  if (score >= 75) return { label: 'Excellent',  text: 'var(--green)' };
  if (score >= 50) return { label: 'Good',       text: 'var(--brand)' };
  if (score >= 30) return { label: 'Fair',       text: '#F16001' };
  return             { label: 'Needs work', text: 'var(--red)' };
};

const DAY = 86_400_000;

function analyse({ transactions, budgets, goals }) {
  const txns = transactions.filter(t => !t.isRecurring);
  const income  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = income > 0 ? (income - expenses) / income : 0;

  // 1 · Savings rate — 30
  let savePts = 0;
  if (income > 0) savePts = savingsRate >= 0.2 ? 30 : savingsRate >= 0.1 ? 20 : savingsRate >= 0 ? 10 : 0;

  // 2 · Budget control — 30
  const spendMap = txns.filter(t => t.type === 'expense')
    .reduce((a, t) => { a[t.category] = (a[t.category] || 0) + t.amount; return a; }, {});
  const under = budgets.filter(b => (spendMap[b.category] || 0) < b.limit).length;
  const budgetPts = budgets.length > 0 ? Math.round((under / budgets.length) * 30) : 15;

  // 3 · Goal progress — 20
  const avgGoal = goals.length > 0
    ? goals.reduce((s, g) => s + Math.min((g.currentAmount / g.targetAmount) * 100, 100), 0) / goals.length
    : 50;
  const goalPts = Math.round((avgGoal / 100) * 20);

  // 4 · Recent activity — 20
  const recent = txns.filter(t => new Date(t.date) >= new Date(Date.now() - 30 * DAY)).length;
  const actPts = recent >= 10 ? 20 : recent >= 5 ? 14 : recent >= 1 ? 8 : 0;

  const parts = [
    { key: 'save',   label: 'Savings rate',    pts: savePts,   max: 30, hint: income > 0 ? `${Math.round(savingsRate * 100)}%` : 'No income yet' },
    { key: 'budget', label: 'Budget control',  pts: budgetPts, max: 30, hint: budgets.length ? `${under}/${budgets.length} on track` : 'No budgets set' },
    { key: 'goal',   label: 'Goal progress',   pts: goalPts,   max: 20, hint: goals.length ? `${Math.round(avgGoal)}% funded` : 'No goals set' },
    { key: 'act',    label: 'Recent activity', pts: actPts,    max: 20, hint: `${recent} in 30 days` },
  ];
  const score = Math.min(100, Math.max(0, parts.reduce((s, p) => s + p.pts, 0)));
  const weakest = [...parts].sort((a, b) => (a.pts / a.max) - (b.pts / b.max))[0];
  return { score, parts, weakest };
}

export default function HealthScore({ transactions = [], budgets = [], goals = [] }) {
  const reduced = prefersReducedMotion();
  const { score, parts, weakest } = useMemo(
    () => analyse({ transactions, budgets, goals }),
    [transactions, budgets, goals],
  );
  const cfg = band(score);
  const offset = C - (score / 100) * C;

  const tip = weakest.pts / weakest.max < 0.75
    ? `Focus next on ${weakest.label.toLowerCase()} — it's holding the score back most.`
    : `Every area is in good shape. Keep it steady.`;

  return (
    <section className="hs" aria-label={`Financial health score ${score} of 100`}>
      <div className="hs-label">Financial health</div>

      <div className="hs-body">
        {/* Ring */}
        <div className="hs-ring">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--border-strong)" strokeWidth={STROKE} />
            <motion.circle
              cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
              stroke="var(--brand)" strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={C}
              initial={reduced ? false : { strokeDashoffset: C }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
            />
          </svg>
          <div className="hs-ring-num">
            <strong style={{ color: 'var(--brand)' }}>{score}</strong>
            <span>/ 100</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="hs-parts">
          <span className="hs-band" style={{ color: cfg.text, background: 'color-mix(in srgb, currentColor 12%, transparent)' }}>
            {cfg.label}
          </span>
          {parts.map((p, i) => (
            <div key={p.key} className="hs-part">
              <div className="hs-part-top">
                <span className="hs-part-label">{p.label}</span>
                <span className="hs-part-hint">{p.hint}</span>
              </div>
              <span className="hs-part-track">
                <motion.span
                  className="hs-part-fill"
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${(p.pts / p.max) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="hs-tip"><TrendUp size={13} weight="bold" /> {tip}</p>
    </section>
  );
}

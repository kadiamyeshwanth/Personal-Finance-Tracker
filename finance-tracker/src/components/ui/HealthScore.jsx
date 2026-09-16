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
import { prefersReducedMotion } from '../../lib/motion';

/* The meter is always brand orange — it is data, and data is orange in this
   system. Only the verdict tag carries the band's colour. */
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

  const tip = weakest.pts / weakest.max < 0.75
    ? `Focus next on ${weakest.label.toLowerCase()} — it's holding the score back most.`
    : `Every area is in good shape. Keep it steady.`;

  // right-hand read-out: goals funded (savings rate already has its own row)
  const goalPct = (parts.find(p => p.key === 'goal').hint.match(/^(\d+)%/) || [])[1];

  /* Instrument layout (styles/instrument.css): breadcrumb + verdict tag, two
     big read-outs, a ticked meter with a 0–100 scale, then each component as
     a labelled read-out over its own thin meter. No ring, no pill. */
  return (
    <section className="hs ins card-accent" aria-label={`Financial health score ${score} of 100`}>
      <header className="ins-head">
        <span className="ins-crumb">Financial health <i>/</i> <b>Score</b></span>
        {/* neutral unless the score is in trouble */}
        <span className={`ins-tag${cfg.label === 'Needs work' ? ' ins-tag--red' : ''}`}>{cfg.label}</span>
      </header>

      <div className="ins-metrics">
        <div>
          <span className="ins-k">Score</span>
          <strong className="ins-v">{score}<small>/100</small></strong>
        </div>
        <div>
          <span className="ins-k">Goals funded</span>
          <strong className="ins-v">{goalPct != null ? `${goalPct}%` : '—'}</strong>
        </div>
      </div>

      <div className="ins-meter" aria-hidden="true">
        <motion.i
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="ins-scale" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>

      <ul className="ins-rows">
        {parts.map((p, i) => (
          <li key={p.key} className="ins-row">
            <span className="ins-k">{p.label}</span>
            <span className="ins-row-v">{p.hint}<em>{p.pts}/{p.max}</em></span>
            <span className="ins-meter ins-meter--thin" aria-hidden="true">
              <motion.i
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${(p.pts / p.max) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          </li>
        ))}
      </ul>

      <p className="ins-foot"><span className="ins-k">Next</span><span>{tip}</span></p>
    </section>
  );
}

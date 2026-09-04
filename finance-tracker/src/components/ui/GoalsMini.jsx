/**
 * GoalsMini — a goals tracker for the dashboard rail.
 * Shows the closest-to-done goals with progress, amounts and what's left.
 * Read-only; links out to the full Goals page.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Target, Plus, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { stagger, prefersReducedMotion } from '../../lib/motion';

const inr = (n) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;

export default function GoalsMini({ goals = [] }) {
  const reduced = prefersReducedMotion();

  const rows = useMemo(() => (
    goals
      .map(g => {
        const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
        return { ...g, pct, left: Math.max(g.targetAmount - g.currentAmount, 0) };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4)
  ), [goals]);

  const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || 0), 0);
  const totalSaved  = goals.reduce((s, g) => s + Math.min(g.currentAmount || 0, g.targetAmount || 0), 0);

  return (
    <div className="dash-aside-card gm">
      <div className="gm-head">
        <div>
          <span className="dash-aside-label" style={{ margin: 0 }}>Goals</span>
          {goals.length > 0 && (
            <span className="gm-summary">{inr(totalSaved)} of {inr(totalTarget)} saved</span>
          )}
        </div>
        <Link to="/goals" className="gm-all">All <ArrowRight size={12} weight="bold" /></Link>
      </div>

      {rows.length === 0 ? (
        <Link to="/goals" className="gm-empty">
          <Plus size={14} weight="bold" /> Set your first goal
        </Link>
      ) : (
        <ul className="gm-list">
          {rows.map((g, i) => {
            const done = g.left <= 0;
            return (
              <motion.li
                key={g._id || g.id}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(i, 0.05)}
              >
                <div className="gm-row-top">
                  <span className="gm-name">
                    <Target size={13} weight="fill" /> {g.name}
                  </span>
                  <span className="gm-pct">{Math.round(g.pct)}%</span>
                </div>
                <span className="gm-track">
                  <motion.span
                    className="gm-fill"
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${g.pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <div className="gm-row-bot">
                  <span className="gm-amt money">{inr(g.currentAmount)} <i>/ {inr(g.targetAmount)}</i></span>
                  <span className={`gm-left ${done ? 'is-done' : ''}`}>
                    {done ? <><CheckCircle size={12} weight="fill" /> Funded</> : `${inr(g.left)} to go`}
                  </span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

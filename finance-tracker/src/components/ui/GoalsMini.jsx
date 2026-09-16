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
    <div className="dash-aside-card gm ins">
      <header className="ins-head">
        <h2 className="ins-crumb">Goals <i>/</i> <b>Progress</b></h2>
        <Link to="/goals" className="ins-link">All <ArrowRight size={12} weight="bold" /></Link>
      </header>

      {rows.length === 0 ? (
        <Link to="/goals" className="ins-empty">
          <span className="ins-k">No goals yet</span>
          <span className="ins-link">Set your first goal <ArrowRight size={12} weight="bold" /></span>
        </Link>
      ) : (
        <>
          <div className="ins-metrics">
            <div>
              <span className="ins-k">Saved</span>
              <strong className="ins-v ins-v--md">{inr(totalSaved)}</strong>
            </div>
            <div>
              <span className="ins-k">Target</span>
              <strong className="ins-v ins-v--md ins-v--dim">{inr(totalTarget)}</strong>
            </div>
          </div>
          <ul className="ins-rows">
            {rows.map((g, i) => {
              const done = g.left <= 0;
              return (
                <li key={g._id || g.id} className={`ins-row${done ? ' is-done' : ''}`}>
                  <span className="gm-name-ins">{g.name}</span>
                  <span className="ins-row-v">
                    {done ? <span className="ins-tag ins-tag--reached">Reached</span> : <>{Math.round(g.pct)}%<em>{inr(g.left)} to go</em></>}
                  </span>
                  <span className="ins-meter ins-meter--thin" aria-hidden="true">
                    <motion.i
                      initial={reduced ? false : { width: 0 }}
                      animate={{ width: `${g.pct}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

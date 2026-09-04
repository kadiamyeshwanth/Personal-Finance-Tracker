import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkle, ArrowUpRight } from '@phosphor-icons/react';
import { prefersReducedMotion } from '../../lib/motion';

const inr = (n) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
const short = (n) => {
  const v = Math.abs(n);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${Math.round(v / 1e3)}k`;
  return `₹${Math.round(v)}`;
};

/**
 * AiTip — a human-sounding financial nudge that types itself out and rotates
 * through a few messages. Sits where the "Savings rate" tile used to.
 * Everything is derived from data already in the page — no request, no LLM.
 */
export default function AiTip({ income = 0, net = 0, topCategory, biggest, goals = [], savingsRate = 0 }) {
  const reduced = prefersReducedMotion();

  const lines = useMemo(() => {
    const out = [];
    // Each nudge: what to do → what it's worth. Not just an observation.
    if (income > 0) {
      if (savingsRate < 0) {
        out.push(`You spent ${inr(Math.abs(net))} more than you earned. Pause your top category for two weeks and you claw most of that back.`);
      } else if (savingsRate < 20) {
        const toTwenty = Math.max(0, Math.round(income * 0.2 - net));
        out.push(`Saving ${savingsRate}% so far. Trim ${inr(toTwenty)} from spending this month and you hit the 20% mark.`);
      } else {
        const move = Math.round(net * 0.5);
        out.push(`Good month — ${savingsRate}% saved. Move ${inr(move)} into a goal today, before it drifts into next month's spending.`);
      }
    }
    if (topCategory) {
      const trim = Math.round(topCategory.amount * 0.2);
      out.push(`${topCategory.name} is your heaviest line at ${inr(topCategory.amount)}. Cap it 20% lower and that's ${inr(trim)} back toward savings.`);
    }
    if (biggest) {
      out.push(`${short(biggest.amount)} on ${biggest.merchant || biggest.category} was the single biggest hit. If that was a one-off, next month should come in lighter.`);
    }
    const near = goals
      .map(g => ({ ...g, pct: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0 }))
      .filter(g => g.pct >= 60 && g.pct < 100)
      .sort((a, b) => b.pct - a.pct)[0];
    if (near) {
      const perMonth = Math.max(1, Math.round((near.targetAmount - near.currentAmount) / 3));
      out.push(`"${near.name}" is ${Math.round(near.pct)}% there. Put ${inr(perMonth)} a month against it and it's done within a quarter.`);
    }
    return out.length ? out : ['Add a few transactions and I’ll start telling you what to do next, not just what happened.'];
  }, [income, net, topCategory, biggest, goals, savingsRate]);

  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(reduced ? lines[0] : '');
  const timers = useRef([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const full = lines[idx % lines.length];

    if (reduced) { setShown(full); return; }

    setShown('');
    let i = 0;
    const type = () => {
      i += 1;
      setShown(full.slice(0, i));
      if (i < full.length) {
        timers.current.push(setTimeout(type, 16 + Math.random() * 26));
      } else {
        // hold, then move to the next line
        timers.current.push(setTimeout(() => setIdx(v => v + 1), 4200));
      }
    };
    timers.current.push(setTimeout(type, 350));
    return () => timers.current.forEach(clearTimeout);
  }, [idx, lines, reduced]);

  return (
    <motion.section
      className="tile tile--ai"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      aria-live="polite"
    >
      <header className="tile-head">
        <span className="tile-icon"><Sparkle size={15} weight="fill" /></span>
        <div className="tile-titles">
          <h3>Clario</h3>
          <p>Assistant</p>
        </div>
        <Link to="/ai-insights" className="tile-out" aria-label="Open AI insights">
          <ArrowUpRight size={14} weight="bold" />
        </Link>
      </header>

      <p className="ai-tip-bubble">
        {shown}
        {!reduced && <i className="ai-tip-caret" aria-hidden="true" />}
      </p>

      <div className="ai-tip-dots" aria-hidden="true">
        {lines.map((_, i) => (
          <span key={i} className={i === idx % lines.length ? 'is-on' : ''} />
        ))}
      </div>
    </motion.section>
  );
}

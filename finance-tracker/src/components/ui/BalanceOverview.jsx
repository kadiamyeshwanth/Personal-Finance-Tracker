/**
 * BalanceOverview — the dashboard's lead card.
 *
 * Answers "where did my money go?" in one glance, which the research named as
 * the single most-cited need:
 *   · the net figure, large, in tabular figures
 *   · month-over-month delta, so the number has direction
 *   · a daily-spend strip for the last 45 days — the shape of the month
 *   · the top categories with their share, so the "where" is answered too
 *
 * Every value is derived from the transactions already in the cache. It fetches
 * nothing and changes no application state.
 */
import { useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight as ArrowUpRight,
  TrendUp as TrendingUp,
  TrendDown as TrendingDown,
} from '@phosphor-icons/react';
import AnimatedCounter from './AnimatedCounter';
import { stagger, spring, prefersReducedMotion } from '../../lib/motion';

const DAYS = 45;
const TOP_N = 4;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export default function BalanceOverview({ transactions = [], income = 0, expenses = 0, net = 0 }) {
  const gid = useId().replace(/:/g, '');
  const reduced = prefersReducedMotion();

  const { bars, delta, monthToDate, windowSpend, categories, maxDay } = useMemo(() => {
    const txns = transactions.filter(t => !t.isRecurring);
    const today = startOfDay(new Date());

    /* Daily expense totals for the trailing window */
    const buckets = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (DAYS - 1 - i));
      return { date: d, total: 0 };
    });
    const firstMs = buckets[0].date.getTime();

    txns.forEach(t => {
      if (t.type !== 'expense') return;
      const d = startOfDay(t.date);
      const idx = Math.round((d.getTime() - firstMs) / 86_400_000);
      if (idx >= 0 && idx < DAYS) buckets[idx].total += t.amount;
    });

    const peak = Math.max(...buckets.map(b => b.total), 1);

    /* Month-over-month change in spend — LIKE FOR LIKE.
       Comparing a partial month against a whole one is misleading: on the 1st
       it would always read "spending down ~97%". So the previous month is
       truncated to the same number of elapsed days. */
    const now = new Date();
    const dayOfMonth = now.getDate();

    const spendInMonth = (offset, maxDay) => txns
      .filter(t => {
        if (t.type !== 'expense') return false;
        const d = new Date(t.date);
        const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        return d.getFullYear() === ref.getFullYear()
          && d.getMonth() === ref.getMonth()
          && d.getDate() <= maxDay;
      })
      .reduce((s, t) => s + t.amount, 0);

    const thisMonth = spendInMonth(0, dayOfMonth);
    const lastMonth = spendInMonth(1, dayOfMonth);

    // Too little of the month has elapsed for the comparison to mean anything.
    const comparable = dayOfMonth >= 3 && lastMonth > 0;
    const pct = comparable ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

    /* Category share of spend */
    const byCat = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
    const totalSpend = Object.values(byCat).reduce((s, v) => s + v, 0) || 1;
    const cats = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([name, amount]) => ({ name, amount, pct: Math.round((amount / totalSpend) * 100) }));

    return {
      bars: buckets.map(b => ({ ...b, h: (b.total / peak) * 100 })),
      delta: pct,
      monthToDate: thisMonth,
      // what the strip below actually adds up to — always consistent with it
      windowSpend: buckets.reduce((s, b) => s + b.total, 0),
      categories: cats,
      maxDay: peak,
    };
  }, [transactions]);

  const positive = net >= 0;
  // Spending LESS than last month is the good direction — invert the usual read.
  const deltaGood = delta !== null && delta <= 0;

  return (
    <motion.section
      className="bo"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      aria-label="Balance overview"
    >
      {/* Header */}
      <header className="bo-head">
        <span className="bo-chip" aria-hidden="true">
          {positive ? <TrendingUp size={14} strokeWidth={2} /> : <TrendingDown size={14} strokeWidth={2} />}
        </span>
        <h2 className="bo-title">Net position</h2>
        <Link to="/analytics" className="bo-out" aria-label="Open analytics">
          <ArrowUpRight size={15} strokeWidth={2} />
        </Link>
      </header>

      {/* Figure + delta */}
      <div className="bo-figure">
        <span className={`bo-amount money ${positive ? '' : 'money-out'}`}>
          <AnimatedCounter value={Math.abs(net)} prefix={positive ? '₹' : '−₹'} duration={1.1} />
        </span>

        {delta !== null && (
          <span className={`bo-delta ${deltaGood ? 'is-good' : 'is-bad'}`}>
            {deltaGood ? <TrendingDown size={12} strokeWidth={2.4} /> : <TrendingUp size={12} strokeWidth={2.4} />}
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="bo-sub">
        {delta !== null
          ? `Spending ${deltaGood ? 'down' : 'up'} ${Math.abs(delta).toFixed(1)}% versus the same point last month.`
          : monthToDate > 0
            ? `₹${Math.round(monthToDate).toLocaleString('en-IN')} spent so far this month.`
            /* nothing logged yet this month — describe the strip below instead,
               so the copy can never read "₹0 spent" next to a full Out figure */
            : `₹${Math.round(windowSpend).toLocaleString('en-IN')} spent over the last ${DAYS} days.`}
      </p>

      {/* Daily spend strip — the shape of the month */}
      <div className="bo-bars" role="img"
        aria-label={`Daily spending for the last ${DAYS} days. Highest day ₹${Math.round(maxDay).toLocaleString('en-IN')}.`}>
        {bars.map((b, i) => (
          <motion.span
            key={i}
            className={`bo-bar ${b.total === 0 ? 'is-empty' : ''}`}
            initial={reduced ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={stagger(i, 0.012)}
            style={{ height: `${Math.max(b.h, b.total > 0 ? 8 : 4)}%` }}
            title={`${b.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ₹${Math.round(b.total).toLocaleString('en-IN')}`}
          />
        ))}
        <svg width="0" height="0" aria-hidden="true">
          <defs>
            <linearGradient id={`bo-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--brand-to)" />
              <stop offset="1" stopColor="var(--brand-from)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Category share */}
      {categories.length > 0 && (
        <ul className="bo-legend">
          {categories.map((c, i) => (
            <motion.li
              key={c.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(i + 2, 0.05)}
            >
              <span className="bo-dot" style={{ opacity: 1 - i * 0.2 }} aria-hidden="true" />
              <span className="bo-legend-name">{c.name}</span>
              <span className="bo-legend-pct money">{c.pct}%</span>
            </motion.li>
          ))}
        </ul>
      )}

      {/* In / out footing */}
      <footer className="bo-foot">
        <div>
          <span className="n-label">In</span>
          <span className="money money-in">₹{Math.round(income).toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="n-label">Out</span>
          <span className="money money-out">₹{Math.round(expenses).toLocaleString('en-IN')}</span>
        </div>
      </footer>
    </motion.section>
  );
}

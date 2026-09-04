/**
 * DashCards — the reference-style dashboard hero cards.
 *
 *   <AccountsCard>   Total Balance + a row per linked account
 *   <PortfolioCard>  Portfolio value + delta + a value strip + allocation grid
 *   <AIPromoCard>    the gradient "analyze my month" call-to-action
 *
 * All three read data already in the query cache and change no state.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Bank, CreditCard, Wallet as WalletIcon, Money,
  TrendUp, TrendDown, Sparkle, ChartLineUp,
} from '@phosphor-icons/react';
import AnimatedCounter from './AnimatedCounter';
import { spring, stagger, prefersReducedMotion } from '../../lib/motion';
import { buildSegments, activeSegmentColor, organicHeights, incomeColor, INCOME_LEVELS, INCOME_ACTIVE } from '../../lib/segments';

const inr = (n) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;

const ACCOUNT_ICON = {
  bank: Bank, credit: CreditCard, wallet: WalletIcon, cash: Money,
};

/* ─────────────────────────────────────────────────────────────────────────
   Total Balance
   ───────────────────────────────────────────────────────────────────────── */
export function AccountsCard({ wallets = [], totalBalance }) {
  const total = totalBalance ?? wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const rows = [...wallets].sort((a, b) => b.balance - a.balance).slice(0, 4);

  // Composition — positive balances only, as a share of the assets total.
  const assets = wallets.filter(w => (w.balance || 0) > 0);
  const assetsTotal = assets.reduce((s, w) => s + w.balance, 0) || 1;
  const debt = wallets.reduce((s, w) => s + Math.min(w.balance || 0, 0), 0);
  const comp = [...assets]
    .sort((a, b) => b.balance - a.balance)
    .map(w => ({ name: w.name, hue: w.color || 'var(--brand)', pct: (w.balance / assetsTotal) * 100 }));

  return (
    <motion.section className="dc dc--balance"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <header className="dc-head">
        <span className="dc-chip"><WalletIcon size={16} /></span>
        <h2 className="dc-title">Total balance</h2>
        <Link to="/wallets" className="dc-out" aria-label="Open wallets">
          <ArrowUpRight size={15} weight="bold" />
        </Link>
      </header>

      <div className="dc-figure money">
        <AnimatedCounter value={total} prefix="₹" duration={1.1} />
      </div>

      {comp.length > 0 && (
        <div className="dc-comp" aria-hidden="true">
          <div className="dc-comp-bar">
            {comp.map((c, i) => (
              <motion.span
                key={i}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(c.pct, 1.5)}%` }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                style={{ background: c.hue }}
                title={`${c.name} · ${Math.round(c.pct)}%`}
              />
            ))}
          </div>
          <div className="dc-comp-legend">
            <span>{comp.length} account{comp.length > 1 ? 's' : ''} holding assets</span>
            {debt < 0 && <span className="is-neg">{inr(debt)} owed</span>}
          </div>
        </div>
      )}

      <ul className="dc-accounts">
        {rows.length === 0 && (
          <li className="dc-empty">
            <Link to="/wallets" className="n-btn n-btn-default n-btn-sm">Add an account</Link>
          </li>
        )}
        {rows.map((w, i) => {
          const neg = w.balance < 0;
          const last4 = String(Math.abs(Math.round(w.balance))).slice(-4).padStart(4, '•');
          return (
            <motion.li key={w._id || w.id}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={stagger(i, 0.05)}>
              <span className="dc-card-mini" style={{ '--card-hue': w.color || 'var(--brand)' }}>
                <i className="dc-card-chip" />
              </span>
              <span className="dc-acc-block">
                <span className="dc-acc-name">
                  {w.name}
                  {w.isDefault && <em>Main</em>}
                </span>
                <span className="dc-acc-num">•••• •••• •••• {last4}</span>
              </span>
              <span className={`dc-acc-bal money ${neg ? 'is-neg' : ''}`}>
                {neg ? '−' : ''}{inr(w.balance)}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Portfolio — value + delta + monthly value strip + allocation
   ───────────────────────────────────────────────────────────────────────── */
const TYPE_LABEL = {
  mutual_fund: 'Mutual funds', stocks: 'Stocks', stock: 'Stocks', crypto: 'Crypto',
  sip: 'SIPs', fd: 'Fixed deposits', ppf: 'PPF', gold: 'Gold',
  real_estate: 'Real estate', other: 'Other',
};

export function PortfolioCard({ investments = [], transactions = [] }) {
  const reduced = prefersReducedMotion();

  const { value, invested, deltaPct, alloc, months } = useMemo(() => {
    const list = Array.isArray(investments)
      ? investments
      : (investments?.data || investments?.investments || []);
    const val = list.reduce((s, i) => s + (i.currentValue || i.investedAmount || 0), 0);
    const inv = list.reduce((s, i) => s + (i.investedAmount || 0), 0);

    const byType = {};
    list.forEach(i => {
      const k = i.type || 'other';
      byType[k] = (byType[k] || 0) + (i.currentValue || i.investedAmount || 0);
    });
    const allocList = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([type, v]) => ({ type, label: TYPE_LABEL[type] || type, pct: Math.round((v / (val || 1)) * 100) }));

    // real monthly income, trailing 12 months
    const now = new Date();
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-IN', { month: 'short' }), amount: 0 };
    });
    (transactions || []).filter(t => t.type === 'income' && !t.isRecurring).forEach(t => {
      const d = new Date(t.date);
      const b = buckets.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (b) b.amount += t.amount;
    });

    return {
      value: val,
      invested: inv,
      deltaPct: inv > 0 ? ((val - inv) / inv) * 100 : null,
      alloc: allocList,
      months: buckets,
    };
  }, [investments, transactions]);

  const maxMonth = Math.max(...months.map(m => m.amount), 1);
  const thisM = months[months.length - 1]?.amount || 0;
  const lastM = months[months.length - 2]?.amount || 0;
  const momPct = lastM > 0 ? ((thisM - lastM) / lastM) * 100 : null;
  const income12 = months.reduce((s, m) => s + m.amount, 0);
  const up = momPct != null && momPct >= 0;

  return (
    <motion.section className="dc dc--portfolio"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <header className="dc-head">
        <span className="dc-chip"><ChartLineUp size={16} /></span>
        <h2 className="dc-title">Monthly income</h2>
        <Link to="/transactions" className="dc-out" aria-label="Open transactions">
          <ArrowUpRight size={15} weight="bold" />
        </Link>
      </header>

      <div className="dc-figure-row">
        <span className="dc-figure money">
          <AnimatedCounter value={thisM} prefix="₹" duration={1.1} />
        </span>
        {momPct != null && (
          <span className={`dc-delta ${up ? 'is-up' : 'is-down'}`}>
            {up ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
            {up ? '+' : ''}{momPct.toFixed(1)}% vs last month
          </span>
        )}
      </div>
      <div className="dc-sub-note">₹{Math.round(income12).toLocaleString('en-IN')} earned over 12 months</div>

      <div className="dc-strip dc-strip--months" aria-hidden="true">
        {months.map((m, i) => {
          const h = 12 + Math.round((m.amount / maxMonth) * 76);
          const last = i === months.length - 1;
          return (
            <motion.span
              key={m.key}
              className={`dc-mbar ${last ? 'is-last' : ''}`}
              title={`${m.label}: ₹${Math.round(m.amount).toLocaleString('en-IN')}`}
              initial={reduced ? false : { height: 0 }}
              animate={{ height: h }}
              transition={{ duration: 0.5, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
            >
              <i>{m.label[0]}</i>
            </motion.span>
          );
        })}
      </div>

      <ul className="dc-alloc">
        {[...months].map((m, idx) => ({ ...m, idx }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 4)
          .map((m, i) => (
            <motion.li key={m.key}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={stagger(i, 0.05)}>
              <span className="dc-dot" style={{ background: 'var(--brand)', color: 'var(--brand)' }} />
              <span className="dc-alloc-name">{m.label}{i === 0 ? ' · best month' : ''}</span>
              <span className="dc-alloc-pct money">₹{Math.round(m.amount).toLocaleString('en-IN')}</span>
            </motion.li>
          ))}
      </ul>
    </motion.section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   AI promo
   ───────────────────────────────────────────────────────────────────────── */
export function AIPromoCard() {
  const month = new Date().toLocaleDateString('en-IN', { month: 'long' });
  return (
    <motion.section className="dc dc--ai"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <span className="dc-ai-glyph"><Sparkle size={22} weight="fill" /></span>
      <h2 className="dc-ai-title">Smart AI-Powered Financial Analytics</h2>
      <p className="dc-ai-body">
        Retrieve May report, analyse key data for informed strategic decisions.
      </p>
      <Link to="/ai-insights" className="dc-ai-btn">Analyse</Link>
      <span className="dc-ai-mesh" aria-hidden="true" />
      <span className="dc-ai-particles" aria-hidden="true">
        <i style={{ left: '70%', top: '15%', animationDelay: '0s' }} />
        <i style={{ left: '85%', top: '35%', animationDelay: '1s' }} />
        <i style={{ left: '60%', top: '45%', animationDelay: '2s' }} />
        <i style={{ left: '80%', top: '75%', animationDelay: '0.5s' }} />
        <i style={{ left: '40%', top: '10%', animationDelay: '1.5s' }} />
      </span>
    </motion.section>
  );
}

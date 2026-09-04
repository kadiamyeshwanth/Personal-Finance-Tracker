/**
 * DashTiles — the three headline figures, and the accounts card.
 *
 * Reference geometry: a row of compact stat tiles (the first one carrying the
 * accent fill), then a card listing the real accounts as a 2-up grid. Each tile
 * answers exactly one question and links to the page that explains it.
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight, Wallet as WalletIcon, ChartLineUp, PiggyBank,
  Bank, CreditCard, Money, TrendUp, TrendDown,
} from '@phosphor-icons/react';
import AnimatedCounter from './AnimatedCounter';
import ShaderBg, { DASH_SHADER } from './shader-bg';
import FloatingPaths from './FloatingPaths';
import BrandLogo from './BrandLogo';
import { spring, stagger } from '../../lib/motion';

const inr = (n) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;

/* Wallet-type → icon, so an account is identifiable without reading it. */
const TYPE_ICON = {
  bank: Bank, savings: PiggyBank, credit: CreditCard,
  cash: Money, investment: TrendUp,
};

/* ─────────────────────────────────────────────────────────────────────────
   One headline figure
   ───────────────────────────────────────────────────────────────────────── */
export function StatTile({
  label, sub, value, prefix = '₹', delta, deltaGood = true,
  icon: Icon, to, accent = false, tone, index = 0,
}) {
  // tone: 'white' | 'gray' — distinct card fills so each figure is easy to spot.
  const toneClass = accent ? 'tile--accent' : tone ? `tile--${tone}` : '';
  return (
    <motion.section
      className={`tile ${toneClass}`.trim()}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={stagger(index, 0.06)}
    >
      {accent && <ShaderBg props={DASH_SHADER} className="tile-shader" opacity={1} />}
      {!accent && tone && <FloatingPaths className="tile-fp" />}
      <header className="tile-head">
        <span className="tile-icon"><Icon size={16} weight="fill" /></span>
        <div className="tile-titles">
          <h3>{label}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {to && (
          <Link to={to} className="tile-out" aria-label={`Open ${label}`}>
            <ArrowUpRight size={14} weight="bold" />
          </Link>
        )}
      </header>

      <div className="tile-figure money">
        {typeof value === 'number'
          ? <AnimatedCounter value={value} prefix={prefix} duration={1.1} />
          : value}
      </div>

      {delta != null && (
        <span className={`tile-delta ${deltaGood ? 'is-up' : 'is-down'}`}>
          {deltaGood ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
          {delta}
        </span>
      )}
    </motion.section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Accounts — a 2-up grid of real accounts, like the reference's wallet card
   ───────────────────────────────────────────────────────────────────────── */
export function WalletCard({ wallets = [] }) {
  const rows = [...wallets].sort((a, b) => b.balance - a.balance).slice(0, 4);

  return (
    <motion.section
      className="wal"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <header className="wal-head">
        <div>
          <h2 className="wal-title">Accounts</h2>
          <p className="wal-sub">{rows.length} linked</p>
        </div>
        <Link to="/wallets" className="n-btn n-btn-default n-btn-sm">Manage</Link>
      </header>

      {rows.length === 0 ? (
        <div className="wal-empty">
          <Link to="/wallets" className="n-btn n-btn-primary n-btn-sm">Add an account</Link>
        </div>
      ) : (
        <ul className="wal-grid">
          {rows.map((w, i) => {
            const Icon = TYPE_ICON[w.type] || WalletIcon;
            const neg = w.balance < 0;
            const last4 = String(Math.abs(Math.round(w.balance))).slice(-4).padStart(4, '0');
            return (
              <motion.li
                key={w._id || w.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(i, 0.05)}
              >
                <BrandLogo name={w.name} type={w.type} size={30} radius={9} className="wal-icon" />
                <span className="wal-name">{w.name}</span>
                <span className={`wal-bal money ${neg ? 'is-neg' : ''}`}>
                  {neg ? '−' : ''}{inr(w.balance)}
                </span>
                <span className="wal-meta">
                  •••• {last4}
                  {w.isDefault && <em>Primary</em>}
                </span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}


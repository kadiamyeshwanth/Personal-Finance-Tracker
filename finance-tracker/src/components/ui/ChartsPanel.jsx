/**
 * ChartsPanel — one home for every dashboard graph, with a segmented switcher.
 *
 * The dashboard had five chart cards stacked vertically. They're all "one view
 * of my money", so they now share a single panel and a tab bar. The real chart
 * components are reused untouched; a CSS rule strips their card chrome so they
 * sit flush inside this panel.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChartBar, ChartLineUp, Wallet, TrendUp, Smiley } from '@phosphor-icons/react';
import CashFlow from './CashFlow';
import BalanceOverview from './BalanceOverview';
import TrendChart from './TrendChart';
import MoodMoney from './MoodMoney';
import { PortfolioCard } from './DashCards';
import { springFast } from '../../lib/motion';

const LS_KEY = 'clario.dash.chartTab';

export default function ChartsPanel({ transactions = [], investments = [], income = 0, expenses = 0, net = 0 }) {
  const TABS = [
    /* Each label names what the panel underneath actually renders — the tab
       and the card heading must not disagree. */
    { key: 'cashflow', label: 'Cash flow', Icon: ChartBar,     el: <CashFlow transactions={transactions} /> },
    { key: 'income',   label: 'Income',    Icon: ChartLineUp,  el: <PortfolioCard investments={investments} transactions={transactions} /> },
    { key: 'spending', label: 'Balance',   Icon: Wallet,       el: <BalanceOverview transactions={transactions} income={income} expenses={expenses} net={net} /> },
    { key: 'trend',    label: '6-month',   Icon: TrendUp,      el: <TrendChart transactions={transactions} /> },
    { key: 'mood',     label: 'Mood',      Icon: Smiley,       el: <MoodMoney /> },
  ];

  const [active, setActive] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || 'cashflow'; } catch { return 'cashflow'; }
  });
  const pick = (k) => {
    setActive(k);
    try { localStorage.setItem(LS_KEY, k); } catch { /* private mode */ }
  };

  const current = TABS.find((t) => t.key === active) || TABS[0];

  return (
    <motion.section
      className="charts-panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springFast}
    >
      <div className="charts-tabs" role="tablist" aria-label="Charts">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={active === key ? 'is-on' : ''}
            onClick={() => pick(key)}
          >
            <Icon size={14} weight={active === key ? 'fill' : 'regular'} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="charts-body">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          {current.el}
        </motion.div>
      </div>
    </motion.section>
  );
}

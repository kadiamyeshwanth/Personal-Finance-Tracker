/**
 * DashboardPage — Full AI Financial Companion Dashboard
 * Includes: greeting + avatar, stat cards, budget alerts,
 * mood check-in widget, streak badges, recent transactions,
 * 6-month chart, health score, quick links, savings rate.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendUp as TrendingUp,
  TrendDown as TrendingDown,
  ArrowRight as ArrowRight,
  CreditCard as CreditCard,
  Target as Target,
  Wallet as Wallet,
  ArrowsClockwise as RefreshCcw,
  SquaresFour as LayoutDashboard,
  Warning as AlertTriangle,
  Flame as Flame,
  Sparkle as Sparkles,
  BookOpen as BookOpen,
  Smiley as Smile,
  X as X,
} from '@phosphor-icons/react';
import { fetchTransactions } from '../api/transactions';
import { fetchGoals }        from '../api/goals';
import { fetchBudgets }      from '../api/budgets';
import { fetchStreaks }       from '../api/streaks';
import { logMood, fetchMoodHistory } from '../api/mood';
import { fetchJournal } from '../api/journal';
import PageHeader    from '../components/ui/PageHeader';
import HealthScore   from '../components/ui/HealthScore';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import BalanceOverview from '../components/ui/BalanceOverview';
import TrendChart from '../components/ui/TrendChart';
import CashFlow from '../components/ui/CashFlow';
import MoodMoney from '../components/ui/MoodMoney';
import GoalsMini from '../components/ui/GoalsMini';
import ChartsPanel from '../components/ui/ChartsPanel';
import { AccountsCard, PortfolioCard, AIPromoCard } from '../components/ui/DashCards';
import { StatTile, WalletCard } from '../components/ui/DashTiles';
import AiTip from '../components/ui/AiTip';
import { fetchWallets } from '../api/wallets';
import { fetchInvestments } from '../api/investments';
import { stagger, spring } from '../lib/motion';
import {
  // the personality icons now come from lib/personality.js — one map, shared
  // with Wrapped and Settings, so the three screens can't drift apart again
  Wallet as WalletIcon, ChartLineUp,
  Smiley, SmileyMeh, SmileyNervous, SmileyBlank, SmileySad, Sparkle, Plus,
} from '@phosphor-icons/react';
import { getPersonalityVisual } from '../lib/personality';
import { useAuth }   from '../context/AuthContext';
import client        from '../api/client';
import toast         from 'react-hot-toast';

// ── Financial personality avatars ─────────────────────────────────────────────
/* Compact money label for tile deltas: ₹1.2L / ₹93k / ₹640 */
const inrShort = (n) => {
  const v = Math.abs(n);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${Math.round(v / 1e3)}k`;
  return `₹${Math.round(v)}`;
};

// ── Mood options ──────────────────────────────────────────────────────────────
const MOODS = [
  { key: 'happy',    Icon: Smiley,        label: 'Happy' },
  { key: 'neutral',  Icon: SmileyMeh,     label: 'Neutral' },
  { key: 'stressed', Icon: SmileyNervous, label: 'Stressed' },
  { key: 'bored',    Icon: SmileyBlank,   label: 'Bored' },
  { key: 'sad',      Icon: SmileySad,     label: 'Sad' },
];

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkelCard = () => (
  <div className="n-card" style={{ padding: '20px 22px' }}>
    <div className="n-skeleton" style={{ height: '11px', width: '60%', marginBottom: '18px' }} />
    <div className="n-skeleton" style={{ height: '28px', width: '50%' }} />
  </div>
);

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, subtext, valueColor }) => (
  <motion.div whileHover={{ boxShadow: 'var(--shadow-sm)' }} className="n-card" style={{ padding: '18px 20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: 'var(--r)', background: 'var(--bg-secondary)' }}>
        <Icon size={13} style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
      </div>
    </div>
    <div style={{ fontSize: '26px', fontWeight: 700, color: valueColor || 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
      <AnimatedCounter value={value} prefix="₹" duration={1.0} />
    </div>
    {subtext && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '3px' }}>{subtext}</div>}
  </motion.div>
);

// ── Quick link row ────────────────────────────────────────────────────────────
const QuickLink = ({ icon: Icon, label, value, to }) => (
  <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>
    <motion.div whileHover={{ backgroundColor: 'var(--bg-hover)' }}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: 'var(--r)', cursor: 'pointer', transition: 'background 0.1s' }}>
      <Icon size={14} strokeWidth={1.5} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <ArrowRight size={12} style={{ color: 'var(--text-3)', opacity: 0.5 }} />
    </motion.div>
  </Link>
);

// ── Streak Badge ──────────────────────────────────────────────────────────────
// Monochrome by design: streaks are habit markers, not money. Reserving colour
// for amounts is what keeps the figures readable at a glance.
const StreakBadge = ({ icon: Icon, label, count, index = 0 }) => {
  if (!count || count < 1) return null;
  return (
    <motion.div
      className="dash-streak"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={stagger(index, 0.06)}
      title={`${count}-day ${label} streak`}
    >
      <Icon size={13} strokeWidth={1.8} style={{ color: 'var(--text-3)' }} />
      <b>{count}d</b>
      <span>{label}</span>
    </motion.div>
  );
};

// ── Mood Check-in Widget ──────────────────────────────────────────────────────
const MoodWidget = () => {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: moodHistory = [] } = useQuery({
    queryKey: ['mood'],
    queryFn: fetchMoodHistory,
    staleTime: 60_000,
  });

  const todayMood = moodHistory.find(m => m.date?.startsWith(today));

  const logMoodMut = useMutation({
    mutationFn: (mood) => logMood({ mood, date: today }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mood'] }); toast.success('Mood logged'); },
    onError: () => toast.error('Could not log mood'),
  });

  return (
    <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <Smile size={13} strokeWidth={1.5} style={{ color: 'var(--text-3)' }} />
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {todayMood ? "Today's mood" : 'How are you feeling?'}
        </span>
      </div>

      {todayMood ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(() => {
            const M = MOODS.find(m => m.key === todayMood.mood);
            return M ? <M.Icon size={26} weight="fill" style={{ color: 'var(--brand)' }} /> : null;
          })()}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>{todayMood.mood}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>logged today</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {MOODS.map(({ key, Icon, label }) => (
            <motion.button key={key}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              onClick={() => logMoodMut.mutate(key)}
              disabled={logMoodMut.isPending}
              title={label}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--r)',
                padding: '5px 8px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}>
              <Icon size={19} weight="fill" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Finance Avatar Card ───────────────────────────────────────────────────────
const AvatarCard = ({ personality }) => {
  const av = getPersonalityVisual(personality);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ padding: '14px 16px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
        Finance type
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '11px', background: 'var(--brand-bg)', flexShrink: 0 }}>
          <av.Icon size={20} weight="fill" style={{ color: 'var(--brand)' }} />
        </span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{personality || 'Unknown'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', lineHeight: 1.4 }}>{av.desc}</div>
        </div>
      </div>
      <Link to="/ai-insights" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--accent)', marginTop: '10px', textDecoration: 'none' }}>
        <Sparkles size={10} /> See full analysis
      </Link>
    </motion.div>
  );
};

// Fire the alert toasts at most once every 10 minutes across the whole session,
// so re-navigating back to the dashboard doesn't replay them each time.
let lastAlertAt = 0;

// ── Transient dashboard notification — small filled pill that drops in from
//    the top and auto-dismisses. One tone = one solid colour, white content. ──
const DashToast = ({ t, tone, icon, title, body, onView }) => (
  <motion.div
    initial={{ opacity: 0, y: -12, scale: 0.96 }}
    animate={
      t.visible
        ? { opacity: 1, y: 0, scale: 1 }
        : { opacity: 0, y: -12, scale: 0.96 }
    }
    transition={{ type: 'spring', bounce: 0.24, duration: 0.45 }}
    className={`dash-toast dash-toast--${tone}`}
    role="status"
  >
    <span className="dash-toast-dot">{icon}</span>
    <div className="dash-toast-body">
      <strong>{title}</strong>
      {body && <span>{body}</span>}
    </div>
    {onView && (
      <button type="button" className="dash-toast-link"
        onClick={() => { toast.dismiss(t.id); onView(); }}>View</button>
    )}
    <button type="button" className="dash-toast-x" onClick={() => toast.dismiss(t.id)} aria-label="Dismiss">
      <X size={12} weight="bold" />
    </button>
  </motion.div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const DashboardPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  // (personality avatar + mood widget retired from the dashboard layout)

  const { data: allTxns = [], isLoading: tl } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: goals   = [], isLoading: gl } = useQuery({ queryKey: ['goals'],        queryFn: fetchGoals });
  const { data: budgets = [], isLoading: bl } = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets });
  const { data: streaks }                     = useQuery({ queryKey: ['streaks'],       queryFn: fetchStreaks,  staleTime: 60_000 });
  const { data: walletData }                  = useQuery({ queryKey: ['wallets'],     queryFn: fetchWallets,     staleTime: 60_000 });
  const { data: investments = [] }            = useQuery({ queryKey: ['investments'], queryFn: fetchInvestments, staleTime: 60_000 });
  const { data: journal = [] }                = useQuery({ queryKey: ['journal'],     queryFn: fetchJournal,     staleTime: 60_000 });

  const txns      = allTxns.filter(t => !t.isRecurring);
  const recurring = allTxns.filter(t => t.isRecurring);

  const { income, expenses, net, recent } = useMemo(() => {
    const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const r   = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
    return { income: inc, expenses: exp, net: inc - exp, recent: r };
  }, [txns]);

  // Budget alerts
  const budgetAlerts = useMemo(() => {
    const spendMap = txns.filter(t => t.type === 'expense')
      .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    return budgets
      .map(b => ({ ...b, spent: spendMap[b.category] || 0, pct: ((spendMap[b.category] || 0) / b.limit) * 100 }))
      .filter(b => b.pct >= 80)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, txns]);

  // Feed for <ActivityDropdown> — budget alerts, goal milestones and the
  // day's most recent transactions. Built from data already fetched above,
  // so mounting the dropdown costs no extra request.
  const activityItems = useMemo(() => {
    const items = [];
    budgetAlerts.slice(0, 3).forEach(b => {
      items.push({
        id: `budget-${b.id || b._id}`,
        icon: <Wallet size={16} />,
        tone: b.pct >= 100 ? 'var(--red)' : 'var(--brand)',
        title: b.pct >= 100 ? `${b.category} over budget` : `${b.category} nearing limit`,
        description: `${Math.round(b.pct)}% of ₹${b.limit.toLocaleString('en-IN')} spent`,
        time: 'Today',
      });
    });
    goals.filter(g => g.targetAmount > 0 && (g.currentAmount / g.targetAmount) >= 0.85).slice(0, 2).forEach(g => {
      const pct = Math.round((g.currentAmount / g.targetAmount) * 100);
      items.push({
        id: `goal-${g.id || g._id}`,
        icon: <Target size={16} />,
        tone: 'var(--brand)',
        title: `${g.name || g.title} at ${pct}%`,
        description: pct >= 100 ? 'Goal reached — nice work.' : 'Almost there.',
        time: 'This week',
      });
    });
    recent.slice(0, 2).forEach(t => {
      items.push({
        id: `txn-${t.id || t._id}`,
        icon: <CreditCard size={16} />,
        tone: t.type === 'income' ? 'var(--brand)' : 'var(--text-3)',
        title: t.merchant || t.category,
        description: `${t.type === 'income' ? '+' : '−'}₹${t.amount.toLocaleString('en-IN')} · ${t.category}`,
        time: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      });
    });
    return items;
  }, [budgetAlerts, goals, recent]);

  const wallets      = walletData?.data || walletData?.wallets || (Array.isArray(walletData) ? walletData : []);
  const totalBalance = walletData?.totalBalance;
  const invList      = Array.isArray(investments) ? investments : (investments?.data || investments?.investments || []);
  const isLoading  = tl || gl || bl;
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

  // Last-30-days snapshot for the insight card
  const monthInsights = useMemo(() => {
    const mStart = new Date(); mStart.setDate(mStart.getDate() - 30); mStart.setHours(0, 0, 0, 0);
    const mtx = txns.filter(t => new Date(t.date) >= mStart);
    const exp = mtx.filter(t => t.type === 'expense');
    const byCat = exp.reduce((a, t) => { a[t.category] = (a[t.category] || 0) + t.amount; return a; }, {});
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const biggest = exp.slice().sort((a, b) => b.amount - a.amount)[0];
    const spent = exp.reduce((s, t) => s + t.amount, 0);
    return {
      topCat: top ? { name: top[0], amount: top[1] } : null,
      biggest: biggest || null,
      spent,
      count: mtx.length,
    };
  }, [txns]);

  const journalSorted = useMemo(
    () => [...journal].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [journal],
  );
  const journalStreak = useMemo(() => {
    const days = new Set(journalSorted.map(e => new Date(e.date).toDateString()));
    let n = 0; const d = new Date();
    while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [journalSorted]);

  // Alerts surface as transient toasts (pop in, auto-dismiss) instead of
  // permanent panels cluttering the layout. Fire once per mount.
  const notifiedRef = React.useRef(false);
  React.useEffect(() => {
    if (isLoading || notifiedRef.current) return;
    if (budgetAlerts.length === 0 && activityItems.length === 0) return;
    if (Date.now() - lastAlertAt < 10 * 60 * 1000) { notifiedRef.current = true; return; }
    notifiedRef.current = true;
    lastAlertAt = Date.now();

    const exceeded = budgetAlerts.filter(b => b.pct >= 100);
    if (budgetAlerts.length > 0) {
      const over = exceeded.length > 0;
      const list = (over ? exceeded : budgetAlerts).slice(0, 3);
      toast.custom((t) => (
        <DashToast
          t={t}
          tone={over ? 'red' : 'brand'}
          icon={<AlertTriangle size={15} weight="fill" />}
          title={over
            ? `${exceeded.length} budget${exceeded.length > 1 ? 's' : ''} exceeded`
            : `${budgetAlerts.length} budget${budgetAlerts.length > 1 ? 's' : ''} near limit`}
          body={list.map(b => `${b.category} ${Math.round(b.pct)}%`).join('  ·  ')}
          onView={() => navigate("/budgets")}
        />
      ), { id: 'dash-budget-alert', duration: 2400 });
    }

    const milestones = activityItems.filter(i => String(i.id).startsWith('goal-'));
    if (milestones.length > 0) {
      toast.custom((t) => (
        <DashToast
          t={t}
          tone="brand"
          icon={<Target size={15} weight="fill" />}
          title={`${milestones.length} goal${milestones.length > 1 ? 's' : ''} almost funded`}
          body={milestones.map(m => m.title).join('  ·  ')}
          onView={() => navigate("/goals")}
        />
      ), { id: 'dash-goal-alert', duration: 2400 });
    }
  }, [isLoading, budgetAlerts, activityItems]);

  // Streak data
  const noSpendStreak    = streaks?.noSpendStreak?.current    || 0;
  const savingsStreak    = streaks?.savingsStreak?.current    || 0;
  const healthyStreak    = streaks?.healthySpendStreak?.current || 0;

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div
        className="dash-head"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <h1 className="dash-greet">
              Welcome back, {currentUser?.username}
            </h1>
            <p className="dash-sub">
              Here is your account activity for {new Date().toLocaleDateString('en-IN', { month: 'long' })}.
            </p>
          </div>

          {/* Streak chips */}
          <div className="dash-streaks">
            <StreakBadge icon={Flame}    label="no-spend" count={noSpendStreak} index={0} />
            <StreakBadge icon={Wallet}   label="savings"  count={savingsStreak} index={1} />
            <StreakBadge icon={Sparkles} label="healthy"  count={healthyStreak} index={2} />
          </div>
        </div>
      </motion.div>

      {/* Budget / goal alerts now pop as transient toasts (see notifiedRef effect) */}

      {/* ── Headline figures ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="tile-row">
          {[0, 1, 2].map(i => <div key={i} className="n-skeleton" style={{ height: 132, borderRadius: 20 }} />)}
        </div>
      ) : (
        <div className="tile-row">
          <StatTile
            index={0} accent
            label="Total balance" sub="Across all accounts"
            value={totalBalance ?? wallets.reduce((s, w) => s + (w.balance || 0), 0)}
            icon={WalletIcon} to="/wallets"
          />
          <StatTile
            index={1} tone="white"
            label="Monthly income" sub={new Date().toLocaleDateString('en-IN', { month: 'long' })}
            value={income} icon={ChartLineUp} to="/transactions"
          />
          <AiTip
            income={income} net={net} savingsRate={savingsRate}
            topCategory={monthInsights.topCat} biggest={monthInsights.biggest}
            goals={goals}
          />
        </div>
      )}

      {/* ── Analysis ────────────────────────────────────────────────────── */}
      <div className="dash-grid">

        <div className="dash-main">

          {/* All graphs in one switchable panel */}
          {!isLoading && (
            <ChartsPanel
              transactions={allTxns}
              investments={invList}
              income={income}
              expenses={expenses}
              net={net}
            />
          )}

          {/* Recent transactions */}
          <section className="rec">
            <header className="rec-head">
              <div>
                <h2 className="rec-title">Recent transactions</h2>
                <p className="rec-sub">Your latest {recent.length} entries</p>
              </div>
              <Link to="/transactions" className="n-btn n-btn-default n-btn-sm">
                View all <ArrowRight size={12} />
              </Link>
            </header>

            <div className="rec-body">
              {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <div className="n-skeleton" style={{ height: '13px', width: '40%', margin: '0 auto' }} />
                </div>
              ) : recent.length === 0 ? (
                <div className="n-empty">
                  <div className="n-empty-icon"><CreditCard size={26} strokeWidth={1.2} /></div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)' }}>No transactions yet</p>
                  <p style={{ fontSize: '13px' }}>Add your first one to get started.</p>
                  <Link to="/transactions" className="n-btn n-btn-default n-btn-sm" style={{ marginTop: '10px', textDecoration: 'none' }}>
                    <CreditCard size={12} /> Add transaction
                  </Link>
                </div>
              ) : (
                <table className="n-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Merchant / Description</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(t => (
                      <tr key={t.id || t._id}>
                        <td style={{ color: 'var(--text-3)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td style={{ maxWidth: '180px' }}>
                          {t.merchant && <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>{t.merchant}</div>}
                          <div style={{ fontSize: '12px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.description || <span style={{ fontStyle: 'italic' }}>—</span>}
                          </div>
                        </td>
                        <td>
                          <span className="n-tag n-tag-gray">{t.category}</span>
                        </td>
                        <td className="money" style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'income' ? 'var(--brand)' : 'var(--text)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {t.type === 'income' ? '+' : '−'}₹{t.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* This month + Journal — filled with real data */}
          {!isLoading && (
            <div className="dash-pair">
              <section className="dash-insight">
                <header className="dash-insight-head">
                  <span className="dc-chip"><Sparkles size={15} weight="fill" /></span>
                  <h2>Last 30 days</h2>
                  <Link to="/ai-insights" className="dash-insight-cta">Analyse <ArrowRight size={12} weight="bold" /></Link>
                </header>
                <ul className="dash-insight-list">
                  <li>
                    <span className="dash-insight-k">Spent</span>
                    <span className="dash-insight-v money">₹{Math.round(monthInsights.spent).toLocaleString('en-IN')}</span>
                    <span className="dash-insight-note">{monthInsights.count} transactions logged</span>
                  </li>
                  {monthInsights.topCat && (
                    <li>
                      <span className="dash-insight-k">Top category</span>
                      <span className="dash-insight-v">{monthInsights.topCat.name}</span>
                      <span className="dash-insight-note">₹{Math.round(monthInsights.topCat.amount).toLocaleString('en-IN')}</span>
                    </li>
                  )}
                  {monthInsights.biggest && (
                    <li>
                      <span className="dash-insight-k">Biggest expense</span>
                      <span className="dash-insight-v">{monthInsights.biggest.merchant || monthInsights.biggest.category}</span>
                      <span className="dash-insight-note">₹{Math.round(monthInsights.biggest.amount).toLocaleString('en-IN')}</span>
                    </li>
                  )}
                  <li>
                    <span className="dash-insight-k">Savings rate</span>
                    <span className="dash-insight-v" style={{ color: savingsRate >= 20 ? 'var(--green)' : savingsRate >= 0 ? 'var(--text)' : 'var(--red)' }}>{savingsRate}%</span>
                    <span className="dash-insight-note">{inrShort(net)} kept</span>
                  </li>
                </ul>
              </section>

              <section className="dash-journal">
                <header className="dash-journal-head">
                  <span className="dc-chip"><BookOpen size={15} weight="fill" /></span>
                  <div>
                    <h2>Financial Journal</h2>
                    <p>{journalStreak > 0 ? `${journalStreak}-day streak · ${journal.length} entries` : `${journal.length} entries`}</p>
                  </div>
                  <Link to="/journal" className="dash-insight-cta">Open <ArrowRight size={12} weight="bold" /></Link>
                </header>
                {journalSorted.length === 0 ? (
                  <Link to="/journal" className="dash-journal-empty">
                    <Plus size={13} weight="bold" /> Write your first entry
                  </Link>
                ) : (
                  <ul className="dash-journal-list">
                    {journalSorted.slice(0, 3).map(e => {
                      const M = MOODS.find(m => m.key === e.mood);
                      const MIcon = M?.Icon || Smile;
                      return (
                        <li key={e._id || e.id}>
                          <MIcon size={15} weight="fill" style={{ color: 'var(--brand)', flexShrink: 0, marginTop: '1px' }} />
                          <div style={{ minWidth: 0 }}>
                            <span className="dash-journal-date">{new Date(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            <span className="dash-journal-text">{e.content}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>

        {/* ── Right column — health first, then accounts, goals ───────────── */}
        <div className="dash-aside">
          {!isLoading && <HealthScore transactions={allTxns} budgets={budgets} goals={goals} />}
          {!isLoading && <WalletCard wallets={wallets} />}
          {!isLoading && <GoalsMini goals={goals} />}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

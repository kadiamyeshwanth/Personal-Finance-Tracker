/**
 * DashboardPage — Full AI Financial Companion Dashboard
 * Includes: greeting + avatar, stat cards, budget alerts,
 * mood check-in widget, streak badges, recent transactions,
 * 6-month chart, health score, quick links, savings rate.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ArrowRight, CreditCard, Target,
  Wallet, RefreshCcw, LayoutDashboard, AlertTriangle, Flame,
  Sparkles, BookOpen, Smile,
} from 'lucide-react';
import { fetchTransactions } from '../api/transactions';
import { fetchGoals }        from '../api/goals';
import { fetchBudgets }      from '../api/budgets';
import { fetchStreaks }       from '../api/streaks';
import { logMood, fetchMoodHistory } from '../api/mood';
import PageHeader    from '../components/ui/PageHeader';
import HealthScore   from '../components/ui/HealthScore';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import { useAuth }   from '../context/AuthContext';
import client        from '../api/client';
import toast         from 'react-hot-toast';

// ── Financial personality avatars ─────────────────────────────────────────────
const AVATARS = {
  'Silent Saver':      { emoji: '🐢', color: '#4cc38a', desc: 'You save quietly and consistently.' },
  'Chaos Spender':     { emoji: '🌪️', color: '#e06c75', desc: 'Your spending is all over the place!' },
  'Budget Ninja':      { emoji: '🥷', color: '#4a9eff', desc: 'You stay within budget like a pro.' },
  'Balanced Spender':  { emoji: '⚖️', color: '#e5a445', desc: 'You balance spending and saving well.' },
  'Impulse Buyer':     { emoji: '⚡', color: '#b48eff', desc: 'You love spontaneous purchases.' },
  'Luxury Addict':     { emoji: '💎', color: '#f472b6', desc: 'You enjoy the finer things in life.' },
  'unknown':           { emoji: '💰', color: 'var(--accent)', desc: 'Keep tracking to discover your type.' },
};

// ── Mood options ──────────────────────────────────────────────────────────────
const MOODS = [
  { key: 'happy',    emoji: '😊', label: 'Happy' },
  { key: 'neutral',  emoji: '😐', label: 'Neutral' },
  { key: 'stressed', emoji: '😤', label: 'Stressed' },
  { key: 'bored',    emoji: '😒', label: 'Bored' },
  { key: 'sad',      emoji: '😢', label: 'Sad' },
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

// ── 6-month mini bar chart ─────────────────────────────────────────────────
const SpendingMiniChart = ({ transactions }) => {
  const bars = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), income: 0, expenses: 0 });
    }
    transactions.filter(t => !t.isRecurring).forEach(t => {
      const d = new Date(t.date);
      const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (!m) return;
      if (t.type === 'income')  m.income   += t.amount;
      if (t.type === 'expense') m.expenses += t.amount;
    });
    const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expenses)), 1);
    return months.map(m => ({ ...m, incPct: (m.income / maxVal) * 100, expPct: (m.expenses / maxVal) * 100 }));
  }, [transactions]);

  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>6-month overview</div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '60px' }}>
        {bars.map((m, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '48px' }}>
              <motion.div initial={{ height: 0 }} animate={{ height: `${m.incPct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                style={{ flex: 1, background: 'var(--green)', borderRadius: '2px 2px 0 0', opacity: 0.65, minHeight: m.income > 0 ? '2px' : 0 }} />
              <motion.div initial={{ height: 0 }} animate={{ height: `${m.expPct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                style={{ flex: 1, background: 'var(--red)', borderRadius: '2px 2px 0 0', opacity: 0.65, minHeight: m.expenses > 0 ? '2px' : 0 }} />
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{m.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
        {[{ label: 'Income', color: 'var(--green)' }, { label: 'Expenses', color: 'var(--red)' }].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, opacity: 0.65 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Streak Badge ──────────────────────────────────────────────────────────────
const StreakBadge = ({ emoji, label, count, color }) => {
  if (!count || count < 1) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      title={`${count}-day ${label} streak`}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 10px',
        border: `1px solid ${color}30`,
        background: `${color}10`,
        borderRadius: '20px',
        fontSize: '12px', fontWeight: 600, color,
        cursor: 'default',
      }}>
      <span style={{ fontSize: '14px' }}>{emoji}</span>
      <span>{count}d</span>
      <span style={{ fontWeight: 400, opacity: 0.75 }}>{label}</span>
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mood'] }); toast.success('Mood logged! 🎯'); },
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
          <span style={{ fontSize: '24px' }}>{MOODS.find(m => m.key === todayMood.mood)?.emoji}</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>{todayMood.mood}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>logged today</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {MOODS.map(({ key, emoji, label }) => (
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
              {emoji}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Finance Avatar Card ───────────────────────────────────────────────────────
const AvatarCard = ({ personality }) => {
  const av = AVATARS[personality] || AVATARS['unknown'];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ padding: '14px 16px', border: `1px solid ${av.color}25`, background: `${av.color}08`, borderRadius: 'var(--r-md)' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
        Finance type
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '28px' }}>{av.emoji}</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: av.color }}>{personality || 'Unknown'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', lineHeight: 1.4 }}>{av.desc}</div>
        </div>
      </div>
      <Link to="/ai-insights" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--accent)', marginTop: '10px', textDecoration: 'none' }}>
        <Sparkles size={10} /> See full analysis
      </Link>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [personality, setPersonality] = useState(null);

  const { data: allTxns = [], isLoading: tl } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: goals   = [], isLoading: gl } = useQuery({ queryKey: ['goals'],        queryFn: fetchGoals });
  const { data: budgets = [], isLoading: bl } = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets });
  const { data: streaks }                     = useQuery({ queryKey: ['streaks'],       queryFn: fetchStreaks,  staleTime: 60_000 });

  // Fetch personality on mount
  React.useEffect(() => {
    client.get('/insights/personality').then(r => setPersonality(r.data?.type)).catch(() => {});
  }, []);

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

  const isLoading  = tl || gl || bl;
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

  // Streak data
  const noSpendStreak    = streaks?.noSpendStreak?.current    || 0;
  const savingsStreak    = streaks?.savingsStreak?.current    || 0;
  const healthyStreak    = streaks?.healthySpendStreak?.current || 0;

  return (
    <div>
      {/* ── Header with avatar ───────────────────────────────────────────── */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            {/* Avatar icon */}
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', marginBottom: '12px', fontSize: '20px' }}>
              {personality ? (AVATARS[personality]?.emoji || '💰') : <LayoutDashboard size={20} strokeWidth={1.5} style={{ color: 'var(--text-2)' }} />}
            </div>
            <h1 style={{ fontSize: '40px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, letterSpacing: '-0.025em' }}>
              {greeting}, {currentUser?.username}
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '14px', marginTop: '4px' }}>
              Here's an overview of your finances.
            </p>
          </div>

          {/* Streak badges row */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            <StreakBadge emoji="🔥" label="no-spend" count={noSpendStreak}  color="#f97316" />
            <StreakBadge emoji="💰" label="savings"  count={savingsStreak}  color="#4ade80" />
            <StreakBadge emoji="✅" label="healthy"  count={healthyStreak}  color="#60a5fa" />
          </div>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginTop: '24px' }} />
      </div>

      {/* ── Budget alert banner ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!isLoading && budgetAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', marginBottom: '20px', border: '1px solid var(--red-border)', borderRadius: 'var(--r-md)', background: 'var(--red-bg)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
                {budgetAlerts.filter(b => b.pct >= 100).length > 0
                  ? `${budgetAlerts.filter(b => b.pct >= 100).length} budget(s) exceeded`
                  : `${budgetAlerts.length} budget(s) near limit`}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {budgetAlerts.map(b => (
                  <span key={b.id || b._id} style={{ fontSize: '12px', color: 'var(--text-2)' }}>{b.category}: {b.pct.toFixed(0)}%</span>
                ))}
              </div>
            </div>
            <Link to="/budgets" style={{ fontSize: '12px', color: 'var(--accent)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
              View <ArrowRight size={11} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
          <SkelCard /><SkelCard /><SkelCard />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '12px', marginBottom: '24px' }}>
          <StatCard label="Total Income"   value={income}            icon={TrendingUp}  valueColor="var(--green)" subtext={<><TrendingUp size={10} color="var(--green)" /> All time</>} />
          <StatCard label="Total Expenses" value={expenses}          icon={TrendingDown} valueColor="var(--red)"   subtext={<><TrendingDown size={10} color="var(--red)" /> All time</>} />
          <StatCard label="Net Savings"    value={Math.abs(net)}     icon={net >= 0 ? TrendingUp : TrendingDown}
            valueColor={net >= 0 ? 'var(--text)' : 'var(--red)'}
            subtext={income > 0 ? `${savingsRate}% savings rate` : (net >= 0 ? 'Positive balance' : 'Overspending')} />
        </div>
      )}

      {/* ── Main 2-column layout ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 232px', gap: '20px', alignItems: 'start' }}>

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Recent transactions */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Recent transactions</span>
              <Link to="/transactions" style={{ fontSize: '12px', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                View all <ArrowRight size={11} />
              </Link>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
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
                          <span className={`n-tag n-tag-${t.type === 'income' ? 'green' : 'red'}`}>{t.category}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'income' ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {t.type === 'income' ? '+' : '−'}₹{t.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 6-month chart */}
          {!isLoading && allTxns.length > 0 && (
            <div style={{ padding: '16px 18px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <SpendingMiniChart transactions={allTxns} />
            </div>
          )}

          {/* Journal quick access */}
          {!isLoading && (
            <Link to="/journal" style={{ textDecoration: 'none' }}>
              <motion.div whileHover={{ borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-xs)' }}
                style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <BookOpen size={16} strokeWidth={1.5} style={{ color: 'var(--text-3)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Financial Journal</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Reflect on today's spending</div>
                </div>
                <ArrowRight size={13} style={{ color: 'var(--text-3)' }} />
              </motion.div>
            </Link>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Quick links */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Quick access</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', padding: '3px' }}>
              <QuickLink icon={CreditCard} label="Transactions" value={txns.length}      to="/transactions" />
              <QuickLink icon={Target}     label="Goals"        value={goals.length}     to="/goals" />
              <QuickLink icon={Wallet}     label="Budgets"      value={budgets.length}   to="/budgets" />
              <QuickLink icon={RefreshCcw} label="Recurring"    value={recurring.length} to="/recurring" />
            </div>
          </div>

          {/* Mood check-in */}
          <MoodWidget />

          {/* Finance avatar */}
          {personality && <AvatarCard personality={personality} />}

          {/* Health score */}
          {!isLoading && (
            <HealthScore transactions={allTxns} budgets={budgets} goals={goals} />
          )}

          {/* Savings rate */}
          {!isLoading && income > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Savings rate</div>
              <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
                color: savingsRate >= 20 ? 'var(--green)' : savingsRate >= 0 ? 'var(--text)' : 'var(--red)' }}>
                {savingsRate}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>
                {savingsRate >= 20 ? '🎉 Excellent habit' : savingsRate >= 10 ? '👍 Good progress' : savingsRate >= 0 ? '💡 Room to improve' : '⚠️ Spending exceeds income'}
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'var(--progress-track)', overflow: 'hidden', marginTop: '10px' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  style={{ height: '100%', borderRadius: '2px', background: savingsRate >= 20 ? 'var(--green)' : savingsRate >= 0 ? 'var(--accent)' : 'var(--red)' }} />
              </div>
            </motion.div>
          )}

          {/* Wrapped shortcut */}
          <Link to="/wrapped" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ scale: 1.01 }}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--r-md)',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer',
              }}>
              <span style={{ fontSize: '20px' }}>✨</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Monthly Wrapped</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>See your month in stories</div>
              </div>
              <ArrowRight size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

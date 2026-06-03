/**
 * SpendingChallengesPage — Gamified spending challenges
 * Users can join challenges like "7-day no-spend", "save ₹5000 this month",
 * "coffee detox", etc. Progress is tracked in real-time against transactions.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Flame, Target, Zap, Coffee, ShoppingBag,
  Wallet, Star, CheckCircle2, Lock, TrendingDown, Clock,
  BarChart3,
} from 'lucide-react';
import { fetchTransactions } from '../api/transactions';
import { fetchBudgets }      from '../api/budgets';
import PageHeader from '../components/ui/PageHeader';
import toast from 'react-hot-toast';

// ── Challenge definitions (all local — no backend needed) ─────────────────────
const buildChallenges = (txns, budgets) => {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart  = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());

  const thisMonthTxns = txns.filter(t => new Date(t.date) >= monthStart && !t.isRecurring);
  const thisWeekTxns  = txns.filter(t => new Date(t.date) >= weekStart  && !t.isRecurring);

  const totalMonthExpense = thisMonthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalMonthIncome  = thisMonthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // Days left in month
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth   = now.getDate();
  const daysLeft     = daysInMonth - dayOfMonth;
  const daysPassed   = dayOfMonth;

  // No-spend days this month
  const spendDays = new Set(
    thisMonthTxns.filter(t => t.type === 'expense').map(t => new Date(t.date).getDate())
  );
  const noSpendDays = daysPassed - spendDays.size;

  // Coffee / food delivery spend
  const coffeeSpend  = thisMonthTxns.filter(t => ['Coffee', 'Food', 'Dining'].includes(t.category) && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const onlineSpend  = thisMonthTxns.filter(t => ['Shopping', 'Online Shopping'].includes(t.category) && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const entertainSpend = thisMonthTxns.filter(t => t.category === 'Entertainment' && t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Savings target
  const savingsAmount  = totalMonthIncome - totalMonthExpense;
  const savingsTarget  = totalMonthIncome * 0.20;

  // Daily average this month
  const dailyAvg = daysPassed > 0 ? totalMonthExpense / daysPassed : 0;
  const projectedMonthTotal = dailyAvg * daysInMonth;

  return [
    {
      id: 'no_spend_week',
      icon: Flame,
      color: '#f97316',
      title: '7-Day No-Spend Challenge',
      description: 'Go 7 consecutive days without any discretionary spending.',
      category: 'Discipline',
      difficulty: 'Medium',
      reward: '🔥 Streak Master badge',
      current: noSpendDays,
      target: 7,
      unit: 'no-spend days this month',
      completed: noSpendDays >= 7,
      tip: 'Meal prep on weekends to avoid food delivery temptation.',
    },
    {
      id: 'save_20_pct',
      icon: Target,
      color: '#4ade80',
      title: 'Save 20% of Income',
      description: `Save at least 20% of your income (₹${savingsTarget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}) this month.`,
      category: 'Savings',
      difficulty: 'Hard',
      reward: '💎 Silent Saver badge',
      current: Math.max(0, savingsAmount),
      target: Math.max(savingsTarget, 1),
      unit: 'saved this month',
      completed: savingsAmount >= savingsTarget && totalMonthIncome > 0,
      tip: 'Set up automatic transfers to savings on payday.',
    },
    {
      id: 'coffee_budget',
      icon: Coffee,
      color: '#c2a35a',
      title: 'Coffee & Food Detox',
      description: 'Keep food & coffee spending under ₹1,500 this month.',
      category: 'Food',
      difficulty: 'Easy',
      reward: '☕ Mindful Eater badge',
      current: coffeeSpend,
      target: 1500,
      unit: 'spent on food & coffee',
      lowerIsBetter: true,
      completed: coffeeSpend <= 1500,
      tip: 'Cook at home 5 days a week to easily hit this target.',
    },
    {
      id: 'no_impulse_week',
      icon: ShoppingBag,
      color: '#a78bfa',
      title: 'Zero Impulse Buys',
      description: 'Keep online shopping under ₹500 this week.',
      category: 'Shopping',
      difficulty: 'Medium',
      reward: '🛡️ Budget Ninja badge',
      current: onlineSpend,
      target: 500,
      unit: 'spent on shopping this month',
      lowerIsBetter: true,
      completed: onlineSpend <= 500,
      tip: 'Use the 24-hour rule: wait a day before any online purchase.',
    },
    {
      id: 'entertainment_cap',
      icon: Zap,
      color: '#f472b6',
      title: 'Entertainment Cap',
      description: 'Keep entertainment spending under ₹1,000 this month.',
      category: 'Entertainment',
      difficulty: 'Easy',
      reward: '🎮 Focus Mode badge',
      current: entertainSpend,
      target: 1000,
      unit: 'spent on entertainment',
      lowerIsBetter: true,
      completed: entertainSpend <= 1000,
      tip: 'Use free streaming trials and free events in your city.',
    },
    {
      id: 'track_every_day',
      icon: BarChart3,
      color: '#60a5fa',
      title: 'Daily Tracker',
      description: 'Log at least one transaction every day for 30 days.',
      category: 'Habit',
      difficulty: 'Easy',
      reward: '📊 Data Master badge',
      current: spendDays.size + noSpendDays,
      target: 30,
      unit: 'days with activity logged',
      completed: (spendDays.size + noSpendDays) >= 30,
      tip: 'Set a daily reminder at 9 PM to review and log your spending.',
    },
    {
      id: 'reduce_expenses',
      icon: TrendingDown,
      color: '#34d399',
      title: 'Expense Reduction',
      description: 'Spend less this month than last month.',
      category: 'Savings',
      difficulty: 'Hard',
      reward: '📉 Downtrend badge',
      current: totalMonthExpense,
      target: Math.max(projectedMonthTotal * 0.9, 1),   // 10% less than projected
      unit: 'spent this month',
      lowerIsBetter: true,
      completed: totalMonthExpense < projectedMonthTotal * 0.9,
      tip: "Review your last month's statement and identify one category to cut.",
    },
    {
      id: 'budget_adherence',
      icon: Wallet,
      color: '#fb923c',
      title: 'Budget Perfectionist',
      description: 'Stay under budget in ALL categories this month.',
      category: 'Budgets',
      difficulty: 'Hard',
      reward: '🏆 Budget King badge',
      current: budgets.filter(b => {
        const spent = thisMonthTxns.filter(t => t.category === b.category && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return spent <= b.limit;
      }).length,
      target: Math.max(budgets.length, 1),
      unit: 'budgets on track',
      completed: budgets.length > 0 && budgets.every(b => {
        const spent = thisMonthTxns.filter(t => t.category === b.category && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return spent <= b.limit;
      }),
      tip: 'Check your budget status every Monday morning.',
    },
  ];
};

// ── Difficulty badge ──────────────────────────────────────────────────────────
const DifficultyBadge = ({ level }) => {
  const map = { Easy: 'var(--green)', Medium: 'var(--yellow)', Hard: 'var(--red)' };
  return (
    <span style={{ fontSize: '10px', fontWeight: 600, color: map[level], background: `${map[level]}15`, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {level}
    </span>
  );
};

// ── Challenge Card ────────────────────────────────────────────────────────────
const ChallengeCard = ({ ch, joined, onJoin }) => {
  const pct = ch.lowerIsBetter
    ? Math.max(0, Math.min(100, (1 - ch.current / ch.target) * 100))
    : Math.min(100, (ch.current / ch.target) * 100);

  const displayPct = ch.lowerIsBetter
    ? Math.max(0, Math.min(100, 100 - (ch.current / ch.target) * 100))
    : Math.min(100, (ch.current / ch.target) * 100);

  const CIcon = ch.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ boxShadow: 'var(--shadow-sm)', borderColor: ch.completed ? `${ch.color}40` : 'var(--border-strong)' }}
      style={{
        border: `1px solid ${ch.completed ? `${ch.color}30` : 'var(--border)'}`,
        background: ch.completed ? `${ch.color}06` : 'var(--bg)',
        borderRadius: 'var(--r-lg)',
        padding: '18px 20px',
        transition: 'all 0.18s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Completed ribbon */}
      {ch.completed && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <CheckCircle2 size={18} style={{ color: ch.color }} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: 'var(--r-md)', background: `${ch.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CIcon size={18} style={{ color: ch.color }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{ch.title}</span>
            <DifficultyBadge level={ch.difficulty} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{ch.description}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            {ch.lowerIsBetter
              ? `₹${ch.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ₹${ch.target.toLocaleString('en-IN', { maximumFractionDigits: 0 })} limit`
              : typeof ch.current === 'number' && ch.current < 100
                ? `${ch.current} / ${ch.target} ${ch.unit}`
                : `₹${ch.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ₹${ch.target.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: ch.completed ? ch.color : 'var(--text-2)' }}>
            {displayPct.toFixed(0)}%
          </span>
        </div>
        <div style={{ height: '5px', borderRadius: '3px', background: 'var(--border-strong)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${displayPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: '3px', background: ch.completed ? ch.color : `${ch.color}bb` }}
          />
        </div>
      </div>

      {/* Reward + tip */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', color: ch.color, fontWeight: 500 }}>🏅 {ch.reward}</div>
          {!ch.completed && (
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>💡 {ch.tip}</div>
          )}
        </div>
        {!ch.completed && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onJoin(ch.id)}
            style={{
              padding: '5px 12px', borderRadius: 'var(--r)', border: `1px solid ${ch.color}40`,
              background: `${ch.color}0d`, color: ch.color,
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.12s', flexShrink: 0,
            }}
            whileHover={{ background: ch.color, color: '#fff' }}
          >
            {joined ? '✓ Joined' : 'Join'}
          </motion.button>
        )}
        {ch.completed && (
          <span style={{ fontSize: '12px', fontWeight: 600, color: ch.color }}>✅ Completed!</span>
        )}
      </div>
    </motion.div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const SpendingChallengesPage = () => {
  const [joinedIds, setJoinedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('joined_challenges') || '[]'); } catch { return []; }
  });
  const [filter, setFilter] = useState('all');

  const { data: allTxns = [], isLoading } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: budgets = [] }            = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets });

  const challenges = useMemo(() => buildChallenges(allTxns, budgets), [allTxns, budgets]);

  const handleJoin = (id) => {
    const updated = joinedIds.includes(id) ? joinedIds : [...joinedIds, id];
    setJoinedIds(updated);
    localStorage.setItem('joined_challenges', JSON.stringify(updated));
    toast.success('Challenge accepted! 🎯');
  };

  const completed = challenges.filter(c => c.completed).length;
  const categories = ['all', ...new Set(challenges.map(c => c.category))];

  const filtered = filter === 'all' ? challenges : challenges.filter(c => c.category === filter);

  return (
    <div>
      <PageHeader
        icon={Trophy}
        title="Spending Challenges"
        subtitle={`${completed} of ${challenges.length} challenges completed this month`}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '24px' }}>🏆</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{completed}/{challenges.length}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>completed</div>
          </div>
        </div>
      </PageHeader>

      {/* XP progress bar */}
      <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: '24px', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Star size={14} style={{ color: '#f59e0b' }} /> Monthly Score
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
            {completed * 125} / {challenges.length * 125} XP
          </span>
        </div>
        <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border-strong)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completed / challenges.length) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Beginner</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Finance Master 🏆</span>
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`n-btn n-btn-sm ${filter === cat ? 'n-btn-primary' : 'n-btn-default'}`}
          >
            {cat === 'all' ? 'All challenges' : cat}
          </button>
        ))}
      </div>

      {/* Challenge grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="n-skeleton" style={{ height: '160px', borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {filtered.map((ch, i) => (
            <motion.div key={ch.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <ChallengeCard ch={ch} joined={joinedIds.includes(ch.id)} onJoin={handleJoin} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Info callout */}
      <div style={{ marginTop: '28px', padding: '14px 16px', background: 'var(--blue-bg)', borderRadius: 'var(--r-md)', border: '1px solid rgba(35,131,226,0.15)', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--accent)' }}>💡 How challenges work:</strong> Progress is calculated automatically from your transaction history.
        Challenges reset at the start of each month. Complete challenges to earn badges and improve your Financial Health Score!
      </div>
    </div>
  );
};

export default SpendingChallengesPage;

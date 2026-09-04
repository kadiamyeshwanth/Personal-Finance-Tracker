import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkle as Sparkles,
  TrendUp as TrendingUp,
  TrendDown as TrendingDown,
  Warning as AlertTriangle,
  Lightbulb as Lightbulb,
  CheckCircle as CheckCircle2,
  ArrowUpRight as ArrowUpRight,
  CircleNotch as Loader2,
  ChatText as MessageSquare,
  PaperPlaneTilt as Send,
  Flame as Flame,
  Target as Target,
  ArrowsClockwise as RefreshCw,
  Brain as Brain,
  ChartBar as BarChart3,
  Lightning as Zap,
} from '@phosphor-icons/react';
import { fetchTransactions } from '../api/transactions';
import { fetchGoals }        from '../api/goals';
import { fetchBudgets }      from '../api/budgets';
import { fetchPersonality, fetchPredictions, fetchSpendingPatterns } from '../api/insights';
import { sendChatMessage, getRoast, getInvestmentAdvice } from '../api/ai';
import PageHeader from '../components/ui/PageHeader';
import toast from 'react-hot-toast';

// ─── Local rule-based insight generator (same as before) ─────────────────────
const generateInsights = ({ txns, budgets, goals }) => {
  const insights = [];
  const now = new Date();
  const expenses = txns.filter(t => t.type === 'expense');
  const income   = txns.filter(t => t.type === 'income');
  const thisMonth  = t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); };
  const lastMonth  = t => { const d = new Date(t.date); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); };
  const thisMonthExp = expenses.filter(thisMonth).reduce((s, t) => s + t.amount, 0);
  const lastMonthExp = expenses.filter(lastMonth).reduce((s, t) => s + t.amount, 0);
  const totalInc = income.reduce((s, t) => s + t.amount, 0);
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;
  const catMap = {};
  expenses.filter(thisMonth).forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const catMapLast = {};
  expenses.filter(lastMonth).forEach(t => { catMapLast[t.category] = (catMapLast[t.category] || 0) + t.amount; });

  if (lastMonthExp > 0) {
    const pct = ((thisMonthExp - lastMonthExp) / lastMonthExp) * 100;
    if (Math.abs(pct) >= 5) insights.push({ id: 'mom-expense', type: pct > 0 ? 'warning' : 'positive', icon: pct > 0 ? TrendingUp : TrendingDown, title: pct > 0 ? `Spending up ${pct.toFixed(0)}% this month` : `Spending down ${Math.abs(pct).toFixed(0)}% this month`, body: pct > 0 ? `You spent ₹${thisMonthExp.toLocaleString('en-IN')} vs ₹${lastMonthExp.toLocaleString('en-IN')} last month.` : `Great discipline! You spent ₹${Math.abs(thisMonthExp - lastMonthExp).toLocaleString('en-IN')} less than last month.` });
  }
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const [cat, amt] = topCat;
    const spike = catMapLast[cat] ? ((amt - catMapLast[cat]) / catMapLast[cat]) * 100 : 0;
    if (spike >= 20) insights.push({ id: 'cat-spike', type: 'warning', icon: AlertTriangle, title: `${cat} spending up ${spike.toFixed(0)}%`, body: `You spent ₹${amt.toLocaleString('en-IN')} on ${cat} vs ₹${catMapLast[cat].toLocaleString('en-IN')} last month.` });
    else insights.push({ id: 'top-cat', type: 'info', icon: Lightbulb, title: `Top category: ${cat}`, body: `₹${amt.toLocaleString('en-IN')} spent on ${cat} this month.` });
  }
  if (totalInc > 0) {
    if (savingsRate < 0) insights.push({ id: 'negative-savings', type: 'danger', icon: AlertTriangle, title: 'Spending exceeds income', body: `You're spending ₹${Math.abs(totalInc - totalExp).toLocaleString('en-IN')} more than you earn.` });
    else if (savingsRate < 10) insights.push({ id: 'low-savings', type: 'warning', icon: TrendingDown, title: `Low savings rate (${savingsRate.toFixed(0)}%)`, body: `Aim for 20%+. Try cutting back on your top 1-2 categories.` });
    else if (savingsRate >= 20) insights.push({ id: 'good-savings', type: 'positive', icon: CheckCircle2, title: `Excellent savings rate — ${savingsRate.toFixed(0)}%`, body: `You're saving ₹${(totalInc - totalExp).toLocaleString('en-IN')} overall. Consider investing the surplus.` });
  }
  const spendMap = {};
  expenses.forEach(t => { spendMap[t.category] = (spendMap[t.category] || 0) + t.amount; });
  const exceeded = budgets.filter(b => (spendMap[b.category] || 0) > b.limit);
  if (exceeded.length > 0) insights.push({ id: 'budget-exceeded', type: 'danger', icon: AlertTriangle, title: `${exceeded.length} budget${exceeded.length > 1 ? 's' : ''} exceeded`, body: exceeded.map(b => `${b.category}: ₹${(spendMap[b.category] || 0).toLocaleString('en-IN')} / ₹${b.limit.toLocaleString('en-IN')}`).join(' · ') });
  goals.forEach(g => {
    if (!g.deadline) return;
    const daysLeft = Math.ceil((new Date(g.deadline) - now) / 86400000);
    const pct = (g.currentAmount / g.targetAmount) * 100;
    if (daysLeft > 0 && daysLeft <= 30 && pct < 80) insights.push({ id: `goal-${g._id}`, type: 'warning', icon: AlertTriangle, title: `Goal "${g.name}" deadline in ${daysLeft} days`, body: `${pct.toFixed(0)}% funded. Need ₹${(g.targetAmount - g.currentAmount).toLocaleString('en-IN')} more.` });
  });
  const largest = [...txns].sort((a, b) => b.amount - a.amount)[0];
  if (largest) insights.push({ id: 'largest-txn', type: 'info', icon: ArrowUpRight, title: `Largest transaction: ₹${largest.amount.toLocaleString('en-IN')}`, body: `${largest.description || largest.category} on ${new Date(largest.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}` });
  return insights;
};

// ─── Type configs ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  positive: { border: 'rgba(15,123,108,0.2)',  bg: 'rgba(15,123,108,0.04)',  color: 'var(--green)',  label: 'Positive' },
  warning:  { border: 'rgba(229,164,69,0.25)', bg: 'rgba(229,164,69,0.04)', color: 'var(--yellow)', label: 'Heads up'  },
  danger:   { border: 'rgba(196,85,77,0.25)',  bg: 'rgba(196,85,77,0.04)',  color: 'var(--red)',    label: 'Alert'    },
  info:     { border: 'var(--border)',          bg: 'var(--bg)',              color: 'var(--accent)', label: 'Insight'  },
};

const InsightCard = ({ insight, index }) => {
  const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.info;
  const Icon = insight.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07, duration: 0.3 }}
      className="ai-card" style={{ borderColor: cfg.border, background: cfg.bg }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--r)', flexShrink: 0, background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color: cfg.color }} strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{cfg.label}</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{insight.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{insight.body}</div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Score ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const r = 44, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 75 ? 'var(--brand)' : score >= 50 ? 'var(--brand)' : score >= 30 ? 'var(--red)' : 'var(--red)';
  return (
    <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <motion.circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }} />
      <text x="55" y="60" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: '22px', fontWeight: 700, fill: color, transform: 'rotate(90deg)', transformOrigin: '55px 55px', fontFamily: 'Inter' }}>{score}</text>
    </svg>
  );
};

// ─── Personality Card ─────────────────────────────────────────────────────────
const PersonalityCard = ({ personality }) => {
  if (!personality || personality.type === 'unknown') return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{ border: `1px solid ${personality.color}30`, borderRadius: 'var(--r-md)', padding: '20px', background: `${personality.color}08`, marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ fontSize: '36px' }}>{personality.emoji}</div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: personality.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>Your Personality</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{personality.title}</div>
        </div>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '12px' }}>{personality.description}</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {personality.traits.map(t => (
          <span key={t} style={{ fontSize: '11px', padding: '2px 8px', background: `${personality.color}15`, border: `1px solid ${personality.color}30`, borderRadius: '10px', color: personality.color }}>{t}</span>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Predictions Card ─────────────────────────────────────────────────────────
const PredictionsCard = ({ pred }) => {
  if (!pred) return null;
  const riskColor = pred.overspendingRisk >= 70 ? 'var(--red)' : pred.overspendingRisk >= 40 ? 'var(--yellow)' : 'var(--green)';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '18px', marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Zap size={14} style={{ color: 'var(--accent)' }} /> Month-end Predictions
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {[
          { label: 'Projected Expenses', value: `₹${pred.projectedExpense.toLocaleString('en-IN')}`, color: 'var(--red)' },
          { label: 'Projected Savings', value: `₹${Math.abs(pred.projectedSavings).toLocaleString('en-IN')}`, color: pred.projectedSavings >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Daily Spend Rate', value: `₹${pred.dailySpendRate.toLocaleString('en-IN')}/day`, color: 'var(--text)' },
          { label: 'Days Left', value: `${pred.daysLeft} days`, color: 'var(--text-3)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: 'var(--r)', background: `${riskColor}10`, border: `1px solid ${riskColor}25` }}>
        <AlertTriangle size={13} style={{ color: riskColor }} />
        <span style={{ fontSize: '12px', color: riskColor, fontWeight: 500 }}>{pred.riskLabel}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>— Overspend risk: {pred.overspendingRisk}%</span>
      </div>
    </motion.div>
  );
};

// ─── Roast Modal ──────────────────────────────────────────────────────────────
const RoastModal = ({ open, onClose, roasts, loading }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,15,15,0.5)', backdropFilter: 'blur(4px)' }} />
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
          style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, width: '500px', maxWidth: 'calc(100vw - 32px)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '28px', boxShadow: 'var(--shadow-float)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔥</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Roast My Spending</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>AI-generated commentary on your financial life choices</div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader2 size={24} style={{ color: 'var(--accent)' }} />
              </motion.div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {(roasts || []).map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                  style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {r}
                </motion.div>
              ))}
            </div>
          )}
          <button onClick={onClose} className="n-btn n-btn-default n-btn-sm" style={{ width: '100%' }}>Close</button>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ─── Chat message component ───────────────────────────────────────────────────

/**
 * Neutralise every HTML-significant character before any markup is added.
 *
 * This bubble is rendered with dangerouslySetInnerHTML, and the text reaching it
 * is not trustworthy in either direction:
 *   • the user's own message is echoed straight back (self-XSS), and
 *   • assistant replies interpolate stored user data — merchant names, goal
 *     names, budget categories — some of which arrives from the SMS webhook,
 *     a public endpoint. A merchant string like `<img src=x onerror=…>` would
 *     otherwise execute in the victim's session and can read the JWT out of
 *     localStorage.
 *
 * Escaping first, then applying the markdown replacements, means only the
 * <strong>/<em>/<br/> tags this function itself emits can ever reach the DOM.
 */
const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseMarkdown = (text) => {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
};

const ChatMessage = ({ msg }) => (
  <motion.div
    className={`ai-row ai-row--${msg.role}`}
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
  >
    {msg.role === 'assistant' && (
      <span className="ai-avatar"><Sparkles size={12} weight="fill" color="#fff" /></span>
    )}
    <div
      className={`ai-bubble ai-bubble--${msg.role}`}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
    />
  </motion.div>
);

// ─── SMART TIPS (unchanged) ───────────────────────────────────────────────────
const SMART_TIPS = [
  { icon: '💡', tip: 'Automate transfers to savings on payday before you can spend it.' },
  { icon: '📊', tip: 'The 50/30/20 rule: 50% needs, 30% wants, 20% savings.' },
  { icon: '🎯', tip: 'Create specific goals (Emergency Fund = 6× monthly expenses).' },
  { icon: '🔄', tip: "Review subscriptions quarterly — cancel what you don't use." },
  { icon: '📅', tip: 'Set a weekly "money date" to review transactions and adjust.' },
  { icon: '💳', tip: 'Pay credit cards in full each month to avoid interest charges.' },
];

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'insights',     label: 'Insights',    icon: Sparkles    },
  { id: 'chat',         label: 'AI Chat',     icon: MessageSquare },
  { id: 'personality',  label: 'Personality', icon: Brain       },
  { id: 'predictions',  label: 'Predictions', icon: BarChart3   },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const AIInsightsPage = () => {
  const [activeTab, setActiveTab] = useState('insights');
  const [loading, setLoading] = useState(true);
  const [roastOpen, setRoastOpen] = useState(false);
  const [roasts, setRoasts] = useState(null);
  const [roastLoading, setRoastLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([{ role: 'assistant', content: '👋 Hello! I\'m your AI Finance Assistant. Ask me anything about your money — spending habits, savings tips, budget status, or investment basics!' }]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Data queries
  const { data: allTxns = [], isLoading: tl } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: goals   = [], isLoading: gl } = useQuery({ queryKey: ['goals'],        queryFn: fetchGoals });
  const { data: budgets = [], isLoading: bl } = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets });
  const { data: personality, isLoading: pl } = useQuery({ queryKey: ['personality'],   queryFn: fetchPersonality });
  const { data: predictions, isLoading: pdl }= useQuery({ queryKey: ['predictions'],   queryFn: fetchPredictions });

  const txns = allTxns.filter(t => !t.isRecurring);
  const isDataLoading = tl || gl || bl;

  useEffect(() => {
    if (!isDataLoading) { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t); }
  }, [isDataLoading]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const insights = useMemo(() => { if (loading) return []; return generateInsights({ txns, budgets, goals }); }, [txns, budgets, goals, loading]);

  // Health score
  const score = useMemo(() => {
    if (txns.length === 0) return 0;
    const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const sr = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
    const budgetScore = budgets.length > 0 ? (budgets.filter(b => { const s = txns.filter(t => t.type === 'expense' && t.category === b.category).reduce((x, t) => x + t.amount, 0); return s <= b.limit; }).length / budgets.length) * 30 : 15;
    const goalScore  = goals.length > 0 ? Math.min(goals.reduce((s, g) => s + Math.min(g.currentAmount / g.targetAmount, 1), 0) / goals.length * 20, 20) : 10;
    const savScore   = Math.max(0, Math.min(sr * 1.5, 30));
    const actScore   = Math.min(txns.filter(t => (new Date() - new Date(t.date)) / 86400000 <= 30).length * 2, 20);
    return Math.round(Math.min(savScore + budgetScore + goalScore + actScore, 100));
  }, [txns, budgets, goals]);
  const scoreLabel = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 30 ? 'Fair' : 'Needs work';
  const scoreColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--accent)' : score >= 30 ? 'var(--yellow)' : 'var(--red)';

  const handleSendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);
    try {
      const data = await sendChatMessage(input.trim());
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally { setChatLoading(false); }
  };

  const handleRoast = async () => {
    setRoastOpen(true); setRoastLoading(true); setRoasts(null);
    try {
      const data = await getRoast();
      setRoasts(data.roasts);
    } catch { toast.error('Failed to generate roast. Add more transactions first!'); setRoastOpen(false); }
    finally { setRoastLoading(false); }
  };

  const SUGGESTED_QUESTIONS = [
    'Where is most of my money going?',
    'How can I save more money?',
    'What\'s my budget status?',
    'Give me investment advice',
    'This month\'s summary',
  ];

  return (
    <div>
      <PageHeader icon={Sparkles} title="AI Insights" subtitle="Intelligent analysis of your financial behaviour and habits." />

      {/* Tabs */}
      <div className="ai-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`ai-tab${activeTab === id ? ' is-on' : ''}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handleRoast}
          className="ai-roast-btn">
          <Flame size={13} /> Roast Me 🔥
        </button>
      </div>

      {/* ── INSIGHTS TAB ── */}
      {activeTab === 'insights' && (
        loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '64px 0' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={28} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
            </motion.div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>Analysing your financial data…</div>
          </div>
        ) : (
          <>
            {/* Score row */}
            <div className="ai-score">
              <ScoreRing score={score} />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Financial Health Score</div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: scoreColor, marginBottom: '6px' }}>{scoreLabel}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', maxWidth: '400px', lineHeight: 1.5 }}>
                  {score >= 75 ? "Your finances are in excellent shape. You're saving well and staying within budgets." :
                   score >= 50 ? 'Good progress! A few improvements in savings or budget adherence will push this higher.' :
                   score >= 30 ? "There's room to improve. Focus on building an emergency fund and sticking to budgets." :
                   'Take action now. Review your spending and set at least one budget to get back on track.'}
                </div>
              </div>
            </div>

            <div className="ai-insights-grid">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>
                  {insights.length} insight{insights.length !== 1 ? 's' : ''} found
                </div>
                {insights.length === 0 ? (
                  <div className="n-empty">
                    <div className="n-empty-icon"><Sparkles size={28} strokeWidth={1.2} /></div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)' }}>Add more transactions</p>
                    <p style={{ fontSize: '13px' }}>The more data you add, the better the insights.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {insights.map((ins, i) => <InsightCard key={ins.id} insight={ins} index={i} />)}
                  </div>
                )}
              </div>
              <div className="ai-side">
                <div className="ai-tips">
                  <div className="ai-side-label">Smart tips</div>
                  {SMART_TIPS.map((t, i) => (
                    <div key={i} className="ai-tip">
                      <span>{t.icon}</span>
                      <span>{t.tip}</span>
                    </div>
                  ))}
                </div>
                <div className="ai-note">Insights generated from your transaction data. Not financial advice.</div>
              </div>
            </div>
          </>
        )
      )}

      {/* ── CHAT TAB ── */}
      {activeTab === 'chat' && (
        <div className="ai-chat-grid">
          <div className="ai-chat">
            <div className="ai-chat-head">
              <span className="ai-dot" />
              <span className="ai-chat-name">AI Finance Assistant</span>
              <span className="ai-chat-meta">&nbsp;·&nbsp;reads your own data</span>
            </div>
            <div className="ai-chat-body">
              {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand), var(--brand))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={12} color="#fff" />
                  </div>
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-3)' }} />)}
                    </div>
                  </motion.div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="ai-chat-input">
              <input className="n-input" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Ask about your finances…" />
              <button onClick={handleSendMessage} disabled={chatLoading || !input.trim()}
                className="n-btn n-btn-primary" aria-label="Send">
                <Send size={14} />
              </button>
            </div>
          </div>
          <div className="ai-side">
            <div className="ai-side-label">Suggested questions</div>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} className="ai-suggest" onClick={() => { setInput(q); }}>{q}</button>
            ))}
            <div className="ai-note">
              This assistant reads your transaction data to answer. Nothing leaves your account.
            </div>
          </div>
        </div>
      )}

      {/* ── PERSONALITY TAB ── */}
      {activeTab === 'personality' && (
        <div style={{ maxWidth: '640px' }}>
          {pl ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Loader2 size={24} style={{ color: 'var(--accent)' }} /></div>
          ) : (
            <>
              <PersonalityCard personality={personality} />
              <div className="ai-explain">
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>How is this determined?</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Your financial personality is calculated from: your savings rate, impulse purchase frequency, late-night spending patterns, budget adherence, and spending category diversity. It updates automatically as you add more transactions.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PREDICTIONS TAB ── */}
      {activeTab === 'predictions' && (
        <div style={{ maxWidth: '640px' }}>
          {pdl ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Loader2 size={24} style={{ color: 'var(--accent)' }} /></div>
          ) : (
            <>
              <PredictionsCard pred={predictions} />
              <div className="ai-note" style={{ fontSize: '12px' }}>
                Predictions are based on your current daily spending rate. They assume your income and spending behaviour remains the same for the rest of the month.
              </div>
            </>
          )}
        </div>
      )}

      {/* Roast Modal */}
      <RoastModal open={roastOpen} onClose={() => setRoastOpen(false)} roasts={roasts} loading={roastLoading} />
    </div>
  );
};

export default AIInsightsPage;

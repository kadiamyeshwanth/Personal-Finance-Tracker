import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle,
  Lightbulb, CheckCircle2, ArrowUpRight, Loader2,
} from 'lucide-react';
import { fetchTransactions } from '../api/transactions';
import { fetchGoals } from '../api/goals';
import { fetchBudgets } from '../api/budgets';
import PageHeader from '../components/ui/PageHeader';

// ── Local rule-based AI engine ─────────────────────────────────────────────
// Generates insights from user's actual data — no external API needed.
const generateInsights = ({ txns, budgets, goals }) => {
  const insights = [];
  const now = new Date();

  const expenses = txns.filter(t => t.type === 'expense');
  const income   = txns.filter(t => t.type === 'income');

  const thisMonth  = (t) => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); };
  const lastMonth  = (t) => { const d = new Date(t.date); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); };

  const thisMonthExp  = expenses.filter(thisMonth).reduce((s, t) => s + t.amount, 0);
  const lastMonthExp  = expenses.filter(lastMonth).reduce((s, t) => s + t.amount, 0);
  const thisMonthInc  = income.filter(thisMonth).reduce((s, t) => s + t.amount, 0);
  const lastMonthInc  = income.filter(lastMonth).reduce((s, t) => s + t.amount, 0);
  const totalInc      = income.reduce((s, t) => s + t.amount, 0);
  const totalExp      = expenses.reduce((s, t) => s + t.amount, 0);
  const savingsRate   = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;

  // Category map this month
  const catMap = {};
  expenses.filter(thisMonth).forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const catMapLast = {};
  expenses.filter(lastMonth).forEach(t => { catMapLast[t.category] = (catMapLast[t.category] || 0) + t.amount; });

  // 1. Month-on-month expense change
  if (lastMonthExp > 0) {
    const pct = ((thisMonthExp - lastMonthExp) / lastMonthExp) * 100;
    if (Math.abs(pct) >= 5) {
      insights.push({
        id: 'mom-expense',
        type: pct > 0 ? 'warning' : 'positive',
        icon: pct > 0 ? TrendingUp : TrendingDown,
        title: pct > 0 ? `Spending up ${pct.toFixed(0)}% this month` : `Spending down ${Math.abs(pct).toFixed(0)}% this month`,
        body: pct > 0
          ? `You spent ₹${thisMonthExp.toLocaleString('en-IN')} this month vs ₹${lastMonthExp.toLocaleString('en-IN')} last month. Review your largest categories.`
          : `Great discipline! You spent ₹${Math.abs(thisMonthExp - lastMonthExp).toLocaleString('en-IN')} less than last month.`,
      });
    }
  }

  // 2. Top spending category spike
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const [cat, amt] = topCat;
    const lastAmt = catMapLast[cat] || 0;
    if (lastAmt > 0) {
      const spike = ((amt - lastAmt) / lastAmt) * 100;
      if (spike >= 20) {
        insights.push({
          id: 'cat-spike',
          type: 'warning',
          icon: AlertTriangle,
          title: `${cat} spending up ${spike.toFixed(0)}%`,
          body: `You spent ₹${amt.toLocaleString('en-IN')} on ${cat} this month, up from ₹${lastAmt.toLocaleString('en-IN')} last month.`,
        });
      }
    } else {
      insights.push({
        id: 'top-cat',
        type: 'info',
        icon: Lightbulb,
        title: `Top category: ${cat}`,
        body: `Your biggest expense this month is ${cat} at ₹${amt.toLocaleString('en-IN')}. ${totalInc > 0 ? `That's ${((amt / thisMonthInc) * 100).toFixed(0)}% of this month's income.` : ''}`,
      });
    }
  }

  // 3. Savings rate insight
  if (totalInc > 0) {
    if (savingsRate < 0) {
      insights.push({ id: 'negative-savings', type: 'danger', icon: AlertTriangle, title: 'Spending exceeds income', body: `You're spending more than you earn. Consider reducing discretionary spending to close the gap of ₹${Math.abs(totalInc - totalExp).toLocaleString('en-IN')}.` });
    } else if (savingsRate < 10) {
      insights.push({ id: 'low-savings', type: 'warning', icon: TrendingDown, title: `Savings rate is low (${savingsRate.toFixed(0)}%)`, body: `Financial experts recommend saving at least 20% of income. Try to cut back in 1–2 categories to reach that target.` });
    } else if (savingsRate >= 20) {
      insights.push({ id: 'good-savings', type: 'positive', icon: CheckCircle2, title: `Excellent savings rate — ${savingsRate.toFixed(0)}%`, body: `You're saving ₹${(totalInc - totalExp).toLocaleString('en-IN')} overall. Keep it up and consider investing the surplus.` });
    }
  }

  // 4. Budget overruns
  const spendMap = {};
  expenses.forEach(t => { spendMap[t.category] = (spendMap[t.category] || 0) + t.amount; });
  const exceeded = budgets.filter(b => (spendMap[b.category] || 0) > b.limit);
  if (exceeded.length > 0) {
    insights.push({
      id: 'budget-exceeded',
      type: 'danger',
      icon: AlertTriangle,
      title: `${exceeded.length} budget${exceeded.length > 1 ? 's' : ''} exceeded`,
      body: exceeded.map(b => `${b.category}: ₹${(spendMap[b.category] || 0).toLocaleString('en-IN')} / ₹${b.limit.toLocaleString('en-IN')}`).join(' · '),
    });
  }

  // 5. Goal deadline warnings
  goals.forEach(g => {
    if (!g.deadline) return;
    const daysLeft = Math.ceil((new Date(g.deadline) - now) / 86400000);
    const pct = (g.currentAmount / g.targetAmount) * 100;
    if (daysLeft > 0 && daysLeft <= 30 && pct < 80) {
      insights.push({
        id: `goal-${g.id}`,
        type: 'warning',
        icon: AlertTriangle,
        title: `Goal "${g.name}" deadline in ${daysLeft} days`,
        body: `You've saved ₹${g.currentAmount.toLocaleString('en-IN')} of ₹${g.targetAmount.toLocaleString('en-IN')} (${pct.toFixed(0)}%). You need ₹${(g.targetAmount - g.currentAmount).toLocaleString('en-IN')} more.`,
      });
    }
  });

  // 6. Positive: no expenses yet this month
  if (thisMonthExp === 0 && now.getDate() > 5) {
    insights.push({ id: 'no-exp', type: 'info', icon: Lightbulb, title: 'No expenses recorded this month', body: 'Add your transactions to get personalised insights here.' });
  }

  // 7. Tip: largest single transaction
  const largest = [...txns].sort((a, b) => b.amount - a.amount)[0];
  if (largest) {
    insights.push({
      id: 'largest-txn',
      type: 'info',
      icon: ArrowUpRight,
      title: `Largest transaction: ₹${largest.amount.toLocaleString('en-IN')}`,
      body: `${largest.description || largest.category} on ${new Date(largest.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    });
  }

  return insights;
};

// ── Insight config ─────────────────────────────────────────────────────────
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      style={{
        border: `1px solid ${cfg.border}`, borderRadius: 'var(--r-md)',
        padding: '16px 18px', background: cfg.bg,
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--r)', flexShrink: 0, background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color: cfg.color }} strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 500, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{insight.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{insight.body}</div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Score ring ─────────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const r = 44, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 75 ? '#0f7b6c' : score >= 50 ? '#2383e2' : score >= 30 ? '#d9730d' : '#c4554d';
  return (
    <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <motion.circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
      />
      <text x="55" y="60" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: '22px', fontWeight: 700, fill: color, transform: 'rotate(90deg)', transformOrigin: '55px 55px', fontFamily: 'Inter' }}>
        {score}
      </text>
    </svg>
  );
};

// ── Tip cards ──────────────────────────────────────────────────────────────
const SMART_TIPS = [
  { icon: '💡', tip: 'Automate transfers to savings on payday before you can spend it.' },
  { icon: '📊', tip: 'The 50/30/20 rule: 50% needs, 30% wants, 20% savings.' },
  { icon: '🎯', tip: 'Create specific goals (Emergency Fund = 6× monthly expenses).' },
  { icon: '🔄', tip: 'Review subscriptions quarterly — cancel what you don\'t use.' },
  { icon: '📅', tip: 'Set a weekly "money date" to review transactions and adjust.' },
  { icon: '💳', tip: 'Pay credit cards in full each month to avoid interest charges.' },
];

// ── Main page ──────────────────────────────────────────────────────────────
const AIInsightsPage = () => {
  const [loading, setLoading] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);

  const { data: allTxns = [], isLoading: tl } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: goals = [],   isLoading: gl } = useQuery({ queryKey: ['goals'],        queryFn: fetchGoals });
  const { data: budgets = [], isLoading: bl } = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets });

  const txns = allTxns.filter(t => !t.isRecurring);
  const isDataLoading = tl || gl || bl;

  // Simulate a brief "analysis" loading state for premium feel
  React.useEffect(() => {
    if (!isDataLoading) {
      const t = setTimeout(() => setLoading(false), 900);
      return () => clearTimeout(t);
    }
  }, [isDataLoading]);

  const insights = useMemo(() => {
    if (loading) return [];
    return generateInsights({ txns, budgets, goals });
  }, [txns, budgets, goals, loading]);

  // Financial health score (simplified)
  const score = useMemo(() => {
    if (txns.length === 0) return 0;
    const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const sr = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
    const budgetScore = budgets.length > 0
      ? (budgets.filter(b => { const s = txns.filter(t => t.type === 'expense' && t.category === b.category).reduce((x, t) => x + t.amount, 0); return s <= b.limit; }).length / budgets.length) * 30
      : 15;
    const goalScore  = goals.length > 0 ? Math.min(goals.reduce((s, g) => s + Math.min(g.currentAmount / g.targetAmount, 1), 0) / goals.length * 20, 20) : 10;
    const savScore   = Math.max(0, Math.min(sr * 1.5, 30));
    const actScore   = Math.min(txns.filter(t => { const d = new Date(t.date); return (new Date() - d) / 86400000 <= 30; }).length * 2, 20);
    return Math.round(Math.min(savScore + budgetScore + goalScore + actScore, 100));
  }, [txns, budgets, goals]);

  const scoreLabel = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 30 ? 'Fair' : 'Needs work';
  const scoreColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--accent)' : score >= 30 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div>
      <PageHeader icon={Sparkles} title="AI Insights" subtitle="Intelligent analysis of your financial behaviour and habits." />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '64px 0' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={28} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </motion.div>
          <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>Analysing your financial data…</div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>Scanning transactions · Checking budgets · Reviewing goals</div>
        </div>
      ) : (
        <>
          {/* Score + summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'center', padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: '28px' }}>
            <ScoreRing score={score} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Financial Health Score</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: scoreColor, marginBottom: '6px' }}>{scoreLabel}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', maxWidth: '400px', lineHeight: 1.5 }}>
                {score >= 75 ? 'Your finances are in excellent shape. You\'re saving well and staying within budgets.' :
                 score >= 50 ? 'Good progress! A few improvements in savings or budget adherence will push this higher.' :
                 score >= 30 ? 'There\'s room to improve. Focus on building an emergency fund and sticking to budgets.' :
                 'Take action now. Review your spending and set at least one budget to get back on track.'}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {[
                  { label: `${txns.length} transactions`, color: 'var(--text-3)' },
                  { label: `${budgets.length} budgets`, color: 'var(--text-3)' },
                  { label: `${goals.length} goals`, color: 'var(--text-3)' },
                ].map(({ label, color }) => (
                  <span key={label} style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '10px', color, border: '1px solid var(--border)' }}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '24px', alignItems: 'start' }}>
            {/* Insights feed */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>
                {insights.length} insight{insights.length !== 1 ? 's' : ''} found
              </div>
              {insights.length === 0 ? (
                <div className="n-empty">
                  <div className="n-empty-icon"><Sparkles size={28} strokeWidth={1.2} /></div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)' }}>Add more transactions</p>
                  <p style={{ fontSize: '13px' }}>The more data you add, the better the insights become.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <AnimatePresence>
                    {insights.map((ins, i) => <InsightCard key={ins.id} insight={ins} index={i} />)}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Smart tips panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>💡 Smart Tips</div>
                </div>
                <div style={{ padding: '4px' }}>
                  {SMART_TIPS.map((t, i) => (
                    <motion.div key={i} whileHover={{ backgroundColor: 'var(--bg-hover)' }}
                      style={{ padding: '10px 12px', borderRadius: 'var(--r)', cursor: 'default' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>{t.icon}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>{t.tip}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Insights are generated from your own transaction data using rule-based analysis. This is not financial advice.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIInsightsPage;

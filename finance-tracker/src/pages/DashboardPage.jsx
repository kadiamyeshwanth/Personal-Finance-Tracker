import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowRight, CreditCard, Target, Wallet, RefreshCcw, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { fetchTransactions } from '../api/transactions';
import { fetchGoals } from '../api/goals';
import { fetchBudgets } from '../api/budgets';
import PageHeader from '../components/ui/PageHeader';
import HealthScore from '../components/ui/HealthScore';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ label, value, icon: Icon, subtext, valueColor }) => (
  <motion.div whileHover={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} className="n-card" style={{ padding: '20px 22px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: 'var(--r)', background: 'var(--bg-secondary)' }}>
        <Icon size={13} style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
      </div>
    </div>
    <div style={{ fontSize: '28px', fontWeight: 700, color: valueColor || 'var(--text)', letterSpacing: '-0.02em' }}>
      <AnimatedCounter value={value} prefix="₹" duration={1.0} />
    </div>
    {subtext && <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>{subtext}</div>}
  </motion.div>
);

const QuickLink = ({ icon: Icon, label, value, to }) => (
  <Link to={to} style={{ textDecoration: 'none' }}>
    <motion.div whileHover={{ backgroundColor: 'var(--bg-hover)' }}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--r)', cursor: 'pointer', transition: 'background 0.12s' }}>
      <Icon size={15} strokeWidth={1.5} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '14px', color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <ArrowRight size={13} style={{ color: 'var(--text-3)', opacity: 0.5 }} />
    </motion.div>
  </Link>
);

/** Mini 6-month income vs expense bar chart */
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
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>6-month overview</div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '64px' }}>
        {bars.map((m, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '52px' }}>
              <motion.div initial={{ height: 0 }} animate={{ height: `${m.incPct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.4,0,0.2,1] }}
                style={{ flex: 1, background: 'var(--green)', borderRadius: '2px 2px 0 0', opacity: 0.6, minHeight: m.income > 0 ? '2px' : 0 }} />
              <motion.div initial={{ height: 0 }} animate={{ height: `${m.expPct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.4,0,0.2,1] }}
                style={{ flex: 1, background: 'var(--red)', borderRadius: '2px 2px 0 0', opacity: 0.6, minHeight: m.expenses > 0 ? '2px' : 0 }} />
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{m.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        {[{ label: 'Income', color: 'var(--green)' }, { label: 'Expenses', color: 'var(--red)' }].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, opacity: 0.6 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const { data: allTxns = [], isLoading: tl } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: goals = [],   isLoading: gl } = useQuery({ queryKey: ['goals'],        queryFn: fetchGoals });
  const { data: budgets = [], isLoading: bl } = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets });

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

  const isLoading = tl || gl || bl;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

  const SkelCard = () => (
    <div className="n-card" style={{ padding: '20px 22px' }}>
      <div className="n-skeleton" style={{ height: '11px', width: '60%', marginBottom: '18px' }} />
      <div className="n-skeleton" style={{ height: '28px', width: '50%' }} />
    </div>
  );

  return (
    <div>
      <PageHeader icon={LayoutDashboard} title={`${greeting}, ${currentUser?.username}`} subtitle="Here's an overview of your finances." />

      {/* Budget alert banner */}
      {!isLoading && budgetAlerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', marginBottom: '24px', border: '1px solid rgba(235,87,87,0.25)', borderRadius: 'var(--r-md)', background: 'rgba(235,87,87,0.04)' }}>
          <AlertTriangle size={15} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '1px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
              {budgetAlerts.filter(b => b.pct >= 100).length > 0 ? `${budgetAlerts.filter(b => b.pct >= 100).length} budget(s) exceeded` : `${budgetAlerts.length} budget(s) near limit`}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {budgetAlerts.map(b => (
                <span key={b.id} style={{ fontSize: '12px', color: 'var(--text-2)' }}>{b.category}: {b.pct.toFixed(0)}% used</span>
              ))}
            </div>
          </div>
          <Link to="/budgets" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
            View budgets <ArrowRight size={11} />
          </Link>
        </motion.div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
          <SkelCard /><SkelCard /><SkelCard />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '14px', marginBottom: '28px' }}>
          <StatCard label="Total Income"   value={income}   icon={TrendingUp}   valueColor="var(--green)" subtext={<><TrendingUp size={11} color="var(--green)" /> All time</>} />
          <StatCard label="Total Expenses" value={expenses} icon={TrendingDown}  valueColor="var(--red)"   subtext={<><TrendingDown size={11} color="var(--red)" /> All time</>} />
          <StatCard label="Net Savings"    value={Math.abs(net)} icon={net >= 0 ? TrendingUp : TrendingDown}
            valueColor={net >= 0 ? 'var(--text)' : 'var(--red)'}
            subtext={income > 0 ? `${savingsRate}% savings rate` : (net >= 0 ? 'Positive balance' : 'Negative balance')} />
        </div>
      )}

      {/* Main two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 236px', gap: '24px', alignItems: 'start' }}>
        {/* Left: recent transactions + mini chart */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Recent transactions</span>
            <Link to="/transactions" style={{ fontSize: '13px', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {isLoading ? (
              <div style={{ padding: '32px', textAlign: 'center' }}><div className="n-skeleton" style={{ height: '14px', width: '40%', margin: '0 auto' }} /></div>
            ) : recent.length === 0 ? (
              <div className="n-empty">
                <div className="n-empty-icon"><CreditCard size={28} strokeWidth={1.2} /></div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)' }}>No transactions yet</p>
                <p style={{ fontSize: '13px' }}>Add your first one to see it here.</p>
                <Link to="/transactions" className="n-btn n-btn-default n-btn-sm" style={{ marginTop: '8px', textDecoration: 'none' }}>
                  <CreditCard size={12} /> Add transaction
                </Link>
              </div>
            ) : (
              <table className="n-table">
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {recent.map(t => (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--text-3)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ color: 'var(--text-2)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Untitled</span>}
                      </td>
                      <td><span className={`n-tag n-tag-${t.type === 'income' ? 'green' : 'red'}`}>{t.category}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: t.type === 'income' ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {t.type === 'income' ? '+' : '−'}₹{t.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 6-month mini chart */}
          {!isLoading && allTxns.length > 0 && (
            <div style={{ marginTop: '20px', padding: '18px 20px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <SpendingMiniChart transactions={allTxns} />
            </div>
          )}
        </div>

        {/* Right: quick access + health score + savings rate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Quick links */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Quick access</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', padding: '4px' }}>
              <QuickLink icon={CreditCard} label="Transactions" value={txns.length}      to="/transactions" />
              <QuickLink icon={Target}     label="Goals"        value={goals.length}     to="/goals" />
              <QuickLink icon={Wallet}     label="Budgets"      value={budgets.length}   to="/budgets" />
              <QuickLink icon={RefreshCcw} label="Recurring"    value={recurring.length} to="/recurring" />
            </div>
          </div>

          {/* Health score */}
          {!isLoading && (
            <HealthScore transactions={allTxns} budgets={budgets} goals={goals} />
          )}

          {/* Savings rate */}
          {!isLoading && income > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Savings rate</div>
              <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em',
                color: savingsRate >= 20 ? 'var(--green)' : savingsRate >= 0 ? 'var(--text)' : 'var(--red)' }}>
                {savingsRate}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
                {savingsRate >= 20 ? 'Excellent saving habit' : savingsRate >= 10 ? 'Good progress' : savingsRate >= 0 ? 'Room to improve' : 'Spending exceeds income'}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

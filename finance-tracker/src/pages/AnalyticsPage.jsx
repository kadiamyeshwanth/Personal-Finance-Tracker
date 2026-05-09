import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, PointElement, LineElement, Filler } from 'chart.js';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';
import { fetchTransactions } from '../api/transactions';
import { fetchBudgets } from '../api/budgets';
import PageHeader from '../components/ui/PageHeader';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, PointElement, LineElement, Filler);

const PALETTE = ['#2383e2','#0f7b6c','#9065b0','#d9730d','#c4554d','#6366f1','#14b8a6','#84cc16'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const useChartOptions = () => {
  const { theme } = useTheme();
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    const text3 = s.getPropertyValue('--text-3').trim();
    const text   = s.getPropertyValue('--text').trim();
    const text2  = s.getPropertyValue('--text-2').trim();
    const border = s.getPropertyValue('--border').trim();
    const bgTip  = theme === 'dark' ? '#2a2a2a' : '#ffffff';
    const base = {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: text3, font: { family: 'Inter', size: 12 }, boxWidth: 10, padding: 14, usePointStyle: true } },
        tooltip: { backgroundColor: bgTip, borderColor: border, borderWidth: 1, titleColor: text, bodyColor: text2, titleFont: { family: 'Inter', size: 13, weight: '600' }, bodyFont: { family: 'Inter', size: 12 }, padding: 12 },
      },
    };
    const scales = {
      x: { grid: { color: border }, ticks: { color: text3, font: { family: 'Inter', size: 11 } }, border: { display: false } },
      y: { grid: { color: border }, ticks: { color: text3, font: { family: 'Inter', size: 11 }, callback: v => `₹${Number(v).toLocaleString('en-IN')}` }, border: { display: false } },
    };
    return { base, scales };
  }, [theme]);
};

const InsightCard = ({ icon: Icon, label, value, sub, color = 'var(--accent)' }) => (
  <div style={{ padding: '16px 18px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <div style={{ width: '28px', height: '28px', borderRadius: 'var(--r)', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={13} style={{ color }} strokeWidth={1.5} />
      </div>
    </div>
    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>{sub}</div>}
  </div>
);

const ChartCard = ({ title, subtitle, children, isLoading, height = 220 }) => (
  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '20px', background: 'var(--bg)' }}>
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>{subtitle}</div>}
    </div>
    {isLoading ? <div className="n-skeleton" style={{ height }} /> : <div style={{ height }}>{children}</div>}
  </div>
);

const AnalyticsPage = () => {
  const now = new Date();
  const [period, setPeriod] = useState('6m');
  const { base, scales } = useChartOptions();
  const { data: allTxns = [], isLoading } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets });
  const txns = allTxns.filter(t => !t.isRecurring);
  const pm = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[period];
  const cutoff = new Date(now.getFullYear(), now.getMonth() - pm + 1, 1);
  const filt = txns.filter(t => new Date(t.date) >= cutoff);

  const monthlyTrend = useMemo(() => {
    const ms = [];
    for (let i = pm - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      ms.push({ label: MONTHS[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), income: 0, expense: 0 });
    }
    filt.forEach(t => {
      const d = new Date(t.date);
      const m = ms.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (!m) return;
      if (t.type === 'income') m.income += t.amount;
      if (t.type === 'expense') m.expense += t.amount;
    });
    return ms;
  }, [filt, pm]);

  const catSpend = useMemo(() => {
    const map = {};
    filt.filter(t => t.type === 'expense').forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filt]);

  const totalExp = catSpend.reduce((s, [, v]) => s + v, 0);
  const totalInc = filt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const net = totalInc - totalExp;
  const sr = totalInc > 0 ? ((net / totalInc) * 100).toFixed(1) : 0;

  const daySpend = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => ({ label: d, total: 0 }));
    filt.filter(t => t.type === 'expense').forEach(t => { days[new Date(t.date).getDay()].total += t.amount; });
    return days;
  }, [filt]);
  const maxDay = Math.max(...daySpend.map(d => d.total), 1);

  const budgetStatus = useMemo(() => {
    const sm = filt.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    return budgets.map(b => ({ ...b, spent: sm[b.category] || 0, pct: Math.min(((sm[b.category] || 0) / b.limit) * 100, 100) })).sort((a, b) => b.pct - a.pct);
  }, [budgets, filt]);

  const trendData = { labels: monthlyTrend.map(m => m.label), datasets: [
    { label: 'Income', data: monthlyTrend.map(m => m.income), borderColor: '#0f7b6c', backgroundColor: 'rgba(15,123,108,0.07)', fill: true, tension: 0.4, pointRadius: 4 },
    { label: 'Expenses', data: monthlyTrend.map(m => m.expense), borderColor: '#c4554d', backgroundColor: 'rgba(196,85,77,0.07)', fill: true, tension: 0.4, pointRadius: 4 },
  ]};
  const catBarData = { labels: catSpend.slice(0, 7).map(([k]) => k), datasets: [{ label: 'Spend (₹)', data: catSpend.slice(0, 7).map(([, v]) => v), backgroundColor: PALETTE.slice(0, 7).map(c => c + '22'), borderColor: PALETTE.slice(0, 7), borderWidth: 1.5, borderRadius: 5, borderSkipped: false }] };
  const doughnutData = { labels: catSpend.slice(0, 6).map(([k]) => k), datasets: [{ data: catSpend.slice(0, 6).map(([, v]) => v), backgroundColor: PALETTE.slice(0, 6).map(c => c + '22'), borderColor: PALETTE.slice(0, 6), borderWidth: 2, hoverOffset: 4 }] };
  const PERIODS = [{ value: '1m', label: '1M' }, { value: '3m', label: '3M' }, { value: '6m', label: '6M' }, { value: '1y', label: '1Y' }];

  return (
    <div>
      <PageHeader icon={BarChart3} title="Analytics" subtitle="Deep insights into your spending patterns and financial trends." />
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r)', overflow: 'hidden', width: 'fit-content' }}>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            style={{ padding: '5px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 500, transition: 'all 0.15s', background: period === p.value ? 'var(--text)' : 'transparent', color: period === p.value ? 'var(--bg)' : 'var(--text-2)' }}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
        <InsightCard icon={TrendingUp}   label="Total income"   value={`₹${totalInc.toLocaleString('en-IN')}`} sub={`Last ${pm} month${pm > 1 ? 's' : ''}`} color="#0f7b6c" />
        <InsightCard icon={TrendingDown} label="Total expenses" value={`₹${totalExp.toLocaleString('en-IN')}`} sub={`${catSpend.length} categories`} color="#c4554d" />
        <InsightCard icon={Target}       label="Net savings"    value={`₹${Math.abs(net).toLocaleString('en-IN')}`} sub={net >= 0 ? 'Surplus' : 'Deficit'} color={net >= 0 ? '#0f7b6c' : '#c4554d'} />
        <InsightCard icon={Calendar}     label="Savings rate"   value={`${sr}%`} sub={sr >= 20 ? 'Excellent' : sr >= 10 ? 'Good' : 'Needs work'} color="#2383e2" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <ChartCard title="Income vs Expenses" subtitle={`Last ${pm} months`} isLoading={isLoading} height={220}>
          <Line data={trendData} options={{ ...base, scales }} />
        </ChartCard>
        <ChartCard title="Spending by Category" subtitle="Expense breakdown" isLoading={isLoading} height={220}>
          {catSpend.length === 0 ? <div className="n-empty" style={{ height: '100%' }}><p>No expenses in this period</p></div> : <Doughnut data={doughnutData} options={{ ...base, cutout: '65%' }} />}
        </ChartCard>
      </div>
      <ChartCard title="Top Spending Categories" subtitle="Highest expense categories" isLoading={isLoading} height={200}>
        {catSpend.length === 0 ? <div className="n-empty"><p>No expense data</p></div> : <Bar data={catBarData} options={{ ...base, scales, indexAxis: 'y' }} />}
      </ChartCard>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '20px', background: 'var(--bg)' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Spending by Day</div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>Which days you spend the most</div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '100px' }}>
            {daySpend.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', height: '100%', justifyContent: 'flex-end' }}>
                <motion.div initial={{ height: 0 }} animate={{ height: `${(d.total / maxDay) * 80}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                  style={{ width: '100%', background: PALETTE[i % PALETTE.length], borderRadius: '3px 3px 0 0', opacity: 0.7, minHeight: d.total > 0 ? '3px' : 0 }} />
                <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '20px', background: 'var(--bg)' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Budget Adherence</div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>How well you're staying within limits</div>
          {budgetStatus.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', padding: '24px 0' }}>No budgets set</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {budgetStatus.slice(0, 5).map(b => (
                <div key={b._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{b.category}</span>
                    <span style={{ fontSize: '11px', color: b.pct >= 100 ? 'var(--red)' : b.pct >= 80 ? 'var(--yellow)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>₹{b.spent.toLocaleString('en-IN')} / ₹{b.limit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="n-progress-track" style={{ height: '5px' }}>
                    <motion.div className="n-progress-fill" initial={{ width: 0 }} animate={{ width: `${b.pct}%` }} transition={{ duration: 0.7 }}
                      style={{ background: b.pct >= 100 ? 'var(--red)' : b.pct >= 80 ? 'var(--yellow)' : 'var(--green)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

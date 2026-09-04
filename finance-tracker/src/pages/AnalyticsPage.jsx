/**
 * AnalyticsPage — spending and income analysis.
 *
 * Charts are Recharts, restyled end to end by the Skeuo chart kit: every plot
 * sits in a recessed groove, bars are drawn as extrusions, and the tooltip is a
 * small floating card. The income/expense chart carries a Brush so a long
 * period can be scrubbed rather than squinted at.
 *
 * All derivation logic is unchanged — this is presentation only.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ChartBar as BarChart3, TrendUp as TrendingUp, TrendDown as TrendingDown,
  Target, Calendar,
} from '@phosphor-icons/react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Brush,
} from 'recharts';
import PageHeader from '../components/ui/PageHeader';
import { fetchTransactions } from '../api/transactions';
import { fetchBudgets } from '../api/budgets';
import { useTheme } from '../context/ThemeContext';
import {
  ChartFrame, SkeuoDefs, RaisedBar, RaisedBarH, SkeuoTooltipSlot, useChartTokens,
} from '../components/charts/SkeuoChart';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PERIODS = [
  { value: '1m', label: '1M' }, { value: '3m', label: '3M' },
  { value: '6m', label: '6M' }, { value: '1y', label: '1Y' },
];

const inr = (n) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
const inrShort = (n) => {
  const v = Math.abs(n);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${Math.round(v / 1e3)}k`;
  return `₹${Math.round(v)}`;
};

/* One headline figure, sharing the dashboard's tile anatomy. */
const Metric = ({ icon: Icon, label, value, sub, accent = false, index = 0 }) => (
  <motion.section
    className={`tile ${accent ? 'tile--accent' : ''}`}
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
  >
    <header className="tile-head">
      <span className="tile-icon"><Icon size={16} weight="fill" /></span>
      <div className="tile-titles"><h3>{label}</h3>{sub && <p>{sub}</p>}</div>
    </header>
    <div className="tile-figure money">{value}</div>
  </motion.section>
);

export default function AnalyticsPage() {
  const now = new Date();
  const [period, setPeriod] = useState('6m');
  const { theme } = useTheme();
  const t = useChartTokens(theme);

  const { data: allTxns = [], isLoading } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets });

  const txns = allTxns.filter(x => !x.isRecurring);
  const pm = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[period];
  const cutoff = new Date(now.getFullYear(), now.getMonth() - pm + 1, 1);
  const filt = txns.filter(x => new Date(x.date) >= cutoff);

  const monthlyTrend = useMemo(() => {
    const ms = [];
    for (let i = pm - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      ms.push({ label: MONTHS[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), income: 0, expense: 0 });
    }
    filt.forEach(x => {
      const d = new Date(x.date);
      const m = ms.find(mm => mm.year === d.getFullYear() && mm.month === d.getMonth());
      if (!m) return;
      if (x.type === 'income') m.income += x.amount;
      if (x.type === 'expense') m.expense += x.amount;
    });
    return ms;
  }, [filt, pm]); // eslint-disable-line react-hooks/exhaustive-deps

  const catSpend = useMemo(() => {
    const map = {};
    filt.filter(x => x.type === 'expense').forEach(x => { map[x.category] = (map[x.category] || 0) + x.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filt]);

  const totalExp = catSpend.reduce((s, [, v]) => s + v, 0);
  const totalInc = filt.filter(x => x.type === 'income').reduce((s, x) => s + x.amount, 0);
  const net = totalInc - totalExp;
  const sr = totalInc > 0 ? ((net / totalInc) * 100).toFixed(1) : 0;

  const daySpend = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => ({ label: d, total: 0 }));
    filt.filter(x => x.type === 'expense').forEach(x => { days[new Date(x.date).getDay()].total += x.amount; });
    return days;
  }, [filt]);

  const budgetStatus = useMemo(() => {
    const sm = filt.filter(x => x.type === 'expense')
      .reduce((acc, x) => { acc[x.category] = (acc[x.category] || 0) + x.amount; return acc; }, {});
    return budgets
      .map(b => ({ ...b, spent: sm[b.category] || 0, pct: Math.min(((sm[b.category] || 0) / b.limit) * 100, 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, filt]);

  const topCats = catSpend.slice(0, 7).map(([name, value], i) => ({ name, value, fill: t.ramp[i % t.ramp.length] }));
  const donut  = catSpend.slice(0, 6).map(([name, value], i) => ({ name, value, fill: t.ramp[i % t.ramp.length] }));
  const noExp = catSpend.length === 0;

  return (
    <div>
      <PageHeader icon={BarChart3} title="Analytics" subtitle="Where your money goes, and how that is trending." />

      {/* Period — one recessed segmented control */}
      <div className="cf-range" style={{ width: 'fit-content', marginBottom: 18 }} role="group" aria-label="Period">
        {PERIODS.map(p => (
          <button key={p.value} type="button" className={period === p.value ? 'is-on' : ''}
            onClick={() => setPeriod(p.value)} aria-pressed={period === p.value}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Headline figures */}
      <div className="tile-row tile-row--4">
        <Metric index={0} accent icon={TrendingUp} label="Total income" sub={`Last ${pm} month${pm > 1 ? 's' : ''}`} value={inr(totalInc)} />
        <Metric index={1} icon={TrendingDown} label="Total expenses" sub={`${catSpend.length} categories`} value={inr(totalExp)} />
        <Metric index={2} icon={Target} label="Net savings" sub={net >= 0 ? 'Surplus' : 'Deficit'} value={inr(net)} />
        <Metric index={3} icon={Calendar} label="Savings rate" sub={sr >= 20 ? 'Excellent' : sr >= 10 ? 'Good' : 'Needs work'} value={`${sr}%`} />
      </div>

      <div className="an-grid">
        {/* Income vs expenses — scrubbable */}
        <ChartFrame
          title="Income vs expenses"
          subtitle={`Last ${pm} months · drag the scrubber to zoom`}
          height={264}
          loading={isLoading}
          action={
            <div className="skc-legend" style={{ margin: 0 }}>
              <span><i style={{ background: t.brand }} />Income</span>
              <span><i style={{ background: '#646464' }} />Expenses</span>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrend} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <SkeuoDefs id="an-trend" />
              <CartesianGrid strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} dy={6} />
              <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={54} />
              <SkeuoTooltipSlot cursorKind="line" formatter={(v) => inr(v)} />
              <Area type="monotone" dataKey="expense" name="Expenses" stroke="#646464" strokeWidth={1.75}
                fill="url(#an-trend-area2)" activeDot={{ r: 4, fill: '#A7A7A7', stroke: 'none' }} />
              <Area type="monotone" dataKey="income" name="Income" stroke={t.brand} strokeWidth={2.5}
                fill="url(#an-trend-area)" activeDot={{ r: 5, fill: t.brand, stroke: '#fff', strokeWidth: 1.5 }} />
              {monthlyTrend.length > 4 && (
                <Brush dataKey="label" height={22} travellerWidth={9} stroke="transparent" y={232} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* Category split */}
        <ChartFrame
          title="Spending by category"
          subtitle="Share of total expenses"
          height={264}
          loading={isLoading}
          empty={noExp ? 'No expenses in this period' : null}
          footer={
            <div className="skc-legend">
              {donut.map(d => <span key={d.name}><i style={{ background: d.fill }} />{d.name}</span>)}
            </div>
          }
        >
          <div style={{ position: 'relative', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <SkeuoDefs id="an-donut" />
                <SkeuoTooltipSlot cursorKind="none" formatter={(v) => inr(v)} />
                <Pie
                  data={donut} dataKey="value" nameKey="name"
                  innerRadius="62%" outerRadius="88%" paddingAngle={2}
                  stroke="var(--surface-in)" strokeWidth={3}
                  isAnimationActive
                >
                  {donut.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {!noExp && (
              <div className="skc-donut-centre">
                <b>{inrShort(totalExp)}</b>
                <span>total spend</span>
              </div>
            )}
          </div>
        </ChartFrame>
      </div>

      {/* Top categories — horizontal, ranked */}
      <ChartFrame
        title="Top spending categories"
        subtitle="Ranked by amount"
        height={Math.max(180, topCats.length * 34)}
        loading={isLoading}
        empty={noExp ? 'No expense data' : null}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topCats} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <SkeuoDefs id="an-top" />
            <CartesianGrid strokeDasharray="3 4" horizontal={false} />
            <XAxis type="number" tickFormatter={inrShort} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} />
            <SkeuoTooltipSlot formatter={(v) => inr(v)} />
            <Bar dataKey="value" name="Spend" barSize={20}
              shape={<RaisedBarH filterId="an-top-lift" radius={7} />}>
              {topCats.map((c, i) => <Cell key={i} fill={c.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="an-grid" style={{ marginTop: 16 }}>
        {/* Weekday rhythm */}
        <ChartFrame title="Spending by day" subtitle="Which days cost you the most" height={190} loading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daySpend} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <SkeuoDefs id="an-day" />
              <CartesianGrid strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} dy={6} />
              <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={54} />
              <SkeuoTooltipSlot formatter={(v) => inr(v)} />
              <Bar dataKey="total" name="Spend" barSize={26}
                shape={<RaisedBar filterId="an-day-lift" radius={7} />}>
                {daySpend.map((d, i) => <Cell key={i} fill={t.ramp[i % t.ramp.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* Budget adherence */}
        <section className="skc">
          <header className="skc-head">
            <div className="skc-titles">
              <h3>Budget adherence</h3>
              <p>How close each budget is to its limit</p>
            </div>
          </header>
          {budgetStatus.length === 0 ? (
            <div className="skc-empty" style={{ height: 120 }}>No budgets set</div>
          ) : (
            <div className="an-budgets">
              {budgetStatus.slice(0, 6).map(b => {
                const over = b.pct >= 100, near = b.pct >= 80;
                return (
                  <div key={b._id || b.id} className="an-budget">
                    <div className="an-budget-top">
                      <span className="an-budget-name">{b.category}</span>
                      <span className="an-budget-num" style={{ color: over ? 'var(--red)' : near ? 'var(--brand)' : 'var(--text-2)' }}>
                        {inr(b.spent)} <em>/ {inr(b.limit)}</em>
                      </span>
                    </div>
                    <span className="hs-part-track">
                      <motion.span
                        className="hs-part-fill"
                        initial={{ width: 0 }} animate={{ width: `${b.pct}%` }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        style={over ? { background: 'var(--red)' } : undefined}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

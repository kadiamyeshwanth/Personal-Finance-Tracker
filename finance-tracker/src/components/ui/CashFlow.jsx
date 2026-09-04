/**
 * CashFlow — daily money in vs out for the selected window.
 *
 * Recharts diverging bars: inflow stacks up from the zero line, outflow stacks
 * down. Restyled by the Skeuo chart kit — recessed groove, extruded bars, a
 * floating tooltip card that does not dim the plot. Gridlines + axis labels
 * give it the read it was missing.
 *
 * Derived entirely from cached transactions — no request.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendUp, TrendDown } from '@phosphor-icons/react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import { spring } from '../../lib/motion';
import { useTheme } from '../../context/ThemeContext';
import {
  SkeuoDefs, RaisedBar, SkeuoTooltipSlot, useChartTokens,
} from '../charts/SkeuoChart';

const RANGES = [
  { key: 'D', label: '14D', days: 14 },
  { key: 'W', label: '6W',  days: 42 },
  { key: 'M', label: '3M',  days: 90 },
  { key: 'C', label: '6M',  days: 180 },
];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const inr = (n) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
const inrShort = (n) => {
  const v = Math.abs(n);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${Math.round(v / 1e3)}k`;
  return `₹${Math.round(v)}`;
};

export default function CashFlow({ transactions = [] }) {
  const [range, setRange] = useState('W');
  const { theme } = useTheme();
  const t = useChartTokens(theme);
  const days = RANGES.find(r => r.key === range).days;
  const tickEvery = days <= 14 ? 2 : days <= 42 ? 7 : days <= 90 ? 15 : 30;

  const { data, inflow, outflow, net } = useMemo(() => {
    const txns = transactions.filter(x => !x.isRecurring);
    const today = startOfDay(new Date());

    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      return { date: d, in: 0, out: 0 };
    });
    const firstMs = buckets[0].date.getTime();

    let totalIn = 0, totalOut = 0;
    txns.forEach(x => {
      const idx = Math.round((startOfDay(x.date).getTime() - firstMs) / 86_400_000);
      if (idx < 0 || idx >= days) return;
      if (x.type === 'income') { buckets[idx].in += x.amount; totalIn += x.amount; }
      else { buckets[idx].out += x.amount; totalOut += x.amount; }
    });

    return {
      data: buckets.map((b, i) => ({
        i,
        label: b.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        full:  b.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        in: b.in,
        out: -b.out,          // negative so it stacks downward
        outAbs: b.out,
        net: b.in - b.out,
      })),
      inflow: totalIn,
      outflow: totalOut,
      net: totalIn - totalOut,
    };
  }, [transactions, days]);

  const positive = net >= 0;

  const tipFormatter = (v, name, p) => {
    if (name === 'Outflow') return '−' + inr(Math.abs(v));
    if (name === 'Inflow')  return '+' + inr(v);
    return inr(v);
  };

  return (
    <motion.section
      className="cf"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      aria-label="Cash flow"
    >
      <header className="cf-head">
        <div>
          <h2 className="cf-title">Cash flow</h2>
          <p className="cf-sub">Daily money in and out · last {days} days</p>
        </div>

        <div className="cf-range" role="group" aria-label="Range">
          {RANGES.map(r => (
            <button
              key={r.key}
              type="button"
              className={range === r.key ? 'is-on' : ''}
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="cf-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barCategoryGap="18%">
            <SkeuoDefs id="cf" />
            <CartesianGrid strokeDasharray="2 5" vertical={false} />
            <XAxis
              dataKey="label" tickLine={false} axisLine={false} dy={8}
              interval={tickEvery - 1} minTickGap={8}
            />
            <YAxis tickFormatter={inrShort} tickLine={false} axisLine={false} width={52} />
            <ReferenceLine y={0} stroke="var(--hairline-2)" strokeWidth={1} />
            <SkeuoTooltipSlot
              formatter={tipFormatter}
              labelFormatter={(l) => data.find(d => d.label === l)?.full || l}
            />
            <Bar dataKey="in"  name="Inflow"  stackId="cf" shape={<RaisedBar filterId="cf-lift" radius={5} />}>
              {data.map((d, i) => <Cell key={i} fill={t.brand} />)}
            </Bar>
            <Bar dataKey="out" name="Outflow" stackId="cf" shape={<RaisedBar filterId="cf-lift" radius={5} />}>
              {data.map((d, i) => <Cell key={i} fill="#6E6E6E" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <footer className="cf-foot">
        <div>
          <span className="n-label">In</span>
          <span className="money cf-up">{inr(inflow)}</span>
        </div>
        <div>
          <span className="n-label">Out</span>
          <span className="money">{inr(outflow)}</span>
        </div>
        <div>
          <span className="n-label">Net</span>
          <span className={`money ${positive ? 'cf-up' : 'cf-down'}`}>
            {positive ? '+' : '−'}{inr(net)}
          </span>
        </div>
      </footer>
    </motion.section>
  );
}

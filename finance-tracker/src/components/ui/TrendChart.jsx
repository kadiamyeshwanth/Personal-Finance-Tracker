/**
 * TrendChart — six-month income vs spending, as a gradient area chart.
 *
 * Hand-rolled SVG rather than Chart.js: the gradients, the smoothing and the
 * draw-on animation all needed exact control, and this ships no extra runtime.
 *
 * Presentation only — it derives everything from transactions already cached.
 */
import { useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '../../lib/motion';

const W = 560;
const H = 150;
const PAD = { t: 12, r: 4, b: 22, l: 4 };

/* Catmull-Rom → cubic bezier. Smooth without overshooting the data. */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function TrendChart({ transactions = [] }) {
  const uid = useId().replace(/:/g, '');
  const reduced = prefersReducedMotion();

  const { months, inPts, outPts, peak } = useMemo(() => {
    const now = new Date();
    const ms = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      ms.push({
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        year: d.getFullYear(), month: d.getMonth(),
        income: 0, expenses: 0,
      });
    }
    transactions.filter(t => !t.isRecurring).forEach(t => {
      const d = new Date(t.date);
      const m = ms.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (!m) return;
      if (t.type === 'income') m.income += t.amount;
      else m.expenses += t.amount;
    });

    const max = Math.max(...ms.map(m => Math.max(m.income, m.expenses)), 1);
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const x = (i) => PAD.l + (i / (ms.length - 1 || 1)) * iw;
    const y = (v) => PAD.t + ih - (v / max) * ih;

    return {
      months: ms,
      inPts:  ms.map((m, i) => ({ x: x(i), y: y(m.income) })),
      outPts: ms.map((m, i) => ({ x: x(i), y: y(m.expenses) })),
      peak: max,
    };
  }, [transactions]);

  const base = H - PAD.b;
  const line   = (pts) => smoothPath(pts);
  const area   = (pts) => `${smoothPath(pts)} L ${pts[pts.length - 1].x} ${base} L ${pts[0].x} ${base} Z`;

  const draw = reduced
    ? { pathLength: 1 }
    : { pathLength: 1, transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] } };

  return (
    <figure className="tc">
      <figcaption className="tc-head">
        <span className="n-label">Six months</span>
        <div className="tc-key">
          <span className="tc-key-item"><i className="tc-sw tc-sw-in" />Income</span>
          <span className="tc-key-item"><i className="tc-sw tc-sw-out" />Spending</span>
        </div>
      </figcaption>

      <svg className="tc-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        role="img" aria-label={`Income and spending over six months. Peak ₹${Math.round(peak).toLocaleString('en-IN')}.`}>
        <defs>
          {/* Income — brand blue, fading to nothing at the baseline */}
          <linearGradient id={`in-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--brand)" stopOpacity="0.42" />
            <stop offset="55%"  stopColor="var(--brand)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
          {/* Spending — ink, so it reads as the ground the blue sits above */}
          <linearGradient id={`out-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--text)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--text)" stopOpacity="0" />
          </linearGradient>
          {/* Stroke gradients run left→right so the line brightens into the present */}
          <linearGradient id={`ins-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="var(--brand-to)" />
            <stop offset="100%" stopColor="var(--brand-from)" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line x1={PAD.l} y1={base} x2={W - PAD.r} y2={base}
          stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

        {/* Spending sits behind income */}
        <path d={area(outPts)}  fill={`url(#out-${uid})`} />
        <motion.path d={line(outPts)} fill="none" stroke="var(--text-3)" strokeWidth="1.5"
          vectorEffect="non-scaling-stroke" strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }} animate={draw} />

        <path d={area(inPts)} fill={`url(#in-${uid})`} />
        <motion.path d={line(inPts)} fill="none" stroke={`url(#ins-${uid})`} strokeWidth="2.25"
          vectorEffect="non-scaling-stroke" strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }} animate={draw} />

        {/* Node on the latest month */}
        <circle cx={inPts[inPts.length - 1].x} cy={inPts[inPts.length - 1].y}
          r="3.5" fill="var(--brand)" stroke="var(--bg-secondary)" strokeWidth="2"
          vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="tc-axis" aria-hidden="true">
        {months.map(m => <span key={`${m.year}-${m.month}`}>{m.label}</span>)}
      </div>
    </figure>
  );
}

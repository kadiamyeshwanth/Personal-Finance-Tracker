/**
 * SkeuoChart — Recharts primitives restyled into Clario's physical language.
 *
 * Recharts ships flat SVG; none of its default chrome is used here. Instead:
 *
 *   <ChartFrame>    a recessed groove the plot sits inside
 *   <RaisedBar>     a bar with a top bevel + drop shadow, so it extrudes
 *   <SkeuoTooltip>  a small floating physical card, not the default box
 *   grid/axis       hairlines from the token system, no library defaults
 *
 * Everything reads CSS variables at render time, so both themes follow the
 * tokens without a second code path.
 */
import { useMemo } from 'react';
import { Tooltip } from 'recharts';

const readVar = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

/** Palette + axis colours, re-read whenever `themeKey` changes. */
export function useChartTokens(themeKey) {
  return useMemo(() => ({
    brand:   readVar('--brand', '#E85002'),
    bright:  readVar('--brand-from', '#F16001'),
    deep:    readVar('--brand-to', '#C10801'),
    ink:     readVar('--text', '#F9F9F9'),
    ink2:    readVar('--text-2', '#A7A7A7'),
    ink3:    readVar('--text-3', '#646464'),
    grid:    readVar('--hairline', 'rgba(255,255,255,0.07)'),
    // Ranked ramp — categories arrive sorted, so a monotonic ramp encodes rank.
    ramp: ['#F98D42', '#F16001', '#E85002', '#D24401', '#C10801', '#A83600', '#8F2A00', '#6B1F00'],
  }), [themeKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Shared SVG filters/gradients. Mount once per chart. */
export function SkeuoDefs({ id }) {
  return (
    <defs>
      <filter id={`${id}-lift`} x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000" floodOpacity="0.45" />
      </filter>
      <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--brand)" stopOpacity="0.32" />
        <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-area2`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#646464" stopOpacity="0.26" />
        <stop offset="100%" stopColor="#646464" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

/**
 * A bar drawn as a physical extrusion: solid face, 1px lighter top bevel,
 * 1px darker bottom seat, and a soft shadow beneath.
 */
export function RaisedBar(props) {
  let { x, y, width, height } = props;
  const { fill, radius = 6, filterId } = props;
  if (height == null || width == null || width <= 0) return null;
  // recharts hands negative (below-axis) bars a negative height with y at the
  // zero line — normalise so they render downward as a real bar.
  if (height < 0) { y = y + height; height = -height; }
  if (height <= 0) return null;
  const r = Math.min(radius, width / 2, height);

  return (
    <g filter={filterId ? `url(#${filterId})` : undefined}>
      <rect x={x} y={y} width={width} height={height} rx={r} ry={r} fill={fill} />
      {/* top bevel — the lit edge */}
      <rect
        x={x + 0.5} y={y + 0.5}
        width={Math.max(width - 1, 0)} height={Math.min(1.5, height)}
        rx={Math.min(r, 1.5)}
        fill="#fff" opacity="0.3"
      />
      {/* seated base */}
      {height > 4 && (
        <rect
          x={x + 0.5} y={y + height - 1.5}
          width={Math.max(width - 1, 0)} height={1}
          fill="#000" opacity="0.22"
        />
      )}
    </g>
  );
}

/** Horizontal variant — bevel runs down the left edge instead. */
export function RaisedBarH(props) {
  const { x, y, width, height, fill, radius = 6, filterId } = props;
  if (height == null || width == null || height <= 0 || width <= 0) return null;
  const r = Math.min(radius, height / 2, width);
  return (
    <g filter={filterId ? `url(#${filterId})` : undefined}>
      <rect x={x} y={y} width={width} height={height} rx={r} ry={r} fill={fill} />
      <rect x={x + 0.5} y={y + 0.5} width={Math.max(width - 1, 0)} height={1.2} rx={1} fill="#fff" opacity="0.26" />
    </g>
  );
}

/** Floating physical card, replacing Recharts' default tooltip surface. */
export function SkeuoTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="skc-tip">
      {label != null && (
        <div className="skc-tip-label">{labelFormatter ? labelFormatter(label) : label}</div>
      )}
      {payload.map((p, i) => (
        <div className="skc-tip-row" key={i}>
          <span className="skc-tip-dot" style={{ background: p.color || p.fill }} />
          <span className="skc-tip-name">{p.name}</span>
          <b>{formatter ? formatter(p.value, p.name, p) : p.value}</b>
        </div>
      ))}
    </div>
  );
}

/** Pre-wired <Tooltip> with our card and no default cursor fill. */
export function SkeuoTooltipSlot({ formatter, labelFormatter, cursorKind = 'bar' }) {
  return (
    <Tooltip
      content={<SkeuoTooltip formatter={formatter} labelFormatter={labelFormatter} />}
      cursor={
        cursorKind === 'none' ? false
          : cursorKind === 'line'
            ? { stroke: 'var(--brand)', strokeWidth: 1, strokeDasharray: '3 3' }
            : { fill: 'rgba(232, 80, 2, 0.08)', radius: 6 }
      }
      wrapperStyle={{ outline: 'none' }}
    />
  );
}

/**
 * The groove a plot sits in. `title`/`action` render a card header above it so
 * every chart on every page has the same anatomy.
 */
export function ChartFrame({ title, subtitle, action, height = 240, loading, empty, footer, children }) {
  return (
    <section className="skc">
      {(title || action) && (
        <header className="skc-head">
          <div className="skc-titles">
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="skc-well" style={{ height }}>
        {loading
          ? <div className="n-skeleton" style={{ height: '100%', borderRadius: 'inherit' }} />
          : empty
            ? <div className="skc-empty">{empty}</div>
            : children}
      </div>
      {!loading && !empty && footer}
    </section>
  );
}

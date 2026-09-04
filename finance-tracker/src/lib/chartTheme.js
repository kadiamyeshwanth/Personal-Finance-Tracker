/**
 * chartTheme — one source of truth for every Chart.js surface.
 *
 * Two things were wrong before this existed:
 *   1. Fills were the series colour + "22" (13% alpha), which on a near-black
 *      ground reads as an empty outline. Charts must be FILLED — the shape is
 *      the data, the stroke is only its edge.
 *   2. Each page hardcoded its own rainbow, so Analytics and Reports disagreed
 *      with the rest of the product.
 *
 * The palette is a single hue stepped by lightness. Series arrive sorted by
 * size, so a monotonic ramp encodes rank as well as identity.
 */

/* Orange ramp, lightest first. Solid — never alpha-suffixed. */
export const SERIES = [
  '#F98D42', '#F16001', '#E85002', '#D24401', '#C10801',
  '#A83600', '#8F2A00', '#6B1F00',
];

/* Money vs. ink — used where a chart genuinely means "in vs out". */
export const INCOME_COLOR = '#E85002';
export const SPEND_COLOR  = '#646464';

const rgba = (hex, a) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * Vertical canvas gradient that fades to nothing at the axis.
 * Chart.js calls this per-render; chartArea is unmeasured on the first pass,
 * so fall back to a flat colour rather than throwing.
 */
export function areaFill(ctx, color, topAlpha = 0.55) {
  const { chart } = ctx;
  const area = chart.chartArea;
  const solid = color.startsWith('#') ? rgba(color, topAlpha) : color;
  if (!area) return solid;
  const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, solid);
  g.addColorStop(1, color.startsWith('#') ? rgba(color, 0.02) : 'rgba(0,0,0,0)');
  return g;
}

/** Horizontal gradient for bars — brighter at the value end. */
export function barFill(ctx, color) {
  const { chart } = ctx;
  const area = chart.chartArea;
  if (!area) return color;
  const g = chart.ctx.createLinearGradient(area.left, 0, area.right, 0);
  g.addColorStop(0, rgba(color, 0.55));
  g.addColorStop(1, color);
  return g;
}

const cssVar = (name, fallback) => {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

const money = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

/**
 * Build base options + both scale orientations.
 * `scales` for vertical charts, `scalesX` for indexAxis:'y' (horizontal bars) —
 * reusing one object for both put a currency formatter on the CATEGORY axis,
 * which is what produced axis labels reading "₹0, ₹1, ₹2".
 */
export function chartTheme() {
  const text   = cssVar('--text', '#f7f9fc');
  const text2  = cssVar('--text-2', 'rgba(247,249,252,0.62)');
  const text3  = cssVar('--text-3', 'rgba(247,249,252,0.42)');
  const border = cssVar('--border', 'rgba(255,255,255,0.08)');
  const tip    = cssVar('--bg-tertiary', '#181b1f');

  const font = { family: 'Nunito, ui-rounded, sans-serif', size: 12 };

  const base = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: text2,
          font: { ...font, weight: '600' },
          /* Filled square swatches. usePointStyle drew hollow rings, which is
             what made the legends look unfinished. */
          usePointStyle: false,
          boxWidth: 12,
          boxHeight: 12,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: tip,
        borderColor: border,
        borderWidth: 1,
        titleColor: text,
        bodyColor: text2,
        titleFont: { ...font, size: 13, weight: '700' },
        bodyFont: font,
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 5,
      },
    },
  };

  const valueAxis = {
    grid: { color: border, drawTicks: false },
    ticks: { color: text3, font: { ...font, size: 11 }, padding: 8, callback: money },
    border: { display: false },
  };
  const catAxis = {
    grid: { display: false },
    ticks: { color: text3, font: { ...font, size: 11 }, padding: 6 },
    border: { display: false },
  };

  return {
    base,
    /* Vertical charts: categories along x, values up y. */
    scales:  { x: catAxis,   y: valueAxis },
    /* Horizontal bars (indexAxis:'y'): values along x, categories down y. */
    scalesX: { x: valueAxis, y: catAxis },
  };
}

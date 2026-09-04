/**
 * segments.js — per-index colour ramp for the "equalizer" bar strips
 * (Portfolio, Monthly Income). Each bar gets its OWN colour sampled from a
 * multi-stop gradient, not one CSS background painted across the whole row —
 * that reads as bars with a shared image behind them; sampling per-index is
 * what gives the reference its "level meter" look, where the hue itself
 * shifts from bar to bar.
 */

const ACTIVE_STOPS = [
  [0.00, '#8F2A00'], // deep burnt — left edge
  [0.16, '#C10801'], // brand deep
  [0.36, '#E85002'], // brand
  [0.58, '#F16001'], // bright orange
  [0.78, '#F98D42'], // amber highlight
  [0.92, '#FCC299'], // pale warm
  [1.00, '#FDE4D2'], // near-cream — right edge of the active run
];

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

function mix(hexA, hexB, t) {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return `rgb(${lerp(r1, r2, t)}, ${lerp(g1, g2, t)}, ${lerp(b1, b2, t)})`;
}

/** Colour for a bar at position t (0..1) along the active run. */
export function activeSegmentColor(t) {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < ACTIVE_STOPS.length - 1; i++) {
    const [p0, c0] = ACTIVE_STOPS[i];
    const [p1, c1] = ACTIVE_STOPS[i + 1];
    if (clamped >= p0 && clamped <= p1) {
      return mix(c0, c1, (clamped - p0) / (p1 - p0 || 1));
    }
  }
  return ACTIVE_STOPS[ACTIVE_STOPS.length - 1][1];
}

/**
 * Deterministic pseudo-random 0..1 stream (mulberry32) — same shape on every
 * render, but not a repeating sine wave, so it reads as real data rather than
 * an obviously periodic waveform.
 */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An organic "level meter" silhouette: a smoothed random walk (so neighbours
 * relate to each other, unlike pure noise) with a couple of deliberate taller
 * peaks placed around the middle third, and a gentle settle toward the end of
 * the active run — matching the reference's "starts high, dips, peaks in the
 * middle, settles" shape rather than a uniform or perfectly periodic wave.
 *
 * Returns heights in 0..1, one per segment, length `n`.
 */
export function organicHeights(n, seed = 42) {
  const next = rng(seed);
  const raw = Array.from({ length: n }, () => 0.32 + next() * 0.62);

  // 3-wide moving average so consecutive bars relate, without going smooth
  // and sinusoidal like a pure trig function would.
  const smoothed = raw.map((_, i) => {
    const a = raw[Math.max(0, i - 1)];
    const b = raw[i];
    const c = raw[Math.min(n - 1, i + 1)];
    return (a + b * 2 + c) / 4;
  });

  // A couple of standout peaks in the middle third — "a few noticeable
  // taller peaks around the middle" — plus a light settle toward the tail
  // of the active run so the later bars read as more consistent.
  const peakA = Math.round(n * 0.42);
  const peakB = Math.round(n * 0.55);
  return smoothed.map((h, i) => {
    let v = h;
    const distA = Math.abs(i - peakA);
    const distB = Math.abs(i - peakB);
    if (distA <= 2) v += (3 - distA) * 0.09;
    if (distB <= 1) v += (2 - distB) * 0.07;
    if (i > n * 0.75) v = v * 0.82 + 0.14; // settle toward the tail
    return Math.max(0.14, Math.min(1, v));
  });
}

/**
 * Build N segments: `activeFrac` of them sample the gradient above (each a
 * distinct colour by position), the remainder are dim/inactive.
 */
export function buildSegments(heights, activeFrac = 0.84) {
  const n = heights.length;
  const activeCount = Math.max(1, Math.round(n * activeFrac));
  return heights.map((h, i) => {
    const active = i < activeCount;
    const color = active ? activeSegmentColor(i / Math.max(1, activeCount - 1)) : null;
    return { h, active, color };
  });
}

/* ───────────────────────────────────────────────────────────────────────────
   Monthly-income strip — a SHORT, DENSE financial-data strip (not a tall
   equalizer). Fixed 60-segment silhouette with small organic variation, an
   active run to ~85% width, then dark inactive segments. Heights are in px
   and used directly on a ~58px-tall row.
   ─────────────────────────────────────────────────────────────────────────── */
export const INCOME_LEVELS = [
  42, 46, 40, 48, 44, 52, 47, 55, 49, 45,
  43, 48, 46, 51, 47, 43, 38, 48, 51, 55,
  53, 58, 54, 49, 46, 50, 48, 52, 55, 58,
  54, 51, 47, 45, 50, 53, 57, 55, 52, 49,
  47, 51, 55, 57, 54, 51, 48, 46, 50, 53,
  51, 48, 44, 39, 35, 30, 27, 25, 23, 21,
];
export const INCOME_ACTIVE = 51; // segments 0..50 active, 51..59 dark

/* Deep orange → orange → warm amber → pale warm highlight. */
const INCOME_RAMP = [
  '#8F2A00', '#A83600', '#C10801', '#D24401', '#E85002',
  '#EE5B02', '#F16001', '#F46E14', '#F77D2A', '#F98D42',
  '#FA9E5C', '#FBB079', '#FCC299', '#FDD4B8', '#FDE4D2',
];

/** Per-segment colour by horizontal position along the active run. */
export function incomeColor(index, activeCount = INCOME_ACTIVE - 1) {
  const t = Math.min(INCOME_RAMP.length - 1, Math.floor((index / activeCount) * INCOME_RAMP.length));
  return INCOME_RAMP[Math.max(0, t)];
}

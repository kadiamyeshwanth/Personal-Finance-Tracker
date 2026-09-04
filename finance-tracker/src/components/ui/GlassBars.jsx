/**
 * GlassBars — the hero's rack of vertical glass slats.
 *
 * Each slat is a real liquid-glass surface: the WebGL gradient burning behind
 * it is refracted through the rim (Chromium) or frosted (everywhere else), so
 * the light genuinely bends rather than being faked with a gradient overlay.
 *
 * Heights follow a bell curve so the rack reads as one sculpted object with a
 * centre crest, not a picket fence. They rise on mount, staggered from the
 * middle outwards.
 */
import { useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLiquidGlass } from './GlassSurface';

/** One slat. Owns its own glass instance — liquid-glass binds per element. */
function Bar({ height, delay, reduced }) {
  const ref = useRef(null);
  useLiquidGlass(ref, { weight: 'light', radius: 18 });

  return (
    <motion.span
      ref={ref}
      className="pre-bar"
      style={{ height: `${height}%` }}
      initial={reduced ? { opacity: 0 } : { scaleY: 0.04, opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { scaleY: 1, opacity: 1 }}
      transition={
        reduced
          ? { duration: 0.3 }
          : { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }
      }
    />
  );
}

export default function GlassBars({ count = 22 }) {
  const reduced = useReducedMotion();

  // Bell-curve heights with a touch of deterministic jitter, and a stagger that
  // radiates from the centre slat outwards.
  const bars = useMemo(() => {
    const mid = (count - 1) / 2;
    return Array.from({ length: count }, (_, i) => {
      const t = (i - mid) / mid;                      // −1 … 1
      const bell = Math.exp(-(t * t) * 1.55);         // centre crest
      const jitter = (((i * 9301 + 49297) % 233) / 233) * 0.13;
      return {
        height: Math.round(30 + bell * 62 + jitter * 100 * 0.09),
        delay: 0.18 + Math.abs(i - mid) * 0.035,
      };
    });
  }, [count]);

  return (
    <div className="pre-bars" aria-hidden="true">
      {bars.map((b, i) => (
        <Bar key={i} height={b.height} delay={b.delay} reduced={reduced} />
      ))}
    </div>
  );
}

/**
 * GlassColumns — full-height glass columns spanning the hero, edge to edge.
 *
 * Each column is a real liquid-glass surface, so the wave of light burning
 * behind it is refracted at the rim (Chromium) or frosted (elsewhere) rather
 * than faked with an overlay. Uniform width and full height: the rack is a
 * screen the light passes through, not a skyline.
 */
import { useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLiquidGlass } from './GlassSurface';

function Column({ delay, reduced }) {
  const ref = useRef(null);
  useLiquidGlass(ref, { weight: 'light', radius: 3 });

  return (
    <motion.span
      ref={ref}
      className="pl-col"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scaleY: 1.06 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={
        reduced ? { duration: 0.3 } : { duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }
      }
    />
  );
}

export default function GlassColumns({ count = 18 }) {
  const reduced = useReducedMotion();

  // Reveal radiates from the centre outward, so the rack resolves as one plane.
  const delays = useMemo(() => {
    const mid = (count - 1) / 2;
    return Array.from({ length: count }, (_, i) => 0.1 + Math.abs(i - mid) * 0.045);
  }, [count]);

  return (
    <div className="pl-cols" aria-hidden="true">
      {delays.map((d, i) => (
        <Column key={i} delay={d} reduced={reduced} />
      ))}
    </div>
  );
}

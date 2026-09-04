/**
 * FloatingPaths — a slow field of flowing SVG strokes for use as a card
 * background. Adapted from the "Background Paths" component to plain JSX;
 * the stroke tint comes from the parent via `currentColor`.
 *
 *   <div className="…card…">
 *     <FloatingPaths className="tile-fp" />
 *     … content (needs its own position/z-index above) …
 *   </div>
 */
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '../../lib/motion';

const COUNT = 26;

const pathD = (i, position) =>
  `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`;

function PathSet({ position, animate }) {
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => {
        const width = 1 + i * 0.09;
        const op = 0.3 + i * 0.026;
        return animate ? (
          <motion.path
            key={`${position}-${i}`}
            d={pathD(i, position)}
            stroke="currentColor"
            strokeWidth={width}
            strokeOpacity={op}
            fill="none"
            initial={{ pathLength: 0.3, opacity: 0.5 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.7, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + (i % 8) * 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ) : (
          <path
            key={`${position}-${i}`}
            d={pathD(i, position)}
            stroke="currentColor"
            strokeWidth={width}
            strokeOpacity={op}
            fill="none"
          />
        );
      })}
    </>
  );
}

export default function FloatingPaths({ className = '' }) {
  const animate = !prefersReducedMotion();

  return (
    <div className={`fp ${className}`.trim()} aria-hidden="true">
      <svg
        className="fp-svg"
        viewBox="-40 40 620 300"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <PathSet position={1} animate={animate} />
        <PathSet position={-1} animate={animate} />
      </svg>
    </div>
  );
}

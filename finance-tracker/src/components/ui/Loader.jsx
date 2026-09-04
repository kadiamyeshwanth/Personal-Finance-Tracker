/**
 * Loader — the Clario mark drawing itself.
 *
 * The glyph is four quadrants, so each one can animate independently: they
 * pulse in sequence around the square, which reads as "working" without the
 * anonymous spinner every app shares. Pure SVG + transform/opacity, so it stays
 * on the compositor.
 *
 * <Loader />              inline, 28px
 * <Loader size={44} />    larger
 * <Loader full label="…" /> centred in the viewport, for route-level waits
 */
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '../../lib/motion';

/* The current Clario mark — one continuous path. */
const MARK_PATH =
  'M 228 0 C 172.772 0 128 44.772 128 100 L 128 0 L 0 0 L 0 28 C 0 83.228 44.772 128 100 128 L 0 128 L 0 256 L 28 256 C 83.228 256 128 211.228 128 156 L 128 256 L 256 256 L 256 228 C 256 172.772 211.228 128 156 128 L 256 128 L 256 0 Z';

export default function Loader({ size = 28, full = false, label, className = '' }) {
  const reduced = prefersReducedMotion();

  const mark = (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      role="img"
      aria-label={label || 'Loading'}
      className={className}
      style={{ transformOrigin: '128px 128px' }}
      initial={reduced ? { opacity: 0.6 } : { opacity: 0.35, rotate: 0, scale: 0.94 }}
      animate={
        reduced
          ? { opacity: 0.6 }
          : { opacity: [0.35, 1, 0.35], rotate: [0, 90, 90], scale: [0.94, 1, 0.94] }
      }
      transition={reduced ? undefined : { duration: 1.4, ease: [0.4, 0, 0.2, 1], repeat: Infinity }}
    >
      <path d={MARK_PATH} fill="currentColor" />
    </motion.svg>
  );

  if (!full) return mark;

  return (
    <div className="loader-full" role="status" aria-live="polite">
      <span className="loader-mark">{mark}</span>
      {label && <p className="loader-label">{label}</p>}
    </div>
  );
}

/**
 * InlineLoader — for buttons and rows, where a full mark is too much.
 * Three dots travelling, same rhythm as the mark.
 */
export function InlineLoader({ label = 'Loading' }) {
  const reduced = prefersReducedMotion();
  return (
    <span className="loader-dots" role="status" aria-label={label}>
      {[0, 1, 2].map(i => (
        <motion.i
          key={i}
          initial={reduced ? { opacity: 0.6 } : { opacity: 0.25, y: 0 }}
          animate={reduced ? { opacity: 0.6 } : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={reduced ? undefined : { duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
        />
      ))}
    </span>
  );
}

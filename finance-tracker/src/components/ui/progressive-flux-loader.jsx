/**
 * ProgressiveFluxLoader — animated progress bar with phase labels.
 *
 * Ported from the supplied reference. Every animation behaviour is preserved
 * exactly as specified: the 3D fly-in/out label transition (opacity + z +
 * scale + blur, staggered per character), the moving sheen sweep blended with
 * `screen`, `useReducedMotion` support (falls back to plain static text and an
 * instant fill, no fake motion), and the controlled/uncontrolled + onComplete
 * contract for driving it from real progress or letting it self-run.
 *
 * The only change is the palette: the reference's blue→cyan "flux" gradient
 * is now Clario's violet ramp (`--flux-from`/`--flux-to` default to the same
 * `--brand-from`/`--brand-to` tokens the rest of the app uses), and the track
 * + label read the app's CSS variables instead of shadcn's `bg-muted` /
 * `text-muted-foreground` utility classes.
 */
import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

const DEFAULT_PHASES = [
  { at: 0, label: 'starting up' },
  { at: 25, label: 'loading assets' },
  { at: 55, label: 'preparing magic' },
  { at: 80, label: 'almost there' },
  { at: 100, label: 'all done' },
];

// Violet flux — reads Clario's brand tokens by default so a theme change
// (or a future accent swap) carries through without touching this file.
const FLUX_FROM = 'var(--flux-from, var(--brand-from, #FF9A3D))';
const FLUX_TO = 'var(--flux-to, var(--brand-to, #C94F00))';
const FLUX_MID = `color-mix(in oklab, ${FLUX_FROM}, ${FLUX_TO})`;

const DEFAULT_GRADIENT = `linear-gradient(90deg, ${FLUX_FROM} 0%, ${FLUX_MID} 35%, ${FLUX_TO} 55%, ${FLUX_MID} 78%, ${FLUX_FROM} 100%)`;

const BAR_SHADOW = `0 0 18px color-mix(in oklab, ${FLUX_FROM} 55%, transparent), 0 0 32px color-mix(in oklab, ${FLUX_TO} 40%, transparent), inset 0 1.5px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 3px rgba(20, 10, 46, 0.45)`;

const SHEEN_GRADIENT =
  'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%)';

const Z_TRANSITION = { duration: 0.9, ease: [0.22, 1, 0.36, 1] };
const LETTER_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };

/** Latest label whose threshold has been crossed. Expects pre-sorted phases. */
function pickLabel(value, sortedPhases) {
  let active = sortedPhases[0]?.label ?? '';
  for (const phase of sortedPhases) {
    if (value >= phase.at) active = phase.label;
  }
  return active;
}

function FluxLabel({ label, reduced, className }) {
  const base = cn('flux-label', className);

  if (reduced) {
    return <div aria-hidden className={base}>{label}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={label}
        aria-hidden
        className={base}
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, z: -380, scale: 0.65, filter: 'blur(14px)' }}
        animate={{
          opacity: [0, 1, 1, 1],
          z: [-380, 60, -8, 0],
          scale: [0.65, 1.08, 0.985, 1],
          filter: ['blur(14px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
        }}
        exit={{
          opacity: 0, z: 220, scale: 1.35, filter: 'blur(10px)',
          transition: { duration: 0.45, ease: [0.7, 0, 0.84, 0] },
        }}
        transition={Z_TRANSITION}
      >
        <span className="flux-label-inner">
          {label.split('').map((char, index) => (
            <motion.span
              key={`${label}-${index}`}
              className="flux-label-char"
              initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ ...LETTER_TRANSITION, delay: 0.18 + index * 0.035 }}
            >
              {char === ' ' ? ' ' : char}
            </motion.span>
          ))}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

export function ProgressiveFluxLoader({
  value,
  phases = DEFAULT_PHASES,
  duration = 12,
  loop = true,
  showLabel = true,
  gradient = DEFAULT_GRADIENT,
  onComplete,
  className,
  barClassName,
  textClassName,
}) {
  const reduced = !!useReducedMotion();
  const isControlled = typeof value === 'number';
  const [internal, setInternal] = React.useState(0);

  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => { onCompleteRef.current = onComplete; });

  const completedRef = React.useRef(false);

  React.useEffect(() => {
    if (isControlled) return;
    let raf = 0;
    let timer = 0;
    let start = null;
    const totalMs = Math.max(500, duration * 1000);

    const tick = (ts) => {
      if (start === null) start = ts;
      const pct = Math.min(100, ((ts - start) / totalMs) * 100);
      setInternal(pct);
      if (pct >= 100) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
        if (loop) {
          start = null;
          completedRef.current = false;
          timer = window.setTimeout(() => {
            setInternal(0);
            raf = requestAnimationFrame(tick);
          }, 700);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [isControlled, duration, loop]);

  const raw = isControlled ? value : internal;
  const current = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;

  React.useEffect(() => {
    if (!isControlled) return;
    if (current >= 100 && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current?.();
    } else if (current < 100) {
      completedRef.current = false;
    }
  }, [isControlled, current]);

  const sortedPhases = React.useMemo(() => [...phases].sort((a, b) => a.at - b.at), [phases]);
  const label = React.useMemo(() => pickLabel(current, sortedPhases), [current, sortedPhases]);
  const rounded = Math.round(current);

  return (
    <div className={cn('flux-root', className)}>
      {showLabel && (
        <div className="flux-label-stage" style={reduced ? undefined : { perspective: '1000px' }}>
          <FluxLabel label={label} reduced={reduced} className={textClassName} />
        </div>
      )}

      <div
        className={cn('flux-track', barClassName)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={label ? `${rounded}% – ${label}` : `${rounded}%`}
        aria-label="Loading"
      >
        <motion.div
          className="flux-fill"
          style={{ background: gradient, boxShadow: BAR_SHADOW }}
          initial={false}
          animate={{ width: `${current}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {!reduced && (
            <motion.span
              aria-hidden
              className="flux-sheen"
              style={{ background: SHEEN_GRADIENT, mixBlendMode: 'screen' }}
              animate={{ x: ['-110%', '210%'] }}
              transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default ProgressiveFluxLoader;

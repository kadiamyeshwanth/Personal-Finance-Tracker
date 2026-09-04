/**
 * motion.js — the app's single source of truth for movement.
 *
 * Springs, not durations. A spring has no fixed duration: it animates from the
 * element's *current* on-screen value, so it can be interrupted and redirected
 * mid-flight without the jump a keyframe/tween produces. That interruptibility
 * is the whole point — the thought and the gesture happen in parallel.
 *
 * Two knobs (Apple's framing, mapped onto Framer Motion):
 *   bounce   ← damping ratio.  0 = critically damped (no overshoot). ~0.2 ≈ 0.8 damping.
 *   duration ← response.       How fast it reaches target, in seconds.
 *
 * Rule: default to NO bounce. Overshoot is earned only when the user's own
 * gesture carried momentum (a flick, a drag release). A menu that merely faded
 * in must not bounce.
 */

/** Critically damped — the default for almost everything. */
export const spring = { type: 'spring', bounce: 0, duration: 0.4 };

/** Snappier critically-damped spring for small, frequent UI (hovers, chips). */
export const springFast = { type: 'spring', bounce: 0, duration: 0.26 };

/** Momentum spring — ONLY after a gesture that carried velocity. */
export const springBouncy = { type: 'spring', bounce: 0.22, duration: 0.4 };

/** Drawers and sheets — Apple ships damping 0.8 / response 0.3 here. */
export const springSheet = { type: 'spring', bounce: 0.2, duration: 0.3 };

/** Non-interactive fades (opacity only) can stay tweened — nothing to interrupt. */
export const fade = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };

/**
 * Momentum projection — where a flick is *going*, not where it was released.
 * Exponential decay, matching UIScrollView. The textbook v²/2a is NOT this.
 *
 * @param {number} velocity px/s at release
 * @param {number} decelerationRate 0.998 normal, 0.99 snappier
 */
export function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Rubber-banding — progressive resistance past a boundary. A hard stop reads as
 * "frozen"; resistance reads as "responsive, but there's nothing more here."
 */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** True when the user asked for less motion. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Staggered reveal for lists/grids. One well-orchestrated entrance beats a
 * dozen scattered micro-animations.
 */
export const stagger = (i = 0, step = 0.045) => ({
  ...spring,
  delay: Math.min(i * step, 0.4), // cap it — row 40 must not wait 2 seconds
});

/** Standard enter/exit for page content. Same path in and out (spatial consistency). */
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

/**
 * Glass surfaces should *materialize* — blur and scale together — so the panel
 * reads as a real material arriving, not a rectangle fading in.
 */
export const materialize = {
  initial: { opacity: 0, scale: 0.97, filter: 'blur(8px)' },
  animate: { opacity: 1, scale: 1,    filter: 'blur(0px)' },
  exit:    { opacity: 0, scale: 0.98, filter: 'blur(6px)' },
};

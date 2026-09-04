/**
 * TiltCard — pointer-tracked 3D tilt + cursor glare, adapted from the
 * Transitions.dev "Card hover tilt" recipe for the prelanding `.pl-card`.
 *
 * Structure mirrors the recipe: an outer flat hit area that never transforms
 * (so pointer math stays stable), an inner element that rotates toward the
 * cursor, and a screen-blended glare that follows it. JS writes four custom
 * properties and toggles `.is-tilting` (fast 1:1 follow) / `.is-hover` (glare
 * fade-in); on leave the inner element eases back to flat.
 *
 * Honors prefers-reduced-motion via CSS (transform + transition killed there).
 */
import { useRef, useCallback } from 'react';

const MAX_DEG = 6;          // peak rotation at the card edge
const GLARE_LAG_MS = 60;    // how long .is-tilting lingers after the last move

export default function TiltCard({ as: Tag = 'article', className = '', children, ...rest }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const idleTimer = useRef(0);

  const onPointerMove = useCallback((e) => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const r = outer.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;   // 0..1
    const py = (e.clientY - r.top) / r.height;   // 0..1

    // rotateX tilts on the vertical axis (top back / bottom forward), so it
    // tracks the pointer's Y; rotateY tracks X. Centre = 0.
    inner.style.setProperty('--tilt-rx', `${(0.5 - py) * 2 * MAX_DEG}deg`);
    inner.style.setProperty('--tilt-ry', `${(px - 0.5) * 2 * MAX_DEG}deg`);
    inner.style.setProperty('--tilt-gx', `${px * 100}%`);
    inner.style.setProperty('--tilt-gy', `${py * 100}%`);

    inner.classList.add('is-tilting');
    outer.classList.add('is-hover');
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => inner.classList.remove('is-tilting'), GLARE_LAG_MS);
  }, []);

  const onPointerLeave = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    clearTimeout(idleTimer.current);
    if (inner) {
      inner.classList.remove('is-tilting');
      inner.style.setProperty('--tilt-rx', '0deg');
      inner.style.setProperty('--tilt-ry', '0deg');
    }
    outer?.classList.remove('is-hover');
  }, []);

  return (
    <Tag
      ref={outerRef}
      className={`pl-tilt ${className}`.trim()}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      {...rest}
    >
      <div ref={innerRef} className="pl-tilt-inner">
        {children}
        <span className="pl-tilt-glare" aria-hidden="true" />
      </div>
    </Tag>
  );
}

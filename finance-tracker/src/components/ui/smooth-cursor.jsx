'use client';

/**
 * SmoothCursor — physics-based custom cursor (magicui / @Code_Parth).
 * Desktop fine pointers only; touch is ignored. Mounted on the prelanding
 * page only.
 *
 *  · tracks the pointer tightly (no lag)
 *  · rotates to face the direction of travel while moving
 *  · over links / buttons it swaps to a soft ring ("hand" state)
 *  · presses in on mousedown
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useSpring } from 'motion/react';

const DESKTOP_POINTER_QUERY = '(any-hover: hover) and (any-pointer: fine)';
const isTrackablePointer = (t) => t !== 'touch';
const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, summary, [data-cursor="pointer"]';

function ArrowSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={26} height={28} viewBox="0 0 50 54" fill="none" style={{ display: 'block' }}>
      <g filter="url(#sc_f)">
        <path d="M42.6817 41.1495L27.5103 6.79925C26.7269 5.02557 24.2082 5.02558 23.3927 6.79925L7.59814 41.1495C6.75833 42.9759 8.52712 44.8902 10.4125 44.1954L24.3757 39.0496C24.8829 38.8627 25.4385 38.8627 25.9422 39.0496L39.8121 44.1954C41.6849 44.8902 43.4884 42.9759 42.6817 41.1495Z" fill="#E85002" />
        <path d="M43.7146 40.6933L28.5431 6.34306C27.3556 3.65428 23.5772 3.69516 22.3668 6.32755L6.57226 40.6778C5.3134 43.4156 7.97238 46.298 10.803 45.2549L24.7662 40.109C25.0221 40.0147 25.2999 40.0156 25.5494 40.1082L39.4193 45.254C42.2261 46.2953 44.9254 43.4347 43.7146 40.6933Z" stroke="#fff" strokeWidth={2.25825} />
      </g>
      <defs>
        <filter id="sc_f" x={0.6} y={0.95} width={49.06} height={52.43} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity={0} result="bg" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="a" />
          <feOffset dy={2.25825} /><feGaussianBlur stdDeviation={2.25825} />
          <feComposite in2="a" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0" />
          <feBlend mode="normal" in2="bg" result="d" />
          <feBlend mode="normal" in="SourceGraphic" in2="d" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}

export function SmoothCursor({
  springConfig = { damping: 60, stiffness: 1400, mass: 0.35, restDelta: 0.001 },
}) {
  const lastPos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastT = useRef(Date.now());
  const prevAngle = useRef(0);
  const accRotation = useRef(0);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressing, setPressing] = useState(false);

  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);
  const rotation = useSpring(0, { damping: 26, stiffness: 240, mass: 0.6 });
  const scale = useSpring(1, { damping: 22, stiffness: 380, mass: 0.5 });

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_POINTER_QUERY);
    const update = () => { setIsEnabled(mq.matches); if (!mq.matches) setIsVisible(false); };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!isEnabled) return undefined;
    let idleTimer = null;
    let rafId = 0;

    const measure = (pos) => {
      const now = Date.now();
      const dt = now - lastT.current;
      if (dt > 0) {
        velocity.current = { x: (pos.x - lastPos.current.x) / dt, y: (pos.y - lastPos.current.y) / dt };
      }
      lastT.current = now;
      lastPos.current = pos;
    };

    const move = (e) => {
      if (!isTrackablePointer(e.pointerType)) return;
      setIsVisible(true);
      const pos = { x: e.clientX, y: e.clientY };
      measure(pos);
      x.set(pos.x);
      y.set(pos.y);

      const speed = Math.hypot(velocity.current.x, velocity.current.y);
      if (speed > 0.12) {
        const angle = Math.atan2(velocity.current.y, velocity.current.x) * (180 / Math.PI) + 90;
        let diff = angle - prevAngle.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        accRotation.current += diff;
        prevAngle.current = angle;
        if (!hovering) rotation.set(accRotation.current);
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { /* settle — keep last angle */ }, 120);
      }
    };

    const throttled = (e) => {
      if (!isTrackablePointer(e.pointerType) || rafId) return;
      rafId = requestAnimationFrame(() => { move(e); rafId = 0; });
    };

    const over = (e) => setHovering(!!e.target?.closest?.(INTERACTIVE));
    const down = () => setPressing(true);
    const up = () => setPressing(false);
    const leaveWin = () => setIsVisible(false);

    document.documentElement.style.cursor = 'none';
    document.body.style.cursor = 'none';
    window.addEventListener('pointermove', throttled, { passive: true });
    window.addEventListener('pointerover', over, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('mouseleave', leaveWin);
    return () => {
      window.removeEventListener('pointermove', throttled);
      window.removeEventListener('pointerover', over);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('mouseleave', leaveWin);
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(idleTimer);
    };
  }, [isEnabled, hovering, rotation, scale, x, y]);

  // press feedback
  useEffect(() => { scale.set(pressing ? 0.84 : 1); }, [pressing, scale]);
  // face upright while parked on a clickable element
  useEffect(() => { if (hovering) rotation.set(0); }, [hovering, rotation]);

  if (!isEnabled) return null;

  return (
    <motion.div
      style={{
        position: 'fixed', left: x, top: y,
        width: 26, height: 28,
        translateX: '-51%', translateY: hovering ? '-50%' : '-11%',
        transformOrigin: hovering ? '50% 50%' : '51% 11%',
        rotate: rotation, scale,
        zIndex: 9999, pointerEvents: 'none', willChange: 'transform',
      }}
      initial={false}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.16 }}
    >
      {/* the ring shown over clickable elements ("hand" state) */}
      <motion.span
        style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 34, height: 34, marginLeft: -17, marginTop: -17,
          borderRadius: '50%', border: '2px solid #E85002',
          background: 'rgba(232, 80, 2, 0.10)',
        }}
        initial={false}
        animate={{ opacity: hovering ? 1 : 0, scale: hovering ? (pressing ? 0.8 : 1) : 0.4 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.span
        style={{ display: 'block' }}
        initial={false}
        animate={{ opacity: hovering ? 0 : 1, scale: hovering ? 0.6 : 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <ArrowSVG />
      </motion.span>
    </motion.div>
  );
}

export default SmoothCursor;

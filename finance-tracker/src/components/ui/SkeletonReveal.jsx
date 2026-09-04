/**
 * SkeletonReveal — skeleton → content swap, adapted from the Transitions.dev
 * "Skeleton loader and reveal" recipe for the prelanding product panels.
 *
 * Starts as a pulsing panel-shaped skeleton. When it scrolls into view it
 * pulses once, then cross-fades to the real panel (skeleton fades + blurs out,
 * content fades + un-blurs in) over one shared duration so the swap reads as a
 * single motion. Both layers hold the same coordinates, so the swap is
 * layout-free — the panel never jumps.
 *
 * reduced-motion: the delay collapses and the content shows immediately.
 */
import { useEffect, useRef, useState } from 'react';

export default function SkeletonReveal({ children, lines = 3, holdMs = 620 }) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setRevealed(true); return undefined; }

    if (typeof IntersectionObserver === 'undefined') { setRevealed(true); return undefined; }

    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          timer = setTimeout(() => setRevealed(true), holdMs);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [holdMs]);

  return (
    <div ref={ref} className={`pl-skel${revealed ? ' is-revealed' : ''}`}>
      <div className="pl-skel-skeleton is-pulsing" aria-hidden={revealed}>
        <div className="pl-skel-bar">
          <i /><i /><i />
        </div>
        <div className="pl-skel-body">
          {Array.from({ length: lines }, (_, i) => (
            <span key={i} className="pl-skel-block" style={{ width: `${92 - i * 14}%` }} />
          ))}
        </div>
      </div>
      <div className="pl-skel-content">{children}</div>
    </div>
  );
}

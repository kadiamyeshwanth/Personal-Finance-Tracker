/**
 * useParallax — maps an element's position in the viewport to a transform.
 *
 * Runs a rAF loop *only while the element is near the viewport* (gated by an
 * IntersectionObserver), reading getBoundingClientRect each frame. That makes
 * it agnostic to the scroll mechanism — it works under Lenis smooth scroll,
 * native scroll, touch fling, and anchor jumps alike, where a plain `scroll`
 * listener would miss Lenis's virtualised scrolling.
 *
 * Writes straight to `.style.transform`, so React never re-renders on scroll.
 * Honors prefers-reduced-motion (no-op).
 *
 *   const ref = useParallax({ speed: -60 });   // moves up as you scroll down
 *   <div ref={ref} />
 */
import { useEffect, useRef } from 'react';

export default function useParallax({ speed = -40, driftX = 0, rotate = 0, clamp = true } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let raf = 0;
    let running = false;

    const frame = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      let p = (vh - r.top) / (vh + r.height);   // 0 entering bottom → 1 leaving top
      if (clamp) p = Math.max(0, Math.min(1, p));
      const c = p - 0.5;                          // -0.5 … 0.5
      el.style.transform =
        `translate3d(${(c * driftX).toFixed(2)}px, ${(c * speed).toFixed(2)}px, 0)` +
        (rotate ? ` rotate(${(c * rotate).toFixed(3)}deg)` : '');
      if (running) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(frame);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: '15% 0px' },
    );
    io.observe(el);
    frame();   // paint once immediately

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [speed, driftX, rotate, clamp]);

  return ref;
}

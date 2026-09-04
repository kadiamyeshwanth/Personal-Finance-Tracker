/**
 * GoldenFlowField — the hero's generative background.
 *
 * The golden ratio is the artwork, not just the layout grid:
 *
 *  · 1597 embers (a Fibonacci number) are seeded on a phyllotaxis spiral —
 *    r = c√i, θ = i × 137.507° — the same golden-angle packing a sunflower
 *    uses. At rest they form a perfect golden spiral.
 *  · A flow field pushes them off that formation; a spring pulls them back.
 *    The field and the spring trade dominance over the cycle, so the whole
 *    thing breathes from order → drift → order. For a money app that reads
 *    as scatter resolving into clarity.
 *  · The field is sampled on a CIRCLE through noise space, so frame 0 and
 *    frame N are literally the same sample — a seamless loop with no cut.
 *
 * Canvas 2D on purpose: no WebGL/WebGPU dependency, no rAF-less blank frame,
 * runs everywhere, and trails are cheaper than they would be in a shader.
 *
 * Pauses when scrolled out of view. Honors prefers-reduced-motion by painting
 * one static frame of the spiral.
 */
import { useEffect, useRef } from 'react';

const PHI          = 1.6180339887498949;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));   // 137.507…°
const COUNT        = 987;                             // Fibonacci — down from 1597 for headroom
const PERIOD       = 18000;                           // ms — one seamless loop
const LOOP_R       = 1.35;                            // noise-circle radius
const FIELD_SCALE  = 0.0016;
const SPRING       = 0.0016;
const DRAG         = 0.955;
const PUSH         = 0.16;
const TRAIL_FADE   = 0.035;

/* ── Value noise: hash lattice + quintic smoothstep. Small, fast, smooth. ── */
function makeNoise(seed = 1) {
  const p = new Uint8Array(512);
  let s = seed * 1013904223 + 1664525;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y) => {
    const u = (h & 1) === 0 ? x : -x;
    const v = (h & 2) === 0 ? y : -y;
    return u + v;
  };

  return (x, y) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v,
    ) * 0.7;
  };
}

export default function GoldenFlowField({ cx = 0.5, cy = 0.809, spread = 0.5, squash = 0.52, ink = false }) {
  const canvasRef = useRef(null);
  const cfg = useRef({ cx, cy, spread, squash, ink });
  cfg.current = { cx, cy, spread, squash, ink };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    // Transparent: the warm bloom lives in CSS behind this canvas, so embers
    // composite over it and trails can fade to nothing instead of to black.
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const noise = makeNoise(7);

    let w = 0, h = 0, dpr = 1;
    let particles = [];
    let raf = 0;
    let running = true;
    let start = performance.now();

    /* Seed on the phyllotaxis spiral. `home` is the golden-spiral rest
       position; the particle is always springing back toward it. */
    const seed = () => {
      // Spiral is sized off the short edge so it holds its shape on any ratio.
      const c = cfg.current;
      const scale = Math.min(w, h) * c.spread / Math.sqrt(COUNT);
      const cx = w * c.cx;
      const cy = h * c.cy;
      const squashY = c.squash;
      particles = new Array(COUNT);
      for (let i = 0; i < COUNT; i++) {
        const r = scale * Math.sqrt(i);
        const a = i * GOLDEN_ANGLE;
        const hx = cx + Math.cos(a) * r;
        const hy = cy + Math.sin(a) * r * squashY;  // squash — a disc, not a ball
        particles[i] = {
          x: hx, y: hy, hx, hy, vx: 0, vy: 0,
          // outer seeds are dimmer + smaller, so density reads as light
          m: 1 - (i / COUNT) * 0.72,
          seedT: (i / COUNT) * Math.PI * 2,
        };
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);   /* cap for fill-rate */
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      seed();
    };

    const frame = (now) => {
      if (!running) return;
      const t = ((now - start) % PERIOD) / PERIOD;      // 0…1, wraps
      const tau = t * Math.PI * 2;
      // Sample noise on a circle → identical at t=0 and t=1 → seamless loop.
      const nz = Math.cos(tau) * LOOP_R;
      const nw = Math.sin(tau) * LOOP_R;
      // Breathing: field dominates mid-cycle, spring wins at the ends.
      const breath = 0.5 - 0.5 * Math.cos(tau);

      const ink = cfg.current.ink;
      // Trails — erase a little alpha each frame so they decay to transparent.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0, 0, 0, ${ink ? TRAIL_FADE * 2.4 : TRAIL_FADE})`;
      ctx.fillRect(0, 0, w, h);
      // ink mode paints dark filaments straight over (cheap — no blend mode);
      // glow mode is additive.
      ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
      // Round caps matter: a resting ember has ~zero velocity, so its
      // moveTo→lineTo is a zero-length stroke and would draw nothing at all
      // without a cap. With one it renders as a dot and the spiral holds.
      ctx.lineCap = 'round';

      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        const n = noise(p.x * FIELD_SCALE + nz, p.y * FIELD_SCALE + nw);
        const ang = n * Math.PI * 4;
        const push = PUSH * breath;
        p.vx += Math.cos(ang) * push + (p.hx - p.x) * SPRING;
        p.vy += Math.sin(ang) * push + (p.hy - p.y) * SPRING;
        p.vx *= DRAG;
        p.vy *= DRAG;
        const px = p.x, py = p.y;
        p.x += p.vx;
        p.y += p.vy;

        // Warmer + brighter the faster it moves; embers cool as they settle,
        // but never go fully dark — the spiral has to stay legible at rest.
        const sp = Math.min(1, Math.hypot(p.vx, p.vy) * 0.42);
        // Kept in the brand's orange lane — the green channel tops out low so
        // the filaments never drift to gold.
        const a = Math.min(1, (0.16 + sp * 0.30) * p.m);
        const col = ink
          // charcoal filaments painted straight over the orange
          ? `rgba(${(24 + sp * 24) | 0}, ${(9 + sp * 8) | 0}, 3, ${Math.min(1, 0.34 + a * 1.4)})`
          : `rgba(255, ${(46 + sp * 62) | 0}, ${(8 + sp * 26) | 0}, ${a})`;
        // Filled head: always renders, even at zero velocity. The streak is
        // only stroked once the ember is actually travelling.
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.75 + p.m * 1.35, 0, Math.PI * 2);
        ctx.fill();
        if (sp > 0.06) {
          ctx.strokeStyle = col;
          ctx.lineWidth = 0.8 + p.m * 0.9;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };

    /* The spiral at rest — first paint, and the reduced-motion state.
       Has to hold as a finished composition on its own, so it gets a warm
       bloom under the dense core plus per-ember falloff. */
    const paintStatic = () => {
      const ink = cfg.current.ink;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        const heat = p.m * p.m;
        ctx.fillStyle = ink
          ? `rgba(26, 9, 3, ${0.42 + heat * 0.4})`
          : `rgba(255, ${(70 + heat * 120) | 0}, ${(10 + heat * 70) | 0}, ${0.22 + heat * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.6 + p.m * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    resize();
    // Always paint the spiral synchronously first: no blank frame while rAF
    // spins up, and it is the whole picture in environments that never fire it.
    paintStatic();
    if (!reduced) raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => {
      resize();
      paintStatic();
    });
    ro.observe(canvas);

    // Stop the loop once the hero scrolls away.
    const io = new IntersectionObserver(([e]) => {
      if (reduced) return;
      if (e.isIntersecting && !running) {
        running = true;
        start = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!e.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    }, { rootMargin: '120px' });
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pl-flow-canvas" aria-hidden="true" />;
}

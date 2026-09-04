'use client';

/**
 * GlobePolaroids — cobe globe (v2) with photo "polaroid" markers pinned to
 * cities via CSS Anchor Positioning. Supplied by the user; types stripped for
 * this JS project, logic unchanged.
 *
 * Needs cobe v2 (marker `id` → `--cobe-<id>` / `--cobe-visible-<id>`) and a
 * browser with CSS anchor positioning (Chrome 125+). Where unsupported the
 * globe still spins; the polaroids just stay hidden (opacity defaults to 0).
 */
import { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';

/* The pins carry Clario's own read, not a travel log — a small stat card per
   city, spread across longitudes so a couple always face the viewer. */
/* spread ~60° apart in longitude so the pins never clump into one corner */
const defaultMarkers = [
  { id: 'pin-mumbai',  location: [19.076, 72.8777],   k: 'Balance',     v: '₹2,31,450', rotate: -5 },
  { id: 'pin-sing',    location: [1.3521, 103.8198],  k: 'Saved',       v: '47%',       rotate: 4 },
  { id: 'pin-tokyo',   location: [35.6762, 139.6503], k: 'Net · Sept',  v: '+₹1,13,460',rotate: -3 },
  { id: 'pin-london',  location: [51.51, -0.13],      k: 'Budgets',     v: '3 of 4',    rotate: 6 },
  { id: 'pin-ny',      location: [40.7128, -74.006],  k: 'Bank logins', v: '0',         rotate: -4 },
  { id: 'pin-sp',      location: [-23.5505, -46.6333],k: 'Streak',      v: '12 days',   rotate: 3 },
];

export function GlobePolaroids({ markers = defaultMarkers, className = '', speed = 0.003 }) {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);

  const handlePointerDown = useCallback((e) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const canvas = canvasRef.current;
    let globe = null;
    let animationId = 0;
    let phi = 0;
    // Pause the WebGL draw while the hero is off-screen — a cobe globe that
    // keeps rendering for the whole ~20k-px scroll is the page's biggest
    // continuous GPU cost.
    let onScreen = true;
    const io = new IntersectionObserver(
      ([e]) => { onScreen = e.isIntersecting; },
      { rootMargin: '10% 0px' },
    );
    io.observe(canvas);

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark: 0,
        diffuse: 3.1,
        mapSamples: 16000,
        mapBrightness: 1.7,
        // near-white — a hair off pure white so the shading + land dots read
        // against the light hero; colour is reserved for the pins
        baseColor: [0.95, 0.94, 0.92],
        markerColor: [0.95, 0.36, 0.05],
        glowColor: [0.99, 0.9, 0.8],
        markerElevation: 0,
        markers: markers.map((m) => ({ location: m.location, size: 0.03, id: m.id })),
        opacity: 0.92,
      });

      function animate() {
        if (onScreen) {
          if (!isPausedRef.current) phi += speed;
          globe.update({
            phi: phi + phiOffsetRef.current + dragOffset.current.phi,
            theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
          });
        }
        animationId = requestAnimationFrame(animate);
      }
      animate();
      setTimeout(() => canvas && (canvas.style.opacity = '1'));
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      io.disconnect();
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
  }, [markers, speed]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1.2s ease',
          borderRadius: '50%',
          touchAction: 'none',
        }}
      />
      {markers.map((m) => (
        <div
          key={m.id}
          style={{
            position: 'absolute',
            positionAnchor: `--cobe-${m.id}`,
            bottom: 'anchor(top)',
            left: 'anchor(center)',
            translate: '-50% 0',
            marginBottom: 10,
            minWidth: 128,
            background: '#fff',
            borderRadius: 12,
            padding: '10px 13px',
            boxShadow: '0 10px 26px -10px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.12)',
            transform: `rotate(${m.rotate}deg)`,
            pointerEvents: 'none',
            /* cobe 2.0.1's `--cobe-visible-*` gate never fires against this
               demo's update loop, so the pins stay on and just orbit the globe
               on their working `--cobe-<id>` anchors. */
            opacity: 1,
            transition: 'opacity 0.35s ease',
          }}
        >
          <span
            style={{
              display: 'block',
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              fontSize: '0.52rem',
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: '#8a8a8a',
            }}
          >
            {m.k}
          </span>
          <span
            style={{
              display: 'block',
              marginTop: 3,
              fontSize: '0.98rem',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: '#141414',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {m.v}
          </span>
        </div>
      ))}
    </div>
  );
}

export default GlobePolaroids;

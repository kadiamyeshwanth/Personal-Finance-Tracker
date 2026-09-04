/**
 * HeroBackground — the prelanding hero's back layer.
 *
 * Default is the live GoldenFlowField — a phyllotaxis flow field rendered on
 * canvas, with grain and a vignette over it.
 *
 * If a rendered clip is dropped at /media/hero-bg.{webm,mp4} it takes over
 * instead (the "hand + glass" export from Google Flow). No code change needed:
 *   public/media/hero-bg.webm   (VP9/AV1, preferred)
 *   public/media/hero-bg.mp4    (H.264, fallback)
 *   public/media/hero-bg.jpg    (first-frame poster, shown while it buffers)
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import GoldenFlowField from './GoldenFlowField';

const VIDEO_BASE = '/media/hero-bg';

export default function HeroBackground() {
  const reduced = useReducedMotion();
  const videoRef = useRef(null);
  // 'probe' → checking for the file · 'video' → playing · 'fallback' → triangle
  const [mode, setMode] = useState('probe');

  useEffect(() => {
    if (reduced) { setMode('fallback'); return undefined; }

    let cancelled = false;
    // HEAD-check the mp4 — but a dev server's SPA fallback answers 200 with
    // text/html for a missing file, so require an actual video content-type.
    fetch(`${VIDEO_BASE}.mp4`, { method: 'HEAD' })
      .then((r) => {
        const ok = r.ok && (r.headers.get('content-type') || '').startsWith('video/');
        if (!cancelled) setMode(ok ? 'video' : 'fallback');
      })
      .catch(() => { if (!cancelled) setMode('fallback'); });
    return () => { cancelled = true; };
  }, [reduced]);

  useEffect(() => {
    if (mode !== 'video') return;
    const v = videoRef.current;
    if (v) v.play?.().catch(() => setMode('fallback'));
  }, [mode]);

  if (mode === 'fallback') {
    return (
      <div className="pl-hero-bg">
        <span className="pl-hero-bloom" aria-hidden="true" />
        {/* Set right of centre so it counterweights the left-set headline —
            the type owns the golden section, the field owns the remainder. */}
        <GoldenFlowField cx={0.76} cy={0.56} spread={0.46} squash={0.86} ink />
        <span className="pl-hero-grain" aria-hidden="true" />
        <span className="pl-hero-vignette" aria-hidden="true" />
      </div>
    );
  }

  if (mode === 'video') {
    return (
      <div className="pl-hero-bg" aria-hidden="true">
        <video
          ref={videoRef}
          className="pl-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={`${VIDEO_BASE}.jpg`}
          onError={() => setMode('fallback')}
        >
          <source src={`${VIDEO_BASE}.webm`} type="video/webm" />
          <source src={`${VIDEO_BASE}.mp4`} type="video/mp4" />
        </video>
      </div>
    );
  }

  // 'probe' — paint nothing but the void; resolves within a frame or two.
  return <div className="pl-hero-bg" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />;
}

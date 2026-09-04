'use client';

/**
 * ShaderBg — a shadergradient.co plane behind a section. One WebGL canvas,
 * mounted only while the section is near the viewport. If WebGL / the library
 * fails, it renders nothing and the section's CSS gradient shows through.
 *
 * `url` is a shadergradient.co "customize" link (control="query").
 */
import { Component, useEffect, useRef, useState } from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

class Boundary extends Component {
  constructor(p) { super(p); this.state = { dead: false }; }
  static getDerivedStateFromError() { return { dead: true }; }
  componentDidCatch() { /* swallow — CSS gradient is the fallback */ }
  render() { return this.state.dead ? null : this.props.children; }
}

/* the user's tuned water-plane for the dashboard shader cards */
export const DASH_SHADER = {
  animate: 'on', type: 'waterPlane', shader: 'defaults',
  brightness: 1.2, cAzimuthAngle: 180, cDistance: 2.4, cPolarAngle: 95, cameraZoom: 1,
  color1: '#ff6a1a', color2: '#c73c00', color3: '#FD4912',
  bgColor1: '#000000', bgColor2: '#000000',
  envPreset: 'city', grain: 'off', lightType: '3d', pixelDensity: 1,
  positionX: 0, positionY: -2.1, positionZ: 0,
  reflection: 0.1, rotationX: 0, rotationY: 0, rotationZ: 225,
  uAmplitude: 0, uDensity: 1.8, uFrequency: 5.5, uSpeed: 0.2, uStrength: 3, uTime: 0.2,
};

/* login screen — a slow orange water-plane behind the form card.
   Angles nudged off the reference: azimuth 180→190, polar 95→90,
   distance 2.99→3.2, rotationZ 225→210 for a flatter, calmer horizon. */
export const AUTH_SHADER_DARK = {
  animate: 'on', type: 'waterPlane', shader: 'defaults',
  brightness: 1.15, cAzimuthAngle: 190, cDistance: 3.2, cPolarAngle: 90, cameraZoom: 1,
  color1: '#ff6a1a', color2: '#2a0d00', color3: '#000000',
  bgColor1: '#000000', bgColor2: '#000000',
  envPreset: 'city', grain: 'off', lightType: '3d', pixelDensity: 1,
  positionX: -0.3, positionY: -2.1, positionZ: 0,
  reflection: 0.1, rotationX: 0, rotationY: 0, rotationZ: 205,
  uAmplitude: 0, uDensity: 1.8, uFrequency: 5.5, uSpeed: 0.1, uStrength: 3, uTime: 20,
};

/* the user's tuned plane — props form, warmer color3 */
export const SHADER_PLANE = {
  animate: 'on', type: 'plane', shader: 'defaults',
  brightness: 1.2, cAzimuthAngle: 180, cDistance: 3.6, cPolarAngle: 90, cameraZoom: 1,
  color1: '#ff5005', color2: '#dbba95', color3: '#e18353',
  envPreset: 'city', grain: 'on', lightType: '3d', pixelDensity: 1,
  positionX: -1.4, positionY: 0, positionZ: 0,
  reflection: 0.1, rotationX: 0, rotationY: 10, rotationZ: 50,
  uAmplitude: 1, uDensity: 1.3, uFrequency: 5.5, uSpeed: 0.35, uStrength: 4, uTime: 0,
};

export function ShaderBg({ url, props, className, opacity = 0.9, style }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced || !ref.current) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        // mount once when it first comes near the viewport, then leave it —
        // toggling on every scroll pass tears the WebGL context down and up,
        // which reads as a flash/flicker.
        if (e.isIntersecting) { setShow(true); io.disconnect(); }
      },
      { rootMargin: '60%' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div ref={ref} className={className} aria-hidden="true" style={{ opacity, ...style }}>
      {show && (
        <Boundary>
          <ShaderGradientCanvas
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {url
              ? <ShaderGradient control="query" urlString={url} />
              : <ShaderGradient control="props" {...(props || SHADER_PLANE)} />}
          </ShaderGradientCanvas>
        </Boundary>
      )}
    </div>
  );
}

export default ShaderBg;

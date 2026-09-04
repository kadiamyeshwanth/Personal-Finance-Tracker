/**
 * TriangleLEDHero — integration seam for the verified vgpu "Triangle LED Hero"
 * example (triangle-led-front/, pulled from https://vgpu.sh, every file SHA-256
 * checked against its manifest and kept BYTE-FOR-BYTE unmodified).
 *
 * This file is the only thing added around the example. It does exactly what the
 * example's own triangle-led-front/index.tsx does — mount a canvas, call
 * `createRenderer({ canvas })`, dispose on unmount — with one addition it needs
 * to survive this app:
 *
 *   The app renders under <React.StrictMode>, which mounts every effect twice in
 *   dev (mount → unmount → mount). The example's renderer boots WebGPU
 *   asynchronously; a synchronous StrictMode unmount in the middle of that boot
 *   tears down the GPU device while the second mount is still bringing it up,
 *   producing "TextureView ... cannot be used with [Device]" and "Invalid
 *   CommandBuffer". vgpu's own Next.js guide calls this out: strict mode double
 *   mounts, and a leaked device/loop per remount is the price of not handling it.
 *
 *   So disposal is deferred one macrotask. A real unmount still disposes ~1
 *   frame later (imperceptible); a StrictMode remount cancels the pending
 *   disposal and reuses the already-booted renderer. The example's renderer.ts
 *   is untouched — its createRenderer()/dispose() contract is used exactly as
 *   published, including its full resource cleanup (gpu, surface, scene, GUI,
 *   frame loop, ResizeObserver and canvas pointer listeners).
 *
 * The example draws opaque black behind the triangle, so this sits at the back
 * of the hero as its background layer.
 */
import { useEffect, useRef } from 'react';
import { createRenderer } from '../../../triangle-led-front/renderer';

export default function TriangleLEDHero() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const disposeTimerRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    // A StrictMode remount lands here before the deferred disposal fires — cancel
    // it and keep the renderer that is already running.
    if (disposeTimerRef.current) {
      clearTimeout(disposeTimerRef.current);
      disposeTimerRef.current = 0;
    }
    if (!rendererRef.current) {
      rendererRef.current = createRenderer({ canvas });
      void rendererRef.current.ready;
    }

    return () => {
      disposeTimerRef.current = setTimeout(() => {
        rendererRef.current?.dispose();
        rendererRef.current = null;
        disposeTimerRef.current = 0;
      }, 0);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  );
}

/**
 * CrowdCanvas — a walking crowd rendered from an openpeeps sprite atlas onto a
 * 2D canvas, driven by GSAP timelines.
 *
 * Adapted from Skiper UI "Skiper 39 / Canvas_Landing_004", itself inspired by
 * https://codepen.io/zadvorsky/pen/xxwbBQV. Illustrations: https://openpeeps.com
 * (CC0). Skiper UI free-tier attribution retained per its license.
 *
 * Types were stripped for this JS project; behaviour is unchanged.
 */
import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

export function CrowdCanvas({ src, rows = 15, cols = 7, className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const config = { src, rows, cols };

    const randomRange = (min, max) => min + Math.random() * (max - min);
    const randomIndex = (array) => randomRange(0, array.length) | 0;
    const removeFromArray = (array, i) => array.splice(i, 1)[0];
    const removeItemFromArray = (array, item) => removeFromArray(array, array.indexOf(item));
    const removeRandomFromArray = (array) => removeFromArray(array, randomIndex(array));
    const getRandomFromArray = (array) => array[randomIndex(array) | 0];

    const resetPeep = ({ stage, peep }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = 100 - 250 * gsap.parseEase('power2.in')(Math.random());
      const startY = stage.height - peep.height + offsetY;
      let startX;
      let endX;

      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = 0;
        peep.scaleX = -1;
      }

      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;

      return { startX, startY, endX };
    };

    const normalWalk = ({ peep, props }) => {
      const { startY, endX } = props;
      const xDuration = 10;
      const yDuration = 0.25;

      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.5, 1.5));
      tl.to(peep, { duration: xDuration, x: endX, ease: 'none' }, 0);
      tl.to(
        peep,
        { duration: yDuration, repeat: xDuration / yDuration, yoyo: true, y: startY - 10 },
        0,
      );
      return tl;
    };

    const walks = [normalWalk];

    const createPeep = ({ image, rect }) => {
      const peep = {
        image,
        rect: [],
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        walk: null,
        setRect: (r) => {
          peep.rect = r;
          peep.width = r[2];
          peep.height = r[3];
        },
        render: (context) => {
          context.save();
          context.translate(peep.x, peep.y);
          context.scale(peep.scaleX, 1);
          context.drawImage(
            peep.image,
            peep.rect[0], peep.rect[1], peep.rect[2], peep.rect[3],
            0, 0, peep.width, peep.height,
          );
          context.restore();
        },
      };
      peep.setRect(rect);
      return peep;
    };

    const img = document.createElement('img');
    const stage = { width: 0, height: 0 };
    const allPeeps = [];
    const availablePeeps = [];
    const crowd = [];

    const createPeeps = () => {
      const { naturalWidth: width, naturalHeight: height } = img;
      const total = config.rows * config.cols;
      const rectWidth = width / config.rows;
      const rectHeight = height / config.cols;
      for (let i = 0; i < total; i++) {
        allPeeps.push(
          createPeep({
            image: img,
            rect: [
              (i % config.rows) * rectWidth,
              ((i / config.rows) | 0) * rectHeight,
              rectWidth,
              rectHeight,
            ],
          }),
        );
      }
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      const walk = getRandomFromArray(walks)({
        peep,
        props: resetPeep({ peep, stage }),
      }).eventCallback('onComplete', () => {
        removePeepFromCrowd(peep);
        addPeepToCrowd();
      });
      peep.walk = walk;
      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return peep;
    };

    const removePeepFromCrowd = (peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        addPeepToCrowd().walk.progress(Math.random());
      }
    };

    // ── lifecycle guards ──────────────────────────────────────────────
    // React 18/19 StrictMode mounts the effect twice; without a kill flag the
    // first (torn-down) run's image `onload` can restart a second draw loop on
    // the same canvas and the two clear each other → blank canvas.
    let killed = false;
    let raf = 0;
    let onScreen = true;
    let peepsBuilt = false;

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    const render = () => {
      const d = dpr();
      canvas.width = canvas.width;          // clear + reset transform
      ctx.save();
      ctx.scale(d, d);
      for (let i = 0; i < crowd.length; i++) crowd[i].render(ctx);
      ctx.restore();
    };

    const loop = () => {
      if (killed) return;
      if (onScreen) render();
      raf = requestAnimationFrame(loop);
    };

    const resize = () => {
      if (killed) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;                 // no layout yet — RO will call again
      const d = dpr();
      stage.width = w;
      stage.height = h;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);

      crowd.forEach((peep) => peep.walk && peep.walk.kill());
      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);
      initCrowd();
      render();                             // paint one frame immediately
    };

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let started = false;

    const start = () => {
      if (started || killed || !stage.width) return;
      started = true;
      if (reduced) { render(); return; }    // static frame, no loop
      raf = requestAnimationFrame(loop);
    };

    const build = () => {
      if (killed || peepsBuilt || !img.naturalWidth) return;
      peepsBuilt = true;
      createPeeps();
      resize();
      start();
    };

    img.onload = build;
    img.onerror = () => { /* atlas missing — section just stays empty */ };
    img.src = config.src;
    if (img.complete && img.naturalWidth) build();   // already cached

    const ro = new ResizeObserver(() => { build(); resize(); });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([e]) => { onScreen = e.isIntersecting; },
      { rootMargin: '200px' },
    );
    io.observe(canvas);

    return () => {
      killed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      img.onload = null;
      crowd.forEach((peep) => { if (peep.walk) peep.walk.kill(); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

export default CrowdCanvas;

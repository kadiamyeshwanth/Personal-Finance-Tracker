/** A cheap purple outline that follows the hovered element. */
import { useEffect, useRef, useState } from 'react';
import { label } from './selectorPath';

export default function HoverOutline({ el, hidden }) {
  const [box, setBox] = useState(null);
  const raf = useRef(0);

  useEffect(() => {
    if (!el || hidden) { setBox(null); return; }
    const update = () => {
      const r = el.getBoundingClientRect();
      setBox({ x: r.x, y: r.y, w: r.width, h: r.height });
    };
    update();
    const loop = () => { update(); raf.current = requestAnimationFrame(loop); };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [el, hidden]);

  if (!box) return null;
  return (
    <div
      className="dm-ui dm-hover"
      style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }}
    >
      <span className="dm-hover-tag">{label(el)}</span>
    </div>
  );
}

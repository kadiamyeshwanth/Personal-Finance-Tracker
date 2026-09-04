/**
 * SelectionOverlay — the Figma-style bounding box: live W/H/X/Y readout, eight
 * resize handles, drag-to-move, and edge/center snap guides against siblings.
 *
 * Moves apply a translate() transform (layout stays intact); resizes set an
 * explicit width/height. Everything goes through designState so it persists and
 * is undoable.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getFor, setProps } from './designState';
import AlignmentGuides from './AlignmentGuides';

const SNAP = 6;
const MIN = 24;
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export default function SelectionOverlay({ el, selector }) {
  const [box, setBox] = useState(null);
  const [drag, setDrag] = useState(null); // { kind:'move'|handle, ... }
  const [guides, setGuides] = useState([]);
  const raf = useRef(0);

  // Follow the element.
  useEffect(() => {
    if (!el) { setBox(null); return; }
    const tick = () => {
      const r = el.getBoundingClientRect();
      setBox({ x: r.x, y: r.y, w: r.width, h: r.height });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [el]);

  const siblingLines = useCallback(() => {
    if (!el?.parentElement) return { v: [], h: [] };
    const v = []; const h = [];
    const pr = el.parentElement.getBoundingClientRect();
    v.push(pr.left, pr.left + pr.width / 2, pr.right);
    h.push(pr.top, pr.top + pr.height / 2, pr.bottom);
    for (const sib of el.parentElement.children) {
      if (sib === el || sib.classList.contains('dm-ui')) continue;
      const r = sib.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      v.push(r.left, r.left + r.width / 2, r.right);
      h.push(r.top, r.top + r.height / 2, r.bottom);
    }
    return { v, h };
  }, [el]);

  const startDrag = (e, kind) => {
    if (!el || !box) return;
    e.preventDefault();
    e.stopPropagation();
    const base = getFor(selector);
    setDrag({
      kind,
      sx: e.clientX,
      sy: e.clientY,
      box: { ...box },
      tx0: base.tx || 0,
      ty0: base.ty || 0,
      w0: base.width ?? box.w,
      h0: base.height ?? box.h,
      lines: siblingLines(),
    });
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e) => {
      let dx = e.clientX - drag.sx;
      let dy = e.clientY - drag.sy;
      const g = [];

      if (drag.kind === 'move') {
        const left = drag.box.x + dx;
        const cx = left + drag.box.w / 2;
        const right = left + drag.box.w;
        const top = drag.box.y + dy;
        const cy = top + drag.box.h / 2;
        const bottom = top + drag.box.h;

        for (const [val, adj] of [[left, 0], [cx, drag.box.w / 2], [right, drag.box.w]]) {
          const hit = drag.lines.v.find((L) => Math.abs(L - val) <= SNAP);
          if (hit !== undefined) {
            dx += hit - val;
            g.push({ axis: 'x', pos: hit, from: Math.min(top, drag.box.y) - 20, to: Math.max(bottom, drag.box.y + drag.box.h) + 20 });
            break;
          }
        }
        for (const val of [top, cy, bottom]) {
          const hit = drag.lines.h.find((L) => Math.abs(L - val) <= SNAP);
          if (hit !== undefined) {
            dy += hit - val;
            g.push({ axis: 'y', pos: hit, from: Math.min(left, drag.box.x) - 20, to: Math.max(right, drag.box.x + drag.box.w) + 20 });
            break;
          }
        }
        setProps(selector, { tx: Math.round(drag.tx0 + dx), ty: Math.round(drag.ty0 + dy) }, false);
      } else {
        const k = drag.kind;
        let w = drag.w0; let h = drag.h0; let tx = drag.tx0; let ty = drag.ty0;
        if (k.includes('e')) w = Math.max(MIN, drag.w0 + dx);
        if (k.includes('s')) h = Math.max(MIN, drag.h0 + dy);
        if (k.includes('w')) { w = Math.max(MIN, drag.w0 - dx); tx = drag.tx0 + (drag.w0 - w); }
        if (k.includes('n')) { h = Math.max(MIN, drag.h0 - dy); ty = drag.ty0 + (drag.h0 - h); }
        setProps(selector, { width: Math.round(w), height: Math.round(h), tx: Math.round(tx), ty: Math.round(ty) }, false);
      }
      setGuides(g);
    };

    const onUp = () => {
      setGuides([]);
      // commit a single history checkpoint
      const cur = getFor(selector);
      setProps(selector, { ...cur }, true);
      setDrag(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, selector]);

  if (!box) return null;

  return (
    <>
      <AlignmentGuides lines={guides} />
      <div
        className="dm-ui dm-sel"
        style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }}
        onMouseDown={(e) => startDrag(e, 'move')}
      >
        <span className="dm-sel-dims">
          {Math.round(box.w)} × {Math.round(box.h)}
          <em>&nbsp;· {Math.round(box.x)}, {Math.round(box.y)}</em>
        </span>
        {HANDLES.map((h) => (
          <span
            key={h}
            className={`dm-handle dm-handle-${h}`}
            onMouseDown={(e) => startDrag(e, h)}
          />
        ))}
      </div>
    </>
  );
}

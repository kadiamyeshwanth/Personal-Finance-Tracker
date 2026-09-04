/**
 * LayersPanel — a shallow tree of the real DOM under the app shell.
 * Clicking a node selects the corresponding live element.
 */
import { useMemo, useState } from 'react';
import { CaretRight } from '@phosphor-icons/react';
import { cssPath, label } from './selectorPath';

const ROOTS = ['.app-frame', '.app-main', '.rail', '.topbar', 'main'];
const MAX_DEPTH = 5;

function pickRoot() {
  for (const s of ROOTS) { const el = document.querySelector(s); if (el) return el; }
  return document.body;
}

function Node({ el, depth, selector, onPick }) {
  const [open, setOpen] = useState(depth < 2);
  if (!(el instanceof HTMLElement) || el.classList.contains('dm-ui')) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;

  const kids = depth < MAX_DEPTH
    ? [...el.children].filter((c) => c instanceof HTMLElement && !c.classList.contains('dm-ui'))
    : [];
  const mine = cssPath(el);
  const isSel = mine === selector;

  return (
    <div className="dm-layer">
      <div className={`dm-layer-row ${isSel ? 'is-sel' : ''}`} style={{ paddingLeft: 6 + depth * 12 }}>
        {kids.length > 0 ? (
          <button type="button" className="dm-layer-caret" onClick={() => setOpen((o) => !o)}>
            <CaretRight size={10} weight="bold" style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
          </button>
        ) : <span className="dm-layer-caret" />}
        <button type="button" className="dm-layer-name" onClick={() => onPick(el)}>{label(el)}</button>
      </div>
      {open && kids.map((c, i) => (
        <Node key={i} el={c} depth={depth + 1} selector={selector} onPick={onPick} />
      ))}
    </div>
  );
}

export default function LayersPanel({ selector, onPick }) {
  const root = useMemo(pickRoot, []);
  return (
    <aside className="dm-ui dm-layers">
      <header className="dm-layers-head">Layers</header>
      <div className="dm-layers-body">
        <Node el={root} depth={0} selector={selector} onPick={onPick} />
      </div>
    </aside>
  );
}

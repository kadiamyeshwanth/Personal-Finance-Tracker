/**
 * DesignMode — a hidden, Figma-like visual editor layered on the real app.
 *
 *  • Floating button (bottom-right) toggles the mode.
 *  • OFF  → renders only the button; the site is 100% normal.
 *  • ON   → hover any real element to outline it, click to select, then drag /
 *           resize / edit its properties in the right panel. Edits are written
 *           as !important CSS overrides keyed by a stable selector, persisted to
 *           localStorage, and re-applied on every load.
 *
 * Isolated in components/design-mode/. One mount point (AppLayout).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PenNib, X, ArrowCounterClockwise, ArrowClockwise, Stack, TrashSimple } from '@phosphor-icons/react';
import { cssPath } from './selectorPath';
import {
  subscribe, undo, redo, canUndo, canRedo, clearSelector, clearAll,
} from './designState';
import SelectionOverlay from './SelectionOverlay';
import PropertiesPanel from './PropertiesPanel';
import HoverOutline from './HoverOutline';
import LayersPanel from './LayersPanel';
import './design-mode.css';

const IS_EDITABLE = (el) => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('.dm-ui')) return false;
  if (el === document.body || el === document.documentElement) return false;
  const r = el.getBoundingClientRect();
  return r.width > 6 && r.height > 6;
};

export default function DesignMode() {
  const [active, setActive] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [hoverEl, setHoverEl] = useState(null);
  const [selPath, setSelPath] = useState(null);
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);

  // Re-render on any override change (keeps panel + overlay in sync).
  useEffect(() => subscribe(rerender), [rerender]);

  const selectedEl = useMemo(() => {
    if (!selPath) return null;
    try { return document.querySelector(selPath); } catch { return null; }
  }, [selPath, hoverEl, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = useCallback((el) => {
    if (!el) { setSelPath(null); return; }
    setSelPath(cssPath(el));
  }, []);

  /* ── Pointer + click capture while active ──────────────────────────────── */
  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add('dm-on');

    const onMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      setHoverEl(IS_EDITABLE(el) ? el : null);
    };
    const onClick = (e) => {
      if (e.target.closest?.('.dm-ui')) return;
      e.preventDefault();
      e.stopPropagation();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (IS_EDITABLE(el)) select(el);
    };
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault(); redo();
      } else if (e.key === 'Escape') {
        setSelPath(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selPath && !/input|textarea/i.test(e.target.tagName)) {
        e.preventDefault();
        clearSelector(selPath);
      }
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('dm-on');
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey);
      setHoverEl(null);
    };
  }, [active, select, selPath]);

  const toggle = () => {
    setActive((a) => {
      const next = !a;
      if (!next) { setSelPath(null); setHoverEl(null); setShowLayers(false); }
      return next;
    });
  };

  return createPortal(
    <>
      {/* Floating toggle — always present */}
      <button
        type="button"
        className={`dm-ui dm-fab ${active ? 'is-on' : ''}`}
        onClick={toggle}
        aria-label={active ? 'Exit design mode' : 'Open design mode'}
        title={active ? 'Exit design mode' : 'Design mode'}
      >
        {active ? <X size={18} weight="bold" /> : <PenNib size={18} weight="fill" />}
      </button>

      {active && (
        <>
          {/* Top toolbar */}
          <div className="dm-ui dm-toolbar">
            <span className="dm-toolbar-title"><PenNib size={13} weight="fill" /> Design mode</span>
            <div className="dm-toolbar-actions">
              <button type="button" onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)">
                <ArrowCounterClockwise size={14} />
              </button>
              <button type="button" onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Shift+Z)">
                <ArrowClockwise size={14} />
              </button>
              <button type="button" className={showLayers ? 'is-on' : ''} onClick={() => setShowLayers((s) => !s)} title="Layers">
                <Stack size={14} />
              </button>
              <button type="button" onClick={() => { if (confirm('Discard all design-mode changes?')) clearAll(); }} title="Reset all">
                <TrashSimple size={14} />
              </button>
            </div>
          </div>

          <HoverOutline el={hoverEl} hidden={hoverEl === selectedEl} />

          <SelectionOverlay
            el={selectedEl}
            selector={selPath}
            onSelectorChange={setSelPath}
          />

          {selectedEl && (
            <PropertiesPanel
              el={selectedEl}
              selector={selPath}
              onSelectParent={() => {
                const p = selectedEl.parentElement;
                if (p && IS_EDITABLE(p)) select(p);
              }}
              onClose={() => setSelPath(null)}
            />
          )}

          {showLayers && (
            <LayersPanel
              selector={selPath}
              onPick={(el) => select(el)}
            />
          )}
        </>
      )}
    </>,
    document.body,
  );
}

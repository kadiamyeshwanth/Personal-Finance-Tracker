/**
 * designState — the single source of truth for visual-editor overrides.
 *
 * Shape:
 *   { "<cssPath>": { opacity, width, height, tx, ty, padding, margin, gap,
 *                    background, color, borderRadius, border, boxShadow,
 *                    backdropFilter, fontSize, fontWeight, lineHeight,
 *                    letterSpacing, display, flexDirection, alignItems,
 *                    justifyContent } }
 *
 * Overrides are turned into a single injected <style> element with !important
 * rules, so the REAL components change and nothing needs per-component wiring.
 * Persisted to localStorage and re-applied on every page load (so edits stick
 * for the end user too, exactly like a saved design).
 */
const LS_KEY = 'clario.design.overrides.v1';
const STYLE_ID = 'clario-design-overrides';
const MAX_HISTORY = 100;

let overrides = read();
const listeners = new Set();

let history = [clone(overrides)];
let cursor = 0;

function read() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(overrides)); } catch { /* private mode */ }
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

/* ── CSS generation ──────────────────────────────────────────────────────── */
const DECL = {
  opacity:        (v) => `opacity:${v}`,
  width:          (v) => `width:${v}px;flex:0 0 auto;max-width:none`,
  height:         (v) => `height:${v}px`,
  padding:        (v) => `padding:${v}`,
  margin:         (v) => `margin:${v}`,
  gap:            (v) => `gap:${v}px`,
  background:     (v) => `background:${v}`,
  color:          (v) => `color:${v}`,
  borderRadius:   (v) => `border-radius:${v}px`,
  border:         (v) => `border:${v}`,
  boxShadow:      (v) => `box-shadow:${v}`,
  backdropFilter: (v) => `backdrop-filter:${v};-webkit-backdrop-filter:${v}`,
  fontSize:       (v) => `font-size:${v}px`,
  fontWeight:     (v) => `font-weight:${v}`,
  lineHeight:     (v) => `line-height:${v}`,
  letterSpacing:  (v) => `letter-spacing:${v}px`,
  display:        (v) => `display:${v}`,
  flexDirection:  (v) => `flex-direction:${v}`,
  alignItems:     (v) => `align-items:${v}`,
  justifyContent: (v) => `justify-content:${v}`,
};

function ruleFor(selector, o) {
  const decls = [];
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === undefined || v === '' || k === 'tx' || k === 'ty') continue;
    if (DECL[k]) decls.push(DECL[k](v) + ' !important');
  }
  if (o.tx || o.ty) {
    decls.push(`transform:translate(${o.tx || 0}px, ${o.ty || 0}px) !important`);
  }
  return decls.length ? `${selector}{${decls.join(';')}}` : '';
}

export function applyStylesheet() {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = Object.entries(overrides)
    .map(([sel, o]) => ruleFor(sel, o))
    .filter(Boolean)
    .join('\n');
}

/* ── Public API ──────────────────────────────────────────────────────────── */
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { applyStylesheet(); persist(); listeners.forEach((f) => f(overrides)); }

export function getOverrides() { return overrides; }
export function getFor(selector) { return overrides[selector] || {}; }

/** Set one property. `commit` pushes an undo checkpoint (use on blur / drag-end). */
export function setProp(selector, key, value, commit = false) {
  const next = { ...(overrides[selector] || {}) };
  if (value === null || value === undefined || value === '') delete next[key];
  else next[key] = value;

  if (Object.keys(next).length) overrides = { ...overrides, [selector]: next };
  else { overrides = { ...overrides }; delete overrides[selector]; }

  if (commit) pushHistory();
  emit();
}

/** Set several props at once (one checkpoint). */
export function setProps(selector, patch, commit = true) {
  const next = { ...(overrides[selector] || {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') delete next[k];
    else next[k] = v;
  }
  if (Object.keys(next).length) overrides = { ...overrides, [selector]: next };
  else { overrides = { ...overrides }; delete overrides[selector]; }
  if (commit) pushHistory();
  emit();
}

export function clearSelector(selector) {
  if (!overrides[selector]) return;
  overrides = { ...overrides };
  delete overrides[selector];
  pushHistory();
  emit();
}

export function clearAll() {
  overrides = {};
  pushHistory();
  emit();
}

/* ── Undo / redo ─────────────────────────────────────────────────────────── */
function pushHistory() {
  history = history.slice(0, cursor + 1);
  history.push(clone(overrides));
  if (history.length > MAX_HISTORY) history.shift();
  cursor = history.length - 1;
}
export function undo() {
  if (cursor === 0) return;
  cursor -= 1;
  overrides = clone(history[cursor]);
  emit();
}
export function redo() {
  if (cursor >= history.length - 1) return;
  cursor += 1;
  overrides = clone(history[cursor]);
  emit();
}
export function canUndo() { return cursor > 0; }
export function canRedo() { return cursor < history.length - 1; }

/* Apply persisted overrides immediately on import. */
applyStylesheet();

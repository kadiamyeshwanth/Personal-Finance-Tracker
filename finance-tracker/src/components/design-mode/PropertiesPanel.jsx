/**
 * PropertiesPanel — right-hand inspector for the selected element.
 * Values fall back to the element's live computed style; editing writes an
 * override (live, persisted, undoable). "Reset" clears this element's overrides.
 */
import { useMemo } from 'react';
import { X, ArrowUUpLeft, ArrowsInLineVertical } from '@phosphor-icons/react';
import { getFor, setProp, clearSelector } from './designState';
import { label } from './selectorPath';

const num = (s) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : '';
};
const toHex = (rgb) => {
  if (typeof rgb === 'string' && rgb[0] === '#') return rgb.slice(0, 7);
  const m = String(rgb).match(/rgba?\(([^)]+)\)/i);
  if (!m) return '#000000';
  const [r, g, b] = m[1].split(',').map((x) => parseInt(x, 10));
  return '#' + [r, g, b].map((v) => (v || 0).toString(16).padStart(2, '0')).join('');
};

export default function PropertiesPanel({ el, selector, onSelectParent, onClose }) {
  const cs = useMemo(() => getComputedStyle(el), [el, selector]);
  const ov = getFor(selector);
  const dirty = Object.keys(ov).length > 0;

  const val = (key, fallback) => (ov[key] !== undefined ? ov[key] : fallback);
  const set = (key, v, commit = true) => setProp(selector, key, v, commit);

  const Row = ({ label: l, children }) => (
    <label className="dm-row"><span>{l}</span>{children}</label>
  );
  const Num = ({ k, cssKey }) => (
    <input
      type="number"
      className="dm-input"
      value={val(k, num(cs[cssKey ?? k]))}
      onChange={(e) => set(k, e.target.value === '' ? '' : +e.target.value, false)}
      onBlur={(e) => set(k, e.target.value === '' ? '' : +e.target.value, true)}
    />
  );
  const Text = ({ k, cssKey }) => (
    <input
      type="text"
      className="dm-input dm-input-wide"
      value={val(k, cs[cssKey ?? k] || '')}
      onChange={(e) => set(k, e.target.value, false)}
      onBlur={(e) => set(k, e.target.value, true)}
    />
  );
  const Color = ({ k, cssKey }) => (
    <span className="dm-color">
      <input type="color" value={toHex(val(k, cs[cssKey ?? k]))} onChange={(e) => set(k, e.target.value, true)} />
      <input
        type="text" className="dm-input dm-input-wide"
        value={val(k, cs[cssKey ?? k] || '')}
        onChange={(e) => set(k, e.target.value, false)}
        onBlur={(e) => set(k, e.target.value, true)}
      />
    </span>
  );
  const Select = ({ k, cssKey, opts }) => (
    <select className="dm-input dm-input-wide" value={val(k, cs[cssKey ?? k])} onChange={(e) => set(k, e.target.value, true)}>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const opacityPct = Math.round((val('opacity', parseFloat(cs.opacity) || 1)) * 100);
  const isFlex = /flex|grid/.test(cs.display);

  return (
    <aside className="dm-ui dm-panel">
      <header className="dm-panel-head">
        <div className="dm-panel-title">
          <button type="button" className="dm-mini" onClick={onSelectParent} title="Select parent"><ArrowUUpLeft size={13} /></button>
          <span>{label(el)}</span>
        </div>
        <button type="button" className="dm-mini" onClick={onClose} title="Deselect"><X size={13} /></button>
      </header>

      <div className="dm-panel-body">
        <section className="dm-sec">
          <h4>Layout</h4>
          <div className="dm-grid2">
            <Row label="X"><Num k="tx" unitless /></Row>
            <Row label="Y"><Num k="ty" unitless /></Row>
            <Row label="W"><Num k="width" cssKey="width" /></Row>
            <Row label="H"><Num k="height" cssKey="height" /></Row>
          </div>
        </section>

        <section className="dm-sec">
          <h4>Opacity</h4>
          <div className="dm-slider">
            <input
              type="range" min="0" max="100" value={opacityPct}
              onChange={(e) => set('opacity', +e.target.value / 100, false)}
              onMouseUp={(e) => set('opacity', +e.target.value / 100, true)}
            />
            <span>{opacityPct}%</span>
          </div>
        </section>

        <section className="dm-sec">
          <h4>Spacing</h4>
          <Row label="Padding"><Text k="padding" /></Row>
          <Row label="Margin"><Text k="margin" /></Row>
          {isFlex && <Row label="Gap"><Num k="gap" cssKey="gap" /></Row>}
        </section>

        <section className="dm-sec">
          <h4>Style</h4>
          <Row label="Background"><Color k="background" cssKey="backgroundColor" /></Row>
          <Row label="Border"><Text k="border" /></Row>
          <Row label="Radius"><Num k="borderRadius" cssKey="borderRadius" /></Row>
          <Row label="Shadow"><Text k="boxShadow" /></Row>
          <Row label="Blur"><Text k="backdropFilter" cssKey="backdropFilter" /></Row>
        </section>

        <section className="dm-sec">
          <h4>Typography</h4>
          <div className="dm-grid2">
            <Row label="Size"><Num k="fontSize" cssKey="fontSize" /></Row>
            <Row label="Weight"><Num k="fontWeight" cssKey="fontWeight" unitless /></Row>
            <Row label="Line"><Num k="lineHeight" cssKey="lineHeight" unitless /></Row>
            <Row label="Spacing"><Num k="letterSpacing" cssKey="letterSpacing" /></Row>
          </div>
          <Row label="Text color"><Color k="color" cssKey="color" /></Row>
        </section>

        {isFlex && (
          <section className="dm-sec">
            <h4>Auto layout</h4>
            <Row label="Display"><Select k="display" opts={['flex', 'grid', 'block', 'inline-flex']} /></Row>
            <Row label="Direction"><Select k="flexDirection" opts={['row', 'column', 'row-reverse', 'column-reverse']} /></Row>
            <Row label="Align"><Select k="alignItems" opts={['stretch', 'flex-start', 'center', 'flex-end', 'baseline']} /></Row>
            <Row label="Justify"><Select k="justifyContent" opts={['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']} /></Row>
          </section>
        )}
      </div>

      <footer className="dm-panel-foot">
        <code className="dm-sel-str" title={selector}>{selector}</code>
        <button type="button" className="dm-reset" disabled={!dirty} onClick={() => clearSelector(selector)}>
          <ArrowsInLineVertical size={12} /> Reset element
        </button>
      </footer>
    </aside>
  );
}

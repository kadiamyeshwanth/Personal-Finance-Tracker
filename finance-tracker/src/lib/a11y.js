/**
 * Accessibility preferences — reduce motion, larger text, high contrast,
 * always-underline links. Stored in localStorage and reflected as attributes
 * on <html> so plain CSS can respond. Call applyA11y() once at boot.
 */
const KEY = 'clario.a11y.v1';

export const A11Y_DEFAULTS = {
  reduceMotion: false,
  textSize: 'default', // 'default' | 'large' | 'xlarge'
  highContrast: false,
  underlineLinks: false,
};

export function getA11y() {
  try {
    return { ...A11Y_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...A11Y_DEFAULTS };
  }
}

export function setA11y(patch) {
  const next = { ...getA11y(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  applyA11y(next);
  window.dispatchEvent(new Event('clario:a11y'));
  return next;
}

export function applyA11y(pref = getA11y()) {
  const el = document.documentElement;
  el.toggleAttribute('data-reduce-motion', !!pref.reduceMotion);
  el.toggleAttribute('data-high-contrast', !!pref.highContrast);
  el.toggleAttribute('data-underline-links', !!pref.underlineLinks);
  if (pref.textSize && pref.textSize !== 'default') el.setAttribute('data-text-size', pref.textSize);
  else el.removeAttribute('data-text-size');
}

export function onA11yChange(cb) {
  const h = () => cb(getA11y());
  window.addEventListener('clario:a11y', h);
  window.addEventListener('storage', h);
  return () => { window.removeEventListener('clario:a11y', h); window.removeEventListener('storage', h); };
}

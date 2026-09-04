/**
 * A stable-ish CSS selector for a real DOM element, used as the key under which
 * that element's design overrides are stored. Prefers meaningful class names and
 * falls back to :nth-of-type for uniqueness. Never uses design-mode's own nodes.
 */
const SKIP_CLASS = /^(dm-|is-|has-|motion-)/;

export function cssPath(el) {
  if (!(el instanceof Element)) return null;

  const parts = [];
  let node = el;

  while (node && node.nodeType === 1 && parts.length < 7) {
    if (node.id && /^[a-zA-Z][\w-]*$/.test(node.id)) {
      parts.unshift(`#${node.id}`);
      break;
    }

    let part = node.nodeName.toLowerCase();
    const classes = [...node.classList].filter((c) => !SKIP_CLASS.test(c));
    if (classes.length) part += '.' + classes.slice(0, 3).map((c) => CSS.escape(c)).join('.');

    const parent = node.parentElement;
    if (parent) {
      const sameType = [...parent.children].filter((s) => s.nodeName === node.nodeName);
      if (sameType.length > 1) part += `:nth-of-type(${sameType.indexOf(node) + 1})`;
    }

    parts.unshift(part);

    if (!parent || parent === document.body) break;
    node = parent;
  }

  return parts.join(' > ');
}

/** Human label for the layers panel. */
export function label(el) {
  if (!(el instanceof Element)) return 'element';
  const cls = [...el.classList].filter((c) => !SKIP_CLASS.test(c));
  const tag = el.nodeName.toLowerCase();
  const key = cls.find((c) => /^(dc|hs|mm|cf|bo|rail|topbar|dash|gm|tc|n-)/.test(c));
  if (key) return key;
  if (cls[0]) return cls[0];
  const txt = (el.textContent || '').trim().slice(0, 18);
  return txt ? `${tag} "${txt}"` : tag;
}

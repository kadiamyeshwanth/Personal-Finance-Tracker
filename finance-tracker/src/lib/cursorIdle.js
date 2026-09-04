/**
 * cursorIdle — hide the mouse pointer after a few seconds of no input,
 * bring it back on the next move / click / key. Pointer devices only.
 *
 * Adds/removes `cursor-idle` on <html>; the CSS rule lives in index.css.
 */
export function initCursorIdle(timeout = 3000) {
  if (typeof window === 'undefined' || !document?.documentElement) return;
  // touch / coarse pointers have no persistent cursor to hide
  if (window.matchMedia?.('(hover: none), (pointer: coarse)').matches) return;

  const root = document.documentElement;
  let timer;

  const wake = () => {
    root.classList.remove('cursor-idle');
    clearTimeout(timer);
    timer = setTimeout(() => root.classList.add('cursor-idle'), timeout);
  };

  ['mousemove', 'mousedown', 'wheel', 'keydown'].forEach(ev =>
    window.addEventListener(ev, wake, { passive: true }),
  );
  // if the tab loses focus, don't leave it hidden on return
  window.addEventListener('blur', () => {
    clearTimeout(timer);
    root.classList.remove('cursor-idle');
  });

  wake();
}

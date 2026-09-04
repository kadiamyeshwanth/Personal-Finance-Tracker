/**
 * AnimatedThemeToggler — icon button that swaps the theme with a circular
 * View-Transitions reveal spreading from the button. Falls back to a plain
 * swap where `document.startViewTransition` is unavailable or reduced motion
 * is requested. UI only — it does not own theme state, it just calls
 * `onThemeChange`.
 */
import { useRef } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export function AnimatedThemeToggler({
  className,
  duration = 450,
  theme,
  onThemeChange,
  ...rest
}) {
  const ref = useRef(null);
  const isDark = theme === 'dark';

  const flip = async () => {
    if (!onThemeChange) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (!document.startViewTransition || reduce) {
      onThemeChange();
      return;
    }

    const transition = document.startViewTransition(() => {
      onThemeChange();
    });

    try {
      await transition.ready;
      const btn = ref.current;
      const { top, left, width, height } = btn.getBoundingClientRect();
      const cx = left + width / 2;
      const cy = top + height / 2;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // farthest corner from the button + a generous margin, so the circle
      // always clears the bottom edge even when innerHeight lags the paint box
      const end = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy)) + Math.max(vw, vh) * 0.15;
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${cx}px ${cy}px)`,
            `circle(${end}px at ${cx}px ${cy}px)`,
          ],
        },
        {
          duration,
          easing: 'cubic-bezier(0.33, 1, 0.42, 1)',
          pseudoElement: '::view-transition-new(root)',
          fill: 'forwards',
        },
      );
    } catch {
      /* transition unsupported mid-flight — theme already swapped */
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={flip}
      className={cn(className)}
      {...rest}
    >
      {isDark ? <Moon size={17} weight="fill" /> : <Sun size={17} weight="fill" />}
    </button>
  );
}

export default AnimatedThemeToggler;

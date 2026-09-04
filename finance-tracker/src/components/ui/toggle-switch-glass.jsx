/**
 * ToggleSwitch — iOS-style liquid-glass switch, used on the prelanding nav as
 * the dark/light theme control. UI only: it holds no theme state, it reports
 * the requested next value through `onChange`.
 *
 *   isActive / darkMode  — current on/off (both accepted; either drives it)
 *   onChange(next)        — called with the boolean the user asked for
 *   size                  — 'sm' | 'md' | 'lg'
 *   colorTheme            — 'flame' | 'neutral'
 */
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: { w: 46, h: 26, pad: 3 },
  md: { w: 58, h: 32, pad: 4 },
  lg: { w: 72, h: 40, pad: 5 },
};

const THEMES = {
  flame:   { on: '#E85002', off: 'hsl(0 0% 82%)', offDark: 'hsl(0 0% 26%)' },
  neutral: { on: '#3B3B3B', off: 'hsl(0 0% 82%)', offDark: 'hsl(0 0% 26%)' },
};

export function ToggleSwitch({
  className,
  size = 'md',
  colorTheme = 'flame',
  isActive,
  darkMode,
  onChange,
  disabled = false,
  ...rest
}) {
  const reduce = useReducedMotion();
  const s = SIZES[size] ?? SIZES.md;
  const t = THEMES[colorTheme] ?? THEMES.flame;
  const on = isActive ?? darkMode ?? false;
  const knob = s.h - s.pad * 2;
  const travel = s.w - s.pad * 2 - knob;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Toggle dark mode"
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!on)}
      onKeyDown={e => {
        if (disabled) return;
        if (e.key === 'ArrowLeft') onChange?.(false);
        if (e.key === 'ArrowRight') onChange?.(true);
      }}
      className={cn('mr-toggle-glass', className)}
      style={{
        width: s.w,
        height: s.h,
        padding: s.pad,
        borderRadius: s.h,
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: on ? t.on : `var(--mr-toggle-off, ${t.off})`,
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.28)',
        transition: 'background 0.3s cubic-bezier(0.33,1,0.42,1)',
        WebkitTapHighlightColor: 'transparent',
      }}
      {...rest}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: on ? travel : 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 }
        }
        style={{
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: 'linear-gradient(180deg,#fff,#ececec)',
          boxShadow: '0 2px 5px rgba(0,0,0,0.32), 0 0 0 0.5px rgba(0,0,0,0.06)',
        }}
      />
    </button>
  );
}

export const AnimatedLiquidGlass = ToggleSwitch;
export default ToggleSwitch;

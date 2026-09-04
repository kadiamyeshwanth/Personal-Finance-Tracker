/**
 * GlassSurface — the floating material layer.
 *
 * Wraps the vendored liquid-glass refraction so any element can become a real
 * glass panel: the content behind it visibly bends at the rim on Chromium, and
 * degrades to a frosted backdrop-filter everywhere else.
 *
 * Apple's material rules this enforces:
 *  · Bigger surfaces read as thicker — `weight` scales blur + displacement.
 *  · Never stack light glass on light glass — use weight="heavy" for structure
 *    (sidebar), weight="light" for interactive chips.
 *  · prefers-reduced-transparency turns the glass solid instead of blurring.
 */
import { useEffect, useRef } from 'react';
import liquidGlass from '../../vendor/liquid-glass';

const WEIGHTS = {
  light:  { scale: -70,  blur: 2, saturate: 1.35, fallbackBlur: 12, chroma: 4 },
  medium: { scale: -112, blur: 3, saturate: 1.5,  fallbackBlur: 18, chroma: 6 },
  heavy:  { scale: -150, blur: 5, saturate: 1.7,  fallbackBlur: 26, chroma: 8 },
};

/** Attach liquid glass to a ref'd element. Returns nothing; cleans up on unmount. */
export function useLiquidGlass(ref, { weight = 'medium', enabled = true, radius } = {}) {
  useEffect(() => {
    if (!enabled || !ref.current) return;

    // Respect the user's transparency preference — solid beats blurry.
    const reduced = window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches;
    if (reduced) return;

    let glass;
    try {
      glass = liquidGlass(ref.current, { ...WEIGHTS[weight] ?? WEIGHTS.medium, radius });
    } catch {
      // Refraction is decoration — never let it break a screen.
      return;
    }
    return () => glass?.destroy?.();
  }, [ref, weight, enabled, radius]);
}

export default function GlassSurface({
  as: Tag = 'div',
  weight = 'medium',
  enabled = true,
  radius,
  className = '',
  style,
  children,
  ...rest
}) {
  const ref = useRef(null);
  useLiquidGlass(ref, { weight, enabled, radius });

  return (
    <Tag
      ref={ref}
      className={`glass glass--${weight} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

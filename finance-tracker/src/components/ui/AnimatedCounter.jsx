import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

/**
 * AnimatedCounter — smoothly counts up from 0 to `value`.
 * Usage: <AnimatedCounter value={12500} prefix="₹" duration={1.2} />
 */
const AnimatedCounter = ({
  value = 0,
  prefix = '',
  suffix = '',
  duration = 1.0,
  decimals = 0,
  locale = 'en-IN',
  style = {},
}) => {
  const motionVal = useMotionValue(0);
  const ref = useRef(null);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration,
      ease: [0.4, 0, 0.2, 1],
      onUpdate: (latest) => {
        if (ref.current) {
          const formatted = decimals > 0
            ? latest.toFixed(decimals)
            : Math.floor(latest).toLocaleString(locale);
          ref.current.textContent = `${prefix}${formatted}${suffix}`;
        }
      },
    });
    return () => controls.stop();
  }, [value, duration, decimals, locale, prefix, suffix, motionVal]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix}{decimals > 0 ? (0).toFixed(decimals) : (0).toLocaleString(locale)}{suffix}
    </span>
  );
};

export default AnimatedCounter;

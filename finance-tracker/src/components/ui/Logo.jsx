/**
 * Clario logo — the quincunx mark + the "Clario" wordmark.
 *
 * <LogoMark>      five-node grid, brand orange, with a soft dimensional lift
 * <LogoWordmark>  the lettering (single path, inherits currentColor)
 * <Logo>          mark + wordmark locked up
 *
 * The mark colour is driven by --logo-mark so both themes and the marketing
 * pages can retint it without touching the component.
 */
const MARK_PATH =
  'M 228 0 C 172.772 0 128 44.772 128 100 L 128 0 L 0 0 L 0 28 C 0 83.228 44.772 128 100 128 L 0 128 L 0 256 L 28 256 C 83.228 256 128 211.228 128 156 L 128 256 L 256 256 L 256 228 C 256 172.772 211.228 128 156 128 L 256 128 L 256 0 Z';

export function LogoMark({ size = 26, className = '', lift = true, style, ...rest }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 256 256"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} role="img" aria-label="Clario"
      style={{ filter: lift ? 'drop-shadow(0 1.5px 3px rgba(193, 8, 1, 0.35))' : undefined, ...style }}
      {...rest}
    >
      <path d={MARK_PATH} fill="var(--logo-mark, #E85002)" />
    </svg>
  );
}

export function LogoWordmark({ height = 18, className = '', style, ...rest }) {
  return (
    <span
      className={`clario-wordmark ${className}`.trim()}
      role="img" aria-label="Clario"
      style={{
        fontFamily: "'Unbounded', ui-rounded, system-ui, sans-serif",
        fontWeight: 700,
        fontSize: `${height}px`,
        lineHeight: 1,
        letterSpacing: '-0.03em',
        display: 'inline-block',
        ...style,
      }}
      {...rest}
    >
      Clario
    </span>
  );
}

export default function Logo({ size = 24, wordmarkHeight, className = '', showWordmark = true }) {
  return (
    <span className={`clario-logo ${className}`.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.42 }}>
      <LogoMark size={size} />
      {showWordmark && <LogoWordmark height={wordmarkHeight ?? Math.round(size * 0.62)} />}
    </span>
  );
}

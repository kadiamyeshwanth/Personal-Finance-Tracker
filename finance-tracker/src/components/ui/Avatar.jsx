import React, { useEffect, useState } from 'react';
import { getAvatar, onAvatarChange } from '../../lib/profile';

/**
 * Avatar — the user's photo if they've set one, otherwise their initial.
 * Reads the local profile store and live-updates when it changes.
 */
export default function Avatar({ name = 'U', size = 32, radius, className = '', style }) {
  const [src, setSrc] = useState(getAvatar);
  useEffect(() => onAvatarChange(setSrc), []);

  const r = radius ?? Math.round(size * 0.32);
  const base = {
    width: size, height: size, borderRadius: r, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', ...style,
  };
  const initial = (name?.[0] || 'U').toUpperCase();

  if (src) {
    return (
      <span className={className} style={base}>
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </span>
    );
  }
  return (
    <span
      className={className}
      style={{ ...base, background: 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

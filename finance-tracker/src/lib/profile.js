/**
 * Local profile avatar — the backend has no picture endpoint and this
 * redesign is UI-only, so the chosen photo lives in localStorage (downscaled
 * to a small square data URL) and every avatar in the app reads from here.
 */
const KEY = 'clario.profile.avatar.v1';
const EVT = 'clario:avatar';

export function getAvatar() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function setAvatar(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(KEY, dataUrl);
    else localStorage.removeItem(KEY);
  } catch { /* quota / private mode — ignore */ }
  window.dispatchEvent(new Event(EVT));
}

export function clearAvatar() { setAvatar(null); }

/** Subscribe to avatar changes (same tab + other tabs). Returns an unsubscribe. */
export function onAvatarChange(cb) {
  const h = () => cb(getAvatar());
  window.addEventListener(EVT, h);
  window.addEventListener('storage', h);
  return () => { window.removeEventListener(EVT, h); window.removeEventListener('storage', h); };
}

/** Read an image File, centre-crop to a square and resize to `size` px. */
export function fileToSquareDataURL(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) return reject(new Error('Not an image'));
    if (file.size > 12 * 1024 * 1024) return reject(new Error('Image is too large (max 12 MB)'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

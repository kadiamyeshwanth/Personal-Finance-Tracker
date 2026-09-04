/**
 * ConnectionBanner — closes two gaps found in the flow audit:
 *
 *   1. OFFLINE — the app had no offline state at all. Requests simply failed
 *      into generic error toasts, which reads as "the app is broken".
 *   2. COLD START — the API sleeps on free-tier hosting. The first request
 *      after idle can take 20–50s, during which the user saw only a spinner.
 *      An unexplained spinner is indistinguishable from a hang.
 *
 * Strictly presentational. It reads react-query's *existing* fetch counter and
 * the browser's online events — it starts no requests, retries nothing, and
 * changes no application behaviour.
 */
import { useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiSlash as WifiOff,
  CircleNotch as Loader2,
  CheckCircle as CheckCircle2,
} from '@phosphor-icons/react';
import { springSheet } from '../../lib/motion';

/** How long a fetch must run before we explain the delay rather than spin silently. */
const SLOW_AFTER_MS = 4000;

export default function ConnectionBanner() {
  const isFetching = useIsFetching();
  const [online, setOnline]   = useState(() => navigator.onLine !== false);
  const [slow, setSlow]       = useState(false);
  const [restored, setRestored] = useState(false);
  const wasOffline = useRef(false);

  /* ── Online / offline ─────────────────────────────────────────────────── */
  useEffect(() => {
    const goOffline = () => { wasOffline.current = true; setOnline(false); };
    const goOnline  = () => {
      setOnline(true);
      // Only celebrate a *recovery*, never announce a state that never broke.
      if (wasOffline.current) {
        wasOffline.current = false;
        setRestored(true);
        const t = setTimeout(() => setRestored(false), 2600);
        return () => clearTimeout(t);
      }
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  /* ── Slow / waking backend ────────────────────────────────────────────── */
  useEffect(() => {
    if (!isFetching) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [isFetching]);

  let state = null;
  if (!online)        state = 'offline';
  else if (restored)  state = 'restored';
  else if (slow)      state = 'slow';

  const COPY = {
    offline: {
      cls: 'clario-banner--warn',
      icon: <WifiOff size={14} strokeWidth={1.9} />,
      text: "You're offline. Your data is still here — new changes will need a connection to save.",
    },
    slow: {
      cls: '',
      icon: <Loader2 size={14} strokeWidth={1.9} className="auth-spin" />,
      text: 'Waking the server up. The first load after a quiet spell can take up to a minute.',
    },
    restored: {
      cls: 'clario-banner--ok',
      icon: <CheckCircle2 size={14} strokeWidth={1.9} />,
      text: 'Back online.',
    },
  };

  return (
    <AnimatePresence initial={false}>
      {state && (
        <motion.div
          key={state}
          role="status"
          aria-live="polite"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={springSheet}
          style={{ overflow: 'hidden', flexShrink: 0 }}
        >
          <div className={`clario-banner ${COPY[state].cls}`}>
            <span className="clario-banner-dot clario-pulse" aria-hidden="true" />
            {COPY[state].icon}
            <span>{COPY[state].text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * States — the edge cases every screen needs, in one place.
 *
 * The audit of the original build found these were the gaps: pages had a single
 * line of copy for "empty" and nothing at all for a failed request, a slow cold
 * start, or being offline. A user cannot tell those apart, and each needs a
 * different action.
 *
 *   <EmptyState>   nothing here yet → tell them how to start
 *   <ErrorState>   the request failed → let them retry, say what broke
 *   <LoadingState> waiting → show the shape of what is coming
 *   <OfflineState> no connection → explain, and retry when it returns
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WarningCircle, WifiSlash, ArrowClockwise } from '@phosphor-icons/react';
import Loader from './Loader';
import { spring } from '../../lib/motion';

function Shell({ icon, tone = 'neutral', title, body, action, compact }) {
  return (
    <motion.div
      className={`state state--${tone} ${compact ? 'state--compact' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {icon && <span className="state-icon">{icon}</span>}
      <h3 className="state-title">{title}</h3>
      {body && <p className="state-body">{body}</p>}
      {action && <div className="state-action">{action}</div>}
    </motion.div>
  );
}

export function EmptyState({ icon, title, body, action, compact }) {
  return <Shell icon={icon} title={title} body={body} action={action} compact={compact} />;
}

/**
 * A failed request. `error` is shown only in development — users get plain
 * language, developers get the detail.
 */
export function ErrorState({ title = 'Could not load this', body, error, onRetry, compact }) {
  const detail = import.meta.env.DEV && error
    ? (error.response?.data?.error || error.message)
    : null;

  return (
    <Shell
      tone="error"
      compact={compact}
      icon={<WarningCircle size={26} weight="fill" />}
      title={title}
      body={body || 'The request did not come back. This is usually the connection or the server waking up.'}
      action={
        <>
          {onRetry && (
            <button type="button" className="n-btn n-btn-default n-btn-sm" onClick={onRetry}>
              <ArrowClockwise size={14} weight="bold" /> Try again
            </button>
          )}
          {detail && <code className="state-detail">{detail}</code>}
        </>
      }
    />
  );
}

/**
 * Waiting. After ~6s it explains the cold start rather than spinning silently —
 * free-tier hosting can take 20–50s to wake, and an unexplained spinner reads
 * as a hang.
 */
export function LoadingState({ label = 'Loading', slowAfter = 6000, compact, variant = 'wireframe', rows = 3 }) {
  if (variant === 'spinner') {
    return (
      <div className={`state state--loading ${compact ? 'state--compact' : ''}`} role="status" aria-live="polite">
        <Loader size={34} />
        <p className="state-body">{label}…</p>
        <SlowHint after={slowAfter} />
      </div>
    );
  }
  // Wireframe: the shape of the page that's arriving, so nothing jumps when it lands.
  return (
    <div className="wf" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      <div className="wf-head">
        <span className="n-skeleton wf-b" style={{ width: 200, height: 26, borderRadius: 8 }} />
        <span className="n-skeleton wf-b" style={{ width: 96, height: 32, borderRadius: 10 }} />
      </div>
      <div className="wf-cards">
        {[0, 1, 2].map(i => (
          <div key={i} className="wf-card">
            <span className="n-skeleton wf-b" style={{ width: '55%', height: 9 }} />
            <span className="n-skeleton wf-b" style={{ width: '72%', height: 22, borderRadius: 8 }} />
          </div>
        ))}
      </div>
      <div className="wf-panel">
        <span className="n-skeleton wf-b" style={{ width: '32%', height: 12 }} />
        <span className="n-skeleton wf-b" style={{ width: '100%', height: 160, borderRadius: 14 }} />
      </div>
      <div className="wf-list">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="wf-row">
            <span className="n-skeleton wf-b" style={{ width: 34, height: 34, borderRadius: 10 }} />
            <span className="n-skeleton wf-b" style={{ flex: 1, height: 12 }} />
            <span className="n-skeleton wf-b" style={{ width: 64, height: 12 }} />
          </div>
        ))}
      </div>
      <SlowHint after={slowAfter} />
    </div>
  );
}

function SlowHint({ after }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), after);
    return () => clearTimeout(t);
  }, [after]);
  if (!slow) return null;
  return (
    <motion.p
      className="state-hint"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={spring}
    >
      Still going — the server may be waking up after being idle.
    </motion.p>
  );
}

export function OfflineState({ onRetry, compact }) {
  return (
    <Shell
      tone="warn"
      compact={compact}
      icon={<WifiSlash size={26} weight="fill" />}
      title="You are offline"
      body="Clario needs a connection to load your data. Anything you were typing is still here."
      action={
        onRetry && (
          <button type="button" className="n-btn n-btn-default n-btn-sm" onClick={onRetry}>
            <ArrowClockwise size={14} weight="bold" /> Retry
          </button>
        )
      }
    />
  );
}

/**
 * One call that covers the whole request lifecycle, so a page cannot forget a
 * branch. Returns null when there is data to render.
 *
 *   const guard = queryStates({ query, onRetry, empty: {...} });
 *   if (guard) return guard;
 */
export function queryStates({ query, isEmpty, empty = {}, label, onRetry, compact }) {
  if (query.isLoading) return <LoadingState label={label} compact={compact} />;
  if (query.isError) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return offline
      ? <OfflineState onRetry={onRetry || query.refetch} compact={compact} />
      : <ErrorState error={query.error} onRetry={onRetry || query.refetch} compact={compact} />;
  }
  if (isEmpty) return <EmptyState {...empty} compact={compact} />;
  return null;
}

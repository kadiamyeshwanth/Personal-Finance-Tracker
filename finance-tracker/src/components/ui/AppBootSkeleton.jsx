/**
 * AppBootSkeleton — what you see while the session token is being verified.
 *
 * Replaces a bare centred spinner. Two reasons:
 *  · A spinner conveys "something is happening" but not "what, or for how long".
 *    On a sleeping backend that wait is 20–50s, and silence reads as a hang.
 *  · Showing the *shape* of the page that is arriving makes the wait feel
 *    shorter and stops the layout jumping when real content lands.
 *
 * The ProgressiveFluxLoader replaces the old static "waking the server up"
 * note: its self-running sweep plus phase labels ("verifying session" →
 * "waking the server" → "almost there") keep communicating progress for
 * exactly the kind of open-ended wait a sleeping free-tier host produces,
 * instead of one line of text that never changes.
 */
import { ProgressiveFluxLoader } from './progressive-flux-loader';

const Bar = ({ w, h = 12, r = 6, style }) => (
  <div className="n-skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />
);

const BOOT_PHASES = [
  { at: 0, label: 'verifying session' },
  { at: 30, label: 'waking the server' },
  { at: 65, label: 'almost there' },
  { at: 100, label: 'nearly ready' },
];

export default function AppBootSkeleton() {
  return (
    <div className="boot" role="status" aria-live="polite">
      <span className="sr-only">Loading your account…</span>

      {/* Sidebar ghost */}
      <aside className="boot-side" aria-hidden="true">
        <Bar w="60%" h={14} style={{ marginBottom: 22 }} />
        {[92, 74, 84, 66, 78, 70].map((w, i) => (
          <Bar key={i} w={`${w}%`} h={10} style={{ marginBottom: 12, opacity: 1 - i * 0.1 }} />
        ))}
      </aside>

      {/* Content ghost */}
      <main className="boot-main" aria-hidden="true">
        <Bar w={210} h={30} r={9} style={{ marginBottom: 26 }} />
        <div className="boot-cards">
          {[0, 1, 2].map(i => (
            <div key={i} className="boot-card">
              <Bar w="52%" h={9} style={{ marginBottom: 14 }} />
              <Bar w="72%" h={22} r={8} />
            </div>
          ))}
        </div>
        <Bar w="100%" h={190} r={16} style={{ marginTop: 22 }} />
      </main>

      {/* The wait, explained continuously rather than after the fact */}
      <div className="boot-loader">
        <ProgressiveFluxLoader phases={BOOT_PHASES} duration={16} />
      </div>
    </div>
  );
}

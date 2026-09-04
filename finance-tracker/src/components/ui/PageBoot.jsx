import { useEffect, useRef, useState } from 'react';

/**
 * PageBoot — Transitions.dev-style skeleton + blur reveal, wrapped around
 * every dashboard page (see AppLayout). On mount it shows a pulsing page
 * ghost; after `holdMs` it cross-fades to the real content (skeleton fades +
 * blurs out, content fades + un-blurs in), matching `.t-skel` in clario.css.
 */
function PageGhost() {
  return (
    <div className="pg-ghost" aria-hidden="true">
      <div className="pg-ghost-head">
        <div className="pg-ghost-b sm" style={{ width: 220 }} />
        <div className="pg-ghost-b sm" style={{ width: 110 }} />
      </div>
      <div className="pg-ghost-row">
        <div className="pg-ghost-b card" />
        <div className="pg-ghost-b card" />
        <div className="pg-ghost-b card" />
      </div>
      <div className="pg-ghost-row two">
        <div className="pg-ghost-b panel" />
        <div className="pg-ghost-b panel" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[92, 78, 84, 70].map((w, i) => <div key={i} className="pg-ghost-b line" style={{ width: `${w}%` }} />)}
      </div>
    </div>
  );
}

export default function PageBoot({ children, holdMs = 520, routeKey }) {
  const [revealed, setRevealed] = useState(false);
  const [mountSkel, setMountSkel] = useState(true);
  const t1 = useRef();
  const t2 = useRef();

  useEffect(() => {
    setRevealed(false);
    setMountSkel(true);
    // new page starts at the top
    const scroller = document.querySelector('.app-main > main');
    if (scroller) scroller.scrollTop = 0;
    // let the skeleton paint one frame, hold, then reveal
    t1.current = setTimeout(() => setRevealed(true), holdMs);
    // drop the skeleton from the DOM once its fade-out is done
    t2.current = setTimeout(() => setMountSkel(false), holdMs + 480);
    return () => { clearTimeout(t1.current); clearTimeout(t2.current); };
  }, [routeKey, holdMs]);

  return (
    <div className={`t-skel${revealed ? ' is-revealed' : ''}`}>
      {mountSkel && (
        <div className="t-skel-skeleton is-pulsing" role="status" aria-label="Loading">
          <PageGhost />
        </div>
      )}
      <div className="t-skel-content">{children}</div>
    </div>
  );
}

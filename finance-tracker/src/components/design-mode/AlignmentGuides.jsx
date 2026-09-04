/** Renders the temporary pink snap guide lines during a drag/resize. */
export default function AlignmentGuides({ lines }) {
  if (!lines || !lines.length) return null;
  return (
    <>
      {lines.map((l, i) =>
        l.axis === 'x' ? (
          <div key={i} className="dm-ui dm-guide dm-guide-v" style={{ left: l.pos, top: l.from, height: l.to - l.from }} />
        ) : (
          <div key={i} className="dm-ui dm-guide dm-guide-h" style={{ top: l.pos, left: l.from, width: l.to - l.from }} />
        ),
      )}
    </>
  );
}

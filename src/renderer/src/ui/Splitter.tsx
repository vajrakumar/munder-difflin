import { useCallback, useRef, useState, type ReactNode } from 'react';

export function Splitter({
  left,
  right,
  initial = 50
}: {
  left: ReactNode;
  right: ReactNode;
  initial?: number;
}): JSX.Element {
  const [pct, setPct] = useState(initial);
  const root = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !root.current) return;
    const rect = root.current.getBoundingClientRect();
    const next = ((e.clientX - rect.left) / rect.width) * 100;
    setPct(Math.min(80, Math.max(20, next)));
  }, []);

  return (
    <div className="paper-splitter" ref={root}>
      <div className="paper-splitter-pane" style={{ width: `${pct}%` }}>{left}</div>
      <div
        className="paper-splitter-handle"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(pct)}
        aria-label="Resize panes"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPct((p) => Math.max(20, p - 2));
          if (e.key === 'ArrowRight') setPct((p) => Math.min(80, p + 2));
        }}
      />
      <div className="paper-splitter-pane" style={{ flex: 1 }}>{right}</div>
    </div>
  );
}

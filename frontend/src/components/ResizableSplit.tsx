import { useEffect, useRef, useState, type ReactNode } from "react";
import { clampSplitRatio, DEFAULT_SPLIT_RATIO, MAX_SPLIT_RATIO, MIN_SPLIT_RATIO } from "../lib/marketplace";

const STORAGE_KEY = "marketplace.splitRatio.v1";

function initialRatio() {
  if (typeof window === "undefined") return DEFAULT_SPLIT_RATIO;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  return stored === null ? DEFAULT_SPLIT_RATIO : clampSplitRatio(Number(stored));
}

export function ResizableSplit({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(initialRatio);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, String(ratio));
  }, [ratio]);

  function updateFromPointer(clientX: number) {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    setRatio(clampSplitRatio(((clientX - bounds.left) / bounds.width) * 100));
  }

  return <div ref={containerRef} className={`split-layout${dragging ? " is-resizing" : ""}`}>
    <div className="split-primary" style={{ flexBasis: `${ratio}%` }}>{primary}</div>
    <div
      className="splitter"
      role="separator"
      aria-label="Resize repository and details panels"
      aria-orientation="vertical"
      aria-valuemin={MIN_SPLIT_RATIO}
      aria-valuemax={MAX_SPLIT_RATIO}
      aria-valuenow={Math.round(ratio)}
      tabIndex={0}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        updateFromPointer(event.clientX);
      }}
      onPointerMove={(event) => dragging && updateFromPointer(event.clientX)}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
      }}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") setRatio(value => clampSplitRatio(value - 2));
        else if (event.key === "ArrowRight") setRatio(value => clampSplitRatio(value + 2));
        else if (event.key === "Home") setRatio(MIN_SPLIT_RATIO);
        else if (event.key === "End") setRatio(MAX_SPLIT_RATIO);
        else return;
        event.preventDefault();
      }}
    >
      <span className="splitter-grip"><i/><i/><i/><i/><i/><i/></span>
      <span className="splitter-tooltip">Drag to resize</span>
    </div>
    <div className="split-secondary">{secondary}</div>
  </div>;
}

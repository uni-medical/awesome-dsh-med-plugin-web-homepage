import { useEffect, useRef, useState, type ReactNode } from "react";
import { clampSplitRatio, getResponsiveSplitBounds, MAX_SPLIT_RATIO, MIN_SPLIT_RATIO } from "../lib/marketplace";
import { useWorkspace } from "../state/WorkspaceContext";

export function ResizableSplit({ primary, secondary, closing = false, onClosed }: { primary: ReactNode; secondary: ReactNode; closing?: boolean; onClosed?: () => void }) {
  const { preferences, updatePreferences } = useWorkspace();
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const [ratio, setRatio] = useState(preferences.splitRatio);
  const [dragging, setDragging] = useState(false);
  const [entered, setEntered] = useState(false);
  const [bounds, setBounds] = useState({ min: MIN_SPLIT_RATIO, max: MAX_SPLIT_RATIO });
  const effectiveRatio = clampSplitRatio(ratio, bounds.min, bounds.max);
  const reduced = preferences.motion === "reduced" || (preferences.motion === "system" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => { const frame = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(frame); }, []);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setBounds(getResponsiveSplitBounds(entry.contentRect.width)));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (!preferences.rememberSplitRatio) setRatio(preferences.splitRatio); }, [preferences.rememberSplitRatio, preferences.splitRatio]);
  useEffect(() => {
    if (!closing) { completedRef.current = false; return; }
    if (reduced) { onClosed?.(); return; }
    const timeout = window.setTimeout(() => { if (!completedRef.current) { completedRef.current = true; onClosed?.(); } }, 470);
    return () => window.clearTimeout(timeout);
  }, [closing, onClosed, reduced]);

  function setNextRatio(next: number | ((value: number) => number)) {
    const value = clampSplitRatio(typeof next === "function" ? next(effectiveRatio) : next, bounds.min, bounds.max);
    setRatio(value);
    if (preferences.rememberSplitRatio) updatePreferences({ splitRatio: value });
  }
  function updateFromPointer(clientX: number) {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    setNextRatio(((clientX - bounds.left) / bounds.width) * 100);
  }
  function completeClose() {
    if (!closing || completedRef.current) return;
    completedRef.current = true;
    onClosed?.();
  }

  return <div ref={containerRef} className={`split-layout${dragging ? " is-resizing" : ""}${entered ? " has-entered" : ""}${closing ? " is-closing" : ""}${reduced ? " reduce-motion" : ""}`}>
    <div className="split-primary" style={{ flexBasis: `${entered && !closing ? effectiveRatio : 100}%` }} onTransitionEnd={event => { if (event.propertyName === "flex-basis") completeClose(); }}>{primary}</div>
    <div className="splitter" role="separator" aria-label="Resize repository and details panels" aria-orientation="vertical" aria-valuemin={bounds.min} aria-valuemax={bounds.max} aria-valuenow={Math.round(effectiveRatio)} aria-disabled={closing} tabIndex={closing ? -1 : 0}
      onPointerDown={event => { if (closing) return; event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); updateFromPointer(event.clientX); }}
      onPointerMove={event => dragging && !closing && updateFromPointer(event.clientX)}
      onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setDragging(false); }} onPointerCancel={() => setDragging(false)}
      onKeyDown={event => { if (closing) return; if (event.key === "ArrowLeft") setNextRatio(value => value - 2); else if (event.key === "ArrowRight") setNextRatio(value => value + 2); else if (event.key === "Home") setNextRatio(bounds.min); else if (event.key === "End") setNextRatio(bounds.max); else return; event.preventDefault(); }}>
      <span className="splitter-grip"><i/><i/><i/><i/><i/><i/></span><span className="splitter-tooltip">Drag to resize</span>
    </div><div className="split-secondary">{secondary}</div>
  </div>;
}

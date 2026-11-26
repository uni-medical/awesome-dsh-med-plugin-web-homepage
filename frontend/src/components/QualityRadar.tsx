import type { QualityAxis } from "../lib/components";
import { RADAR_MAX, radarPoint, radarPolygon } from "../lib/radar";

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 78;

export function QualityRadar({ axes, notReviewed }: { axes: QualityAxis[]; notReviewed: string }) {
  if (!axes.length) return null;
  const rings = Array.from({ length: RADAR_MAX }, (_, index) => index + 1);
  const scores = axes.map(axis => axis.score);
  const summary = axes.map(axis => `${axis.label} ${axis.score ?? notReviewed}`).join("，");
  return <svg className="quality-radar" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={summary}>
    {rings.map(ring => <polygon key={ring} className="radar-ring" points={radarPolygon(axes.map(() => ring), RADIUS, CENTER)}/>)}
    {axes.map((axis, index) => {
      const end = radarPoint(index, axes.length, RADAR_MAX, RADIUS, CENTER);
      return <line key={axis.key} className="radar-axis" x1={CENTER} y1={CENTER} x2={end.x} y2={end.y}/>;
    })}
    <polygon className="radar-shape" points={radarPolygon(scores, RADIUS, CENTER)}/>
    {axes.map((axis, index) => {
      const label = radarPoint(index, axes.length, RADAR_MAX + 1.45, RADIUS, CENTER);
      const anchor = Math.abs(label.x - CENTER) < 8 ? "middle" : label.x > CENTER ? "start" : "end";
      return <text key={axis.key} className={`radar-label${axis.score === null ? " is-missing" : ""}`} x={label.x} y={label.y} textAnchor={anchor} dominantBaseline="middle">{axis.label} {axis.score ?? notReviewed}</text>;
    })}
  </svg>;
}

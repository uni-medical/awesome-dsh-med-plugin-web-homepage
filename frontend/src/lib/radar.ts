export const RADAR_MAX = 5;

export interface RadarPoint { x: number; y: number; }

/** Vertex of axis `index` (of `count`) at `value` on a 0–RADAR_MAX scale; axis 0 points up. */
export function radarPoint(index: number, count: number, value: number, radius: number, center = 0): RadarPoint {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  const scaled = (Math.max(0, Math.min(RADAR_MAX, value)) / RADAR_MAX) * radius;
  return { x: center + Math.cos(angle) * scaled, y: center + Math.sin(angle) * scaled };
}

/** SVG `points` for a polygon; a missing score is left out rather than drawn as 0. */
export function radarPolygon(scores: readonly (number | null)[], radius: number, center = 0): string {
  return scores.flatMap((score, index) => {
    if (score === null) return [];
    const point = radarPoint(index, scores.length, score, radius, center);
    return [`${point.x.toFixed(1)},${point.y.toFixed(1)}`];
  }).join(" ");
}

/** Evenly spaced positions around a circle for the capability graph. */
export function ringPositions(count: number, radius: number, center: RadarPoint): RadarPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(count, 1);
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  });
}

const LINE_LENGTH = 16;

/** Up to two lines at word boundaries; the full name stays in the node's tooltip. */
export function wrapLabel(text: string, width = LINE_LENGTH): string[] {
  if (text.length <= width) return [text];
  const words = text.split(/(?<=[\s_-])/);
  let first = "";
  for (const word of words) {
    if ((first + word).length > width && first) break;
    first += word;
  }
  if (first.length > width) first = text.slice(0, width);
  const rest = text.slice(first.length).trim();
  return [first.trim(), rest.length > width ? `${rest.slice(0, width - 1).trimEnd()}…` : rest].filter(Boolean);
}

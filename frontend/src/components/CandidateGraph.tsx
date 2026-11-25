import { useState } from "react";
import type { CandidateGroup, Neighbour, NeighbourLink } from "../lib/capabilitySearch";
import { ringPositions, wrapLabel, type RadarPoint } from "../lib/radar";
import { useComponentCopy } from "../state/useComponentCopy";

const WIDTH = 860;
const HEIGHT = 600;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const INNER_RING = 140;
const OUTER_RING = 262;
const INNER_LIMIT = 6;

const nodeRadius = (group: CandidateGroup) => 9 + Math.min(9, Math.log2(group.members.length + 1) * 3);

function layout(count: number): RadarPoint[] {
  const inner = Math.min(count, INNER_LIMIT);
  const outer = count - inner;
  const innerPoints = ringPositions(inner, INNER_RING, CENTER);
  const outerPoints = ringPositions(outer, OUTER_RING, CENTER).map((point, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * (index + 0.5)) / Math.max(outer, 1);
    return outer > 1 ? { x: CENTER.x + Math.cos(angle) * OUTER_RING, y: CENTER.y + Math.sin(angle) * OUTER_RING * 0.86 } : point;
  });
  return [...innerPoints, ...outerPoints];
}

export function CandidateGraph({ selected, related, links, onSelect }: { selected: CandidateGroup; related: Neighbour[]; links: NeighbourLink[]; onSelect: (key: string) => void }) {
  const { c, types } = useComponentCopy();
  const [active, setActive] = useState<string | null>(null);
  const positions = layout(related.length);
  const position = new Map(related.map((item, index) => [item.group.key, positions[index]]));
  const activeItem = related.find(item => item.group.key === active);
  const dimmed = (key: string) => active !== null && active !== key;

  return <div className="candidate-graph-wrap">
    <svg className="candidate-graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={`${selected.name} · ${c.related}`}>
      <circle className="graph-halo" cx={CENTER.x} cy={CENTER.y} r={OUTER_RING + 30}/>
      <circle className="graph-ring" cx={CENTER.x} cy={CENTER.y} r={INNER_RING}/>
      {links.map(link => {
        const from = position.get(link.from);
        const to = position.get(link.to);
        if (!from || !to) return null;
        const highlighted = active === link.from || active === link.to;
        return <line key={`${link.from}|${link.to}`} className={`graph-link${link.sameRepository ? " is-repository" : ""}${highlighted ? " is-active" : ""}${active && !highlighted ? " is-dimmed" : ""}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>;
      })}
      {related.map(item => {
        const point = position.get(item.group.key)!;
        return <line key={item.group.key} className={`graph-edge${item.sameRepository.length ? " is-repository" : ""}${active === item.group.key ? " is-active" : ""}${dimmed(item.group.key) ? " is-dimmed" : ""}`} x1={CENTER.x} y1={CENTER.y} x2={point.x} y2={point.y} strokeWidth={1 + Math.min(1, item.similarity) * 2.5}/>;
      })}
      <g className="graph-centre">
        <title>{selected.name}</title>
        <circle cx={CENTER.x} cy={CENTER.y} r={66}/>
        {wrapLabel(selected.name, 14).map((line, index, lines) => <text key={line} x={CENTER.x} y={CENTER.y - 16 - (lines.length - 1) * 9 + index * 18} textAnchor="middle">{line}</text>)}
        <text className="graph-centre-sub" x={CENTER.x} y={CENTER.y + 14} textAnchor="middle">{types[selected.members[0].type]}</text>
        <text className="graph-centre-sub" x={CENTER.x} y={CENTER.y + 32} textAnchor="middle">{selected.members.length} {c.sourceRecords}</text>
      </g>
      {related.map((item, index) => {
        const { group } = item;
        const point = position.get(group.key)!;
        const radius = nodeRadius(group);
        // Inner-ring labels sit under the node so they do not run into the outer ring.
        const inner = index < INNER_LIMIT;
        const right = point.x >= CENTER.x - 4;
        const anchor = inner ? "middle" : right ? "start" : "end";
        const labelX = inner ? point.x : point.x + (right ? radius + 8 : -radius - 8);
        const lines = wrapLabel(group.name, inner ? 14 : 16);
        const labelY = (line: number) => inner ? point.y + radius + 14 + line * 15 : point.y - (lines.length - 1) * 8 + line * 16;
        return <g key={group.key} className={`graph-node${item.sameRepository.length ? " is-repository" : ""}${dimmed(group.key) ? " is-dimmed" : ""}`} role="button" tabIndex={0} aria-label={`${group.name}${item.sameRepository.length ? ` · ${c.sameRepository}` : ""}`}
          onClick={() => onSelect(group.key)} onMouseEnter={() => setActive(group.key)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(group.key)} onBlur={() => setActive(null)}
          onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(group.key); } }}>
          <title>{group.name}</title>
          <circle cx={point.x} cy={point.y} r={radius}/>
          {lines.map((line, lineIndex) => <text key={line} x={labelX} y={labelY(lineIndex)} textAnchor={anchor} dominantBaseline="middle">{line}</text>)}
          {group.members.length > 1 && <text className="graph-node-sub" x={labelX} y={labelY(lines.length - 1) + 16} textAnchor={anchor} dominantBaseline="middle">{group.members.length} {c.sourceRecords}</text>}
        </g>;
      })}
    </svg>
    <div className="graph-footer">
      <p className="graph-explain" aria-live="polite">{activeItem
        ? <><b>{activeItem.group.name}</b>{activeItem.sameRepository.length > 0 && <> · {c.sameRepository}：{activeItem.sameRepository.join("、")}</>}{activeItem.shared.length > 0 && <> · {c.sharedWords}：{activeItem.shared.join(" · ")}</>}</>
        : c.hoverHint}</p>
      <ul className="graph-legend">
        <li><i className="legend-repository" aria-hidden="true"/>{c.legendRepository}</li>
        <li><i className="legend-shared" aria-hidden="true"/>{c.legendShared}</li>
        <li><i className="legend-size" aria-hidden="true"/>{c.legendSize}</li>
      </ul>
    </div>
  </div>;
}

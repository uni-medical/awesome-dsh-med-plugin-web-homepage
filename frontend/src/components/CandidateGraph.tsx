import { useState } from "react";
import type { CandidateGroup, NeighbourLink } from "../lib/capabilitySearch";
import type { RelationType } from "../lib/components";
import { ringPositions, wrapLabel, type RadarPoint } from "../lib/radar";
import { useComponentCopy } from "../state/useComponentCopy";

const WIDTH = 860;
const HEIGHT = 600;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const INNER_RING = 140;
const OUTER_RING = 262;
const DEFAULT_INNER = 6;
const CENTRE_RADIUS = 66;

/** A node around the selected group: a catalogue relation (inner ring) or a search candidate (outer ring). */
export interface GraphNode {
  key: string;
  name: string;
  memberCount: number;
  kind: "catalogue" | "retrieval";
  relations: { type: RelationType; direction: "out" | "in" }[];
  sameRepository: string[];
  shared: string[];
  similarity: number;
}

const nodeRadius = (node: GraphNode) => 9 + Math.min(9, Math.log2(node.memberCount + 1) * 3);

function layout(count: number, inner: number): RadarPoint[] {
  const outer = count - inner;
  const innerPoints = ringPositions(inner, INNER_RING, CENTER);
  const outerPoints = Array.from({ length: outer }, (_, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * (index + 0.5)) / Math.max(outer, 1);
    return { x: CENTER.x + Math.cos(angle) * OUTER_RING, y: CENTER.y + Math.sin(angle) * OUTER_RING * 0.86 };
  });
  return [...innerPoints, ...outerPoints];
}

/** Line from the centre circle's edge to the node's edge, so arrowheads stay visible. */
function trimmedEdge(point: RadarPoint, radius: number) {
  const dx = point.x - CENTER.x;
  const dy = point.y - CENTER.y;
  const length = Math.hypot(dx, dy) || 1;
  const start = (CENTRE_RADIUS + 4) / length;
  const end = (radius + 4) / length;
  return { x1: CENTER.x + dx * start, y1: CENTER.y + dy * start, x2: point.x - dx * end, y2: point.y - dy * end };
}

export function CandidateGraph({ selected, nodes, links, onNode }: { selected: CandidateGroup; nodes: GraphNode[]; links: NeighbourLink[]; onNode: (node: GraphNode) => void }) {
  const { c, types, mechanisms, relations: relationLabels, e } = useComponentCopy();
  const [active, setActive] = useState<string | null>(null);
  const catalogueCount = nodes.filter(node => node.kind === "catalogue").length;
  const inner = catalogueCount > 0 ? catalogueCount : Math.min(nodes.length, DEFAULT_INNER);
  const positions = layout(nodes.length, inner);
  const position = new Map(nodes.map((node, index) => [node.key, positions[index]]));
  const activeNode = nodes.find(node => node.key === active);
  const dimmed = (key: string) => active !== null && active !== key;
  const relationText = (node: GraphNode) => node.relations.map(relation => relationLabels[relation.type][relation.direction]).join(" / ");

  return <div className="candidate-graph-wrap">
    <svg className="candidate-graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={`${selected.name} · ${c.related}`}>
      <defs>
        <marker id="graph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" className="graph-arrow"/></marker>
      </defs>
      <circle className="graph-halo" cx={CENTER.x} cy={CENTER.y} r={OUTER_RING + 30}/>
      <circle className="graph-ring" cx={CENTER.x} cy={CENTER.y} r={INNER_RING}/>
      {links.map(link => {
        const from = position.get(link.from);
        const to = position.get(link.to);
        if (!from || !to) return null;
        const highlighted = active === link.from || active === link.to;
        return <line key={`${link.from}|${link.to}`} className={`graph-link${link.sameRepository ? " is-repository" : ""}${highlighted ? " is-active" : ""}${active && !highlighted ? " is-dimmed" : ""}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>;
      })}
      {nodes.map(node => {
        const point = position.get(node.key)!;
        const state = `${active === node.key ? " is-active" : ""}${dimmed(node.key) ? " is-dimmed" : ""}`;
        if (node.kind === "catalogue") {
          const outgoing = node.relations.some(relation => relation.direction === "out");
          const incoming = node.relations.some(relation => relation.direction === "in");
          return <line key={node.key} className={`graph-edge is-catalogue relation-${node.relations[0].type}${state}`} {...trimmedEdge(point, nodeRadius(node))}
            markerEnd={outgoing ? "url(#graph-arrow)" : undefined} markerStart={incoming ? "url(#graph-arrow)" : undefined}/>;
        }
        return <line key={node.key} className={`graph-edge${node.sameRepository.length ? " is-repository" : ""}${state}`} x1={CENTER.x} y1={CENTER.y} x2={point.x} y2={point.y} strokeWidth={1 + Math.min(1, node.similarity) * 2.5}/>;
      })}
      <g className="graph-centre">
        <title>{selected.name}</title>
        <circle cx={CENTER.x} cy={CENTER.y} r={CENTRE_RADIUS}/>
        {wrapLabel(selected.name, 14).map((line, index, lines) => <text key={line} x={CENTER.x} y={CENTER.y - 16 - (lines.length - 1) * 9 + index * 18} textAnchor="middle">{line}</text>)}
        <text className="graph-centre-sub" x={CENTER.x} y={CENTER.y + 14} textAnchor="middle">{selected.members[0].mechanism ? mechanisms[selected.members[0].mechanism] : types[selected.members[0].type]}</text>
        <text className="graph-centre-sub" x={CENTER.x} y={CENTER.y + 32} textAnchor="middle">{selected.members.length} {c.sourceRecords}</text>
      </g>
      {nodes.map((node, index) => {
        const point = position.get(node.key)!;
        const radius = nodeRadius(node);
        const onInner = index < inner;
        const right = point.x >= CENTER.x - 4;
        const anchor = onInner ? "middle" : right ? "start" : "end";
        const labelX = onInner ? point.x : point.x + (right ? radius + 8 : -radius - 8);
        const lines = wrapLabel(node.name, onInner ? 14 : 16);
        const labelY = (line: number) => onInner ? point.y + radius + 14 + line * 15 : point.y - (lines.length - 1) * 8 + line * 16;
        const subtitle = node.kind === "catalogue" ? relationText(node) : node.memberCount > 1 ? `${node.memberCount} ${c.sourceRecords}` : "";
        return <g key={node.key} className={`graph-node is-${node.kind}${node.sameRepository.length ? " is-repository" : ""}${dimmed(node.key) ? " is-dimmed" : ""}${node.kind === "catalogue" ? ` relation-${node.relations[0].type}` : ""}`}
          role="button" tabIndex={0} aria-label={`${node.name}${node.kind === "catalogue" ? ` · ${relationText(node)}` : ""}`}
          onClick={() => onNode(node)} onMouseEnter={() => setActive(node.key)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(node.key)} onBlur={() => setActive(null)}
          onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onNode(node); } }}>
          <title>{node.name}</title>
          <circle cx={point.x} cy={point.y} r={radius}/>
          {lines.map((line, lineIndex) => <text key={line} x={labelX} y={labelY(lineIndex)} textAnchor={anchor} dominantBaseline="middle">{line}</text>)}
          {subtitle && <text className="graph-node-sub" x={labelX} y={labelY(lines.length - 1) + 16} textAnchor={anchor} dominantBaseline="middle">{subtitle}</text>}
        </g>;
      })}
    </svg>
    <div className="graph-footer">
      <p className="graph-explain" aria-live="polite">{activeNode
        ? <><b>{activeNode.name}</b>
          {activeNode.kind === "catalogue" && <> · {c.catalogueRelation}: {relationText(activeNode)}</>}
          {activeNode.sameRepository.length > 0 && <> · {c.sameRepository}: {activeNode.sameRepository.join(", ")}</>}
          {activeNode.shared.length > 0 && <> · {c.sharedWords}: {activeNode.shared.map(e).join(" · ")}</>}</>
        : c.hoverHint}</p>
      <ul className="graph-legend">
        <li><i className="legend-catalogue" aria-hidden="true"/>{c.legendCatalogue}</li>
        <li><i className="legend-repository" aria-hidden="true"/>{c.legendRepository}</li>
        <li><i className="legend-shared" aria-hidden="true"/>{c.legendShared}</li>
        <li><i className="legend-size" aria-hidden="true"/>{c.legendSize}</li>
      </ul>
    </div>
  </div>;
}

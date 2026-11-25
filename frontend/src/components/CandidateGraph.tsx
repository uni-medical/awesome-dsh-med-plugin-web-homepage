import type { CandidateGroup } from "../lib/capabilitySearch";
import { ringPositions } from "../lib/radar";
import { useComponentCopy } from "../state/useComponentCopy";

const WIDTH = 760;
const HEIGHT = 520;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const RING = 205;
const LABEL_LIMIT = 22;

const shorten = (text: string) => (text.length > LABEL_LIMIT ? `${text.slice(0, LABEL_LIMIT - 1)}…` : text);

export function CandidateGraph({ selected, related, onSelect }: { selected: CandidateGroup; related: { group: CandidateGroup; similarity: number }[]; onSelect: (key: string) => void }) {
  const { c, types } = useComponentCopy();
  const positions = ringPositions(related.length, RING, CENTER);
  const centreType = types[selected.members[0].type];
  return <svg className="candidate-graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={`${selected.name} · ${c.related}`}>
    <circle className="graph-halo" cx={CENTER.x} cy={CENTER.y} r={RING + 40}/>
    {positions.map((point, index) => <line key={related[index].group.key} className="graph-edge" x1={CENTER.x} y1={CENTER.y} x2={point.x} y2={point.y} strokeWidth={1 + related[index].similarity * 2}/>)}
    <g className="graph-centre">
      <circle cx={CENTER.x} cy={CENTER.y} r={64}/>
      <text x={CENTER.x} y={CENTER.y - 14} textAnchor="middle">{shorten(selected.name)}</text>
      <text className="graph-centre-sub" x={CENTER.x} y={CENTER.y + 8} textAnchor="middle">{centreType}</text>
      <text className="graph-centre-sub" x={CENTER.x} y={CENTER.y + 28} textAnchor="middle">{selected.members.length} {c.sourceRecords}</text>
    </g>
    {positions.map((point, index) => {
      const { group } = related[index];
      const right = point.x >= CENTER.x;
      return <g key={group.key} className="graph-node" role="button" tabIndex={0} aria-label={group.name}
        onClick={() => onSelect(group.key)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(group.key); } }}>
        <circle cx={point.x} cy={point.y} r={14}/>
        <text x={point.x + (right ? 22 : -22)} y={point.y} textAnchor={right ? "start" : "end"} dominantBaseline="middle">{shorten(group.name)}</text>
        {group.members.length > 1 && <text className="graph-node-sub" x={point.x + (right ? 22 : -22)} y={point.y + 17} textAnchor={right ? "start" : "end"}>{group.members.length} {c.sourceRecords}</text>}
      </g>;
    })}
  </svg>;
}

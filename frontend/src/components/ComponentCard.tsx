import type { ComponentSummary, RiskLevel } from "../lib/components";
import { useComponentCopy } from "../state/useComponentCopy";
import { useWorkspace } from "../state/WorkspaceContext";

export function RiskBadge({ level }: { level: RiskLevel | null }) {
  const { risks } = useComponentCopy();
  const key = level ?? "none";
  return <span className={`risk-badge risk-${key}`}><i aria-hidden="true"/>{risks[key]}</span>;
}

export function PlanToggle({ component, compact = false }: { component: Pick<ComponentSummary, "id" | "name" | "type" | "repo">; compact?: boolean }) {
  const { plan, togglePlan } = useWorkspace();
  const { c } = useComponentCopy();
  const inPlan = plan.some(item => item.id === component.id);
  const label = `${inPlan ? c.removeFromPlan : c.addToPlan}: ${component.name}`;
  return <button type="button" className={`plan-toggle${inPlan ? " is-active" : ""}${compact ? " is-compact" : ""}`} aria-pressed={inPlan} aria-label={label} title={label}
    onClick={event => { event.stopPropagation(); togglePlan(component); }}>
    {compact ? <span aria-hidden="true">{inPlan ? "✓" : "+"}</span> : <>{inPlan ? `✓ ${c.inPlan}` : c.addToPlan}</>}
  </button>;
}

/** The title button opens the detail; its ::after stretches over the card so the whole card is clickable. */
export function ComponentCard({ component, onOpen }: { component: ComponentSummary; onOpen: (id: string) => void }) {
  const { types } = useComponentCopy();
  const tag = component.tasks[0] ?? component.tags[0];
  return <article className="component-card">
    <div className="component-card-head">
      <h2><button type="button" className="component-open" data-entry-id={component.id} onClick={() => onOpen(component.id)}>{component.name}</button></h2>
      <PlanToggle component={component} compact/>
    </div>
    <p className="component-source"><b>{types[component.type]}</b> · {component.repo}</p>
    <p className="component-description">{component.description}</p>
    <div className="component-card-foot">{tag ? <span className="component-tag">{tag}</span> : <span/>}<RiskBadge level={component.risk}/></div>
  </article>;
}

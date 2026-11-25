import { useState } from "react";
import { formatPlan } from "../lib/plan";
import { useComponentCopy } from "../state/useComponentCopy";
import { useWorkspace } from "../state/WorkspaceContext";

export function PlanBar() {
  const { plan, removeFromPlan, clearPlan } = useWorkspace();
  const { c, types } = useComponentCopy();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatPlan(plan));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (reason) {
      console.error("Copying the plan failed", reason);
    }
  }

  return <aside className={`plan-bar${open ? " is-open" : ""}`} aria-label={c.plan}>
    {open && <div className="plan-list" id="plan-list">
      {plan.length ? <ol>{plan.map(item => <li key={item.id}><span><b>{item.name}</b><small>{types[item.type]} · {item.repo}</small></span><button type="button" onClick={() => removeFromPlan(item.id)} aria-label={`${c.remove}: ${item.name}`}>×</button></li>)}</ol> : <p>{c.planEmpty}</p>}
    </div>}
    <div className="plan-bar-row">
      <button type="button" className="plan-summary" aria-expanded={open} aria-controls="plan-list" onClick={() => setOpen(value => !value)}>
        <b>{c.plan}</b><span>{plan.length}</span><i aria-hidden="true">{open ? "▾" : "▴"}</i>
      </button>
      <div className="plan-actions">
        <button type="button" disabled={!plan.length} onClick={copy}>{copied ? c.copied : c.copyPlan}</button>
        <button type="button" disabled={!plan.length} onClick={() => { clearPlan(); setOpen(false); }}>{c.clearPlan}</button>
      </div>
    </div>
  </aside>;
}

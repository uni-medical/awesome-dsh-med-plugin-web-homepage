import { useState } from "react";
import { componentClient } from "../api/componentClient";
import { formatInstallScript, formatPlan } from "../lib/plan";
import { useComponentCopy } from "../state/useComponentCopy";
import { useWorkspace } from "../state/WorkspaceContext";

const STATUS_MS = 1600;
type CopyState = "idle" | "busy" | "list" | "install" | "failed";

export function PlanBar() {
  const { plan, removeFromPlan, clearPlan } = useWorkspace();
  const { c, types, locale } = useComponentCopy();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CopyState>("idle");

  async function copy(kind: "list" | "install") {
    setState("busy");
    try {
      let text = formatPlan(plan);
      if (kind === "install") {
        const details = await Promise.all(plan.map(item => componentClient.getDetail(item.id)));
        const installIds = new Map(plan.map((item, index) => [item.id, details[index]?.install?.entryId ?? null]));
        text = formatInstallScript(plan, installIds, locale);
      }
      await navigator.clipboard.writeText(text);
      setState(kind);
    } catch (reason) {
      console.error("Copying the plan failed", reason);
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), STATUS_MS);
  }

  return <aside className={`plan-bar${open ? " is-open" : ""}`} aria-label={c.plan}>
    {open && <div className="plan-list" id="plan-list">
      <p className="plan-hint">{c.planHint}</p>
      {plan.length ? <ol>{plan.map(item => <li key={item.id}><span><b>{item.name}</b><small>{types[item.type]} · {item.repo}</small></span><button type="button" onClick={() => removeFromPlan(item.id)} aria-label={`${c.remove}: ${item.name}`}>×</button></li>)}</ol> : <p>{c.planEmpty}</p>}
    </div>}
    <div className="plan-bar-row">
      <button type="button" className="plan-summary" aria-expanded={open} aria-controls="plan-list" onClick={() => setOpen(value => !value)}>
        <b>{c.plan}</b><span>{plan.length}</span><i aria-hidden="true">{open ? "▾" : "▴"}</i>
      </button>
      <div className="plan-actions" aria-live="polite">
        <button type="button" disabled={!plan.length || state === "busy"} onClick={() => copy("install")}>{state === "busy" ? c.preparing : state === "install" ? c.copied : state === "failed" ? c.copyFailed : c.copyInstall}</button>
        <button type="button" disabled={!plan.length || state === "busy"} onClick={() => copy("list")}>{state === "list" ? c.copied : c.copyPlan}</button>
        <button type="button" disabled={!plan.length} onClick={() => { clearPlan(); setOpen(false); }}>{c.clearPlan}</button>
      </div>
    </div>
  </aside>;
}

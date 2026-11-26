import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { componentClient } from "../api/componentClient";
import { MAX_PLAN_FILE_BYTES, MAX_SHARE_URL_LENGTH, PLAN_PARAM, decodePlanShare, exportPlanFile, formatInstallScript, formatPlan, mergePlans, parsePlanFile, resolvePlanIds, sharePlanUrl, type PlanItem } from "../lib/plan";
import { useComponentCopy } from "../state/useComponentCopy";
import { useComponents } from "../state/useComponents";
import { useWorkspace } from "../state/WorkspaceContext";

const STATUS_MS = 1600;
type CopyState = "idle" | "busy" | "list" | "install" | "share" | "failed";
interface PendingImport { ids: string[]; items: PlanItem[]; missing: number; }

/** Confirms an incoming plan (share link or file) before it touches the stored plan. */
function ImportBanner({ pending, onReplace, onMerge, onDismiss }: { pending: PendingImport; onReplace: () => void; onMerge: () => void; onDismiss: () => void }) {
  const { c, formatNumber } = useComponentCopy();
  return <div className="plan-import" role="alertdialog" aria-labelledby="plan-import-title">
    <p id="plan-import-title"><b>{c.importTitle}</b> {formatNumber(pending.items.length)} {c.importComponents}{pending.missing > 0 && <> · {formatNumber(pending.missing)} {c.importMissing}</>}</p>
    {pending.items.length > 0 && <ul>{pending.items.slice(0, 6).map(item => <li key={item.id}>{item.name}</li>)}{pending.items.length > 6 && <li>…</li>}</ul>}
    <div className="plan-actions">
      {pending.items.length > 0 && <button type="button" onClick={onMerge}>{c.importMerge}</button>}
      {pending.items.length > 0 && <button type="button" onClick={onReplace}>{c.importReplace}</button>}
      <button type="button" onClick={onDismiss}>{c.importDismiss}</button>
    </div>
  </div>;
}

export function PlanBar() {
  const { plan, removeFromPlan, clearPlan, replacePlan } = useWorkspace();
  const { c, types, locale } = useComponentCopy();
  const { byId, loading } = useComponents();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CopyState>("idle");
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [tooLong, setTooLong] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // A share link carries the plan in ?plan=…; take it out of the URL and ask before importing.
  const shared = params.get(PLAN_PARAM);
  useEffect(() => {
    if (shared === null) return;
    const ids = decodePlanShare(shared);
    if (ids.length) setPendingIds(ids); else setInvalid(true);
    setParams(current => { const next = new URLSearchParams(current); next.delete(PLAN_PARAM); return next; }, { replace: true });
  }, [shared, setParams]);

  const pending: PendingImport | null = pendingIds && !loading ? (() => {
    const resolved = resolvePlanIds(pendingIds, byId);
    return { ids: pendingIds, items: resolved.items, missing: resolved.missing.length };
  })() : null;

  function finish(next: CopyState) {
    setState(next);
    window.setTimeout(() => setState("idle"), STATUS_MS);
  }

  async function copy(kind: "list" | "install" | "share") {
    setState("busy");
    try {
      let text = formatPlan(plan);
      if (kind === "share") {
        text = sharePlanUrl(plan, window.location.origin, import.meta.env.BASE_URL);
        if (text.length > MAX_SHARE_URL_LENGTH) { setState("idle"); setTooLong(true); return; }
      }
      if (kind === "install") {
        const details = await Promise.all(plan.map(item => componentClient.getDetail(item.id)));
        const formalIds = new Set(plan.filter((_, index) => details[index]?.install?.formalInventory).map(item => item.id));
        text = formatInstallScript(plan, new Map(plan.map((item, index) => [item.id, details[index]?.install?.entryId ?? null])), locale, formalIds);
      }
      await navigator.clipboard.writeText(text);
      finish(kind);
    } catch (reason) {
      console.error("Copying the plan failed", reason);
      finish("failed");
    }
  }

  function exportFile() {
    const url = URL.createObjectURL(new Blob([exportPlanFile(plan)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `medical-component-plan-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PLAN_FILE_BYTES) { setInvalid(true); return; }
    try {
      const ids = parsePlanFile(await file.text());
      if (ids.length) { setPendingIds(ids); setInvalid(false); } else setInvalid(true);
    } catch (reason) {
      console.error("Reading the plan file failed", reason);
      setInvalid(true);
    }
  }

  const label = (kind: CopyState, idle: string) => (state === kind ? c.copied : state === "failed" ? c.copyFailed : idle);

  return <aside className={`plan-bar${open ? " is-open" : ""}`} aria-label={c.plan}>
    {pending && <ImportBanner pending={pending}
      onMerge={() => { replacePlan(mergePlans(plan, pending.items)); setPendingIds(null); setOpen(true); }}
      onReplace={() => { replacePlan(pending.items); setPendingIds(null); setOpen(true); }}
      onDismiss={() => setPendingIds(null)}/>}
    {invalid && <div className="plan-import" role="alert"><p>{c.importInvalid}</p><div className="plan-actions"><button type="button" onClick={() => setInvalid(false)}>{c.close}</button></div></div>}
    {open && <div className="plan-list" id="plan-list">
      <p className="plan-hint">{c.planHint} {c.transferHint}</p>
      {tooLong && <p className="panel-warning">{c.shareTooLong}</p>}
      {plan.length ? <ol>{plan.map(item => <li key={item.id}><span><b>{item.name}</b><small>{types[item.type]} · {item.repo}</small></span><button type="button" onClick={() => removeFromPlan(item.id)} aria-label={`${c.remove}: ${item.name}`}>×</button></li>)}</ol> : <p>{c.planEmpty}</p>}
      <div className="plan-actions plan-transfer">
        <button type="button" disabled={!plan.length || state === "busy"} onClick={() => copy("share")}>{label("share", c.sharePlan)}</button>
        <button type="button" disabled={!plan.length} onClick={exportFile}>{c.exportPlan}</button>
        <button type="button" onClick={() => fileInput.current?.click()}>{c.importPlan}</button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importFile}/>
      </div>
    </div>}
    <div className="plan-bar-row">
      <button type="button" className="plan-summary" aria-expanded={open} aria-controls="plan-list" onClick={() => setOpen(value => !value)}>
        <b>{c.plan}</b><span>{plan.length}</span><i aria-hidden="true">{open ? "▾" : "▴"}</i>
      </button>
      <div className="plan-actions" aria-live="polite">
        <button type="button" disabled={!plan.length || state === "busy"} onClick={() => copy("install")}>{state === "busy" ? c.preparing : label("install", c.copyInstall)}</button>
        <button type="button" disabled={!plan.length || state === "busy"} onClick={() => copy("list")}>{label("list", c.copyPlan)}</button>
        <button type="button" disabled={!plan.length} onClick={() => { clearPlan(); setOpen(false); }}>{c.clearPlan}</button>
      </div>
    </div>
  </aside>;
}

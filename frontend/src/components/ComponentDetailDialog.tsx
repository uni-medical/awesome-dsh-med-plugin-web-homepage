import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ComponentCapability, ComponentDetail, EvaluationCard } from "../lib/components";
import { useComponentCopy } from "../state/useComponentCopy";
import { useComponentDetail } from "../state/useComponents";
import { PlanToggle } from "./ComponentCard";
import { QualityRadar } from "./QualityRadar";

type Copy = ReturnType<typeof useComponentCopy>["c"];

function Panel({ title, className = "", children }: { title: string; className?: string; children: ReactNode }) {
  return <section className={`detail-panel ${className}`}><h3>{title}</h3>{children}</section>;
}

function Chips({ values }: { values: string[] }) {
  return values.length ? <div className="detail-chips">{values.map(value => <span key={value}>{value}</span>)}</div> : null;
}

function RiskPanel({ card, c }: { card: EvaluationCard; c: Copy }) {
  return <Panel title={c.risk} className={`risk-panel risk-${card.risk.level}`}>
    <p className="panel-verdict">{card.risk.verdict}</p>
    {card.risk.subcategory && <p className="panel-sub">{card.risk.subcategory}</p>}
    {card.risk.lines.length > 0 && <ul className="panel-lines">{card.risk.lines.map(line => <li key={line}>{line}</li>)}</ul>}
    {card.risk.threats.length > 0 && <div className="panel-field"><span>{c.threats}</span><Chips values={card.risk.threats.map(threat => threat.subLabels.length ? `${threat.type}：${threat.subLabels.join("、")}` : threat.type)}/></div>}
    <div className="panel-field"><span>{c.compatibility}</span><p>{card.compatibility.label}</p></div>
    {card.compatibility.warnings.length > 0 && <ul className="panel-lines">{card.compatibility.warnings.map(line => <li key={line}>{line}</li>)}</ul>}
    <p className="panel-note">{c.disclaimer}</p>
  </Panel>;
}

function FunctionPanel({ card, c }: { card: EvaluationCard; c: Copy }) {
  const fn = card.function;
  return <Panel title={c.function}>
    {fn.status === "ok" ? <p className="panel-verdict is-neutral">{[fn.primary, fn.secondary].filter(Boolean).join(" · ")}</p> : <p className="panel-verdict is-muted">{c.notReviewed}</p>}
    <Chips values={fn.subLabels}/>
    {Object.entries(card.behaviour).map(([group, labels]) => <div className="panel-field" key={group}><span>{group}</span><p>{labels.join("、")}</p></div>)}
  </Panel>;
}

function QualityPanel({ card, c }: { card: EvaluationCard; c: Copy }) {
  const cost = card.quality.find(axis => axis.key === "cost");
  const sources = [...new Set(card.quality.map(axis => axis.source))];
  return <Panel title={c.quality} className="quality-panel">
    <div className="quality-layout">
      <QualityRadar axes={card.quality} notReviewed={c.notReviewed}/>
      <div className="quality-notes">
        <p className="panel-sub">{c.qualityScale} · {sources.join(" / ")}</p>
        {cost && <>
          <p className="quality-cost">{cost.label} · {cost.score === null ? c.notReviewed : `${cost.score} / 5`}</p>
          {cost.reason && <p>{cost.reason}</p>}
          {cost.source && <p className="panel-sub">{c.source} {cost.source}</p>}
          {cost.drivers && cost.drivers.length > 0 && <ul className="panel-lines">{cost.drivers.map(driver => <li key={driver}>{driver}</li>)}</ul>}
        </>}
      </div>
    </div>
    <details className="panel-more"><summary>{c.axisSources}</summary>
      <dl>{card.quality.map(axis => <div key={axis.key}><dt>{axis.label}</dt><dd>{axis.score ?? c.notReviewed} · {axis.source}{axis.notes?.length ? ` · ${axis.notes.join("；")}` : ""}</dd></div>)}</dl>
    </details>
  </Panel>;
}

function CapabilityBlock({ capability, c }: { capability: ComponentCapability; c: Copy }) {
  return <div className="capability-block">
    <h4>{capability.task || capability.subdomain}</h4>
    <p className="panel-sub">{[capability.domain, capability.subdomain].filter(Boolean).join(" / ")}</p>
    {(capability.inputs.length > 0 || capability.outputs.length > 0) && <div className="capability-io">
      <div><span>{c.inputs}</span>{capability.inputs.length ? capability.inputs.map(value => <p key={value}>{value}</p>) : <p className="is-muted">—</p>}</div>
      <b aria-hidden="true">→</b>
      <div><span>{c.outputs}</span>{capability.outputs.length ? capability.outputs.map(value => <p key={value}>{value}</p>) : <p className="is-muted">—</p>}</div>
    </div>}
    {capability.databases.length > 0 && <div className="panel-field"><span>{c.databases}</span><Chips values={capability.databases}/></div>}
  </div>;
}

function RawFields({ detail, c }: { detail: ComponentDetail; c: Copy }) {
  return <details className="panel-more"><summary>{c.rawFields}</summary><dl>
    <div><dt>ID</dt><dd><code>{detail.id}</code></dd></div>
    <div><dt>{c.provider}</dt><dd><code>{detail.provider}</code></dd></div>
    <div><dt>{c.sourceFile}</dt><dd><a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer">{detail.sourceName} ↗</a></dd></div>
    <div><dt>{c.license}</dt><dd>{detail.license ?? "—"}</dd></div>
    <div><dt>{c.callable}</dt><dd>{detail.callable ? c.yes : c.no}</dd></div>
    {detail.aliases.length > 0 && <div><dt>{c.aliases}</dt><dd>{detail.aliases.join("、")}</dd></div>}
    {detail.link.cardUnitId && <div><dt>{c.evaluationCard}</dt><dd><code>{detail.link.cardUnitId}</code></dd></div>}
  </dl></details>;
}

function MedicalPanel({ detail, card, c }: { detail: ComponentDetail; card: EvaluationCard | null; c: Copy }) {
  const medical = card?.medical;
  return <Panel title={card ? c.medical : c.capabilities} className="medical-panel">
    {medical && <>
      {medical.rejectedAll && <p className="panel-warning">{c.rejectedAll}</p>}
      {medical.noMedicalContent && <p className="panel-verdict is-muted">{c.medicalNone}{medical.noneReason ? `：${medical.noneReason}` : ""}</p>}
      {Object.entries(medical.groups).map(([group, items]) => <div className="medical-group" key={group}>
        <h4>{group}</h4>
        {items.map(item => <div className="medical-item" key={`${item.code}-${item.text}`}><p>{item.text}</p><small>{item.code} · {item.label}{item.evidence.length ? ` · ${item.evidence.join("，")}` : ""}</small></div>)}
      </div>)}
      {medical.audience && <p className="panel-sub">{c.audience} {medical.audience}{medical.expertReview ? ` · ${c.expertReview}` : ""}</p>}
      {medical.authorStatements.length > 0 && <div className="panel-field"><span>{c.authorStatements}</span>{medical.authorStatements.map(item => <p key={item.text}>{item.text}</p>)}</div>}
    </>}
    {detail.capabilities.map((capability, index) => <CapabilityBlock key={`${capability.task}-${index}`} capability={capability} c={c}/>)}
    <RawFields detail={detail} c={c}/>
    {medical?.undetermined && <details className="panel-more"><summary>{c.undetermined}</summary><p>{medical.undetermined}</p></details>}
  </Panel>;
}

function NoEvaluationPanel({ detail, c }: { detail: ComponentDetail; c: Copy }) {
  return <Panel title={c.risk} className="risk-panel risk-none">
    <p className="panel-verdict is-muted">{c.noEvaluation}</p>
    <p>{detail.link.status === "ambiguous" ? c.ambiguousText : c.noEvaluationText}</p>
  </Panel>;
}

function DetailBody({ detail, c }: { detail: ComponentDetail; c: Copy }) {
  const card = detail.evaluation;
  return <div className="detail-grid">
    <Panel title={c.info} className="info-panel">
      <p className="info-description">{detail.description}</p>
      <div className="panel-field"><span>{c.source}</span><p><a href={detail.repositoryUrl} target="_blank" rel="noopener noreferrer">{detail.repo} ↗</a></p></div>
      <Chips values={detail.tags}/>
    </Panel>
    {card ? <RiskPanel card={card} c={c}/> : <NoEvaluationPanel detail={detail} c={c}/>}
    {card && <FunctionPanel card={card} c={c}/>}
    {card && <QualityPanel card={card} c={c}/>}
    <MedicalPanel detail={detail} card={card} c={c}/>
    {card && <div className="detail-footer">{card.footer.map(line => <p key={line}>{line}</p>)}{card.review.rejectedClaims > 0 && <p>{card.review.rejectedClaims} {c.rejectedClaims}</p>}</div>}
  </div>;
}

export function ComponentDetailDialog({ entryId, onClose, showMapLink = true }: { entryId: string | null; onClose: () => void; showMapLink?: boolean }) {
  const { c, types } = useComponentCopy();
  const { detail, loading, error, missing } = useComponentDetail(entryId);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (entryId && !dialog.open) dialog.showModal();
    if (!entryId && dialog.open) dialog.close();
  }, [entryId]);

  useEffect(() => { ref.current?.querySelector(".component-dialog-body")?.scrollTo({ top: 0 }); }, [detail?.id]);

  return <dialog ref={ref} className="component-dialog" aria-labelledby="component-dialog-title" onClose={() => { if (entryId) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    {entryId && <div className="component-dialog-frame">
      <div className="component-dialog-header">
        <div>
          <h2 id="component-dialog-title">{detail?.name ?? (loading ? c.detailLoading : entryId)}</h2>
          {detail && <p><b>{types[detail.type]}</b> · {detail.repo}</p>}
        </div>
        <div className="component-dialog-actions">
          {detail && showMapLink && <Link className="dialog-secondary" to={`/graph?focus=${encodeURIComponent(detail.id)}`}>{c.openMap} ↗</Link>}
          {detail && <PlanToggle component={detail}/>}
          <button type="button" className="dialog-close" onClick={onClose} aria-label={c.close}>×</button>
        </div>
      </div>
      <div className="component-dialog-body" aria-busy={loading}>
        {loading && <p className="dialog-status" role="status">{c.detailLoading}</p>}
        {error && <p className="dialog-status" role="alert">{c.detailError}</p>}
        {missing && <p className="dialog-status" role="status">{c.detailMissing}</p>}
        {detail && <DetailBody detail={detail} c={c}/>}
      </div>
    </div>}
  </dialog>;
}

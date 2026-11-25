import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ComponentCapability, ComponentDetail, ComponentRelation, ComponentSummary, EvaluationCard } from "../lib/components";
import { useComponentCopy } from "../state/useComponentCopy";
import { useComponentDetail, useComponents } from "../state/useComponents";
import { PlanToggle, RiskBadge } from "./ComponentCard";
import { CopyBlock } from "./CopyBlock";
import { QualityRadar } from "./QualityRadar";

type Copy = ReturnType<typeof useComponentCopy>;

const SETUP_GUIDE_URL = "https://github.com/uni-medical/awesome-dsh-med-plugin/blob/integrate/README.metaharness.zh.md";
const RELATION_PREVIEW = 8;
const quote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;

function Panel({ title, className = "", children }: { title: string; className?: string; children: ReactNode }) {
  return <section className={`detail-panel ${className}`}><h3>{title}</h3>{children}</section>;
}

function Chips({ values }: { values: string[] }) {
  return values.length ? <div className="detail-chips">{values.map(value => <span key={value}>{value}</span>)}</div> : null;
}

function InfoPanel({ detail, copy }: { detail: ComponentDetail; copy: Copy }) {
  const { c } = copy;
  return <Panel title={c.info} className="info-panel">
    <p className="info-description">{detail.description}</p>
    <div className="panel-field"><span>{c.source}</span><p><a href={detail.repositoryUrl} target="_blank" rel="noopener noreferrer">{detail.repo} ↗</a></p></div>
    <Chips values={detail.tags}/>
    {c.upstreamEnglish && <p className="panel-note">{c.upstreamEnglish}</p>}
  </Panel>;
}

function InstallPanel({ detail, copy }: { detail: ComponentDetail; copy: Copy }) {
  const { c } = copy;
  const install = detail.install;
  const requirementLabels: Record<string, string> = { configuration: c.requiresConfiguration, runtime: c.requiresRuntime, resource: c.requiresResource };
  return <Panel title={c.install} className="install-panel">
    {install ? <>
      <CopyBlock label={c.install} text={`dsh-med inspect ${quote(install.entryId)}\ndsh-med install ${quote(install.entryId)} --profile medical`}/>
      <div className="panel-field"><span>{c.entryId}</span><CopyBlock label={c.entryId} text={install.entryId} inline/></div>
      {install.installability !== "ready" && <p className="panel-warning">{c.installNotReady}</p>}
      {install.trust === "candidate" && <p className="panel-warning">{c.installCandidate}</p>}
      {install.requires.length > 0 && <ul className="panel-lines">{install.requires.map(kind => <li key={kind}>{requirementLabels[kind] ?? kind}</li>)}</ul>}
      <p className="panel-note">{c.installNote} <a href={SETUP_GUIDE_URL} target="_blank" rel="noopener noreferrer">{c.installGuide} ↗</a></p>
    </> : <p className="panel-note">{c.installUnavailable}</p>}
    <div className="panel-field"><span>{c.source}</span><CopyBlock label={c.source} text={`git clone ${detail.repositoryUrl}.git`} inline/></div>
  </Panel>;
}

function RiskPanel({ card, copy }: { card: EvaluationCard; copy: Copy }) {
  const { c, e } = copy;
  return <Panel title={c.risk} className={`risk-panel risk-${card.risk.level}`}>
    <p className="panel-verdict">{e(card.risk.verdict)}</p>
    {card.risk.subcategory && <p className="panel-sub">{e(card.risk.subcategory)}</p>}
    {card.risk.lines.length > 0 && <ul className="panel-lines">{card.risk.lines.map(line => <li key={line}>{e(line)}</li>)}</ul>}
    {card.risk.threats.length > 0 && <div className="panel-field"><span>{c.threats}</span><Chips values={card.risk.threats.map(threat => threat.subLabels.length ? `${e(threat.type)}: ${threat.subLabels.map(e).join(", ")}` : e(threat.type))}/></div>}
    <div className="panel-field"><span>{c.compatibility}</span><p>{e(card.compatibility.label)}</p></div>
    {card.compatibility.warnings.length > 0 && <ul className="panel-lines">{card.compatibility.warnings.map(line => <li key={line}>{e(line)}</li>)}</ul>}
    <p className="panel-note">{c.disclaimer}</p>
  </Panel>;
}

function FunctionPanel({ card, copy }: { card: EvaluationCard; copy: Copy }) {
  const { c, e } = copy;
  const fn = card.function;
  return <Panel title={c.function}>
    {fn.status === "ok" ? <p className="panel-verdict is-neutral">{[fn.primary, fn.secondary].filter((value): value is string => Boolean(value)).map(e).join(" · ")}</p> : <p className="panel-verdict is-muted">{c.notReviewed}</p>}
    <Chips values={fn.subLabels.map(e)}/>
    {Object.entries(card.behaviour).map(([group, labels]) => <div className="panel-field" key={group}><span>{e(group)}</span><p>{labels.map(e).join(", ")}</p></div>)}
  </Panel>;
}

function QualityPanel({ card, copy }: { card: EvaluationCard; copy: Copy }) {
  const { c, e } = copy;
  const axes = card.quality.map(axis => ({ ...axis, label: e(axis.label) }));
  const cost = axes.find(axis => axis.key === "cost");
  const sources = [...new Set(card.quality.map(axis => e(axis.source)))];
  return <Panel title={c.quality} className="quality-panel">
    <div className="quality-layout">
      <QualityRadar axes={axes} notReviewed={c.notReviewed}/>
      <div className="quality-notes">
        <p className="panel-sub">{c.qualityScale} · {sources.join(" / ")}</p>
        {cost && <>
          <p className="quality-cost">{cost.label} · {cost.score === null ? c.notReviewed : `${cost.score} / 5`}</p>
          {cost.reason && <p>{e(cost.reason)}</p>}
          {cost.drivers && cost.drivers.length > 0 && <ul className="panel-lines">{cost.drivers.map(driver => <li key={driver}>{e(driver)}</li>)}</ul>}
        </>}
      </div>
    </div>
    <details className="panel-more"><summary>{c.axisSources}</summary>
      <dl>{axes.map(axis => <div key={axis.key}><dt>{axis.label}</dt><dd>{axis.score ?? c.notReviewed} · {e(axis.source)}{axis.notes?.length ? ` · ${axis.notes.map(e).join("; ")}` : ""}</dd></div>)}</dl>
    </details>
  </Panel>;
}

function RelationsPanel({ relations, byId, onOpen, copy }: { relations: ComponentRelation[]; byId: Map<string, ComponentSummary>; onOpen: (id: string) => void; copy: Copy }) {
  const { c, types, relations: labels } = copy;
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? relations : relations.slice(0, RELATION_PREVIEW);
  return <Panel title={`${c.relatedComponents} · ${relations.length}`} className="relations-panel">
    <ul className="relation-list">{shown.map((relation, index) => {
      const other = byId.get(relation.otherId);
      return <li key={`${relation.type}-${relation.direction}-${relation.otherId}-${index}`}>
        <span className={`relation-type relation-${relation.type}`}>{labels[relation.type][relation.direction]}</span>
        <div>
          <button type="button" className="text-button" onClick={() => onOpen(relation.otherId)}>{other?.name ?? relation.otherId}</button>
          {other && <small>{types[other.type]} · {other.repo}</small>}
          {relation.condition && <p lang="zh-CN">{relation.condition}</p>}
        </div>
        {other && <RiskBadge level={other.risk}/>}
      </li>;
    })}</ul>
    {relations.length > RELATION_PREVIEW && <button type="button" className="text-button" onClick={() => setExpanded(value => !value)}>{expanded ? "−" : `+ ${relations.length - RELATION_PREVIEW} ${c.relationsMore}`}</button>}
    <p className="panel-note">{c.relationsSource}</p>
  </Panel>;
}

function CapabilityBlock({ capability, c }: { capability: ComponentCapability; c: Copy["c"] }) {
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

function RawFields({ detail, c }: { detail: ComponentDetail; c: Copy["c"] }) {
  return <details className="panel-more"><summary>{c.rawFields}</summary><dl>
    <div><dt>ID</dt><dd><code>{detail.id}</code></dd></div>
    <div><dt>{c.provider}</dt><dd><code>{detail.provider}</code></dd></div>
    <div><dt>{c.sourceFile}</dt><dd><a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer">{detail.sourceName} ↗</a></dd></div>
    <div><dt>{c.license}</dt><dd>{detail.license ?? "—"}</dd></div>
    <div><dt>{c.callable}</dt><dd>{detail.callable ? c.yes : c.no}</dd></div>
    {detail.aliases.length > 0 && <div><dt>{c.aliases}</dt><dd>{detail.aliases.join(", ")}</dd></div>}
    {detail.link.cardUnitId && <div><dt>{c.evaluationCard}</dt><dd><code>{detail.link.cardUnitId}</code></dd></div>}
  </dl></details>;
}

function MedicalPanel({ detail, card, copy }: { detail: ComponentDetail; card: EvaluationCard | null; copy: Copy }) {
  const { c, e } = copy;
  const medical = card?.medical;
  return <Panel title={card ? c.medical : c.capabilities} className="medical-panel">
    {medical && <>
      {medical.rejectedAll && <p className="panel-warning">{c.rejectedAll}</p>}
      {medical.noMedicalContent && <p className="panel-verdict is-muted">{c.medicalNone}{medical.noneReason ? `: ${medical.noneReason}` : ""}</p>}
      {Object.entries(medical.groups).map(([group, items]) => <div className="medical-group" key={group}>
        <h4>{e(group)}</h4>
        {items.map(item => <div className="medical-item" key={`${item.code}-${item.text}`}><p lang="zh-CN">{item.text}</p><small>{item.code} · {e(item.label)}{item.evidence.length ? ` · ${item.evidence.join(", ")}` : ""}</small></div>)}
      </div>)}
      {c.originalChinese && Object.keys(medical.groups).length > 0 && <p className="panel-note">{c.originalChinese}</p>}
      {medical.audience && <p className="panel-sub">{c.audience}: {e(medical.audience)}{medical.expertReview ? ` · ${c.expertReview}` : ""}</p>}
      {medical.authorStatements.length > 0 && <div className="panel-field"><span>{c.authorStatements}</span>{medical.authorStatements.map(item => <p key={item.text}>{item.text}</p>)}</div>}
    </>}
    {detail.capabilities.map((capability, index) => <CapabilityBlock key={`${capability.task}-${index}`} capability={capability} c={c}/>)}
    <RawFields detail={detail} c={c}/>
    {medical?.undetermined && <details className="panel-more"><summary>{c.undetermined}</summary><p>{e(medical.undetermined)}</p></details>}
  </Panel>;
}

function NoEvaluationPanel({ detail, c }: { detail: ComponentDetail; c: Copy["c"] }) {
  return <Panel title={c.risk} className="risk-panel risk-none">
    <p className="panel-verdict is-muted">{c.noEvaluation}</p>
    <p>{detail.link.status === "ambiguous" ? c.ambiguousText : c.noEvaluationText}</p>
  </Panel>;
}

/** Order follows what a visitor needs: what it is and how to install it, then whether it is safe and fit, then the details. */
function DetailBody({ detail, byId, onOpen, copy }: { detail: ComponentDetail; byId: Map<string, ComponentSummary>; onOpen: (id: string) => void; copy: Copy }) {
  const card = detail.evaluation;
  const { c, e } = copy;
  return <div className="detail-grid">
    <InfoPanel detail={detail} copy={copy}/>
    <InstallPanel detail={detail} copy={copy}/>
    {card ? <RiskPanel card={card} copy={copy}/> : <NoEvaluationPanel detail={detail} c={c}/>}
    {card && <FunctionPanel card={card} copy={copy}/>}
    {card && <QualityPanel card={card} copy={copy}/>}
    {detail.relations.length > 0 && <RelationsPanel relations={detail.relations} byId={byId} onOpen={onOpen} copy={copy}/>}
    <MedicalPanel detail={detail} card={card} copy={copy}/>
    {card && <div className="detail-footer">{card.footer.map(line => <p key={line}>{e(line)}</p>)}{card.review.rejectedClaims > 0 && <p>{card.review.rejectedClaims} {c.rejectedClaims}</p>}</div>}
  </div>;
}

export function ComponentDetailDialog({ entryId, onClose, onOpen, showMapLink = true, showMarketLink = false }: { entryId: string | null; onClose: () => void; onOpen: (id: string) => void; showMapLink?: boolean; showMarketLink?: boolean }) {
  const copy = useComponentCopy();
  const { c, types } = copy;
  const { detail, loading, error, missing } = useComponentDetail(entryId);
  const { byId } = useComponents();
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
          {detail && showMarketLink && <Link className="dialog-secondary" to={`/marketplace?q=${encodeURIComponent(detail.name)}&entry=${encodeURIComponent(detail.id)}`}>{c.openInEcosystem} ↗</Link>}
          {detail && showMapLink && <Link className="dialog-secondary" to={`/graph?focus=${encodeURIComponent(detail.id)}`}>{c.openMap} ↗</Link>}
          {detail && <PlanToggle component={detail}/>}
          <button type="button" className="dialog-close" onClick={onClose} aria-label={c.close}>×</button>
        </div>
      </div>
      <div className="component-dialog-body" aria-busy={loading}>
        {loading && <p className="dialog-status" role="status">{c.detailLoading}</p>}
        {error && <p className="dialog-status" role="alert">{c.detailError}</p>}
        {missing && <p className="dialog-status" role="status">{c.detailMissing}</p>}
        {detail && <DetailBody detail={detail} byId={byId} onOpen={onOpen} copy={copy}/>}
      </div>
    </div>}
  </dialog>;
}

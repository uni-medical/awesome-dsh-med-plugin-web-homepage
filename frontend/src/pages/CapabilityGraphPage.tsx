import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CandidateGraph, type GraphNode } from "../components/CandidateGraph";
import { PlanToggle, RiskBadge } from "../components/ComponentCard";
import { ComponentDetailDialog } from "../components/ComponentDetailDialog";
import { NEIGHBOUR_LIMIT, catalogueNeighbours, neighbourLinks, neighbours, normaliseName, prepare, queryTermGroups, searchCandidates, type CandidateGroup } from "../lib/capabilitySearch";
import { useComponentCopy, useEntryDialog } from "../state/useComponentCopy";
import { useComponents } from "../state/useComponents";

type Tab = "related" | "overview";

/** The component's profile in the ecosystem: its detail dialog over a list filtered to its name. */
const profileLink = (component: { id: string; name: string }) => `/marketplace?q=${encodeURIComponent(component.name)}&entry=${encodeURIComponent(component.id)}`;
type View = "graph" | "list";

/** Two example tasks per market group, so every area of the catalogue has an entry point. */
const EXAMPLE_QUERIES = {
  zh: [
    "检索神经肿瘤相关论文，读取摘要并追踪引用", "临床试验检索与证据综述",
    "单细胞 RNA-seq 细胞类型注释", "基因变异注释与致病性查询",
    "药物靶点与不良反应查询", "化合物相似性检索与分子对接",
    "电子病历 FHIR 数据读取", "公共卫生与流行病统计分析",
    "医学影像分割", "病理全切片图像分析",
    "论文写作与引用管理", "生物信息工作流与数据可视化",
    "智能体上下文记忆与历史摘要", "工具调用权限与安全治理",
  ],
  en: [
    "Search neuro-oncology papers, read abstracts and trace citations", "Clinical trial search and evidence review",
    "Single-cell RNA-seq cell type annotation", "Variant annotation and pathogenicity lookup",
    "Drug target and adverse event lookup", "Compound similarity search and molecular docking",
    "Read EHR data through FHIR", "Public health and epidemiology statistics",
    "Medical image segmentation", "Pathology whole slide image analysis",
    "Paper writing and citation management", "Bioinformatics workflow and data visualization",
    "Agent context memory and history summary", "Tool-call permission governance",
  ],
};

function ExampleQueries({ onPick }: { onPick: (query: string) => void }) {
  const { c, locale } = useComponentCopy();
  return <div className="graph-examples"><span>{c.examples}</span><ul>{EXAMPLE_QUERIES[locale].map(query => <li key={query}><button type="button" onClick={() => onPick(query)}>{query}</button></li>)}</ul></div>;
}

function CandidateList({ groups, selectedKey, onSelect }: { groups: CandidateGroup[]; selectedKey?: string; onSelect: (key: string) => void }) {
  const { c, kindOf, sourceOf, descriptionOf } = useComponentCopy();
  return <ol className="candidate-list">{groups.map(group => {
    const lead = group.members[0];
    const repos = [...new Set(group.members.map(sourceOf))];
    return <li key={group.key} className={group.key === selectedKey ? "is-selected" : ""}>
      <button type="button" className="candidate-main" aria-pressed={group.key === selectedKey} onClick={() => onSelect(group.key)}>
        <strong>{group.name}{group.members.length > 1 && <small> ×{group.members.length}</small>}</strong>
        <span className="candidate-description">{descriptionOf(lead)}</span>
        <span className="candidate-source">{kindOf(lead)} · {repos.slice(0, 2).join(" · ")}{repos.length > 2 ? ` +${repos.length - 2}` : ""}</span>
      </button>
      {group.members.length === 1 ? <PlanToggle component={lead} compact/> : <span className="candidate-count" title={c.members}>{group.members.length}</span>}
    </li>;
  })}</ol>;
}

function Overview({ group, onOpen }: { group: CandidateGroup; onOpen: (id: string) => void }) {
  const { c, kindOf, sourceOf, descriptionOf } = useComponentCopy();
  return <div className="candidate-overview">
    <h3>{c.members} · {group.members.length}</h3>
    <ul>{group.members.map(member => <li key={member.id}>
      <div><strong>{member.name}</strong><small>{kindOf(member)} · {sourceOf(member)}</small><p>{descriptionOf(member)}</p></div>
      <div className="overview-actions"><RiskBadge level={member.risk}/><button type="button" className="dialog-secondary" onClick={() => onOpen(member.id)}>{c.details}</button><Link className="dialog-secondary" to={profileLink(member)}>{c.viewProfile} ↗</Link><PlanToggle component={member}/></div>
    </li>)}</ul>
  </div>;
}

export function CapabilityGraphPage() {
  const { components, edges, byId, loading, error } = useComponents();
  const { c, formatNumber, relations: relationLabels, e } = useComponentCopy();
  const [params, setParams] = useSearchParams();
  const { entryId, open, close } = useEntryDialog();
  const focus = params.get("focus");
  const focusComponent = focus ? byId.get(focus) : undefined;
  const query = params.get("q") ?? (focusComponent ? [focusComponent.name, ...focusComponent.tasks].join(" ") : "");
  const [draft, setDraft] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (query !== syncedQuery) { setSyncedQuery(query); setDraft(query); }
  const [tab, setTab] = useState<Tab>("related");
  const [view, setView] = useState<View>("graph");

  const prepared = useMemo(() => prepare(components), [components]);
  const result = useMemo(() => searchCandidates(prepared, query), [prepared, query]);
  const focusKey = focusComponent ? normaliseName(focusComponent.name) : undefined;
  const requested = params.get("node") ?? focusKey;
  const selected = result.groups.find(group => group.key === requested) ?? result.groups[0];
  const catalogue = useMemo(() => (selected ? catalogueNeighbours(selected, edges, byId) : []), [selected, edges, byId]);
  const related = useMemo(() => {
    const catalogueKeys = new Set(catalogue.map(item => item.key));
    return selected ? neighbours(result.groups, selected, Number.POSITIVE_INFINITY).filter(item => !catalogueKeys.has(item.group.key)) : [];
  }, [result.groups, selected, catalogue]);
  const nodes = useMemo<GraphNode[]>(() => [
    ...catalogue.map(item => ({ key: item.key, name: item.name, memberCount: item.members.length, kind: "catalogue" as const, relations: item.relations, sameRepository: [], shared: [], similarity: 1 })),
    ...related.slice(0, NEIGHBOUR_LIMIT).map(item => ({ key: item.group.key, name: item.group.name, memberCount: item.group.members.length, kind: "retrieval" as const, relations: [], sameRepository: item.sameRepository, shared: item.shared, similarity: item.similarity })),
  ], [catalogue, related]);
  const links = useMemo(() => neighbourLinks(related.slice(0, NEIGHBOUR_LIMIT)), [related]);
  const termGroups = useMemo(() => queryTermGroups(query), [query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setParams(current => { const next = new URLSearchParams(); const q = draft.trim(); if (q) next.set("q", q); if (current.get("entry")) next.set("entry", current.get("entry")!); return next; });
  }
  function search(text: string) {
    setDraft(text);
    setParams(() => new URLSearchParams({ q: text }));
  }
  function activate(node: GraphNode) {
    if (result.groups.some(group => group.key === node.key)) select(node.key);
    else {
      const member = catalogue.find(item => item.key === node.key)?.members[0];
      if (member) open(member.id);
    }
  }
  function select(key: string) {
    setParams(current => { const next = new URLSearchParams(current); next.set("node", key); if (!next.get("q") && query) next.set("q", query); return next; }, { replace: true });
  }

  return <div className="graph-page workspace-route-view">
    <form className="graph-query" onSubmit={submit}>
      <label className="sr-only" htmlFor="graph-query">{c.navGraph}</label>
      <textarea id="graph-query" rows={2} placeholder={c.graphPlaceholder} value={draft} onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>
      <button type="submit" className="primary-button">{c.graphExplore}</button>
    </form>
    {query && termGroups.length > 0 && <div className="graph-terms"><span>{c.terms}</span>
      <ul>{termGroups.map(group => <li key={group.source ?? "latin"}>{group.source && <b lang="zh-CN">{group.source}</b>}{group.source && <i aria-hidden="true">→</i>}{group.terms.join(" · ")}</li>)}</ul>
      {termGroups.some(group => group.source) && <small>{c.chineseNote}</small>}
    </div>}
    <div className="graph-layout">
      <aside className="graph-candidates" aria-label={c.candidates}>
        <div className="graph-candidates-head"><h2>{c.candidates}</h2><span>{formatNumber(result.groups.length)}</span></div>
        {loading ? <p className="graph-empty">{c.loading}</p> : error ? <p className="graph-empty">{c.loadError}</p>
          : !query ? <ExampleQueries onPick={search}/>
          : !result.groups.length ? <p className="graph-empty">{c.graphNoResults}</p>
          : <CandidateList groups={result.groups} selectedKey={selected?.key} onSelect={select}/>}
      </aside>
      <section className="graph-detail" aria-label={selected?.name ?? c.navGraph}>
        {selected ? <>
          <div className="graph-detail-head">
            <div><h2>{selected.name}</h2><p>{selected.members[0].description}</p></div>
            <div className="graph-detail-actions">
              {selected.members.length === 1
                ? <Link className="dialog-secondary" to={profileLink(selected.members[0])}>{c.viewProfile} ↗</Link>
                : <Link className="dialog-secondary" to={`/marketplace?q=${encodeURIComponent(selected.name)}`}>{c.viewAllRecords} {selected.members.length} ↗</Link>}
              {selected.members.length === 1 ? <PlanToggle component={selected.members[0]}/> : <button type="button" className="dialog-secondary" onClick={() => setTab("overview")}>{c.members} · {selected.members.length}</button>}
            </div>
          </div>
          <div className="graph-tabs">
            <div role="tablist" aria-label={selected.name}>
              <button type="button" role="tab" aria-selected={tab === "related"} className={tab === "related" ? "active" : ""} onClick={() => setTab("related")}>{c.related}</button>
              <button type="button" role="tab" aria-selected={tab === "overview"} className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>{c.overview}</button>
            </div>
            {tab === "related" && <div className="graph-view-toggle" role="group" aria-label={c.related}>
              <button type="button" aria-pressed={view === "graph"} className={view === "graph" ? "active" : ""} onClick={() => setView("graph")}>{c.graphView}</button>
              <button type="button" aria-pressed={view === "list"} className={view === "list" ? "active" : ""} onClick={() => setView("list")}>{c.listView}</button>
            </div>}
          </div>
          {tab === "related" ? <>
            <p className="graph-relation-note" role="status">{catalogue.length} {c.catalogueCount} · {Math.min(related.length, NEIGHBOUR_LIMIT)} / {formatNumber(result.groups.length)} {c.candidatesShown}</p>
            {!nodes.length ? <p className="graph-empty">{c.noNeighbours}</p>
              : view === "graph" ? <CandidateGraph selected={selected} nodes={nodes} links={links} onNode={activate}/>
              : <table className="related-table"><thead><tr><th>{c.candidates}</th><th>{c.relation}</th><th>{c.sharedWords}</th><th>{c.members}</th><th>{c.similarity}</th></tr></thead><tbody>
                {catalogue.map(item => <tr key={`c-${item.key}`} className="is-catalogue"><td><button type="button" className="text-button" onClick={() => activate({ key: item.key, name: item.name, memberCount: item.members.length, kind: "catalogue", relations: item.relations, sameRepository: [], shared: [], similarity: 1 })}>{item.name}</button></td><td>{c.catalogueRelation}: {item.relations.map(relation => relationLabels[relation.type][relation.direction]).join(" / ")}</td><td>—</td><td>{item.members.length}</td><td>—</td></tr>)}
                {related.map(({ group, similarity, shared, sameRepository }) => <tr key={group.key}><td><button type="button" className="text-button" onClick={() => select(group.key)}>{group.name}</button></td><td>{sameRepository.length ? `${c.sameRepository}: ${sameRepository.join(", ")}` : c.sharedWords}</td><td>{shared.map(e).join(" · ") || "—"}</td><td>{group.members.length}</td><td>{Math.round(similarity * 100)}%</td></tr>)}
              </tbody></table>}
          </> : <Overview group={selected} onOpen={open}/>}
        </> : <p className="graph-empty">{query ? c.graphNoResults : c.graphHint}</p>}
      </section>
    </div>
    <ComponentDetailDialog entryId={entryId} onClose={close} onOpen={open} showMarketLink/>
  </div>;
}

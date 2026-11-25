import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CandidateGraph } from "../components/CandidateGraph";
import { PlanToggle, RiskBadge } from "../components/ComponentCard";
import { ComponentDetailDialog } from "../components/ComponentDetailDialog";
import { neighbours, normaliseName, prepare, searchCandidates, type CandidateGroup } from "../lib/capabilitySearch";
import { useComponentCopy, useEntryDialog } from "../state/useComponentCopy";
import { useComponents } from "../state/useComponents";

const CJK = /[㐀-鿿]/;
type Tab = "related" | "overview";
type View = "graph" | "list";

function CandidateList({ groups, selectedKey, onSelect }: { groups: CandidateGroup[]; selectedKey?: string; onSelect: (key: string) => void }) {
  const { c, types } = useComponentCopy();
  return <ol className="candidate-list">{groups.map(group => {
    const lead = group.members[0];
    const repos = [...new Set(group.members.map(member => member.repo))];
    return <li key={group.key} className={group.key === selectedKey ? "is-selected" : ""}>
      <button type="button" className="candidate-main" aria-pressed={group.key === selectedKey} onClick={() => onSelect(group.key)}>
        <strong>{group.name}{group.members.length > 1 && <small> ×{group.members.length}</small>}</strong>
        <span className="candidate-description">{lead.description}</span>
        <span className="candidate-source">{types[lead.type]} · {repos.slice(0, 2).join(" · ")}{repos.length > 2 ? ` +${repos.length - 2}` : ""}</span>
      </button>
      {group.members.length === 1 ? <PlanToggle component={lead} compact/> : <span className="candidate-count" title={c.members}>{group.members.length}</span>}
    </li>;
  })}</ol>;
}

function Overview({ group, onOpen }: { group: CandidateGroup; onOpen: (id: string) => void }) {
  const { c, types } = useComponentCopy();
  return <div className="candidate-overview">
    <h3>{c.members} · {group.members.length}</h3>
    <ul>{group.members.map(member => <li key={member.id}>
      <div><strong>{member.name}</strong><small>{types[member.type]} · {member.repo}</small><p>{member.description}</p></div>
      <div className="overview-actions"><RiskBadge level={member.risk}/><button type="button" className="dialog-secondary" onClick={() => onOpen(member.id)}>{c.details}</button><PlanToggle component={member}/></div>
    </li>)}</ul>
  </div>;
}

export function CapabilityGraphPage() {
  const { components, byId, loading, error } = useComponents();
  const { c, formatNumber } = useComponentCopy();
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
  const related = useMemo(() => (selected ? neighbours(result.groups, selected) : []), [result.groups, selected]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setParams(current => { const next = new URLSearchParams(); const q = draft.trim(); if (q) next.set("q", q); if (current.get("entry")) next.set("entry", current.get("entry")!); return next; });
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
    {query && result.terms.length > 0 && <p className="graph-terms">{c.terms}：{result.terms.join(" · ")}{CJK.test(query) ? ` · ${c.chineseNote}` : ""}</p>}
    <div className="graph-layout">
      <aside className="graph-candidates" aria-label={c.candidates}>
        <div className="graph-candidates-head"><h2>{c.candidates}</h2><span>{formatNumber(result.groups.length)}</span></div>
        {loading ? <p className="graph-empty">{c.loading}</p> : error ? <p className="graph-empty">{c.loadError}</p>
          : !query ? <p className="graph-empty">{c.graphHint}</p>
          : !result.groups.length ? <p className="graph-empty">{c.graphNoResults}</p>
          : <CandidateList groups={result.groups} selectedKey={selected?.key} onSelect={select}/>}
      </aside>
      <section className="graph-detail" aria-label={selected?.name ?? c.navGraph}>
        {selected ? <>
          <div className="graph-detail-head">
            <div><h2>{selected.name}</h2><p>{selected.members[0].description}</p></div>
            {selected.members.length === 1 ? <PlanToggle component={selected.members[0]}/> : <button type="button" className="dialog-secondary" onClick={() => setTab("overview")}>{c.members} · {selected.members.length}</button>}
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
            <p className="graph-relation-note" role="status">{c.relationNote} · {related.length} / {formatNumber(result.groups.length)} {c.groups}</p>
            {!related.length ? <p className="graph-empty">{c.noNeighbours}</p>
              : view === "graph" ? <CandidateGraph selected={selected} related={related} onSelect={select}/>
              : <table className="related-table"><thead><tr><th>{c.candidates}</th><th>{c.members}</th><th>{c.similarity}</th></tr></thead><tbody>{related.map(({ group, similarity }) => <tr key={group.key}><td><button type="button" className="text-button" onClick={() => select(group.key)}>{group.name}</button></td><td>{group.members.length}</td><td>{Math.round(similarity * 100)}%</td></tr>)}</tbody></table>}
          </> : <Overview group={selected} onOpen={open}/>}
        </> : <p className="graph-empty">{query ? c.graphNoResults : c.graphHint}</p>}
      </section>
    </div>
    <ComponentDetailDialog entryId={entryId} onClose={close}/>
  </div>;
}

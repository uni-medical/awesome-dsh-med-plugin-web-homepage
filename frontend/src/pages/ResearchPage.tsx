import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RepositoryVisual } from "../components/RepositoryVisual";
import { WorkbenchShell } from "../components/WorkbenchShell";
import { resolveComparisonEntries, toggleComparison } from "../lib/workspace";
import { useCatalog } from "../state/useCatalog";
import { useWorkspace } from "../state/WorkspaceContext";
import "../styles/marketplace.css";

const fmt = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
const display = (value: string | null | undefined) => value || "Not available";

export function ResearchPage() {
  const { entries, loading } = useCatalog();
  const { collections } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const ids = params.getAll("compare");
  const compared = resolveComparisonEntries(entries, ids);
  const missingCount = new Set(ids).size - compared.length;
  const candidates = useMemo(() => { const memberIds = collections.find(item => item.id === collectionFilter)?.entryIds; return entries.filter(entry => (!memberIds || memberIds.includes(entry.id)) && !ids.includes(entry.id) && `${entry.fullName} ${entry.description ?? ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 10); }, [entries, ids, query, collections, collectionFilter]);
  function toggle(id: string) { const next = new URLSearchParams(params); next.delete("compare"); toggleComparison(ids, id).forEach(value => next.append("compare", value)); setParams(next); }
  const rows = [
    ["Status", (e: typeof entries[number]) => e.tier], ["Component type", (e: typeof entries[number]) => e.primaryCategory], ["Domains", (e: typeof entries[number]) => e.domains.join(", ")], ["Categories", (e: typeof entries[number]) => e.categories.join(", ")], ["Topics", (e: typeof entries[number]) => e.topics.join(", ")], ["Stars", (e: typeof entries[number]) => e.stars.toLocaleString("en-US")], ["License", (e: typeof entries[number]) => e.license], ["Language", (e: typeof entries[number]) => e.language], ["Updated", (e: typeof entries[number]) => fmt(e.updatedAt)], ["Observed", (e: typeof entries[number]) => fmt(e.observedAt)], ["Homepage", (e: typeof entries[number]) => display(e.homepageUrl)], ["Main snapshot", (e: typeof entries[number]) => display(e.snapshot.mainSha)], ["Automation snapshot", (e: typeof entries[number]) => display(e.snapshot.automationSha)],
  ] as const;
  return <WorkbenchShell className="workspace-content-page"><header className="workspace-page-header"><span>RESEARCH</span><h1>Compare evidence</h1><p>Compare two to four repositories using catalog metadata. Differences are highlighted without producing a quality ranking.</p></header><div className="workspace-page-scroll research-layout">
    <aside className="research-picker"><h2>Add repositories</h2><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search catalog…"/><p>{compared.length}/4 selected</p>{collections.length > 0 && <div className="research-collection-filters"><button className={collectionFilter === null ? "active" : ""} onClick={() => setCollectionFilter(null)}>All catalog</button>{collections.map(item => <button key={item.id} className={collectionFilter === item.id ? "active" : ""} onClick={() => setCollectionFilter(item.id)}>{item.name} · {item.entryIds.length}</button>)}</div>}<div>{loading ? <p>Loading…</p> : candidates.map(entry => <button key={entry.id} disabled={compared.length >= 4} onClick={() => toggle(entry.id)}><RepositoryVisual entry={entry}/><span><strong>{entry.fullName}</strong><small>{entry.primaryCategory} · {entry.tier}</small></span><b>＋</b></button>)}</div></aside>
    <section className="comparison-area">{missingCount > 0 && <p className="comparison-notice">{missingCount} repository ID in this link is no longer available.</p>}{compared.length < 2 ? <div className="workspace-empty"><h2>Select at least two repositories</h2><p>Add projects from the catalog to build a side-by-side evidence comparison.</p></div> : <div className="comparison-scroll"><table><thead><tr><th>Evidence field</th>{compared.map(entry => <th key={entry.id}><RepositoryVisual entry={entry}/><strong>{entry.fullName}</strong><button onClick={() => toggle(entry.id)} aria-label={`Remove ${entry.fullName}`}>×</button></th>)}</tr></thead><tbody>{rows.map(([label, getter]) => { const values = compared.map(getter); const differs = new Set(values).size > 1; return <tr className={differs ? "differs" : ""} key={label}><th>{label}{differs && <small>different</small>}</th>{values.map((value, index) => <td key={compared[index].id}>{value}</td>)}</tr>; })}</tbody></table></div>}</section>
  </div></WorkbenchShell>;
}

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/Header";
import { EntryDetail } from "../components/EntryDetail";
import { useCatalog } from "../state/useCatalog";
import { filterCatalog } from "../utils/filterCatalog";
export function MarketplacePage() {
  const {entries, loading, error} = useCatalog();
  const [params, setParams] = useSearchParams();
  const shown = useMemo(() => filterCatalog(entries, params), [entries, params]);
  const selected = entries.find(entry => entry.id === params.get("entry"));
  const view = params.get("view") === "table" ? "table" : "cards";
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if(value) next.set(key, value); else next.delete(key);
    setParams(next, {replace: key === "q"});
  }
  const filters = [
    {key:"type", label:"Component type", values:[...new Set(entries.map(e=>e.primaryCategory))]},
    {key:"domain", label:"Domain", values:["medical","general"]},
    {key:"tier", label:"Source tier", values:["stable","candidate"]},
    {key:"license", label:"License", values:[...new Set(entries.map(e=>e.license))].sort()}
  ];
  return <main className="market"><Header/><header><span className="eyebrow">MARKETPLACE</span><h1>Components for medical AI research.</h1><p>Compare tools, skills, and interfaces with their public source context.</p><label className="search-label" htmlFor="search">Search components</label><input id="search" type="search" placeholder="Search names, descriptions, or tags…" value={params.get("q") ?? ""} onChange={e=>update("q", e.target.value)} /></header>
    <div className="directory-layout"><aside className="filter-panel" aria-label="Catalog filters"><h2>Browse the catalog</h2>{filters.map(f=><label key={f.key}>{f.label}<select value={params.get(f.key) ?? ""} onChange={e=>update(f.key,e.target.value)}><option value="">All</option>{f.values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>)}<button onClick={()=>setParams({})}>Clear filters</button><p>Stable means present in the reviewed main snapshot; Candidate means present only in the automated discovery snapshot. Neither is a verification badge.</p></aside>
    <section aria-label="Component results"><div className="results-toolbar"><p role="status">{loading ? "Loading catalog…" : error || shown.length + " records"}</p><div className="view-toggle" role="group" aria-label="Result view"><button className={view === "cards" ? "active" : ""} onClick={()=>update("view","")}>Cards</button><button className={view === "table" ? "active" : ""} onClick={()=>update("view","table")}>Table</button></div></div>{!loading && !error && !shown.length && <div className="empty"><h2>No matching components</h2><p>Try another term or clear your filters.</p></div>}
    {view === "table" ? <div className="table-scroll"><table className="catalog-table"><thead><tr><th>Project</th><th>Status</th><th>Category</th><th>Domain</th><th>Stars</th><th>License</th><th>Language</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{shown.map(e=><tr key={e.id}><th scope="row"><strong>{e.fullName}</strong><small>{e.source}</small></th><td><span className={e.tier}>{e.tier}</span></td><td>{e.primaryCategory}</td><td>{e.domains.join(" · ")}</td><td>★ {e.stars.toLocaleString("en-US")}</td><td>{e.license}</td><td>{e.language}</td><td>{new Intl.DateTimeFormat("en",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(e.updatedAt))}</td><td><button onClick={()=>update("entry",e.id)}>Details</button><a href={e.repositoryUrl} target="_blank" rel="noopener noreferrer">Repo ↗</a></td></tr>)}</tbody></table></div> : <div className="results">{shown.map(e=><article className="entry" key={e.id}><div className="entry-top"><span className={e.tier}>{e.tier}</span><code>{e.primaryCategory}</code><small>{e.source}</small></div><h2>{e.fullName}</h2><p>{e.description ?? "No source description provided."}</p><div className="meta"><span>★ {e.stars.toLocaleString("en-US")} observed</span><span>{e.domains.join(" · ")}</span><span>{e.license}</span><span>{e.language}</span><time dateTime={e.updatedAt}>Updated {new Intl.DateTimeFormat("en",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(e.updatedAt))}</time></div><div className="entry-bottom"><div>{(e.topics.length?e.topics:["No source tags"]).slice(0,4).map(t=><em key={t}>{t}</em>)}</div><div><button onClick={()=>update("entry",e.id)} aria-label={"View details: "+e.fullName}>View details</button><a href={e.repositoryUrl} target="_blank" rel="noopener noreferrer">Repository ↗</a></div></div></article>)}</div>}</section></div>{selected && <EntryDetail entry={selected} onClose={()=>update("entry","")}/>}</main>;
}

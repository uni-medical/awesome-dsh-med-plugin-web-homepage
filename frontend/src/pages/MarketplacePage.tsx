import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EntryDetail } from "../components/EntryDetail";
import { MarketplaceNavRail } from "../components/MarketplaceNavRail";
import { MarketplaceResults } from "../components/MarketplaceResults";
import { ResizableSplit } from "../components/ResizableSplit";
import { parseMarketplaceView, resolveSelectedEntry, type MarketplaceView } from "../lib/marketplace";
import type { CatalogEntry } from "../lib/catalog";
import { useCatalog } from "../state/useCatalog";
import { filterCatalog } from "../utils/filterCatalog";
import "../styles/marketplace.css";

const FILTER_KEYS = ["q", "type", "domain", "tier", "license"];

function CatalogFilterPanel({ entries, params, onUpdate, onClear }: { entries: CatalogEntry[]; params: URLSearchParams; onUpdate: (key: string, value: string) => void; onClear: () => void }) {
  const filters = [
    { key: "type", label: "Component type", values: [...new Set(entries.map(entry => entry.primaryCategory))].sort() },
    { key: "domain", label: "Domain", values: ["medical", "general"] },
    { key: "tier", label: "Source tier", values: ["stable", "candidate"] },
    { key: "license", label: "License", values: [...new Set(entries.map(entry => entry.license))].sort() },
  ];
  return <aside className="repository-filter-panel" aria-label="Catalog filters"><div className="filter-panel-heading"><span>REFINE</span><h2>Browse catalog</h2></div>{filters.map(filter => <label key={filter.key}>{filter.label}<select value={params.get(filter.key) ?? ""} onChange={event => onUpdate(filter.key, event.target.value)}><option value="">All</option>{filter.values.map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}<button type="button" onClick={onClear}>Clear filters</button><p>Stable is present in the reviewed main snapshot. Candidate is present only in the automated discovery snapshot. Neither is a verification badge.</p></aside>;
}

export function MarketplacePage() {
  const { entries, loading, error } = useCatalog();
  const [params, setParams] = useSearchParams();
  const shown = useMemo(() => filterCatalog(entries, params), [entries, params]);
  const view = parseMarketplaceView(params.get("view"));
  const selectedId = params.get("entry");
  const selected = resolveSelectedEntry(entries, selectedId);

  function update(key: string, value: string, replace = false) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace });
  }

  function clearFilters() {
    const next = new URLSearchParams(params);
    FILTER_KEYS.forEach(key => next.delete(key));
    setParams(next);
  }

  function setView(nextView: MarketplaceView) {
    update("view", nextView);
  }

  const browser = <section className="repository-pane" aria-label="Repository browser">
    <div className="repository-heading">
      <div><span className="workbench-eyebrow">MARKETPLACE</span><h1>Repository</h1><p>Discover and compare open medical AI components.</p></div>
      <div className="view-switcher" role="group" aria-label="Repository view">
        {(["cards", "table", "gallery"] as const).map(mode => <button key={mode} type="button" className={view === mode ? "active" : ""} aria-pressed={view === mode} onClick={() => setView(mode)}><span aria-hidden="true">{mode === "cards" ? "▦" : mode === "table" ? "☷" : "▧"}</span>{mode === "cards" ? "Card" : mode[0].toUpperCase() + mode.slice(1)}</button>)}
      </div>
    </div>
    <div className="result-summary"><p role="status">{loading ? "Loading catalog…" : error || `${shown.length} repositories`}</p><button type="button" onClick={clearFilters}>Clear filters</button></div>
    <div className="repository-body"><CatalogFilterPanel entries={entries} params={params} onUpdate={update} onClear={clearFilters}/><div className="repository-scroll">
      {!loading && !error && !shown.length ? <div className="workbench-empty"><h2>No matching components</h2><p>Try another term or clear the active filters.</p></div> : <MarketplaceResults view={view} entries={shown} selectedId={selected?.id} onSelect={entry => update("entry", entry.id)}/>}
    </div></div>
  </section>;

  return <main className="market marketplace-workbench">
    <MarketplaceNavRail/>
    <div className="marketplace-stage">
      <header className="workbench-topbar">
        <label className="workbench-search"><span className="sr-only">Search repositories</span><b aria-hidden="true">⌕</b><input type="search" placeholder="Search repositories, tags, or keywords…" value={params.get("q") ?? ""} onChange={event => update("q", event.target.value, true)}/></label>
      </header>
      {selected ? <ResizableSplit primary={browser} secondary={<EntryDetail entry={selected} onClose={() => update("entry", "")}/>}/> : browser}
    </div>
  </main>;
}

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EntryDetail } from "../components/EntryDetail";
import { MarketplaceNavRail } from "../components/MarketplaceNavRail";
import { MarketplaceResults } from "../components/MarketplaceResults";
import { ResizableSplit } from "../components/ResizableSplit";
import { parseMarketplaceView, type MarketplaceView } from "../lib/marketplace";
import { useCatalog } from "../state/useCatalog";
import { filterCatalog } from "../utils/filterCatalog";
import "../styles/marketplace.css";

const FILTER_KEYS = ["q", "type", "domain", "tier", "license"];

export function MarketplacePage() {
  const { entries, loading, error } = useCatalog();
  const [params, setParams] = useSearchParams();
  const shown = useMemo(() => filterCatalog(entries, params), [entries, params]);
  const view = parseMarketplaceView(params.get("view"));
  const selectedId = params.get("entry");
  const selected = selectedId ? entries.find(entry => entry.id === selectedId) : shown[0];

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

  const filters = [
    { key: "type", label: "All types", values: [...new Set(entries.map(entry => entry.primaryCategory))].sort() },
    { key: "domain", label: "All domains", values: ["medical", "general"] },
    { key: "tier", label: "All tiers", values: ["stable", "candidate"] },
    { key: "license", label: "All licenses", values: [...new Set(entries.map(entry => entry.license))].sort() },
  ];

  const browser = <section className="repository-pane" aria-label="Repository browser">
    <div className="repository-heading">
      <div><span className="workbench-eyebrow">MARKETPLACE</span><h1>Repository</h1><p>Discover and compare open medical AI components.</p></div>
      <div className="view-switcher" role="group" aria-label="Repository view">
        {(["cards", "table", "gallery"] as const).map(mode => <button key={mode} type="button" className={view === mode ? "active" : ""} aria-pressed={view === mode} onClick={() => setView(mode)}><span aria-hidden="true">{mode === "cards" ? "▦" : mode === "table" ? "☷" : "▧"}</span>{mode === "cards" ? "Card" : mode[0].toUpperCase() + mode.slice(1)}</button>)}
      </div>
    </div>
    <div className="result-summary"><p role="status">{loading ? "Loading catalog…" : error || `${shown.length} repositories`}</p><button type="button" onClick={clearFilters}>Clear filters</button></div>
    <div className="repository-scroll">
      {!loading && !error && !shown.length ? <div className="workbench-empty"><h2>No matching components</h2><p>Try another term or clear the active filters.</p></div> : <MarketplaceResults view={view} entries={shown} selectedId={selected?.id} onSelect={entry => update("entry", entry.id)}/>}
    </div>
  </section>;

  return <main className="market marketplace-workbench">
    <MarketplaceNavRail/>
    <div className="marketplace-stage">
      <header className="workbench-topbar">
        <label className="workbench-search"><span className="sr-only">Search repositories</span><b aria-hidden="true">⌕</b><input type="search" placeholder="Search repositories, tags, or keywords…" value={params.get("q") ?? ""} onChange={event => update("q", event.target.value, true)}/></label>
        <div className="top-filters">{filters.map(filter => <label key={filter.key}><span className="sr-only">{filter.label}</span><select value={params.get(filter.key) ?? ""} onChange={event => update(filter.key, event.target.value)}><option value="">{filter.label}</option>{filter.values.map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}</div>
      </header>
      <ResizableSplit primary={browser} secondary={<EntryDetail entry={selected}/>}/>
    </div>
  </main>;
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EntryDetail } from "../components/EntryDetail";
import { MarketplaceResults } from "../components/MarketplaceResults";
import { ResizableSplit } from "../components/ResizableSplit";
import { parseMarketplaceView, resolveSelectedEntry, toggleMultiValue, type MarketplaceView } from "../lib/marketplace";
import type { CatalogEntry } from "../lib/catalog";
import { useCatalog } from "../state/useCatalog";
import { useWorkspace } from "../state/WorkspaceContext";
import { useUiLanguage } from "../state/useUiLanguage";
import { filterCatalog } from "../utils/filterCatalog";
import "../styles/marketplace.css";

const FILTER_KEYS = ["q", "type", "domain", "tier", "license"];

function CatalogFilterPanel({ entries, params, onUpdate, onToggleType, onClear }: { entries: CatalogEntry[]; params: URLSearchParams; onUpdate: (key: string, value: string) => void; onToggleType: (value: string) => void; onClear: () => void }) {
  const { t } = useUiLanguage();
  const typeValues = [...new Set(entries.map(entry => entry.primaryCategory))].sort();
  const selectedTypes = new Set(params.getAll("type"));
  const filters = [
    { key: "domain", label: t("filter.domain"), values: ["medical", "general"] },
    { key: "tier", label: t("filter.sourceTier"), values: ["stable", "candidate"] },
    { key: "license", label: t("filter.license"), values: [...new Set(entries.map(entry => entry.license))].sort() },
  ];
  return <aside className="repository-filter-panel" aria-label={t("filter.aria")}><div className="filter-panel-heading"><span>{t("filter.eyebrow")}</span><h2>{t("filter.title")}</h2></div><fieldset className="type-multiselect"><legend>{t("filter.componentType")} <small>{selectedTypes.size ? `${selectedTypes.size} ${t("filter.selected")}` : t("common.all")}</small></legend>{typeValues.map(value => <label key={value}><input type="checkbox" checked={selectedTypes.has(value)} onChange={() => onToggleType(value)}/><span>{value}</span><b>{entries.filter(entry => entry.primaryCategory === value).length}</b></label>)}</fieldset>{filters.map(filter => <label key={filter.key}>{filter.label}<select value={params.get(filter.key) ?? ""} onChange={event => onUpdate(filter.key, event.target.value)}><option value="">{t("common.all")}</option>{filter.values.map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}<button type="button" onClick={onClear}>{t("marketplace.clearFilters")}</button><p>{t("filter.disclosure")}</p></aside>;
}

export function MarketplacePage() {
  const { entries, loading, error } = useCatalog();
  const { preferences } = useWorkspace();
  const { t } = useUiLanguage();
  const [params, setParams] = useSearchParams();
  const shown = useMemo(() => filterCatalog(entries, params), [entries, params]);
  const view = params.has("view") ? parseMarketplaceView(params.get("view")) : preferences.defaultView;
  const selectedId = params.get("entry");
  const selected = resolveSelectedEntry(entries, selectedId);
  const [detailEntry, setDetailEntry] = useState<CatalogEntry>();
  const [closing, setClosing] = useState(false);
  const focusEntryRef = useRef<string | null>(null);

  useEffect(() => {
    if (selected) { setDetailEntry(selected); setClosing(false); }
    else if (detailEntry) setClosing(true);
  }, [selected, detailEntry]);

  const finishClose = useCallback(() => {
    setDetailEntry(undefined); setClosing(false);
    setParams(current => { const next = new URLSearchParams(current); next.delete("entry"); return next; }, { replace: true });
    const id = focusEntryRef.current;
    if (id) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-entry-id="${CSS.escape(id)}"]`)?.focus());
  }, [setParams]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape" && detailEntry && !closing) setClosing(true); }
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailEntry, closing]);

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

  function toggleType(value: string) {
    setParams(toggleMultiValue(params, "type", value));
  }

  function setView(nextView: MarketplaceView) {
    update("view", nextView);
  }

  const browser = <section className="repository-pane" aria-label={t("marketplace.title")}>
    <div className="repository-heading">
      <div><span className="workbench-eyebrow">{t("marketplace.eyebrow")}</span><h1>{t("marketplace.title")}</h1><p>{t("marketplace.description")}</p></div>
      <div className="view-switcher" role="group" aria-label={t("marketplace.viewLabel")}>
        {(["cards", "table", "gallery"] as const).map(mode => <button key={mode} type="button" className={view === mode ? "active" : ""} aria-pressed={view === mode} onClick={() => setView(mode)}><span aria-hidden="true">{mode === "cards" ? "▦" : mode === "table" ? "☷" : "▧"}</span>{t(`marketplace.${mode}`)}</button>)}
      </div>
    </div>
    <div className="result-summary"><p role="status">{loading ? t("common.loading") : error || `${shown.length} ${t("common.repositories")}`}</p><button type="button" onClick={clearFilters}>{t("marketplace.clearFilters")}</button></div>
    <div className="repository-body"><CatalogFilterPanel entries={entries} params={params} onUpdate={update} onToggleType={toggleType} onClear={clearFilters}/><div className="repository-scroll">
      {!loading && !error && !shown.length ? <div className="workbench-empty"><h2>{t("marketplace.noMatches")}</h2><p>{t("marketplace.noMatchesHint")}</p></div> : <MarketplaceResults view={view} entries={shown} selectedId={selected?.id} onSelect={entry => { focusEntryRef.current = entry.id; update("entry", entry.id); }}/>}
    </div></div>
  </section>;

  return <div className="marketplace-stage workspace-route-view">
      <header className="workbench-topbar">
        <label className="workbench-search"><span className="sr-only">{t("marketplace.searchLabel")}</span><b aria-hidden="true">⌕</b><input type="search" placeholder={t("marketplace.searchPlaceholder")} value={params.get("q") ?? ""} onChange={event => update("q", event.target.value, true)}/></label>
      </header>
      {detailEntry ? <ResizableSplit primary={browser} secondary={<EntryDetail entry={detailEntry} focusOnOpen={preferences.focusDetails} onClose={() => { if (!closing) setClosing(true); }}/>} closing={closing} onClosed={finishClose}/> : browser}
  </div>;
}

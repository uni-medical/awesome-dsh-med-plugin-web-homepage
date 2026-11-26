import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ComponentCard } from "../components/ComponentCard";
import { ComponentDetailDialog } from "../components/ComponentDetailDialog";
import { COMPONENT_TYPES, DOMAIN_GROUPS, type ComponentSummary, type MechanismRole } from "../lib/components";
import { MECHANISM_ORDER } from "../lib/componentCopy";
import { FILTER_KEYS, NOT_EVALUATED, PAGE_SIZE, countBy, filterComponents, filterQueryString, toggleMultiValue } from "../lib/marketplace";
import { useComponentCopy, useEntryDialog } from "../state/useComponentCopy";
import { useComponents } from "../state/useComponents";

const SEARCH_DELAY_MS = 200;
const RISK_FILTERS = ["green", "amber", "red", NOT_EVALUATED] as const;

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { c } = useComponentCopy();
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) { setSyncedValue(value); setDraft(value); }
  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);
  return <label className="ecosystem-search">
    <span className="sr-only">{c.searchLabel}</span><b aria-hidden="true">⌕</b>
    <input type="search" placeholder={c.searchPlaceholder} value={draft} onChange={event => setDraft(event.target.value)}/>
    {draft && <button type="button" onClick={() => { setDraft(""); onChange(""); }}>{c.clear}</button>}
  </label>;
}

function FilterMenu({ indexed, params, onToggle, onSet }: { indexed: ReturnType<typeof useComponents>["indexed"]; params: URLSearchParams; onToggle: (key: string, value: string) => void; onSet: (key: string, value: string) => void }) {
  const { c, types, risks, mechanisms, formatNumber, e } = useComponentCopy();
  const typeCounts = useMemo(() => countBy(filterComponents(indexed, params, ["type"]), item => item.type), [indexed, params]);
  const riskCounts = useMemo(() => countBy(filterComponents(indexed, params, ["risk"]), item => item.risk ?? NOT_EVALUATED), [indexed, params]);
  const mechanismCounts = useMemo(() => countBy(filterComponents(indexed, params, ["mech"]), item => item.mechanism ?? null), [indexed, params]);
  const functionCounts = useMemo(() => [...countBy(indexed.map(entry => entry.item), item => item.functionPrimary)].sort((a, b) => b[1] - a[1]), [indexed]);
  const active = params.getAll("type").length + params.getAll("risk").length + (params.get("fn") ? 1 : 0) + (params.get("mech") ? 1 : 0);
  return <details className="filter-menu">
    <summary>{c.filters}{active > 0 && <span className="filter-count">{active}</span>}<i aria-hidden="true">⌄</i></summary>
    <div className="filter-popover">
      <fieldset><legend>{c.filterType}</legend>{COMPONENT_TYPES.map(type => <label key={type}><input type="checkbox" checked={params.getAll("type").includes(type)} onChange={() => onToggle("type", type)}/><span>{types[type]}</span><b>{formatNumber(typeCounts.get(type) ?? 0)}</b></label>)}</fieldset>
      <fieldset><legend>{c.filterRisk}</legend>{RISK_FILTERS.map(risk => <label key={risk}><input type="checkbox" checked={params.getAll("risk").includes(risk)} onChange={() => onToggle("risk", risk)}/><span>{risks[risk]}</span><b>{formatNumber(riskCounts.get(risk) ?? 0)}</b></label>)}</fieldset>
      <label className="filter-select">{c.filterMechanism}<select value={params.get("mech") ?? ""} onChange={event => onSet("mech", event.target.value)}><option value="">{c.all}</option>{MECHANISM_ORDER.map(role => <option key={role} value={role}>{mechanisms[role]} ({formatNumber(mechanismCounts.get(role) ?? 0)})</option>)}</select></label>
      <label className="filter-select">{c.filterFunction}<select value={params.get("fn") ?? ""} onChange={event => onSet("fn", event.target.value)}><option value="">{c.all}</option>{functionCounts.map(([value, total]) => <option key={value} value={value}>{e(value)} ({formatNumber(total)})</option>)}</select></label>
    </div>
  </details>;
}

/** Capability environment plus the four runtime mechanism classes, so the catalogue reads as more than a tool list. */
function HarnessCoverage({ indexed, active, onPick }: { indexed: ReturnType<typeof useComponents>["indexed"]; active: string; onPick: (role: MechanismRole) => void }) {
  const { c, mechanisms, mechanismCoverage, formatNumber } = useComponentCopy();
  // Paper plugins per class; native DSH mechanisms are listed but not counted as plugins.
  const counts = useMemo(() => countBy(indexed.map(entry => entry.item), item => (item.native ? null : item.mechanism ?? null)), [indexed]);
  const capabilityTotal = useMemo(() => indexed.filter(entry => !entry.item.mechanism && !entry.item.native).length, [indexed]);
  const mechanismTotal = [...counts.values()].reduce((sum, value) => sum + value, 0);
  if (!mechanismTotal) return null;
  return <section className="harness-coverage" aria-label={c.coverageTitle}>
    <p className="harness-coverage-title"><b>{c.coverageTitle}</b><span>{c.coverageHint}</span></p>
    <div className="harness-coverage-grid">
      <div className="harness-cell is-capability"><span>{c.coverageTools}</span><strong>{formatNumber(capabilityTotal)}</strong><p>{c.coverageToolsText}</p></div>
      {MECHANISM_ORDER.map(role => <button key={role} type="button" className="harness-cell" aria-pressed={active === role} onClick={() => onPick(role)}>
        <span>{mechanisms[role]}</span><strong>{formatNumber(counts.get(role) ?? 0)}</strong><p>{mechanismCoverage[role]}</p>
      </button>)}
    </div>
  </section>;
}

function ResultGrid({ items, onOpen }: { items: ComponentSummary[]; onOpen: (id: string) => void }) {
  const { c, formatNumber } = useComponentCopy();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [shownItems, setShownItems] = useState(items);
  const sentinel = useRef<HTMLDivElement>(null);
  if (items !== shownItems) { setShownItems(items); setVisible(PAGE_SIZE); }
  useEffect(() => {
    const target = sentinel.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setVisible(count => count + PAGE_SIZE); }, { rootMargin: "600px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [items]);
  const shown = items.slice(0, visible);
  return <>
    <div className="component-grid">{shown.map(item => <ComponentCard key={item.id} component={item} onOpen={onOpen}/>)}</div>
    {visible < items.length && <div className="grid-more" ref={sentinel}><span>{c.showing} {formatNumber(shown.length)} {c.of} {formatNumber(items.length)}</span><button type="button" onClick={() => setVisible(count => count + PAGE_SIZE)}>{c.showMore}</button></div>}
  </>;
}

export function MarketplacePage() {
  const { indexed, loading, error } = useComponents();
  const { c, groups, formatNumber } = useComponentCopy();
  const [params, setParams] = useSearchParams();
  const { entryId, open, close } = useEntryDialog();
  // Keyed on the filter parameters only: opening a detail (`entry`) must not reset the grid.
  const filterQuery = filterQueryString(params);
  const filters = useMemo(() => new URLSearchParams(filterQuery), [filterQuery]);
  const shown = useMemo(() => filterComponents(indexed, filters), [indexed, filters]);
  const groupCounts = useMemo(() => countBy(filterComponents(indexed, filters, ["group"]), item => item.group), [indexed, filters]);
  const activeGroup = filters.get("group") ?? "";

  function update(key: string, value: string, replace = false) {
    setParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); return next; }, { replace });
  }
  function reset() {
    setParams(current => { const next = new URLSearchParams(current); FILTER_KEYS.forEach(key => next.delete(key)); return next; });
  }

  return <div className="ecosystem-page workspace-route-view">
    <div className="ecosystem-header"><h1>{c.ecosystemTitle}</h1><button type="button" className="text-button" onClick={reset}>{c.resetFilters}</button></div>
    <div className="ecosystem-controls">
      <SearchField value={filters.get("q") ?? ""} onChange={value => update("q", value, true)}/>
      <FilterMenu indexed={indexed} params={filters} onToggle={(key, value) => setParams(current => toggleMultiValue(current, key, value))} onSet={(key, value) => update(key, value)}/>
    </div>
    <HarnessCoverage indexed={indexed} active={filters.get("mech") ?? ""} onPick={role => setParams(current => {
      const next = new URLSearchParams(current);
      if (next.get("mech") === role) { next.delete("mech"); next.delete("group"); } else { next.set("group", "mechanisms"); next.set("mech", role); }
      return next;
    })}/>
    <div className="group-tabs" role="group" aria-label={c.filters}>
      <button type="button" aria-pressed={!activeGroup} className={!activeGroup ? "active" : ""} onClick={() => update("group", "")}>{c.all}</button>
      {DOMAIN_GROUPS.map(group => <button key={group} type="button" aria-pressed={activeGroup === group} className={activeGroup === group ? "active" : ""} onClick={() => update("group", activeGroup === group ? "" : group)}>{groups[group]}<small>{formatNumber(groupCounts.get(group) ?? 0)}</small></button>)}
    </div>
    <div className="ecosystem-results">
      <div className="results-head"><h2>{c.explore}</h2><p role="status">{loading ? c.loading : error ? c.loadError : `${formatNumber(shown.length)} ${c.componentsCount}`}</p></div>
      {!loading && !error && !shown.length ? <div className="workbench-empty"><h2>{c.noMatches}</h2><p>{c.noMatchesHint}</p></div> : <ResultGrid items={shown} onOpen={open}/>}
    </div>
    <ComponentDetailDialog entryId={entryId} onClose={close} onOpen={open}/>
  </div>;
}

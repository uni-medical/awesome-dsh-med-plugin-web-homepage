import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RepositoryVisual } from "../components/RepositoryVisual";
import { WorkbenchShell } from "../components/WorkbenchShell";
import { resolveComparisonEntries, toggleComparison } from "../lib/workspace";
import { useCatalog } from "../state/useCatalog";
import { useUiLanguage } from "../state/useUiLanguage";
import { useWorkspace } from "../state/WorkspaceContext";
import "../styles/marketplace.css";

export function ResearchPage() {
  const { entries, loading } = useCatalog();
  const { collections } = useWorkspace();
  const { formatDate, formatNumber, t } = useUiLanguage();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const ids = params.getAll("compare");
  const compared = resolveComparisonEntries(entries, ids);
  const missingCount = new Set(ids).size - compared.length;
  const candidates = useMemo(() => {
    const memberIds = collections.find(item => item.id === collectionFilter)?.entryIds;
    return entries.filter(entry => (!memberIds || memberIds.includes(entry.id)) && !ids.includes(entry.id) && `${entry.fullName} ${entry.description ?? ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  }, [entries, ids, query, collections, collectionFilter]);

  function toggle(id: string) {
    const next = new URLSearchParams(params);
    next.delete("compare");
    toggleComparison(ids, id).forEach(value => next.append("compare", value));
    setParams(next);
  }

  const missing = (value: string | null | undefined) => value || t("common.notAvailable");
  const rows = [
    [t("research.status"), (e: typeof entries[number]) => e.tier],
    [t("research.componentType"), (e: typeof entries[number]) => e.primaryCategory],
    [t("research.domains"), (e: typeof entries[number]) => e.domains.join(", ")],
    [t("research.categories"), (e: typeof entries[number]) => e.categories.join(", ")],
    [t("research.topics"), (e: typeof entries[number]) => e.topics.join(", ")],
    [t("research.stars"), (e: typeof entries[number]) => formatNumber(e.stars)],
    [t("research.license"), (e: typeof entries[number]) => e.license],
    [t("research.language"), (e: typeof entries[number]) => e.language],
    [t("research.updated"), (e: typeof entries[number]) => formatDate(e.updatedAt)],
    [t("research.observed"), (e: typeof entries[number]) => formatDate(e.observedAt)],
    [t("research.homepage"), (e: typeof entries[number]) => missing(e.homepageUrl)],
    [t("research.mainSnapshot"), (e: typeof entries[number]) => missing(e.snapshot.mainSha)],
    [t("research.automationSnapshot"), (e: typeof entries[number]) => missing(e.snapshot.automationSha)],
  ] as const;

  return <WorkbenchShell className="workspace-content-page">
    <header className="workspace-page-header"><span>{t("research.eyebrow")}</span><h1>{t("research.title")}</h1><p>{t("research.description")}</p></header>
    <div className="workspace-page-scroll research-layout">
      <aside className="research-picker"><h2>{t("research.add")}</h2><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("research.search")}/><p>{compared.length}/4 {t("research.selected")}</p>{collections.length > 0 && <div className="research-collection-filters"><button className={collectionFilter === null ? "active" : ""} onClick={() => setCollectionFilter(null)}>{t("research.allCatalog")}</button>{collections.map(item => <button key={item.id} className={collectionFilter === item.id ? "active" : ""} onClick={() => setCollectionFilter(item.id)}>{item.name} · {item.entryIds.length}</button>)}</div>}<div>{loading ? <p>{t("common.loading")}</p> : candidates.map(entry => <button key={entry.id} disabled={compared.length >= 4} onClick={() => toggle(entry.id)}><RepositoryVisual entry={entry}/><span><strong>{entry.fullName}</strong><small>{entry.primaryCategory} · {entry.tier}</small></span><b>＋</b></button>)}</div></aside>
      <section className="comparison-area">{missingCount > 0 && <p className="comparison-notice">{missingCount} {t("research.unavailable")}</p>}{compared.length < 2 ? <div className="workspace-empty"><h2>{t("research.selectTwo")}</h2><p>{t("research.selectTwoHint")}</p></div> : <div className="comparison-scroll"><table><thead><tr><th>{t("research.evidenceField")}</th>{compared.map(entry => <th key={entry.id}><RepositoryVisual entry={entry}/><strong>{entry.fullName}</strong><button onClick={() => toggle(entry.id)} aria-label={`${t("research.remove")} ${entry.fullName}`}>×</button></th>)}</tr></thead><tbody>{rows.map(([label, getter]) => { const values = compared.map(getter); const differs = new Set(values).size > 1; return <tr className={differs ? "differs" : ""} key={label}><th>{label}{differs && <small>{t("research.different")}</small>}</th>{values.map((value, index) => <td key={compared[index].id}>{value}</td>)}</tr>; })}</tbody></table></div>}</section>
    </div>
  </WorkbenchShell>;
}

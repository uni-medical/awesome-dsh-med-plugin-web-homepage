import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MarketplaceResults } from "../components/MarketplaceResults";
import { WorkbenchShell } from "../components/WorkbenchShell";
import { buildSmartCollections, type SmartCollection } from "../lib/workspace";
import { useCatalog } from "../state/useCatalog";
import { useUiLanguage } from "../state/useUiLanguage";
import { useWorkspace } from "../state/WorkspaceContext";
import "../styles/marketplace.css";

export function CollectionsPage() {
  const { entries, loading } = useCatalog();
  const { collections, createCollection, renameCollection, deleteCollection } = useWorkspace();
  const { zh, t } = useUiLanguage();
  const navigate = useNavigate();
  const smart = useMemo(() => buildSmartCollections(entries), [entries]);
  const [active, setActive] = useState<{ kind: "smart" | "personal"; id: string } | null>(null);
  const [name, setName] = useState("");
  const selected = active?.kind === "smart" ? smart.find(item => item.id === active.id) : collections.find(item => item.id === active?.id);
  const selectedEntries = selected ? selected.entryIds.map(id => entries.find(entry => entry.id === id)).filter((entry): entry is typeof entries[number] => Boolean(entry)) : [];

  function smartCopy(item: SmartCollection) {
    if (!zh) return { name: item.name, description: item.description };
    const fixed: Record<string, { name: string; description: string }> = {
      medical: { name: "医疗组件", description: "被归类到医疗领域的组件。" },
      general: { name: "通用组件", description: "适用于通用工作流的组件。" },
      stable: { name: "稳定快照", description: "存在于已审阅主快照中的组件。" },
      candidate: { name: "候选发现", description: "仅存在于自动发现数据中的组件。" },
    };
    return fixed[item.id] ?? { name: item.name, description: `主要类别为 ${item.name} 的组件。` };
  }

  return <WorkbenchShell className="workspace-content-page">
    <header className="workspace-page-header"><span>{t("collections.eyebrow")}</span><h1>{t("collections.title")}</h1><p>{t("collections.description")}</p></header>
    <div className="workspace-page-scroll">
      <section>
        <div className="section-title"><div><span>{t("collections.automatic")}</span><h2>{t("collections.smart")}</h2></div><p>{t("collections.smartHint")}</p></div>
        <div className="smart-grid">{smart.map(item => { const copy = smartCopy(item); return <button key={item.id} className={active?.kind === "smart" && active.id === item.id ? "active" : ""} onClick={() => setActive({ kind: "smart", id: item.id })}><strong>{copy.name}</strong><span>{copy.description}</span><b>{item.entryIds.length}</b></button>; })}</div>
      </section>
      <section>
        <div className="section-title"><div><span>{t("collections.personal")}</span><h2>{t("collections.yours")}</h2></div><p>{t("collections.browserOnly")}</p></div>
        <form className="new-collection" onSubmit={event => { event.preventDefault(); createCollection(name); setName(""); }}><input aria-label={t("collections.nameAria")} value={name} onChange={event => setName(event.target.value)} placeholder={t("collections.namePlaceholder")} maxLength={80}/><button type="submit" disabled={!name.trim()}>{t("collections.create")}</button></form>
        {collections.length ? <div className="personal-list">{collections.map(item => <article key={item.id} className={active?.kind === "personal" && active.id === item.id ? "active" : ""}><button className="collection-open" onClick={() => setActive({ kind: "personal", id: item.id })}><strong>{item.name}</strong><span>{item.entryIds.length} {t("common.repositories")}</span></button><button onClick={() => { const next = window.prompt(t("collections.renamePrompt"), item.name); if (next) renameCollection(item.id, next); }}>{t("collections.rename")}</button><button onClick={() => deleteCollection(item.id)}>{t("collections.delete")}</button></article>)}</div> : <div className="workspace-empty"><h3>{t("collections.emptyTitle")}</h3><p>{t("collections.emptyHint")}</p><Link to="/marketplace">{t("collections.browse")}</Link></div>}
      </section>
      {selected && <section><div className="section-title"><div><span>{t("collections.contents")}</span><h2>{active?.kind === "smart" ? smartCopy(selected as SmartCollection).name : selected.name}</h2></div><p>{selectedEntries.length} {t("common.repositories")}</p></div>{loading ? <p>{t("common.loading")}</p> : selectedEntries.length ? <MarketplaceResults entries={selectedEntries} view="cards" onSelect={entry => navigate(`/marketplace?entry=${encodeURIComponent(entry.id)}`)}/>: <div className="workspace-empty"><h3>{t("collections.collectionEmpty")}</h3><p>{t("collections.collectionEmptyHint")}</p></div>}</section>}
    </div>
  </WorkbenchShell>;
}

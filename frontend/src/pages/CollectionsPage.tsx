import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MarketplaceResults } from "../components/MarketplaceResults";
import { WorkbenchShell } from "../components/WorkbenchShell";
import { buildSmartCollections } from "../lib/workspace";
import { useCatalog } from "../state/useCatalog";
import { useWorkspace } from "../state/WorkspaceContext";
import "../styles/marketplace.css";

export function CollectionsPage() {
  const { entries, loading } = useCatalog();
  const { collections, createCollection, renameCollection, deleteCollection } = useWorkspace();
  const smart = useMemo(() => buildSmartCollections(entries), [entries]);
  const [active, setActive] = useState<{ kind: "smart" | "personal"; id: string } | null>(null);
  const [name, setName] = useState("");
  const selected = active?.kind === "smart" ? smart.find(item => item.id === active.id) : collections.find(item => item.id === active?.id);
  const selectedEntries = selected ? selected.entryIds.map(id => entries.find(entry => entry.id === id)).filter((entry): entry is typeof entries[number] => Boolean(entry)) : [];
  return <WorkbenchShell className="workspace-content-page"><header className="workspace-page-header"><span>WORKSPACE</span><h1>Collections</h1><p>Use live catalog groups or organize repositories into private, browser-local collections.</p></header><div className="workspace-page-scroll">
    <section><div className="section-title"><div><span>AUTOMATIC</span><h2>Smart collections</h2></div><p>Calculated from the current catalog snapshot.</p></div><div className="smart-grid">{smart.map(item => <button key={item.id} className={active?.kind === "smart" && active.id === item.id ? "active" : ""} onClick={() => setActive({ kind: "smart", id: item.id })}><strong>{item.name}</strong><span>{item.description}</span><b>{item.entryIds.length}</b></button>)}</div></section>
    <section><div className="section-title"><div><span>PERSONAL</span><h2>Your collections</h2></div><p>Stored only in this browser.</p></div><form className="new-collection" onSubmit={event => { event.preventDefault(); createCollection(name); setName(""); }}><input aria-label="Collection name" value={name} onChange={event => setName(event.target.value)} placeholder="Name a new collection" maxLength={80}/><button type="submit" disabled={!name.trim()}>Create collection</button></form>{collections.length ? <div className="personal-list">{collections.map(item => <article key={item.id} className={active?.kind === "personal" && active.id === item.id ? "active" : ""}><button className="collection-open" onClick={() => setActive({ kind: "personal", id: item.id })}><strong>{item.name}</strong><span>{item.entryIds.length} repositories</span></button><button onClick={() => { const next = window.prompt("Rename collection", item.name); if (next) renameCollection(item.id, next); }}>Rename</button><button onClick={() => deleteCollection(item.id)}>Delete</button></article>)}</div> : <div className="workspace-empty"><h3>No personal collections</h3><p>Create one here, then save repositories from Marketplace.</p><Link to="/marketplace">Browse Marketplace →</Link></div>}</section>
    {selected && <section><div className="section-title"><div><span>CONTENTS</span><h2>{selected.name}</h2></div><p>{selectedEntries.length} repositories</p></div>{loading ? <p>Loading…</p> : selectedEntries.length ? <MarketplaceResults entries={selectedEntries} view="cards" onSelect={entry => { window.location.href = `${import.meta.env.BASE_URL}marketplace?entry=${encodeURIComponent(entry.id)}`; }}/>: <div className="workspace-empty"><h3>This collection is empty</h3><p>Save repositories from Marketplace to see them here.</p></div>}</section>}
  </div></WorkbenchShell>;
}

import type { KeyboardEvent } from "react";
import type { CatalogEntry } from "../lib/catalog";
import type { MarketplaceView } from "../lib/marketplace";

const formatDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));

function visualVariant(entry: CatalogEntry) {
  return [...entry.fullName].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 6;
}
function EntryVisual({ entry, large = false }: { entry: CatalogEntry; large?: boolean }) {
  const initials = entry.primaryCategory.split(/\s+/).map(part => part[0]).join("").slice(0, 3).toUpperCase();
  return <div className={`entry-visual visual-${visualVariant(entry)}${large ? " is-large" : ""}`} aria-hidden="true"><span>{initials}</span><i/><i/></div>;
}

function EntryActions({ entry, onSelect }: { entry: CatalogEntry; onSelect: (entry: CatalogEntry) => void }) {
  return <div className="result-actions"><button type="button" onClick={(event) => { event.stopPropagation(); onSelect(entry); }}>View details</button><a href={entry.repositoryUrl} onClick={event => event.stopPropagation()} target="_blank" rel="noopener noreferrer">Repository ↗</a></div>;
}

function selectFromCard(event: KeyboardEvent<HTMLElement>, entry: CatalogEntry, onSelect: (entry: CatalogEntry) => void) {
  if (event.target !== event.currentTarget) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect(entry);
  }
}

interface ResultProps {
  entries: CatalogEntry[];
  selectedId?: string;
  onSelect: (entry: CatalogEntry) => void;
}

function CardView({ entries, selectedId, onSelect }: ResultProps) {
  return <div className="repository-cards">{entries.map(entry => <article className={`repository-card${selectedId === entry.id ? " is-selected" : ""}`} key={entry.id} tabIndex={0} onClick={() => onSelect(entry)} onKeyDown={event => selectFromCard(event, entry, onSelect)}>
    <EntryVisual entry={entry}/>
    <div className="repository-card-copy">
      <div className="result-kicker"><span className={entry.tier}>{entry.tier}</span><code>{entry.primaryCategory}</code><span>★ {entry.stars.toLocaleString("en-US")}</span></div>
      <h2>{entry.fullName}</h2>
      <p>{entry.description ?? "No source description provided."}</p>
      <div className="result-meta"><span>{entry.domains.join(" · ")}</span><span>{entry.license}</span><span>{entry.language}</span><time dateTime={entry.updatedAt}>Updated {formatDate(entry.updatedAt)}</time></div>
      <div className="result-footer"><div className="compact-tags">{entry.topics.slice(0, 4).map(topic => <span key={topic}>{topic}</span>)}</div><EntryActions entry={entry} onSelect={onSelect}/></div>
    </div>
  </article>)}</div>;
}

function TableView({ entries, selectedId, onSelect }: ResultProps) {
  return <div className="workbench-table-scroll"><table className="workbench-table"><thead><tr><th>Project</th><th>Status</th><th>Category</th><th>Domain</th><th>Stars</th><th>License</th><th>Language</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{entries.map(entry => <tr className={selectedId === entry.id ? "is-selected" : ""} key={entry.id} tabIndex={0} onClick={() => onSelect(entry)} onKeyDown={event => selectFromCard(event, entry, onSelect)}>
    <th scope="row"><strong>{entry.fullName}</strong><small>{entry.source}</small></th>
    <td><span className={entry.tier}>{entry.tier}</span></td><td>{entry.primaryCategory}</td><td>{entry.domains.join(" · ")}</td><td>★ {entry.stars.toLocaleString("en-US")}</td><td>{entry.license}</td><td>{entry.language}</td><td>{formatDate(entry.updatedAt)}</td><td><EntryActions entry={entry} onSelect={onSelect}/></td>
  </tr>)}</tbody></table></div>;
}

function GalleryView({ entries, selectedId, onSelect }: ResultProps) {
  return <div className="repository-gallery">{entries.map(entry => <article className={`gallery-card${selectedId === entry.id ? " is-selected" : ""}`} key={entry.id} tabIndex={0} onClick={() => onSelect(entry)} onKeyDown={event => selectFromCard(event, entry, onSelect)}>
    <EntryVisual entry={entry} large/>
    <div className="gallery-copy"><div className="result-kicker"><span className={entry.tier}>{entry.tier}</span><span>★ {entry.stars.toLocaleString("en-US")}</span></div><h2>{entry.fullName}</h2><p>{entry.description ?? "No source description provided."}</p><div className="compact-tags">{[entry.primaryCategory, ...entry.domains, ...entry.topics].slice(0, 4).map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div><EntryActions entry={entry} onSelect={onSelect}/></div>
  </article>)}</div>;
}

export function MarketplaceResults({ view, ...props }: ResultProps & { view: MarketplaceView }) {
  if (view === "table") return <TableView {...props}/>;
  if (view === "gallery") return <GalleryView {...props}/>;
  return <CardView {...props}/>;
}

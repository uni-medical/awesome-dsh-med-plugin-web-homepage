import type { KeyboardEvent } from "react";
import type { CatalogEntry } from "../lib/catalog";
import type { MarketplaceView } from "../lib/marketplace";
import { RepositoryVisual } from "./RepositoryVisual";
import { CollectionPicker } from "./CollectionPicker";
import { useUiLanguage } from "../state/useUiLanguage";

function EntryActions({ entry, onSelect }: { entry: CatalogEntry; onSelect: (entry: CatalogEntry) => void }) {
  const { t } = useUiLanguage();
  return <div className="result-actions"><button type="button" onClick={(event) => { event.stopPropagation(); onSelect(entry); }}>{t("results.viewDetails")}</button><CollectionPicker entryId={entry.id}/><a href={entry.repositoryUrl} onClick={event => event.stopPropagation()} target="_blank" rel="noopener noreferrer">{t("results.repository")} ↗</a></div>;
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
  const { formatDate, formatNumber, t } = useUiLanguage();
  return <div className="repository-cards">{entries.map(entry => <article data-entry-id={entry.id} className={`repository-card${selectedId === entry.id ? " is-selected" : ""}`} key={entry.id} tabIndex={0} onClick={() => onSelect(entry)} onKeyDown={event => selectFromCard(event, entry, onSelect)}>
    <RepositoryVisual entry={entry}/>
    <div className="repository-card-copy">
      <div className="result-kicker"><span className={entry.tier}>{entry.tier}</span><code>{entry.primaryCategory}</code><span>★ {formatNumber(entry.stars)}</span></div>
      <h2>{entry.fullName}</h2>
      <p>{entry.description ?? t("results.noDescription")}</p>
      <div className="result-meta"><span>{entry.domains.join(" · ")}</span><span>{entry.license}</span><span>{entry.language}</span><time dateTime={entry.updatedAt}>{t("results.updated")} {formatDate(entry.updatedAt)}</time></div>
      <div className="result-footer"><div className="compact-tags">{entry.topics.slice(0, 4).map(topic => <span key={topic}>{topic}</span>)}</div><EntryActions entry={entry} onSelect={onSelect}/></div>
    </div>
  </article>)}</div>;
}

function TableView({ entries, selectedId, onSelect }: ResultProps) {
  const { formatDate, formatNumber, t } = useUiLanguage();
  return <div className="workbench-table-scroll"><table className="workbench-table"><thead><tr><th>{t("results.project")}</th><th>{t("results.status")}</th><th>{t("results.category")}</th><th>{t("results.domain")}</th><th>{t("results.stars")}</th><th>{t("results.license")}</th><th>{t("results.language")}</th><th>{t("results.updated")}</th><th>{t("results.actions")}</th></tr></thead><tbody>{entries.map(entry => <tr data-entry-id={entry.id} className={selectedId === entry.id ? "is-selected" : ""} key={entry.id} tabIndex={0} onClick={() => onSelect(entry)} onKeyDown={event => selectFromCard(event, entry, onSelect)}>
    <th scope="row"><div className="table-project"><RepositoryVisual entry={entry} className="table-project-visual"/><span><strong>{entry.fullName}</strong><small>{entry.source}</small></span></div></th>
    <td><span className={entry.tier}>{entry.tier}</span></td><td>{entry.primaryCategory}</td><td>{entry.domains.join(" · ")}</td><td>★ {formatNumber(entry.stars)}</td><td>{entry.license}</td><td>{entry.language}</td><td>{formatDate(entry.updatedAt)}</td><td><EntryActions entry={entry} onSelect={onSelect}/></td>
  </tr>)}</tbody></table></div>;
}

function GalleryView({ entries, selectedId, onSelect }: ResultProps) {
  const { formatNumber, t } = useUiLanguage();
  return <div className="repository-gallery">{entries.map(entry => <article data-entry-id={entry.id} className={`gallery-card${selectedId === entry.id ? " is-selected" : ""}`} key={entry.id} tabIndex={0} onClick={() => onSelect(entry)} onKeyDown={event => selectFromCard(event, entry, onSelect)}>
    <RepositoryVisual entry={entry} large/>
    <div className="gallery-copy"><div className="result-kicker"><span className={entry.tier}>{entry.tier}</span><span>★ {formatNumber(entry.stars)}</span></div><h2>{entry.fullName}</h2><p>{entry.description ?? t("results.noDescription")}</p><div className="compact-tags">{[entry.primaryCategory, ...entry.domains, ...entry.topics].slice(0, 4).map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div><EntryActions entry={entry} onSelect={onSelect}/></div>
  </article>)}</div>;
}

export function MarketplaceResults({ view, ...props }: ResultProps & { view: MarketplaceView }) {
  if (view === "table") return <TableView {...props}/>;
  if (view === "gallery") return <GalleryView {...props}/>;
  return <CardView {...props}/>;
}

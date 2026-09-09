import { useEffect, useRef } from "react";
import type { CatalogEntry } from "../lib/catalog";
const fmt = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
const Missing = () => <span className="missing">Not available</span>;
export function EntryDetail({entry, onClose}: {entry: CatalogEntry; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog className="entry-detail" ref={ref} onCancel={onClose} onClose={onClose} aria-labelledby="entry-title"><button className="close" onClick={onClose} aria-label="Close entry details">×</button>
    <header className="detail-hero"><div><span className={entry.tier}>{entry.tier}</span><code>{entry.primaryCategory}</code><h2 id="entry-title">{entry.fullName}</h2><p>{entry.description ?? "No source description provided."}</p></div><div className="detail-stat"><strong>★ {entry.stars.toLocaleString("en-US")}</strong><small>observed stars</small></div></header>
    <section className="detail-section"><h3>Identity</h3><dl><div><dt>Repository</dt><dd>{entry.fullName}</dd></div><div><dt>Source</dt><dd>{entry.source}</dd></div><div><dt>License</dt><dd>{entry.license}</dd></div><div><dt>Language</dt><dd>{entry.language}</dd></div></dl></section>
    <section className="detail-section"><h3>Evidence snapshot</h3><dl><div><dt>Updated</dt><dd>{fmt(entry.updatedAt)}</dd></div><div><dt>Observed</dt><dd>{fmt(entry.observedAt)}</dd></div><div><dt>Main snapshot SHA</dt><dd>{entry.snapshot.mainSha ?? <Missing/>}</dd></div><div><dt>Automation snapshot SHA</dt><dd>{entry.snapshot.automationSha ?? <Missing/>}</dd></div></dl></section>
    <section className="detail-section"><h3>Classification</h3><div className="detail-tags">{entry.categories.map(v=><span key={v}>{v}</span>)}{entry.domains.map(v=><span key={v}>{v}</span>)}{entry.topics.map(v=><span key={v}>{v}</span>)}</div></section>
    <section className="detail-section detail-links"><h3>Links</h3><a href={entry.repositoryUrl} target="_blank" rel="noopener noreferrer">Open repository ↗</a>{entry.homepageUrl && <a href={entry.homepageUrl} target="_blank" rel="noopener noreferrer">Project homepage ↗</a>}</section>
    <p className="disclosure">Stable means present in the reviewed main snapshot; Candidate means present only in the automated discovery snapshot. Neither indicates medical validation, security review, compatibility, or quality.</p></dialog>;
}

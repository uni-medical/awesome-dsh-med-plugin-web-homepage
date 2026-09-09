import { useEffect, useRef } from "react";
import type { CatalogEntry } from "../lib/catalog";

const fmt = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
const Missing = () => <span className="missing">Not available</span>;

export function EntryDetail({ entry, onClose }: { entry?: CatalogEntry; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [entry?.id]);

  if (!entry) return <aside className="entry-detail-pane empty-detail" aria-label="Repository details"><div><span>RESEARCH PROFILE</span><h2>Select a repository</h2><p>Choose View details from any result to inspect its identity, source snapshot, classification, and links.</p></div></aside>;

  return <aside className="entry-detail-pane" aria-labelledby="entry-title"><div ref={ref} className="detail-scroll">
    <header className="detail-hero"><button type="button" className="detail-close" onClick={onClose} aria-label="Close details">×</button><div><div className="detail-badges"><span className={entry.tier}>{entry.tier}</span><code>{entry.primaryCategory}</code>{entry.domains.map(domain => <code key={domain}>{domain}</code>)}</div><h2 id="entry-title">{entry.fullName}</h2><p>{entry.description ?? "No source description provided."}</p></div><div className="detail-stat"><strong>★ {entry.stars.toLocaleString("en-US")}</strong><small>observed stars</small></div></header>
    <section className="detail-section"><h3><span>01</span> Identity</h3><dl><div><dt>Repository</dt><dd>{entry.fullName}</dd></div><div><dt>Source</dt><dd>{entry.source}</dd></div><div><dt>License</dt><dd>{entry.license}</dd></div><div><dt>Language</dt><dd>{entry.language}</dd></div></dl></section>
    <section className="detail-section"><h3><span>02</span> Evidence snapshot</h3><dl><div><dt>Updated</dt><dd>{fmt(entry.updatedAt)}</dd></div><div><dt>Observed</dt><dd>{fmt(entry.observedAt)}</dd></div><div><dt>Main snapshot SHA</dt><dd className="sha-value">{entry.snapshot.mainSha ?? <Missing/>}</dd></div><div><dt>Automation snapshot SHA</dt><dd className="sha-value">{entry.snapshot.automationSha ?? <Missing/>}</dd></div></dl></section>
    <section className="detail-section"><h3><span>03</span> Classification</h3><div className="detail-tags">{entry.categories.map(v => <span key={`category-${v}`}>{v}</span>)}{entry.domains.map(v => <span key={`domain-${v}`}>{v}</span>)}{entry.topics.map(v => <span key={`topic-${v}`}>{v}</span>)}</div></section>
    <section className="detail-section detail-links"><h3><span>04</span> Links</h3><div><a className="primary-detail-link" href={entry.repositoryUrl} target="_blank" rel="noopener noreferrer">Open repository ↗</a>{entry.homepageUrl ? <a href={entry.homepageUrl} target="_blank" rel="noopener noreferrer">Project homepage ↗</a> : <span className="missing-link">Homepage not available</span>}</div></section>
    <section className="detail-section disclosure"><h3><span>05</span> Disclosure</h3><p>Stable means present in the reviewed main snapshot; Candidate means present only in the automated discovery snapshot. Neither indicates medical validation, security review, compatibility, or quality.</p></section>
  </div></aside>;
}

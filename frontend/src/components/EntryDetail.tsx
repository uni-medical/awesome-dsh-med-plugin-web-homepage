import { useEffect, useRef, useState } from "react";
import { resolveRepositoryVisual } from "../data/repositoryVisuals";
import type { CatalogEntry } from "../lib/catalog";
import { RepositoryVisual } from "./RepositoryVisual";
import { CollectionPicker } from "./CollectionPicker";

const fmt = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
const Missing = () => <span className="missing">Not available</span>;

export function EntryDetail({ entry, onClose, focusOnOpen = false }: { entry?: CatalogEntry; onClose: () => void; focusOnOpen?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [displayedEntry, setDisplayedEntry] = useState(entry);
  const [transition, setTransition] = useState<"idle" | "out" | "in">("idle");
  const pendingEntryRef = useRef(entry);
  const displayedEntryRef = useRef(entry);
  const swapTimerRef = useRef<number | undefined>(undefined);
  const settleTimerRef = useRef<number | undefined>(undefined);
  const reduced = document.documentElement.dataset.motion === "reduced"
    || (document.documentElement.dataset.motion !== "full" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    pendingEntryRef.current = entry;
    window.clearTimeout(swapTimerRef.current);
    window.clearTimeout(settleTimerRef.current);
    if (displayedEntryRef.current?.id === entry?.id) return;
    if (reduced) {
      displayedEntryRef.current = entry;
      setDisplayedEntry(entry);
      setTransition("idle");
      return;
    }
    setTransition("out");
    swapTimerRef.current = window.setTimeout(() => {
      const nextEntry = pendingEntryRef.current;
      displayedEntryRef.current = nextEntry;
      setDisplayedEntry(nextEntry);
      ref.current?.scrollTo({ top: 0, behavior: "instant" });
      setTransition("in");
      settleTimerRef.current = window.setTimeout(() => setTransition("idle"), 420);
    }, 145);
    return () => {
      window.clearTimeout(swapTimerRef.current);
      window.clearTimeout(settleTimerRef.current);
    };
  }, [entry, reduced]);

  useEffect(() => {
    if (focusOnOpen) ref.current?.focus({ preventScroll: true });
  }, [displayedEntry?.id, focusOnOpen]);

  if (!displayedEntry) return <aside className="entry-detail-pane empty-detail" aria-label="Repository details"><div><span>RESEARCH PROFILE</span><h2>Select a repository</h2><p>Choose View details from any result to inspect its identity, source snapshot, classification, and links.</p></div></aside>;

  const currentEntry = displayedEntry;
  const visual = resolveRepositoryVisual(currentEntry.id);
  const visualLabel = visual?.sourceKind === "github-owner-avatar" ? "GitHub owner avatar" : visual?.sourceKind === "homepage-icon" ? "Official homepage icon" : visual?.sourceKind === "generated-neutral-visual" ? "Generated neutral visual" : "Official project logo";

  return <aside className="entry-detail-pane" aria-labelledby="entry-title" aria-busy={transition === "out"}><div ref={ref} className="detail-scroll" tabIndex={-1}>
    <div className={`detail-content${transition === "out" ? " is-switching-out" : transition === "in" ? " is-switching-in" : ""}`} aria-live="polite">
      <header className="detail-hero"><button type="button" className="detail-close" onClick={onClose} aria-label="Close details">×</button><RepositoryVisual entry={currentEntry} className="detail-entry-visual"/><div className="detail-hero-copy"><div className="detail-badges"><span className={currentEntry.tier}>{currentEntry.tier}</span><code>{currentEntry.primaryCategory}</code>{currentEntry.domains.map(domain => <code key={domain}>{domain}</code>)}</div><h2 id="entry-title">{currentEntry.fullName}</h2><p>{currentEntry.description ?? "No source description provided."}</p></div><div className="detail-stat"><strong>★ {currentEntry.stars.toLocaleString("en-US")}</strong><small>observed stars</small></div></header>
      <section className="detail-section"><h3><span>01</span> Identity</h3><dl><div><dt>Repository</dt><dd>{currentEntry.fullName}</dd></div><div><dt>Source</dt><dd>{currentEntry.source}</dd></div><div><dt>License</dt><dd>{currentEntry.license}</dd></div><div><dt>Language</dt><dd>{currentEntry.language}</dd></div></dl></section>
      <section className="detail-section"><h3><span>02</span> Evidence snapshot</h3><dl><div><dt>Updated</dt><dd>{fmt(currentEntry.updatedAt)}</dd></div><div><dt>Observed</dt><dd>{fmt(currentEntry.observedAt)}</dd></div><div><dt>Main snapshot SHA</dt><dd className="sha-value">{currentEntry.snapshot.mainSha ?? <Missing/>}</dd></div><div><dt>Automation snapshot SHA</dt><dd className="sha-value">{currentEntry.snapshot.automationSha ?? <Missing/>}</dd></div></dl></section>
      <section className="detail-section"><h3><span>03</span> Classification</h3><div className="detail-tags">{currentEntry.categories.map(v => <span key={`category-${v}`}>{v}</span>)}{currentEntry.domains.map(v => <span key={`domain-${v}`}>{v}</span>)}{currentEntry.topics.map(v => <span key={`topic-${v}`}>{v}</span>)}</div></section>
      <section className="detail-section detail-links"><h3><span>04</span> Links</h3><div><CollectionPicker entryId={currentEntry.id}/><a className="primary-detail-link" href={currentEntry.repositoryUrl} target="_blank" rel="noopener noreferrer">Open repository ↗</a>{currentEntry.homepageUrl ? <a href={currentEntry.homepageUrl} target="_blank" rel="noopener noreferrer">Project homepage ↗</a> : <span className="missing-link">Homepage not available</span>}{visual?.sourceUrl ? <a href={visual.sourceUrl} title={visual.usageNote} target="_blank" rel="noopener noreferrer">Visual source · {visualLabel} ↗</a> : visual ? <span className="missing-link" title={visual.usageNote}>Generated neutral visual</span> : <span className="missing-link">Visual source not available</span>}</div></section>
      <section className="detail-section disclosure"><h3><span>05</span> Disclosure</h3><p>Stable means present in the reviewed main snapshot; Candidate means present only in the automated discovery snapshot. Neither indicates medical validation, security review, compatibility, or quality.</p></section>
    </div>
  </div></aside>;
}

import { useEffect, useRef, useState } from "react";
import { resolveRepositoryVisual } from "../data/repositoryVisuals";
import type { CatalogEntry } from "../lib/catalog";
import { RepositoryVisual } from "./RepositoryVisual";
import { CollectionPicker } from "./CollectionPicker";
import { useUiLanguage } from "../state/useUiLanguage";

export function EntryDetail({ entry, onClose, focusOnOpen = false }: { entry?: CatalogEntry; onClose: () => void; focusOnOpen?: boolean }) {
  const { formatDate, formatNumber, t } = useUiLanguage();
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

  if (!displayedEntry) return <aside className="entry-detail-pane empty-detail" aria-label={t("details.aria")}><div><span>{t("details.profile")}</span><h2>{t("details.selectTitle")}</h2><p>{t("details.selectHint")}</p></div></aside>;

  const currentEntry = displayedEntry;
  const visual = resolveRepositoryVisual(currentEntry.id);
  const visualLabel = visual?.sourceKind === "github-owner-avatar" ? t("details.visualGithub") : visual?.sourceKind === "homepage-icon" ? t("details.visualHomepage") : visual?.sourceKind === "generated-neutral-visual" ? t("details.visualGenerated") : t("details.visualOfficial");
  const Missing = () => <span className="missing">{t("common.notAvailable")}</span>;

  return <aside className="entry-detail-pane" aria-labelledby="entry-title" aria-busy={transition === "out"}><div ref={ref} className="detail-scroll" tabIndex={-1}>
    <div className={`detail-content${transition === "out" ? " is-switching-out" : transition === "in" ? " is-switching-in" : ""}`} aria-live="polite">
      <header className="detail-hero"><button type="button" className="detail-close" onClick={onClose} aria-label={t("details.close")}>×</button><RepositoryVisual entry={currentEntry} className="detail-entry-visual"/><div className="detail-hero-copy"><div className="detail-badges"><span className={currentEntry.tier}>{currentEntry.tier}</span><code>{currentEntry.primaryCategory}</code>{currentEntry.domains.map(domain => <code key={domain}>{domain}</code>)}</div><h2 id="entry-title">{currentEntry.fullName}</h2><p>{currentEntry.description ?? t("results.noDescription")}</p></div><div className="detail-stat"><strong>★ {formatNumber(currentEntry.stars)}</strong><small>{t("details.observedStars")}</small></div></header>
      <section className="detail-section"><h3><span>01</span> {t("details.identity")}</h3><dl><div><dt>{t("details.repository")}</dt><dd>{currentEntry.fullName}</dd></div><div><dt>{t("details.source")}</dt><dd>{currentEntry.source}</dd></div><div><dt>{t("details.license")}</dt><dd>{currentEntry.license}</dd></div><div><dt>{t("details.language")}</dt><dd>{currentEntry.language}</dd></div></dl></section>
      <section className="detail-section"><h3><span>02</span> {t("details.evidence")}</h3><dl><div><dt>{t("details.updated")}</dt><dd>{formatDate(currentEntry.updatedAt)}</dd></div><div><dt>{t("details.observed")}</dt><dd>{formatDate(currentEntry.observedAt)}</dd></div><div><dt>{t("details.mainSha")}</dt><dd className="sha-value">{currentEntry.snapshot.mainSha ?? <Missing/>}</dd></div><div><dt>{t("details.automationSha")}</dt><dd className="sha-value">{currentEntry.snapshot.automationSha ?? <Missing/>}</dd></div></dl></section>
      <section className="detail-section"><h3><span>03</span> {t("details.classification")}</h3><div className="detail-tags">{currentEntry.categories.map(v => <span key={`category-${v}`}>{v}</span>)}{currentEntry.domains.map(v => <span key={`domain-${v}`}>{v}</span>)}{currentEntry.topics.map(v => <span key={`topic-${v}`}>{v}</span>)}</div></section>
      <section className="detail-section detail-links"><h3><span>04</span> {t("details.links")}</h3><div><CollectionPicker entryId={currentEntry.id}/><a className="primary-detail-link" href={currentEntry.repositoryUrl} target="_blank" rel="noopener noreferrer">{t("details.openRepository")}</a>{currentEntry.homepageUrl ? <a href={currentEntry.homepageUrl} target="_blank" rel="noopener noreferrer">{t("details.projectHomepage")}</a> : <span className="missing-link">{t("details.homepageMissing")}</span>}{visual?.sourceUrl ? <a href={visual.sourceUrl} title={visual.usageNote} target="_blank" rel="noopener noreferrer">{t("details.visualSource")} · {visualLabel} ↗</a> : visual ? <span className="missing-link" title={visual.usageNote}>{t("details.generatedVisual")}</span> : <span className="missing-link">{t("details.visualMissing")}</span>}</div></section>
      <section className="detail-section disclosure"><h3><span>05</span> {t("details.disclosure")}</h3><p>{t("details.disclosureText")}</p></section>
    </div>
  </div></aside>;
}

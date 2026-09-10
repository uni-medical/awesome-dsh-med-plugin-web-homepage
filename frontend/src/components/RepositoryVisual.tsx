import { useState } from "react";
import { repositoryVisualAssetUrl, resolveRepositoryVisual } from "../data/repositoryVisuals";
import type { CatalogEntry } from "../lib/catalog";

function visualVariant(entry: CatalogEntry) {
  return [...entry.fullName].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 6;
}

export function RepositoryVisual({ entry, large = false, className = "" }: { entry: CatalogEntry; large?: boolean; className?: string }) {
  const visual = resolveRepositoryVisual(entry.id);
  const source = repositoryVisualAssetUrl(visual, import.meta.env.BASE_URL);
  const [failedSource, setFailedSource] = useState<string>();
  const showSource = source !== undefined && source !== failedSource;
  const initials = entry.primaryCategory.split(/\s+/).map(part => part[0]).join("").slice(0, 3).toUpperCase();
  const classes = [
    "entry-visual",
    `visual-${visualVariant(entry)}`,
    large ? "is-large" : "",
    showSource ? "has-source" : "",
    className,
  ].filter(Boolean).join(" ");

  return <div className={classes} aria-hidden="true">
    {showSource && <img src={source} alt="" loading="lazy" decoding="async" onError={() => setFailedSource(source)}/>}
    <span>{initials}</span><i/><i/>
  </div>;
}

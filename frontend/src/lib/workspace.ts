import type { CatalogEntry } from "./catalog";
import { clampSplitRatio, type MarketplaceView } from "./marketplace";
import type { UiLocale } from "./i18n";

export type Density = "comfortable" | "compact";
export type MotionMode = "system" | "full" | "reduced";

export interface WorkspacePreferences {
  version: 1;
  locale: UiLocale;
  defaultView: MarketplaceView;
  density: Density;
  motion: MotionMode;
  splitRatio: number;
  rememberSplitRatio: boolean;
  focusDetails: boolean;
}

export interface PersonalCollection {
  id: string;
  name: string;
  entryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SmartCollection {
  id: string;
  name: string;
  description: string;
  entryIds: string[];
}

export const PREFERENCES_KEY = "medical-workbench.preferences.v1";
export const COLLECTIONS_KEY = "medical-workbench.collections.v1";
export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  version: 1, locale: "en", defaultView: "cards", density: "comfortable", motion: "system",
  splitRatio: 56, rememberSplitRatio: true, focusDetails: true,
};

export function parsePreferences(raw: string | null): WorkspacePreferences {
  try {
    const value = JSON.parse(raw ?? "null") as Partial<WorkspacePreferences> | null;
    if (!value || value.version !== 1) return { ...DEFAULT_PREFERENCES };
    return {
      version: 1,
      locale: value.locale === "zh" ? "zh" : "en",
      defaultView: ["cards", "table", "gallery"].includes(value.defaultView ?? "") ? value.defaultView! : DEFAULT_PREFERENCES.defaultView,
      density: value.density === "compact" ? "compact" : "comfortable",
      motion: ["system", "full", "reduced"].includes(value.motion ?? "") ? value.motion! : "system",
      splitRatio: clampSplitRatio(Number(value.splitRatio)),
      rememberSplitRatio: value.rememberSplitRatio !== false,
      focusDetails: value.focusDetails !== false,
    };
  } catch { return { ...DEFAULT_PREFERENCES }; }
}

export function parseCollections(raw: string | null): PersonalCollection[] {
  try {
    const value = JSON.parse(raw ?? "null") as { version?: number; collections?: unknown } | null;
    if (value?.version !== 1 || !Array.isArray(value.collections)) return [];
    return value.collections.filter((item): item is PersonalCollection => {
      if (!item || typeof item !== "object") return false;
      const record = item as Partial<PersonalCollection>;
      return typeof record.id === "string" && typeof record.name === "string" && Array.isArray(record.entryIds);
    }).map(item => ({ ...item, entryIds: item.entryIds.filter(id => typeof id === "string") }));
  } catch { return []; }
}

export function createCollection(collections: PersonalCollection[], name: string, id = crypto.randomUUID()): PersonalCollection[] {
  const now = new Date().toISOString();
  const cleanName = name.trim().slice(0, 80);
  if (!cleanName) return collections;
  return [...collections, { id, name: cleanName, entryIds: [], createdAt: now, updatedAt: now }];
}

export function addEntryToCollection(collections: PersonalCollection[], collectionId: string, entryId: string): PersonalCollection[] {
  return collections.map(item => item.id !== collectionId || item.entryIds.includes(entryId) ? item : { ...item, entryIds: [...item.entryIds, entryId], updatedAt: new Date().toISOString() });
}

export function removeEntryFromCollection(collections: PersonalCollection[], collectionId: string, entryId: string): PersonalCollection[] {
  return collections.map(item => item.id !== collectionId ? item : { ...item, entryIds: item.entryIds.filter(id => id !== entryId), updatedAt: new Date().toISOString() });
}

export function buildSmartCollections(entries: CatalogEntry[]): SmartCollection[] {
  const by = (predicate: (entry: CatalogEntry) => boolean) => entries.filter(predicate).map(entry => entry.id);
  const base: SmartCollection[] = [
    { id: "medical", name: "Medical components", description: "Components classified in the medical domain.", entryIds: by(entry => entry.domains.includes("medical")) },
    { id: "general", name: "General-purpose components", description: "Components classified for general-purpose workflows.", entryIds: by(entry => entry.domains.includes("general")) },
    { id: "stable", name: "Stable snapshot", description: "Present in the reviewed main snapshot.", entryIds: by(entry => entry.tier === "stable") },
    { id: "candidate", name: "Candidate discoveries", description: "Present only in automated discovery data.", entryIds: by(entry => entry.tier === "candidate") },
  ];
  const types = [...new Set(entries.map(entry => entry.primaryCategory))].sort();
  return [...base, ...types.map(type => ({ id: `type-${type.toLowerCase().replaceAll(" ", "-")}`, name: type, description: `Components whose primary category is ${type}.`, entryIds: by(entry => entry.primaryCategory === type) }))];
}

export function toggleComparison(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter(value => value !== id);
  return ids.length >= 4 ? ids : [...ids, id];
}

export function resolveComparisonEntries(entries: CatalogEntry[], ids: string[]): CatalogEntry[] {
  const unique = [...new Set(ids)].slice(0, 4);
  return unique.map(id => entries.find(entry => entry.id === id)).filter((entry): entry is CatalogEntry => Boolean(entry));
}

import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "../src/lib/catalog";
import {
  DEFAULT_PREFERENCES,
  addEntryToCollection,
  buildSmartCollections,
  createCollection,
  parseCollections,
  parsePreferences,
  resolveComparisonEntries,
  toggleComparison,
} from "../src/lib/workspace";

const entries = [
  { id: "a/medical", primaryCategory: "Plugin", domains: ["medical"], tier: "stable" },
  { id: "b/general", primaryCategory: "Tool", domains: ["general"], tier: "candidate" },
  { id: "c/both", primaryCategory: "Plugin", domains: ["medical", "general"], tier: "candidate" },
] as CatalogEntry[];

describe("workspace preferences", () => {
  it("uses safe defaults for missing or malformed stored values", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("broken json")).toEqual(DEFAULT_PREFERENCES);
  });

  it("accepts valid settings and clamps the split ratio", () => {
    const value = JSON.stringify({ version: 1, defaultView: "gallery", density: "compact", motion: "reduced", splitRatio: 99, rememberSplitRatio: false, focusDetails: false });
    expect(parsePreferences(value)).toMatchObject({ defaultView: "gallery", density: "compact", motion: "reduced", splitRatio: 70, rememberSplitRatio: false, focusDetails: false });
  });
});

describe("workspace collections", () => {
  it("builds live smart collections from catalog metadata", () => {
    const smart = buildSmartCollections(entries);
    expect(smart.find(item => item.id === "medical")?.entryIds).toEqual(["a/medical", "c/both"]);
    expect(smart.find(item => item.id === "type-plugin")?.entryIds).toEqual(["a/medical", "c/both"]);
  });

  it("creates named collections and permits membership in multiple collections", () => {
    const first = createCollection([], "Review later", "one");
    const second = createCollection(first, "Clinical", "two");
    const updated = addEntryToCollection(addEntryToCollection(second, "one", "a/medical"), "two", "a/medical");
    expect(updated.every(item => item.entryIds.includes("a/medical"))).toBe(true);
  });

  it("falls back when stored collection data is damaged", () => {
    expect(parseCollections("{}" )).toEqual([]);
    expect(parseCollections("not-json")).toEqual([]);
  });
});

describe("research comparison", () => {
  it("keeps two to four unique ids and ignores missing entries", () => {
    expect(toggleComparison(["a", "b", "c", "d"], "e")).toEqual(["a", "b", "c", "d"]);
    expect(toggleComparison(["a", "b"], "a")).toEqual(["b"]);
    expect(resolveComparisonEntries(entries, ["a/medical", "missing", "b/general"]).map(entry => entry.id)).toEqual(["a/medical", "b/general"]);
  });
});

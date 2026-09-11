import { describe, expect, it } from "vitest";
import { catalog } from "../src/data/catalog";
import { filterCatalog } from "../src/utils/filterCatalog";
import { createStaticCatalogClient } from "../src/api/catalogClient";
import { getCatalogSummary } from "../src/lib/catalog";
describe("catalog", () => {
  it("loads exactly the public records and resolves ids with slashes", async () => {
    const client = createStaticCatalogClient(catalog);
    expect(await client.listEntries()).toHaveLength(20);
    expect(await client.getEntry("bowang-lab/MedSAMSlicer")).toBeDefined();
    expect(await client.getEntry("missing/repo")).toBeUndefined();
  });
  it("combines filters and searches fields without case sensitivity", () => {
    const result = filterCatalog(catalog.entries, new URLSearchParams("type=Plugin&domain=medical&tier=stable&license=NOASSERTION&q=MEDSAM"));
    expect(result.map(e=>e.id)).toEqual(["bowang-lab/MedSAMSlicer"]);
    expect(filterCatalog(catalog.entries,new URLSearchParams("q=nonexistent-xyz"))).toEqual([]);
  });
  it("matches any selected component type when the type parameter is repeated", () => {
    const result = filterCatalog(catalog.entries, new URLSearchParams("type=Plugin&type=MCP+Server"));
    expect(new Set(result.map(entry => entry.primaryCategory))).toEqual(new Set(["Plugin", "MCP Server"]));
    expect(result).toHaveLength(8);
    expect(filterCatalog(catalog.entries, new URLSearchParams("type=&type=Plugin"))).toHaveLength(4);
  });
  it("searches tags and handles absent descriptions", () => {
    const e = {...catalog.entries[0], description:null, topics:["special-tag"]};
    expect(filterCatalog([e],new URLSearchParams("q=special-tag"))).toHaveLength(1);
    expect(filterCatalog([e],new URLSearchParams("q=Plugin"))).toHaveLength(1);
  });
  it("derives the homepage summary from the checked-in snapshot", () => {
    expect(getCatalogSummary(catalog.entries)).toEqual({
      total: 20,
      stable: 10,
      candidate: 10,
      medical: 9,
    });
    expect(new Set(catalog.entries.map((entry) => entry.primaryCategory))).toHaveLength(5);
  });
  it("keeps live-only and evaluative claims out of public records", () => {
    const prohibitedFields = [
      "downloads",
      "qualityScore",
      "verified",
      "matched_queries",
      "relevance_evidence",
    ];
    for (const entry of catalog.entries) {
      expect(entry.repositoryUrl).toMatch(/^https:\/\/github\.com\//);
      expect(prohibitedFields.some((field) => field in entry)).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import { catalog } from "../src/data/catalog";
import { getLandingEvidence, landingCopy } from "../src/lib/landing";

describe("landing evidence", () => {
  it("derives every metric from the supplied snapshot", () => {
    const evidence = getLandingEvidence(catalog);
    expect(evidence.total).toBe(catalog.entries.length);
    expect(evidence.medical).toBe(catalog.entries.filter(entry => entry.domains.includes("medical")).length);
    expect(evidence.types).toEqual([...new Set(catalog.entries.map(entry => entry.primaryCategory))].sort());
    expect(evidence.generatedAt).toBe(catalog.generatedAt);
    expect(getLandingEvidence({ ...catalog, entries: [] })).toMatchObject({ total: 0, medical: 0, types: [] });
  });
  it("offers the same information in both interface languages", () => {
    expect(Object.keys(landingCopy.zh).sort()).toEqual(Object.keys(landingCopy.en).sort());
    expect(landingCopy.zh.browse).toBe("浏览组件市场");
    expect(landingCopy.en.browse).toBe("Browse Marketplace");
  });
});

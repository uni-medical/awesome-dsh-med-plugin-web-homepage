import { describe, expect, it } from "vitest";
import summary from "../src/data/componentSummary.json";
import { getLandingEvidence, landingCopy } from "../src/lib/landing";

describe("landing evidence", () => {
  it("derives every metric from the generated catalogue summary", () => {
    const evidence = getLandingEvidence(summary);
    expect(evidence.total).toBe(summary.total);
    expect(evidence.evaluated).toBe(summary.evaluated);
    expect(evidence.evaluated).toBeLessThanOrEqual(evidence.total);
    expect(evidence.types).toEqual(Object.keys(summary.byType).sort());
    expect(evidence.snapshotAt).toBe(Object.values(summary.upstream).map(source => source.committedAt).sort().at(-1));
  });

  it("handles an empty summary", () => {
    expect(getLandingEvidence({ total: 0, evaluated: 0, byType: {}, upstream: {} })).toEqual({ total: 0, evaluated: 0, types: [], snapshotAt: "" });
  });

  it("offers the same information in both interface languages", () => {
    expect(Object.keys(landingCopy.zh).sort()).toEqual(Object.keys(landingCopy.en).sort());
    expect(landingCopy.zh.browse).toBe("浏览组件生态");
  });
});

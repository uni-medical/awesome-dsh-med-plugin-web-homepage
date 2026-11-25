import { describe, expect, it } from "vitest";
import { decodePlanShare, encodePlanShare, exportPlanFile, mergePlans, parsePlanFile, PLAN_LIMIT, resolvePlanIds, sharePlanUrl, type PlanItem } from "../src/lib/plan";

const a: PlanItem = { id: "mcp:o/r/fhir_read", name: "FHIR Read", type: "mcp", repo: "o/r" };
const b: PlanItem = { id: "skill:中文/路径/x", name: "X", type: "skill", repo: "中文/路径" };

describe("plan share links", () => {
  it("round-trips ids, including non-ASCII ones, through a URL-safe value", () => {
    const value = encodePlanShare([a, b]);
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodePlanShare(value)).toEqual([a.id, b.id]);
  });

  it("builds a link to the component ecosystem under the site base path", () => {
    expect(sharePlanUrl([a], "https://example.org", "/base/")).toBe(`https://example.org/base/marketplace?plan=${encodePlanShare([a])}`);
  });

  it("ignores malformed or hostile values", () => {
    expect(decodePlanShare(null)).toEqual([]);
    expect(decodePlanShare("%%%")).toEqual([]);
    expect(decodePlanShare(encodePlanShare([]))).toEqual([]);
    const hostile = btoa(JSON.stringify([1, null, "ok", "ok", "x".repeat(600)])).replace(/=+$/, "");
    expect(decodePlanShare(hostile)).toEqual(["ok"]);
    expect(decodePlanShare(btoa(JSON.stringify(Array.from({ length: PLAN_LIMIT + 5 }, (_, i) => `id${i}`))))).toHaveLength(PLAN_LIMIT);
  });
});

describe("plan files", () => {
  it("exports a readable file and imports its ids", () => {
    const file = exportPlanFile([a, b], "2026-11-25T00:00:00.000Z");
    expect(JSON.parse(file)).toMatchObject({ kind: "medical-component-plan", version: 1, exportedAt: "2026-11-25T00:00:00.000Z", items: [a, b] });
    expect(parsePlanFile(file)).toEqual([a.id, b.id]);
  });

  it("rejects files that are not plans", () => {
    expect(parsePlanFile("not json")).toEqual([]);
    expect(parsePlanFile(JSON.stringify({ kind: "something-else", version: 1, items: [a] }))).toEqual([]);
    expect(parsePlanFile(JSON.stringify({ version: 2, items: [a] }))).toEqual([]);
  });

  it("resolves ids against the catalogue and reports unknown ones", () => {
    const byId = new Map([[a.id, { ...a, name: "FHIR Read (current)" }]]);
    expect(resolvePlanIds([a.id, "gone"], byId)).toEqual({ items: [{ ...a, name: "FHIR Read (current)" }], missing: ["gone"] });
  });

  it("merges without duplicates, keeping the current order first", () => {
    expect(mergePlans([a], [b, a]).map(item => item.id)).toEqual([a.id, b.id]);
  });
});

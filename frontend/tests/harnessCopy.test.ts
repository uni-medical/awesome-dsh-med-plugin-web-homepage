import { describe, expect, it } from "vitest";
import { HARNESS_ADAPTATION, HARNESS_LAYERS } from "../src/lib/componentCopy";

const CJK = /[㐀-鿿]/;
const ALLOWED_LATIN = /\b(Skill|MCP|CLI|Preset|Profile)\b/g;

describe("harness adaptation copy", () => {
  it("covers the capability environment and the four mechanism classes in both languages", () => {
    expect(HARNESS_LAYERS).toEqual(["capability", "orchestration", "contextMemory", "permissions", "evaluationFeedback"]);
    for (const locale of ["en", "zh"] as const) {
      for (const layer of HARNESS_LAYERS) {
        expect(HARNESS_ADAPTATION[locale][layer].provides.trim()).not.toBe("");
        expect(HARNESS_ADAPTATION[locale][layer].split.trim()).not.toBe("");
      }
    }
  });

  it("keeps each language free of the other", () => {
    for (const layer of HARNESS_LAYERS) {
      const en = HARNESS_ADAPTATION.en[layer];
      const zh = HARNESS_ADAPTATION.zh[layer];
      expect(CJK.test(en.provides + en.split)).toBe(false);
      expect((zh.provides + zh.split).replace(ALLOWED_LATIN, "")).not.toMatch(/[A-Za-z]{2,}/);
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  clampSplitRatio,
  DEFAULT_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  parseMarketplaceView,
  getResponsiveSplitBounds,
  resolveSelectedEntry,
  toggleMultiValue,
} from "../src/lib/marketplace";
import { readFileSync } from "node:fs";

describe("marketplace workbench state", () => {
  it("generates static entry points for every workspace route", () => {
    const script = readFileSync(new URL("../scripts/generate-routes.mjs", import.meta.url), "utf8");
    for (const route of ["marketplace", "collections", "research", "settings"]) {
      expect(script).toContain(`\"${route}\"`);
    }
  });

  it("keeps one shared navigation rail across workspace route changes", () => {
    const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const navigation = readFileSync(new URL("../src/components/MarketplaceNavRail.tsx", import.meta.url), "utf8");
    expect(app).toContain("<WorkbenchLayout");
    expect(app).toContain("<Route element={<WorkbenchLayout/>}>");
    expect(navigation.match(/viewTransition/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("animates detail content swaps and keeps the search field intentionally compact", () => {
    const detail = readFileSync(new URL("../src/components/EntryDetail.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../src/styles/marketplace.css", import.meta.url), "utf8");
    expect(detail).toContain("displayedEntry");
    expect(detail).toContain("pendingEntryRef");
    expect(detail).toContain("is-switching-out");
    expect(detail).toContain("is-switching-in");
    expect(styles).toContain(".detail-content.is-switching-out");
    expect(styles).toContain(".detail-content.is-switching-in");
    expect(styles).toMatch(/\.workbench-search\s*\{[^}]*max-width:\s*720px/s);
  });
  it("accepts all supported view query values and defaults invalid values to cards", () => {
    expect(parseMarketplaceView("cards")).toBe("cards");
    expect(parseMarketplaceView("table")).toBe("table");
    expect(parseMarketplaceView("gallery")).toBe("gallery");
    expect(parseMarketplaceView(null)).toBe("cards");
    expect(parseMarketplaceView("grid")).toBe("cards");
  });

  it("keeps the resizable split inside usable panel bounds", () => {
    expect(clampSplitRatio(55)).toBe(55);
    expect(clampSplitRatio(10)).toBe(MIN_SPLIT_RATIO);
    expect(clampSplitRatio(95)).toBe(MAX_SPLIT_RATIO);
    expect(clampSplitRatio(Number.NaN)).toBe(DEFAULT_SPLIT_RATIO);
    expect(clampSplitRatio(Number.NaN, 57, 59)).toBe(57);
  });

  it("protects readable pane widths when the desktop workbench narrows", () => {
    expect(getResponsiveSplitBounds(1600)).toEqual({ min: 40, max: 70 });
    expect(getResponsiveSplitBounds(1000)).toEqual({ min: 52, max: 62 });
    const compact = getResponsiveSplitBounds(920);
    expect(compact.min).toBeGreaterThanOrEqual(56);
    expect(compact.max).toBeGreaterThan(compact.min);
  });

  it("keeps details closed until a repository id is explicitly selected", () => {
    const entries = [{ id: "owner/one" }, { id: "owner/two" }];
    expect(resolveSelectedEntry(entries, null)).toBeUndefined();
    expect(resolveSelectedEntry(entries, "owner/two")).toEqual({ id: "owner/two" });
    expect(resolveSelectedEntry(entries, "missing/repository")).toBeUndefined();
  });

  it("toggles repeated query values without disturbing other filters", () => {
    const params = new URLSearchParams("view=gallery&type=Plugin&type=Skill&domain=medical");
    const removed = toggleMultiValue(params, "type", "Plugin");
    expect(removed.getAll("type")).toEqual(["Skill"]);
    expect(removed.get("view")).toBe("gallery");
    expect(removed.get("domain")).toBe("medical");

    const added = toggleMultiValue(removed, "type", "MCP Server");
    expect(added.getAll("type")).toEqual(["Skill", "MCP Server"]);
  });
});

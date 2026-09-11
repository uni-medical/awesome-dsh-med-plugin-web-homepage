import { describe, expect, it } from "vitest";
import {
  clampSplitRatio,
  DEFAULT_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  parseMarketplaceView,
  resolveSelectedEntry,
  toggleMultiValue,
} from "../src/lib/marketplace";

describe("marketplace workbench state", () => {
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

import { describe, expect, it } from "vitest";
import {
  clampSplitRatio,
  DEFAULT_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  parseMarketplaceView,
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
});

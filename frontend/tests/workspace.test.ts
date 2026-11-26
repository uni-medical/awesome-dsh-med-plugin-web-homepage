import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, clampSplitRatio, parsePreferences } from "../src/lib/workspace";
import { translate } from "../src/lib/i18n";

describe("workspace preferences", () => {
  it("keeps dark as the default for existing browsers without a theme", () => {
    expect(parsePreferences(JSON.stringify({ version: 1, locale: "zh", defaultView: "table", splitRatio: 61 })))
      .toMatchObject({ theme: "dark", locale: "zh", defaultView: "table", splitRatio: 61 });
  });

  it.each(["dark", "light"])("remembers the %s theme without losing other preferences", theme => {
    const stored = { ...DEFAULT_PREFERENCES, theme, locale: "zh", density: "compact", motion: "reduced", splitRatio: 63, defaultView: "gallery" };
    expect(parsePreferences(JSON.stringify(stored))).toEqual(stored);
  });

  it.each(["system", "LIGHT", "", 1, null])("defaults to dark for an invalid theme %s", theme => {
    expect(parsePreferences(JSON.stringify({ ...DEFAULT_PREFERENCES, theme }))).toMatchObject({ theme: "dark" });
  });

  it("uses safe defaults for missing or malformed stored values", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("broken json")).toEqual(DEFAULT_PREFERENCES);
  });

  it("accepts valid settings and clamps the split ratio", () => {
    const value = JSON.stringify({ version: 1, locale: "zh", defaultView: "gallery", density: "compact", motion: "reduced", splitRatio: 99, rememberSplitRatio: false, focusDetails: false });
    expect(parsePreferences(value)).toMatchObject({ locale: "zh", defaultView: "gallery", density: "compact", motion: "reduced", splitRatio: 70, rememberSplitRatio: false, focusDetails: false });
  });

  it("falls back to English for an invalid stored interface language", () => {
    const value = JSON.stringify({ ...DEFAULT_PREFERENCES, version: 1, locale: "fr" });
    expect(parsePreferences(value).locale).toBe("en");
  });

  it("provides stable English and Chinese interface copy", () => {
    expect(translate("en", "nav.marketplace")).toBe("Component ecosystem");
    expect(translate("zh", "nav.marketplace")).toBe("组件生态");
    expect(translate("zh", "nav.graph")).toBe("能力星图");
  });

  it("clamps legacy split ratios kept for preference compatibility", () => {
    expect(clampSplitRatio(10)).toBe(40);
    expect(clampSplitRatio(95)).toBe(70);
    expect(clampSplitRatio(Number.NaN)).toBe(56);
  });
});

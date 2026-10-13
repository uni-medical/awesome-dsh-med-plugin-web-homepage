import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { applyTheme } from "../src/lib/theme";
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, parsePreferences } from "../src/lib/workspace";

const bootstrap = readFileSync(new URL("../public/theme-init.js", import.meta.url), "utf8");

function themeDocument(withMeta = true) {
  const documentElement = { dataset: {} as Record<string, string>, style: { colorScheme: "" } };
  const meta = { setAttribute: vi.fn() };
  return { documentElement, querySelector: vi.fn(() => withMeta ? meta : null), meta };
}

describe("theme application", () => {
  it.each(["light", "dark"] as const)("applies %s to the page, native controls and browser chrome", theme => {
    const target = themeDocument();
    applyTheme(theme, target as unknown as Document);
    expect(target.documentElement.dataset.theme).toBe(theme);
    expect(target.documentElement.style.colorScheme).toBe(theme);
    expect(target.meta.setAttribute).toHaveBeenCalledWith("content", theme === "light" ? "#f6f5f1" : "#080f1b");
  });

  it("can apply the theme without a browser chrome meta element", () => {
    const target = themeDocument(false);
    expect(() => applyTheme("light", target as unknown as Document)).not.toThrow();
    expect(target.documentElement.dataset.theme).toBe("light");
  });
});

describe("theme before first paint", () => {
  it.each([
    null, "broken json", JSON.stringify({ version: 1 }),
    JSON.stringify({ version: 2, theme: "light" }),
    JSON.stringify({ ...DEFAULT_PREFERENCES, theme: "invalid" }),
    JSON.stringify({ ...DEFAULT_PREFERENCES, theme: "dark" }),
    JSON.stringify({ ...DEFAULT_PREFERENCES, theme: "light" }),
  ])("agrees with React's preference parser for stored value %s", raw => {
    const target = themeDocument();
    const getItem = vi.fn(() => raw);
    runInNewContext(bootstrap, { document: target, localStorage: { getItem } });
    expect(getItem).toHaveBeenCalledWith(PREFERENCES_KEY);
    expect(target.documentElement.dataset.theme).toBe(parsePreferences(raw).theme);
    expect(target.documentElement.style.colorScheme).toBe(parsePreferences(raw).theme);
  });

  it("keeps dark when browser storage is blocked", () => {
    const target = themeDocument();
    runInNewContext(bootstrap, { document: target, localStorage: { getItem: () => { throw new Error("Storage blocked"); } } });
    expect(target.documentElement.dataset.theme).toBe("dark");
    // The runtime theme application does not depend on storage access.
    applyTheme("light", target as unknown as Document);
    expect(target.documentElement.dataset.theme).toBe("light");
  });

  it("runs safely even without browser chrome metadata", () => {
    const target = themeDocument(false);
    expect(() => runInNewContext(bootstrap, { document: target, localStorage: { getItem: () => null } })).not.toThrow();
  });
});

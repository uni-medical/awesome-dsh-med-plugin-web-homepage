import type { UiLocale } from "./i18n";

export type Density = "comfortable" | "compact";
export type MotionMode = "system" | "full" | "reduced";
export type ThemeMode = "dark" | "light";
export type LegacyView = "cards" | "table" | "gallery";

export const MIN_SPLIT_RATIO = 40;
export const MAX_SPLIT_RATIO = 70;
export const DEFAULT_SPLIT_RATIO = 56;

/**
 * Browser-local v1 preferences. `defaultView`, `splitRatio`, `rememberSplitRatio`
 * and `focusDetails` belonged to the earlier repository browser; they are still
 * parsed so stored preferences round-trip unchanged.
 */
export interface WorkspacePreferences {
  version: 1;
  locale: UiLocale;
  defaultView: LegacyView;
  density: Density;
  motion: MotionMode;
  theme: ThemeMode;
  splitRatio: number;
  rememberSplitRatio: boolean;
  focusDetails: boolean;
}

export const PREFERENCES_KEY = "medical-workbench.preferences.v1";
export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  version: 1, locale: "en", defaultView: "cards", density: "comfortable", motion: "system", theme: "dark",
  splitRatio: DEFAULT_SPLIT_RATIO, rememberSplitRatio: true, focusDetails: true,
};

export function clampSplitRatio(value: number, min = MIN_SPLIT_RATIO, max = MAX_SPLIT_RATIO): number {
  if (!Number.isFinite(value)) return Math.min(max, Math.max(min, DEFAULT_SPLIT_RATIO));
  return Math.min(max, Math.max(min, value));
}

export function parsePreferences(raw: string | null): WorkspacePreferences {
  try {
    const value = JSON.parse(raw ?? "null") as Partial<WorkspacePreferences> | null;
    if (!value || value.version !== 1) return { ...DEFAULT_PREFERENCES };
    return {
      version: 1,
      locale: value.locale === "zh" ? "zh" : "en",
      defaultView: ["cards", "table", "gallery"].includes(value.defaultView ?? "") ? value.defaultView! : DEFAULT_PREFERENCES.defaultView,
      density: value.density === "compact" ? "compact" : "comfortable",
      motion: ["system", "full", "reduced"].includes(value.motion ?? "") ? value.motion! : "system",
      theme: value.theme === "light" ? "light" : "dark",
      splitRatio: clampSplitRatio(Number(value.splitRatio)),
      rememberSplitRatio: value.rememberSplitRatio !== false,
      focusDetails: value.focusDetails !== false,
    };
  } catch { return { ...DEFAULT_PREFERENCES }; }
}

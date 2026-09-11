export const MARKETPLACE_VIEWS = ["cards", "table", "gallery"] as const;

export type MarketplaceView = (typeof MARKETPLACE_VIEWS)[number];

export const DEFAULT_SPLIT_RATIO = 56;
export const MIN_SPLIT_RATIO = 40;
export const MAX_SPLIT_RATIO = 70;

export function parseMarketplaceView(value: string | null): MarketplaceView {
  return MARKETPLACE_VIEWS.includes(value as MarketplaceView)
    ? (value as MarketplaceView)
    : "cards";
}
export function clampSplitRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPLIT_RATIO;
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, value));
}

export function resolveSelectedEntry<T extends { id: string }>(entries: readonly T[], selectedId: string | null): T | undefined {
  if (!selectedId) return undefined;
  return entries.find(entry => entry.id === selectedId);
}

export function toggleMultiValue(params: URLSearchParams, key: string, value: string): URLSearchParams {
  const next = new URLSearchParams(params);
  const values = next.getAll(key);
  next.delete(key);
  if (values.includes(value)) {
    values.filter(item => item !== value).forEach(item => next.append(key, item));
  } else {
    [...values, value].forEach(item => next.append(key, item));
  }
  return next;
}

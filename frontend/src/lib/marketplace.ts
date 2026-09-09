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

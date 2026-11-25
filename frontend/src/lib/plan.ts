import type { ComponentSummary, ComponentType } from "./components";
import { REPO_PATH, shellNote, shellQuote } from "./shell";

export const PLAN_KEY = "medical-workbench.plan.v1";
export const PLAN_LIMIT = 200;

export interface PlanItem { id: string; name: string; type: ComponentType; repo: string; }

const TYPES = new Set(["skill", "mcp", "cli", "dsh-plugin"]);

export function parsePlan(raw: string | null): PlanItem[] {
  try {
    const value = JSON.parse(raw ?? "null") as { version?: number; items?: unknown } | null;
    if (value?.version !== 1 || !Array.isArray(value.items)) return [];
    const seen = new Set<string>();
    return value.items.filter((item): item is PlanItem => {
      if (!item || typeof item !== "object") return false;
      const record = item as Partial<PlanItem>;
      const valid = typeof record.id === "string" && typeof record.name === "string" && typeof record.repo === "string" && TYPES.has(record.type ?? "") && !seen.has(record.id);
      if (valid) seen.add(record.id!);
      return valid;
    }).slice(0, PLAN_LIMIT).map(({ id, name, type, repo }) => ({ id, name, type, repo }));
  } catch { return []; }
}

export const serialisePlan = (items: readonly PlanItem[]) => JSON.stringify({ version: 1, items });

export function togglePlanItem(items: readonly PlanItem[], component: Pick<ComponentSummary, "id" | "name" | "type" | "repo">): PlanItem[] {
  if (items.some(item => item.id === component.id)) return items.filter(item => item.id !== component.id);
  if (items.length >= PLAN_LIMIT) return [...items];
  return [...items, { id: component.id, name: component.name, type: component.type, repo: component.repo }];
}

export function removePlanItem(items: readonly PlanItem[], id: string): PlanItem[] {
  return items.filter(item => item.id !== id);
}

/** Plain-text list for copying into notes or an agent prompt. */
export function formatPlan(items: readonly PlanItem[]): string {
  return items.map((item, index) => `${index + 1}. ${item.name} (${item.type} · ${item.repo}) — ${item.id}`).join("\n");
}

const SETUP_GUIDE_URL = "https://github.com/uni-medical/awesome-dsh-med-plugin/blob/integrate/README.metaharness.zh.md";

const SCRIPT_COPY = {
  en: { header: (count: number) => `Plan: ${count} components (Medical Component Market)`, setup: `Requires the dsh-med CLI and the pinned DSH: ${SETUP_GUIDE_URL}`, missing: (name: string, repo: string) => `${name}: no upstream install entry; get it from https://github.com/${repo}` },
  zh: { header: (count: number) => `方案：${count} 个组件（Medical Component Market）`, setup: `需要先安装 dsh-med CLI 与固定版本 DSH：${SETUP_GUIDE_URL}`, missing: (name: string, repo: string) => `${name}：上游没有安装条目，请从来源仓库获取 https://github.com/${repo}` },
};

/**
 * Shell script installing every plan item through dsh-med. `installIds` maps a
 * catalogue id to its upstream entry-index id, or null when there is none.
 * Every line is either a quoted dsh-med command or a quoted `:` no-op note, so
 * pasting it into bash or zsh never executes upstream text.
 */
export function formatInstallScript(items: readonly PlanItem[], installIds: ReadonlyMap<string, string | null>, locale: "en" | "zh"): string {
  const copy = SCRIPT_COPY[locale];
  const lines = items.flatMap(item => {
    const entryId = installIds.get(item.id);
    if (!entryId) return [shellNote(copy.missing(item.name, REPO_PATH.test(item.repo) ? item.repo : ""))];
    return [shellNote(item.name), `dsh-med install ${shellQuote(entryId)} --profile medical`];
  });
  return [shellNote(copy.header(items.length)), shellNote(copy.setup), ...lines].join("\n");
}

// ---- Moving a plan between browsers: share links and files ----

export const PLAN_PARAM = "plan";
export const PLAN_FILE_KIND = "medical-component-plan";
/** Upper bounds checked before parsing, so a huge link or file cannot freeze the tab. */
export const MAX_SHARE_LENGTH = 32_000;
export const MAX_PLAN_FILE_BYTES = 1_000_000;
/** Longer links are often truncated by chat apps and servers; such plans should use a file. */
export const MAX_SHARE_URL_LENGTH = 6_000;

const toBase64Url = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (value: string) => new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0)));

const cleanIds = (values: unknown): string[] => (Array.isArray(values)
  ? [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0 && value.length <= 512))].slice(0, PLAN_LIMIT)
  : []);

/** Compact, URL-safe encoding of the plan's component ids. */
export function encodePlanShare(items: readonly Pick<PlanItem, "id">[]): string {
  return toBase64Url(JSON.stringify(items.map(item => item.id)));
}

/** Ids from a share parameter; empty when the value is malformed. */
export function decodePlanShare(value: string | null): string[] {
  if (!value || value.length > MAX_SHARE_LENGTH) return [];
  try { return cleanIds(JSON.parse(fromBase64Url(value))); } catch { return []; }
}

export function sharePlanUrl(items: readonly Pick<PlanItem, "id">[], origin: string, baseUrl: string): string {
  return `${origin}${baseUrl.replace(/\/?$/, "/")}marketplace?${PLAN_PARAM}=${encodePlanShare(items)}`;
}

/** Portable plan file. Names are included for people reading the file; ids are what is imported. */
export function exportPlanFile(items: readonly PlanItem[], exportedAt = new Date().toISOString()): string {
  return `${JSON.stringify({ kind: PLAN_FILE_KIND, version: 1, exportedAt, items }, null, 2)}\n`;
}

/** Ids from an exported plan file (or the stored plan format); empty when the file is not a plan. */
export function parsePlanFile(text: string): string[] {
  if (text.length > MAX_PLAN_FILE_BYTES) return [];
  try {
    const value = JSON.parse(text) as { kind?: unknown; version?: unknown; items?: unknown };
    if (value?.version !== 1 || (value.kind !== undefined && value.kind !== PLAN_FILE_KIND) || !Array.isArray(value.items)) return [];
    return cleanIds(value.items.map(item => (item && typeof item === "object" ? (item as { id?: unknown }).id : undefined)));
  } catch { return []; }
}

/** Resolves imported ids against the current catalogue; unknown ids are reported, never guessed. */
export function resolvePlanIds(ids: readonly string[], byId: ReadonlyMap<string, Pick<ComponentSummary, "id" | "name" | "type" | "repo">>): { items: PlanItem[]; missing: string[] } {
  const items: PlanItem[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const found = byId.get(id);
    if (found) items.push({ id: found.id, name: found.name, type: found.type, repo: found.repo });
    else missing.push(id);
  }
  return { items, missing };
}

/** Current items first, then new ones, without duplicates, within the limit. */
export function mergePlans(current: readonly PlanItem[], incoming: readonly PlanItem[]): PlanItem[] {
  const seen = new Set(current.map(item => item.id));
  return [...current, ...incoming.filter(item => !seen.has(item.id) && seen.add(item.id))].slice(0, PLAN_LIMIT);
}

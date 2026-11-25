import type { ComponentSummary, ComponentType } from "./components";

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
const shellQuote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;
/** Comments must stay on one line so upstream names cannot start a new command. */
const oneLine = (value: string) => value.replace(/[\r\n\u2028\u2029]+/g, " ");

const SCRIPT_COPY = {
  en: { header: (count: number) => `# Plan: ${count} components (Medical Component Market)`, setup: `# Requires the dsh-med CLI and the pinned DSH: ${SETUP_GUIDE_URL}`, missing: (name: string, repo: string) => `# ${name}: no upstream install entry; get it from https://github.com/${repo}` },
  zh: { header: (count: number) => `# 方案：${count} 个组件（Medical Component Market）`, setup: `# 需要先安装 dsh-med CLI 与固定版本 DSH：${SETUP_GUIDE_URL}`, missing: (name: string, repo: string) => `# ${name}：上游没有安装条目，请从来源仓库获取 https://github.com/${repo}` },
};

/**
 * Shell script installing every plan item through dsh-med. `installIds` maps a
 * catalogue id to its upstream entry-index id, or null when there is none.
 */
export function formatInstallScript(items: readonly PlanItem[], installIds: ReadonlyMap<string, string | null>, locale: "en" | "zh"): string {
  const copy = SCRIPT_COPY[locale];
  const lines = items.map(item => {
    const entryId = installIds.get(item.id);
    return entryId ? `dsh-med install ${shellQuote(entryId)} --profile medical  # ${oneLine(item.name)}` : copy.missing(oneLine(item.name), oneLine(item.repo));
  });
  return [copy.header(items.length), copy.setup, ...lines].join("\n");
}

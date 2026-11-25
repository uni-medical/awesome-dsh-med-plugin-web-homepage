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

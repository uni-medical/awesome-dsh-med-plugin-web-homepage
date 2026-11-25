import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import type { ComponentSummary } from "../lib/components";
import { PLAN_KEY, parsePlan, removePlanItem, serialisePlan, togglePlanItem, type PlanItem } from "../lib/plan";
import { applyTheme } from "../lib/theme";
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, parsePreferences, type WorkspacePreferences } from "../lib/workspace";

interface WorkspaceValue {
  preferences: WorkspacePreferences;
  plan: PlanItem[];
  updatePreferences: (patch: Partial<WorkspacePreferences>) => void;
  restorePreferences: () => void;
  togglePlan: (component: Pick<ComponentSummary, "id" | "name" | "type" | "repo">) => void;
  removeFromPlan: (id: string) => void;
  clearPlan: () => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);
const readPreferences = () => { try { return typeof window === "undefined" ? DEFAULT_PREFERENCES : parsePreferences(localStorage.getItem(PREFERENCES_KEY)); } catch { return { ...DEFAULT_PREFERENCES }; } };
const readPlan = () => { try { return typeof window === "undefined" ? [] : parsePlan(localStorage.getItem(PLAN_KEY)); } catch { return []; } };
const safelyStore = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* The workspace remains usable without persistence. */ } };

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [plan, setPlan] = useState<PlanItem[]>(readPlan);
  useLayoutEffect(() => { applyTheme(preferences.theme); }, [preferences.theme]);
  useEffect(() => { safelyStore(PREFERENCES_KEY, JSON.stringify(preferences)); }, [preferences]);
  useEffect(() => { safelyStore(PLAN_KEY, serialisePlan(plan)); }, [plan]);
  useEffect(() => { document.documentElement.dataset.density = preferences.density; document.documentElement.dataset.motion = preferences.motion; document.documentElement.lang = preferences.locale === "zh" ? "zh-CN" : "en"; }, [preferences]);
  const value: WorkspaceValue = {
    preferences, plan,
    updatePreferences: patch => setPreferences(current => parsePreferences(JSON.stringify({ ...current, ...patch, version: 1 }))),
    restorePreferences: () => setPreferences({ ...DEFAULT_PREFERENCES }),
    togglePlan: component => setPlan(current => togglePlanItem(current, component)),
    removeFromPlan: id => setPlan(current => removePlanItem(current, id)),
    clearPlan: () => setPlan([]),
  };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}

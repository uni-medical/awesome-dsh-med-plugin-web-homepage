import type { ComponentSummary } from "./components";
import { expandQueryTerms } from "./capabilitySearch";

/** URL parameters owned by the component list filters. */
export const FILTER_KEYS = ["q", "group", "type", "risk", "fn", "mech"] as const;
/** Value of the `risk` filter for components without a verified evaluation. */
export const NOT_EVALUATED = "none";
export const PAGE_SIZE = 60;

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

export interface IndexedComponent { item: ComponentSummary; text: string; }

/** Variants per whitespace-separated term; a Chinese term also matches its English aliases. */
export function compileQuery(query: string): string[][] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).map(expandQueryTerms);
}

const matchesCompiled = (text: string, compiled: string[][]) => compiled.every(variants => variants.some(variant => text.includes(variant)));

/** Each term must match. */
export function matchesQuery(text: string, query: string): boolean {
  return matchesCompiled(text, compileQuery(query));
}

/** Only the list-filter parameters, so unrelated changes (such as `entry`) keep the same result. */
export function filterQueryString(params: URLSearchParams): string {
  const next = new URLSearchParams();
  FILTER_KEYS.forEach(key => params.getAll(key).forEach(value => next.append(key, value)));
  return next.toString();
}

export function filterComponents(indexed: readonly IndexedComponent[], params: URLSearchParams, ignore: string[] = []): ComponentSummary[] {
  const read = (key: string) => (ignore.includes(key) ? [] : params.getAll(key).filter(Boolean));
  const compiled = compileQuery(ignore.includes("q") ? "" : params.get("q") ?? "");
  const [group] = read("group");
  const types = new Set(read("type"));
  const risks = new Set(read("risk"));
  const [fn] = read("fn");
  const [mechanism] = read("mech");
  const matches = indexed.filter(({ item, text }) => {
    if (group && item.group !== group) return false;
    if (types.size && !types.has(item.type)) return false;
    if (risks.size && !risks.has(item.risk ?? NOT_EVALUATED)) return false;
    if (fn && item.functionPrimary !== fn) return false;
    if (mechanism && item.mechanism !== mechanism) return false;
    return !compiled.length || matchesCompiled(text, compiled);
  }).map(({ item }) => item);
  const query = (ignore.includes("q") ? "" : params.get("q") ?? "").trim().toLowerCase();
  return query ? rankByName(matches, query) : matches;
}

/** Stable re-ordering: exact name, then names starting with the query, then names containing it, then the rest. */
export function rankByName<T extends { name: string }>(items: readonly T[], query: string): T[] {
  const rank = (name: string) => {
    const lower = name.toLowerCase();
    return lower === query ? 0 : lower.startsWith(query) ? 1 : lower.includes(query) ? 2 : 3;
  };
  return items.map((item, index) => ({ item, index, rank: rank(item.name) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item);
}

export function countBy<T>(items: readonly T[], key: (item: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

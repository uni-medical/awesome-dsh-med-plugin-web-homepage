// Text retrieval for the capability map. Ranks catalogue records against a
// task description, merges records that share a normalised name, and ranks
// neighbours by IDF-weighted shared vocabulary and canonical function
// subcategories. Neighbours are retrieval candidates from
// the same query, not catalogue relations: the upstream data carries no
// dependency or call graph.

import { QUERY_ALIASES, aliasKeysIn, aliasesFor } from "../data/queryAliases";
import { RELATION_TYPES, type CatalogueEdge, type ComponentSummary, type RelationType } from "./components";

const CJK = /[㐀-鿿]/;
const STOPWORDS = new Set(["a", "an", "and", "the", "of", "for", "to", "in", "on", "with", "by", "or", "from", "into", "via", "using", "use", "find", "get", "tool", "tools"]);

export const CANDIDATE_LIMIT = 40;
export const NEIGHBOUR_LIMIT = 12;
/** Catalogue-relation nodes drawn on the inner ring. */
export const CATALOGUE_LIMIT = 8;
/** Neighbours below this weighted similarity are noise and are not shown. */
export const MIN_SIMILARITY = 0.05;

/** Variants a single list-search term may match. */
export function expandQueryTerms(term: string): string[] {
  const lower = term.toLowerCase();
  return CJK.test(lower) ? [lower, ...aliasesFor(lower)] : [lower];
}

/**
 * Query → distinct terms: latin words, plus each known Chinese phrase in the
 * query and its English aliases. The Chinese phrase itself matches the
 * Chinese descriptions of paper mechanism plugins.
 */
export function queryTerms(query: string): string[] {
  const lower = query.toLowerCase();
  const latin = lower.replace(/[㐀-鿿]+/g, " ").split(/[^a-z0-9+#.-]+/).map(word => word.replace(/^[.-]+|[.-]+$/g, "")).filter(word => word.length >= 2 && !STOPWORDS.has(word));
  const chinese = (lower.match(/[㐀-鿿]+/g) ?? []).flatMap(text => [...aliasKeysIn(text), ...aliasesFor(text)]);
  return [...new Set([...latin, ...chinese])];
}

export function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9㐀-鿿]+/g, " ").trim();
}

/** Weight multipliers: curated function subcategories count most, the broad domain least. */
export const FUNCTION_WEIGHT = 1.6;
export const DOMAIN_WEIGHT = 0.4;
const FUNCTION_PREFIX = "fn:";
const DOMAIN_PREFIX = "dom:";

interface Prepared { item: ComponentSummary; name: string; labels: string; description: string; vocabulary: Map<string, number>; }

const stem = (word: string) => (word.length > 4 && word.endsWith("s") && !/(ss|us|is)$/.test(word) ? word.slice(0, -1) : word);
const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length >= 3 && !STOPWORDS.has(word)).map(stem);

function features(item: ComponentSummary): Map<string, number> {
  const result = new Map<string, number>();
  for (const word of words([item.name, ...item.tags, ...item.tasks].join(" "))) result.set(word, 1);
  for (const label of item.functionLabels) result.set(`${FUNCTION_PREFIX}${label}`, FUNCTION_WEIGHT);
  if (item.domain) result.set(`${DOMAIN_PREFIX}${item.domain}`, DOMAIN_WEIGHT);
  return result;
}

/**
 * Pre-computes searchable text and a weighted vocabulary per record. Each
 * feature is weighted by inverse document frequency over the whole catalogue,
 * so rare terms (glioma, cnv) link more strongly than common ones (data, analysis).
 */
export function prepare(items: readonly ComponentSummary[]): Prepared[] {
  const perItem = items.map(features);
  const documentFrequency = new Map<string, number>();
  perItem.forEach(map => map.forEach((_, feature) => documentFrequency.set(feature, (documentFrequency.get(feature) ?? 0) + 1)));
  const total = Math.max(items.length, 1);
  return items.map((item, index) => {
    const labels = [...item.tags, ...item.tasks, item.domain, item.functionPrimary ?? "", ...item.functionLabels].join(" ").toLowerCase();
    const vocabulary = new Map([...perItem[index]].map(([feature, multiplier]) => [feature, multiplier * Math.log(1 + total / (documentFrequency.get(feature) ?? 1))]));
    return { item, name: item.name.toLowerCase(), labels, description: item.description.toLowerCase(), vocabulary };
  });
}

export function scoreRecord(record: Prepared, terms: readonly string[]): number {
  let total = 0;
  let matched = 0;
  for (const term of terms) {
    const weight = record.name.includes(term) ? 6 : record.labels.includes(term) ? 3 : record.description.includes(term) ? 1 : 0;
    if (weight) { total += weight; matched += 1; }
  }
  return matched ? total * (0.5 + matched / terms.length) : 0;
}

export interface CandidateGroup {
  key: string;
  name: string;
  score: number;
  members: ComponentSummary[];
  /** Feature → weight (IDF × multiplier), merged over members. */
  vocabulary: Map<string, number>;
}

export interface SearchResult { terms: string[]; groups: CandidateGroup[]; totalGroups: number; }

export function searchCandidates(prepared: readonly Prepared[], query: string, limit = CANDIDATE_LIMIT): SearchResult {
  const terms = queryTerms(query);
  if (!terms.length) return { terms, groups: [], totalGroups: 0 };
  const groups = new Map<string, CandidateGroup & { best: number }>();
  for (const record of prepared) {
    const score = scoreRecord(record, terms);
    if (!score) continue;
    const key = normaliseName(record.item.name) || record.item.id;
    const group = groups.get(key) ?? { key, name: record.item.name, score: 0, best: 0, members: [], vocabulary: new Map<string, number>() };
    group.members.push(record.item);
    record.vocabulary.forEach((weight, feature) => group.vocabulary.set(feature, Math.max(weight, group.vocabulary.get(feature) ?? 0)));
    if (score > group.best) { group.best = score; group.name = record.item.name; }
    group.score = group.best + Math.log2(group.members.length);
    groups.set(key, group);
  }
  const ranked = [...groups.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return {
    terms,
    totalGroups: ranked.length,
    groups: ranked.slice(0, limit).map(group => ({ key: group.key, name: group.name, score: group.score, vocabulary: group.vocabulary, members: [...group.members].sort((a, b) => (a.risk === null ? 1 : 0) - (b.risk === null ? 1 : 0) || a.repo.localeCompare(b.repo)) })),
  };
}

const norm = (vocabulary: Map<string, number>) => Math.sqrt([...vocabulary.values()].reduce((sum, weight) => sum + weight * weight, 0));

/** Weighted cosine similarity of two groups' vocabularies (0–1). */
export function similarity(a: CandidateGroup, b: CandidateGroup): number {
  let shared = 0;
  a.vocabulary.forEach((weight, feature) => { const other = b.vocabulary.get(feature); if (other !== undefined) shared += weight * other; });
  const denominator = norm(a.vocabulary) * norm(b.vocabulary);
  return denominator ? shared / denominator : 0;
}

const repositories = (group: CandidateGroup) => new Set(group.members.map(member => member.repo.toLowerCase()));

/** Most distinctive shared terms and function subcategories, for explaining an edge. */
export function sharedWords(a: CandidateGroup, b: CandidateGroup, limit = 4): string[] {
  return [...a.vocabulary].filter(([feature]) => b.vocabulary.has(feature) && !feature.startsWith(DOMAIN_PREFIX))
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, limit)
    .map(([feature]) => (feature.startsWith(FUNCTION_PREFIX) ? feature.slice(FUNCTION_PREFIX.length) : feature));
}

/** Repositories both groups come from: a catalogue relation (same source repository), not a retrieval guess. */
export function sharedRepositories(a: CandidateGroup, b: CandidateGroup): string[] {
  const other = repositories(b);
  return [...new Set(a.members.map(member => member.repo))].filter(repo => other.has(repo.toLowerCase()));
}

export interface Neighbour { group: CandidateGroup; similarity: number; shared: string[]; sameRepository: string[]; }

export const REPOSITORY_BONUS = 0.15;
const rank = (item: Neighbour) => item.similarity + (item.sameRepository.length ? REPOSITORY_BONUS : 0);

/**
 * Other candidates from the same query. A neighbour either comes from the same
 * repository as the selected group (catalogue relation) or shares task/tag
 * vocabulary with it (retrieval relation). Sharing a repository adds a small
 * ranking bonus only: large merged groups span many repositories, so it must not
 * crowd out vocabulary similarity.
 */
export function neighbours(groups: readonly CandidateGroup[], selected: CandidateGroup, limit = NEIGHBOUR_LIMIT): Neighbour[] {
  return groups.filter(group => group.key !== selected.key)
    .map(group => ({ group, similarity: similarity(selected, group), shared: sharedWords(selected, group), sameRepository: sharedRepositories(selected, group) }))
    .filter(entry => entry.sameRepository.length > 0 || entry.similarity >= MIN_SIMILARITY)
    .sort((a, b) => rank(b) - rank(a) || b.group.score - a.group.score)
    .slice(0, limit);
}

export interface NeighbourLink { from: string; to: string; sameRepository: boolean; }

export const LINK_THRESHOLD = 0.35;
export const LINK_LIMIT = 12;

/** Links among similar neighbours, so the map shows clusters rather than a bare star. Same-repository pairs are flagged for styling. */
export function neighbourLinks(items: readonly Neighbour[], threshold = LINK_THRESHOLD, limit = LINK_LIMIT): NeighbourLink[] {
  const links: (NeighbourLink & { weight: number })[] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i].group;
      const b = items[j].group;
      const sameRepository = sharedRepositories(a, b).length > 0;
      const weight = similarity(a, b);
      if (weight >= threshold) links.push({ from: a.key, to: b.key, sameRepository, weight });
    }
  }
  return links.sort((x, y) => y.weight - x.weight).slice(0, limit).map(({ from, to, sameRepository }) => ({ from, to, sameRepository }));
}

/** Query terms grouped by where they came from: each Chinese phrase with its glossary aliases, then the latin words. */
export function queryTermGroups(query: string): { source: string | null; terms: string[] }[] {
  const lower = query.toLowerCase();
  const chinese = (lower.match(/[㐀-鿿]+/g) ?? []).flatMap(segment => matchedPhrases(segment));
  const latin = queryTerms(lower.replace(/[㐀-鿿]+/g, " "));
  return [...chinese, ...(latin.length ? [{ source: null, terms: latin }] : [])];
}

function matchedPhrases(segment: string): { source: string; terms: string[] }[] {
  const groups: { source: string; terms: string[] }[] = [];
  const seen = new Set<string>();
  for (const key of Object.keys(QUERY_ALIASES).sort((a, b) => b.length - a.length)) {
    if (!segment.includes(key)) continue;
    const terms = QUERY_ALIASES[key].filter(term => !seen.has(term));
    terms.forEach(term => seen.add(term));
    if (terms.length) groups.push({ source: key, terms });
  }
  return groups;
}

export interface CatalogueNeighbour {
  key: string;
  name: string;
  members: ComponentSummary[];
  /** Relation labels from the selected group's point of view, e.g. requires/out. */
  relations: { type: RelationType; direction: "out" | "in" }[];
}

/**
 * Components linked to any member of the selected group by an upstream
 * catalogue relation, merged by name like candidates. These may lie outside
 * the current search results.
 */
export function catalogueNeighbours(selected: CandidateGroup, edges: readonly CatalogueEdge[], byId: Map<string, ComponentSummary>, limit = CATALOGUE_LIMIT): CatalogueNeighbour[] {
  const memberIds = new Set(selected.members.map(member => member.id));
  const result = new Map<string, CatalogueNeighbour>();
  for (const edge of edges) {
    const fromSelected = memberIds.has(edge.from);
    const toSelected = memberIds.has(edge.to);
    if (fromSelected === toSelected) continue;
    const other = byId.get(fromSelected ? edge.to : edge.from);
    if (!other) continue;
    const key = normaliseName(other.name) || other.id;
    if (key === selected.key) continue;
    const entry = result.get(key) ?? { key, name: other.name, members: [], relations: [] };
    if (!entry.members.some(member => member.id === other.id)) entry.members.push(other);
    const relation = { type: edge.type, direction: fromSelected ? "out" as const : "in" as const };
    if (!entry.relations.some(item => item.type === relation.type && item.direction === relation.direction)) entry.relations.push(relation);
    result.set(key, entry);
  }
  const order = (item: CatalogueNeighbour) => Math.min(...item.relations.map(relation => RELATION_TYPES.indexOf(relation.type)));
  return [...result.values()].sort((a, b) => order(a) - order(b) || b.members.length - a.members.length || a.name.localeCompare(b.name)).slice(0, limit);
}

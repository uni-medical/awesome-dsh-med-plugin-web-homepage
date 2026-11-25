// Text retrieval for the capability map. Ranks catalogue records against a
// task description, merges records that share a normalised name, and ranks
// neighbours by shared vocabulary. Neighbours are retrieval candidates from
// the same query, not catalogue relations: the upstream data carries no
// dependency or call graph.

import { aliasesFor } from "../data/queryAliases";
import type { ComponentSummary } from "./components";

const CJK = /[㐀-鿿]/;
const STOPWORDS = new Set(["a", "an", "and", "the", "of", "for", "to", "in", "on", "with", "by", "or", "from", "into", "via", "using", "use", "find", "get", "tool", "tools"]);

export const CANDIDATE_LIMIT = 40;
export const NEIGHBOUR_LIMIT = 14;

/** Variants a single list-search term may match. */
export function expandQueryTerms(term: string): string[] {
  const lower = term.toLowerCase();
  return CJK.test(lower) ? [lower, ...aliasesFor(lower)] : [lower];
}

/** Query → distinct terms: latin words plus aliases of contained Chinese phrases. */
export function queryTerms(query: string): string[] {
  const lower = query.toLowerCase();
  const latin = lower.replace(/[㐀-鿿]+/g, " ").split(/[^a-z0-9+#.-]+/).map(word => word.replace(/^[.-]+|[.-]+$/g, "")).filter(word => word.length >= 2 && !STOPWORDS.has(word));
  const chinese = (lower.match(/[㐀-鿿]+/g) ?? []).flatMap(aliasesFor);
  return [...new Set([...latin, ...chinese])];
}

export function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9㐀-鿿]+/g, " ").trim();
}

interface Prepared { item: ComponentSummary; name: string; labels: string; description: string; vocabulary: Set<string>; }

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length >= 3 && !STOPWORDS.has(word));

export function prepare(items: readonly ComponentSummary[]): Prepared[] {
  return items.map(item => {
    const labels = [...item.tags, ...item.tasks, item.domain, item.functionPrimary ?? ""].join(" ").toLowerCase();
    return { item, name: item.name.toLowerCase(), labels, description: item.description.toLowerCase(), vocabulary: new Set([...words(item.name), ...words(labels)]) };
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
  vocabulary: Set<string>;
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
    const group = groups.get(key) ?? { key, name: record.item.name, score: 0, best: 0, members: [], vocabulary: new Set<string>() };
    group.members.push(record.item);
    record.vocabulary.forEach(word => group.vocabulary.add(word));
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

export function similarity(a: CandidateGroup, b: CandidateGroup): number {
  let shared = 0;
  a.vocabulary.forEach(word => { if (b.vocabulary.has(word)) shared += 1; });
  const union = a.vocabulary.size + b.vocabulary.size - shared;
  const sameDomain = a.members[0]?.domain === b.members[0]?.domain ? 0.1 : 0;
  return union ? shared / union + sameDomain : sameDomain;
}

const repositories = (group: CandidateGroup) => new Set(group.members.map(member => member.repo.toLowerCase()));

/** Words two candidate groups share, longest first, for explaining an edge. */
export function sharedWords(a: CandidateGroup, b: CandidateGroup, limit = 4): string[] {
  return [...a.vocabulary].filter(word => b.vocabulary.has(word)).sort((x, y) => y.length - x.length || x.localeCompare(y)).slice(0, limit);
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
    .filter(entry => entry.sameRepository.length > 0 || entry.similarity > 0)
    .sort((a, b) => rank(b) - rank(a) || b.group.score - a.group.score)
    .slice(0, limit);
}

export interface NeighbourLink { from: string; to: string; sameRepository: boolean; }

export const LINK_THRESHOLD = 0.3;
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

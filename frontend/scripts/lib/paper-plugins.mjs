// Paper mechanism plugins: data/paper-plugin-inventory.json on the integrate
// branch (432 formal DSH plugins generated from papers) and their QC cards in
// security/results/v2/paper-plugin-qc-20261125 on the card branch.
//
// They are agent mechanisms (orchestration, context and memory, evaluation
// feedback, permissions) rather than tools, so they get their own list group
// and keep the paper they came from. Entry, card and entry-table row share the
// 24-hex suffix of the entry id.

/** Harness roles from details.harness.role, in display order. */
export const MECHANISM_ROLES = ["orchestration", "contextMemory", "evaluationFeedback", "permissions"];
export const MECHANISM_GROUP = "mechanisms";
export const MECHANISM_DOMAIN = "agent-mechanism";
/** English tags per role, so English queries and similarity features reach the Chinese-described plugins. */
const ROLE_TAGS = { orchestration: ["orchestration"], contextMemory: ["context memory"], evaluationFeedback: ["evaluation feedback"], permissions: ["permissions"] };

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 320;
const SUFFIX = /(?:user\/added\/|paper-plugin\/)([0-9a-f]{24})(?::|$)/;
const HTTPS = /^https:\/\//i;

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Short display name: the text before the first colon, or a shortened first clause. */
export function paperPluginTitle(name) {
  const text = String(name ?? "").trim();
  const head = text.split(/[：:]/, 1)[0].trim();
  if (head && head.length <= MAX_TITLE && head.length < text.length) return head;
  if (text.length <= MAX_TITLE) return text;
  const clause = text.split(/[，,；;。]/, 1)[0].trim();
  return truncate(clause.length <= MAX_TITLE ? clause : text, MAX_TITLE);
}

/** 24-hex suffix shared by the inventory id, card unit id and entry-table repository; null otherwise. */
export function paperPluginSuffix(value) {
  return String(value ?? "").match(SUFFIX)?.[1] ?? null;
}

/**
 * Links inventory entries to cards and entry-table rows by suffix. A suffix
 * carried by more than one card is ambiguous and links nothing.
 */
export function linkPaperCards(entries, cards, rows) {
  const cardsBySuffix = new Map();
  for (const card of cards) {
    const suffix = paperPluginSuffix(card.unit_id);
    if (suffix) cardsBySuffix.set(suffix, [...(cardsBySuffix.get(suffix) ?? []), card]);
  }
  const rowsBySuffix = new Map();
  for (const row of rows) {
    const suffix = paperPluginSuffix(row.card_unit_id) ?? paperPluginSuffix(row.repository);
    if (suffix) rowsBySuffix.set(suffix, [...(rowsBySuffix.get(suffix) ?? []), row]);
  }
  const links = new Map();
  for (const entry of entries) {
    const suffix = paperPluginSuffix(entry.id);
    const found = suffix ? cardsBySuffix.get(suffix) ?? [] : [];
    if (found.length !== 1) continue;
    const matchedRows = rowsBySuffix.get(suffix) ?? [];
    links.set(entry.id, { card: found[0], row: matchedRows.length === 1 ? matchedRows[0] : null });
  }
  const duplicateCards = [...cardsBySuffix.values()].filter(list => list.length > 1).length;
  return { links, stats: { entries: entries.length, linked: links.size, unmatched: entries.length - links.size, duplicateCards } };
}

const roleOf = (entry) => {
  const role = entry.details?.harness?.role;
  return MECHANISM_ROLES.includes(role) ? role : null;
};

function paperOf(entry) {
  const source = entry.source ?? {};
  const url = typeof source.url === "string" && HTTPS.test(source.url) ? source.url : null;
  return { label: String(source.label ?? ""), title: String(source.title ?? ""), url };
}

/** Compact record for the list, search and capability map. */
export function toPaperPluginSummary(entry, repo, publicCard) {
  return {
    id: entry.id,
    name: paperPluginTitle(entry.name),
    type: entry.type,
    repo,
    description: truncate(String(entry.description ?? entry.name ?? ""), MAX_DESCRIPTION),
    tags: ["agent mechanism", ...(ROLE_TAGS[roleOf(entry)] ?? [])],
    group: MECHANISM_GROUP,
    domain: MECHANISM_DOMAIN,
    tasks: [],
    risk: publicCard ? publicCard.risk.level : null,
    functionPrimary: publicCard ? publicCard.function.primary : null,
    functionLabels: publicCard ? publicCard.function.subLabels : [],
    mechanism: roleOf(entry),
    paper: paperOf(entry).label || null,
  };
}

/** Full record loaded when a detail dialog opens. `upstream` = { repository, commit } of the inventory. */
export function toPaperPluginDetail(entry, upstream, publicCard) {
  const definition = entry.locator?.definition_file;
  const blob = (path) => `https://github.com/${upstream.repository}/blob/${upstream.commit}/data/${path}`;
  return {
    id: entry.id,
    name: paperPluginTitle(entry.name),
    type: entry.type,
    repo: upstream.repository,
    provider: "paper-plugin",
    sourceName: definition ? definition.split("/").slice(-1)[0] : "",
    sourceUrl: definition ? blob(definition) : `https://github.com/${upstream.repository}`,
    repositoryUrl: `https://github.com/${upstream.repository}`,
    license: null,
    callable: false,
    aliases: [],
    description: String(entry.description ?? entry.name ?? ""),
    tags: [],
    capabilities: [],
    evaluation: publicCard,
    link: publicCard ? { status: "unique", cardUnitId: publicCard.unitId } : { status: "unmatched" },
    install: {
      entryId: entry.id,
      installability: String(entry.installation?.installability ?? "unknown"),
      verification: String(entry.evidence?.status ?? "unknown"),
      trust: String(entry.trust ?? "unknown"),
      requires: [],
      formalInventory: true,
    },
    relations: [],
    mechanism: roleOf(entry),
    paper: paperOf(entry),
  };
}

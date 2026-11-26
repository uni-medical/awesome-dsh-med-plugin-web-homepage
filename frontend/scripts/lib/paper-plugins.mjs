// Paper mechanism plugins: data/paper-plugin-inventory.json on the integrate
// branch (432 formal DSH plugins generated from papers) and their QC cards in
// security/results/v2/paper-plugin-qc-20261125 on the card branch.
//
// They are agent mechanisms (orchestration, context and memory, evaluation
// feedback, permissions) rather than tools, so they get their own list group
// and keep the paper they came from. Entry, card and entry-table row share the
// 24-hex suffix of the entry id.

import { catalogueRelations } from "./relations.mjs";

/** Harness roles from details.harness.role, in display order. */
export const MECHANISM_ROLES = ["orchestration", "contextMemory", "evaluationFeedback", "permissions"];
// Domain group (literature | omics | drug | clinical | imaging | tools) of a
// mechanism plugin, so the same domain tabs work for tools and mechanisms.
// The source paper's title decides first (whole English words; specific
// domains before general ones), then the card's function subcategories.
const PAPER_DOMAIN_RULES = [
  ["imaging", /\b(imag\w*|radiolog\w*|patholog\w*|histopatholog\w*|x-ray|cxr|slides?|whole[- ]slide|segmentation|vision|visual|ultrasound|mri|dermatolog\w*|ophthalm\w*|retina\w*)\b/i],
  ["drug", /\b(drugs?|chem\w*|molecul\w*|compounds?|pharma\w*|toxic\w*|enzym\w*|pharmacogenom\w*|pgx)\b/i],
  ["omics", /\b(single[- ]cell|genom\w*|genes?|genetic\w*|omics?|transcriptom\w*|proteom\w*|protein\w*|crispr|sequenc\w*|bioinformatic\w*|cells?|cellular|dna|rna|biolog\w*|biotech|perturb\w*)\b/i],
  ["clinical", /\b(clinic\w*|patients?|ehr|fhir|diagnos\w*|hospital\w*|medical|medicine|health\w*|epidemi\w*|care|icd|oncolog\w*|diseases?|therap\w*|nurs\w*|surg\w*|fracture|epilep\w*|autism|asd|alzheimer\w*|cancer|psychiatr\w*|mental)\b/i],
  ["literature", /\b(literature|citations?|reviews?|evidence|papers?|scientific writing|survey|systematic)\b/i],
];
// MRI and CT are matched case-sensitively so "context" or "orchestration" never count as CT.
const IMAGING_ACRONYM = /\b(CT|MRI|PET)\b/;
const SUBLABEL_DOMAINS = {
  文献检索与综述: "literature", 科研写作与成果: "literature", 文献与证据综述: "literature", 研究证据与临床语义检索: "literature",
  实验与组学分析: "omics", 基因与变异检索: "omics", 蛋白质互作与网络分析: "omics",
  药物发现与分子筛选: "drug", 药代动力学与模拟: "drug",
  临床与健康管理: "clinical", 临床数据与文本治理: "clinical", 临床统计与结局分析: "clinical", 临床指南与医学术语: "clinical", 临床数据标准与迁移: "clinical",
  医学影像处理与分割: "imaging", 临床记录与影像数据: "imaging",
};

export function paperDomainGroup(entry, publicCard) {
  const title = `${entry.source?.title ?? ""} ${entry.source?.label ?? ""}`;
  if (IMAGING_ACRONYM.test(title)) return "imaging";
  const byTitle = PAPER_DOMAIN_RULES.find(([, pattern]) => pattern.test(title));
  if (byTitle) return byTitle[0];
  const byLabel = (publicCard?.function?.subLabels ?? []).map(label => SUBLABEL_DOMAINS[label]).find(Boolean);
  return byLabel ?? "tools";
}
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
    group: paperDomainGroup(entry, publicCard),
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

// ---- Relations (integrate:data/capabilities/paper-plugin-relations.json and
// paper-plugin-model-relations.json). `alternative_to` edges start at native
// DSH mechanisms that a paper plugin may replace; those natives are added to
// the catalogue so the capability map can show the replacement.

/** Component-to-component edges; entry-index ids are mapped, catalogue ids pass through. */
export function paperRelationEdges(relations, indexToCatalogue, catalogueIds) {
  const ids = new Map(indexToCatalogue);
  for (const id of catalogueIds) ids.set(id, id);
  return catalogueRelations(relations, ids);
}

const NATIVE_ID = /^dsh-plugin:([\w.-]+)\/([\w.-]+)\/[\w.-]+$/;
const REVISION = /^[0-9a-f]{7,40}$/;

/**
 * List and detail records for native DSH mechanisms named as replacement
 * targets. The role is the most common role among the plugins replacing it.
 */
export function nativeMechanismRecords(nativeTargets, relations, rolesById) {
  return nativeTargets.flatMap(target => {
    const match = String(target.id ?? "").match(NATIVE_ID);
    if (!match) return [];
    const repo = `${match[1]}/${match[2]}`;
    const roles = new Map();
    for (const relation of relations) {
      if (relation.type !== "alternative_to" || relation.from !== target.id) continue;
      const role = rolesById.get(relation.to);
      if (role) roles.set(role, (roles.get(role) ?? 0) + 1);
    }
    const role = [...roles].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const name = String(target.name ?? target.id);
    const revision = REVISION.test(String(target.revision ?? "")) ? target.revision : null;
    const summary = {
      id: target.id, name, type: "dsh-plugin", repo, description: "", tags: ["agent mechanism", "native"],
      group: "tools", domain: MECHANISM_DOMAIN, tasks: [], risk: null, functionPrimary: null, functionLabels: [],
      mechanism: MECHANISM_ROLES.includes(role) ? role : null, paper: null, native: true,
    };
    const detail = {
      id: target.id, name, type: "dsh-plugin", repo, provider: "dsh-native", sourceName: name,
      sourceUrl: revision ? `https://github.com/${repo}/tree/${revision}` : `https://github.com/${repo}`,
      repositoryUrl: `https://github.com/${repo}`, license: null, callable: false, aliases: [], description: "", tags: [], capabilities: [],
      evaluation: null, link: { status: "unmatched" }, install: null, relations: [], mechanism: summary.mechanism, paper: null, native: true,
    };
    return [{ summary, detail }];
  });
}

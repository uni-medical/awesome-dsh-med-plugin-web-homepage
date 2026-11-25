// Projects upstream records onto the fields the public site may show.
// Card fields follow security/docs/user-card-spec-20261112.md §3–4 on the
// user-card-taxonomy-20261112 branch. Reviewer-only fields
// (function.unmapped, review.validation_errors, cost driver candidates,
// judge inputs) are not exported.

import { entryRepository, parseSourceRef } from "./link-cards.mjs";

const MAX_DESCRIPTION = 320;
const MAX_TAGS = 8;
const MAX_TASKS = 3;

const GROUP_DOMAINS = {
  literature: ["literature", "scientific-research", "scientific-writing", "academic-writing", "writing", "science-communication", "patents", "intellectual-property", "information-retrieval", "web-research", "web-search", "research-funding"],
  omics: ["genomics", "bioinformatics", "transcriptomics", "proteomics", "metabolomics", "molecular-biology", "microbiome", "microbiology", "immunology", "epigenomics", "immunogenomics", "immunoinformatics", "structural-biology", "systems-biology", "biology"],
  drug: ["pharmacology", "cheminformatics", "chemistry", "computational-chemistry", "toxicology"],
  clinical: ["clinical-medicine", "clinical-research", "health-data", "public-health", "regulatory-affairs", "regulatory", "oncology", "mental-health", "medical-education", "medical-devices", "neuroscience"],
  imaging: ["medical-imaging", "bioimaging", "computer-vision"],
};
const DOMAIN_TO_GROUP = new Map(Object.entries(GROUP_DOMAINS).flatMap(([group, domains]) => domains.map(domain => [domain, group])));

/** One of literature | omics | drug | clinical | imaging | tools. */
export function domainGroup(domain) {
  return DOMAIN_TO_GROUP.get(domain) ?? "tools";
}

const asLabel = (value) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return String(value.name ?? value.type ?? value.id ?? value.label ?? JSON.stringify(value));
  return String(value);
};
const strings = (values) => (Array.isArray(values) ? values.map(asLabel).filter(Boolean) : []);
const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function publicQuality(item) {
  const base = { key: item.key, label: item.label, score: typeof item.score === "number" ? item.score : null, source: item.source };
  if (item.key === "cost") return { ...base, reason: item.reason ?? "", drivers: strings(item.drivers) };
  const notes = strings(item.notes);
  return notes.length ? { ...base, notes } : base;
}

function publicMedical(medical) {
  const groups = Object.fromEntries(Object.entries(medical.groups ?? {}).map(([name, items]) => [name, items.map(item => ({ code: item.code, label: item.label, text: item.text, evidence: strings(item.evidence) }))]));
  const result = {
    status: medical.status,
    groups,
    codes: strings(medical.codes),
    noMedicalContent: Boolean(medical.no_medical_content),
    noneReason: medical.none_reason ?? "",
    audience: medical.audience ?? "",
    authorStatements: (medical.author_statements ?? []).map(item => ({ text: item.text, evidence: strings(item.evidence) })),
    expertReview: Boolean(medical.expert_review),
    undetermined: medical.undetermined ?? "",
  };
  if (medical.rejected_all) {
    return { ...result, rejectedAll: true, rejected: (medical.rejected ?? []).map(item => ({ code: item.code, label: item.label, reason: item.reason })) };
  }
  return result;
}

/** Public subset of one evaluation card. `row` is the matching entry-scores.tsv row, if any. */
export function toPublicCard(card, row) {
  const rejectedClaims = Number.parseInt(row?.review_rejected_claims ?? "", 10);
  return {
    unitId: card.unit_id,
    title: card.title,
    kind: card.kind,
    source: card.source,
    compatibility: { state: card.compatibility.state, label: card.compatibility.label, warnings: strings(card.compatibility.warnings) },
    risk: { verdict: card.risk.verdict, level: card.risk.level, subcategory: card.risk.subcategory ?? "", threats: (card.risk.threats ?? []).map(threat => ({ type: threat.type, subLabels: strings(threat.sub_labels) })), lines: strings(card.risk.lines) },
    function: { status: card.function.status, primary: card.function.primary ?? null, secondary: card.function.secondary ?? null, subLabels: strings(card.function.sub_labels) },
    behaviour: Object.fromEntries(Object.entries(card.behaviour ?? {}).map(([group, labels]) => [group, strings(labels)])),
    quality: (card.quality ?? []).map(publicQuality),
    medical: publicMedical(card.medical ?? {}),
    footer: strings(card.footer),
    review: { status: card.review.status, valid: Boolean(card.review.valid), rejectedClaims: Number.isFinite(rejectedClaims) ? rejectedClaims : 0 },
  };
}

const firstCapability = (entry) => entry.capabilities?.[0] ?? { domain: "general", subdomain: "", task: "" };

/** Compact record for the list, search and capability map. */
export function toComponentSummary(entry, repo, publicCard) {
  const capability = firstCapability(entry);
  const tasks = [...new Set(entry.capabilities.flatMap(item => [item.subdomain, item.task]).filter(Boolean))].slice(0, MAX_TASKS);
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    repo,
    description: truncate(entry.description ?? "", MAX_DESCRIPTION),
    tags: strings(entry.tags).slice(0, MAX_TAGS),
    group: domainGroup(capability.domain),
    domain: capability.domain,
    tasks,
    risk: publicCard ? publicCard.risk.level : null,
    functionPrimary: publicCard ? publicCard.function.primary : null,
  };
}

function sourceUrl(entry, record, repo) {
  const ref = entry.source_ref ?? "";
  if (/^https:\/\/github\.com\//i.test(ref)) return ref.replace(/#evidence-[0-9a-f]+$/i, "");
  const { path } = parseSourceRef(ref);
  const revision = record?.source?.revision;
  if (path && revision) return `https://github.com/${repo}/blob/${revision}/${path}`;
  return `https://github.com/${repo}`;
}

/** Full record loaded when a detail dialog opens. */
export function toComponentDetail(entry, record, repo, publicCard, linkStatus) {
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    repo,
    provider: entry.provider,
    sourceName: entry.source_name,
    sourceUrl: sourceUrl(entry, record, repo),
    repositoryUrl: `https://github.com/${repo}`,
    license: entry.license ?? null,
    callable: Boolean(entry.callable),
    aliases: strings(entry.aliases),
    description: entry.description ?? "",
    tags: strings(entry.tags),
    capabilities: (entry.capabilities ?? []).map(item => ({ domain: item.domain, subdomain: item.subdomain, task: item.task, inputs: strings(item.inputs), outputs: strings(item.outputs), databases: strings(item.database) })),
    evaluation: publicCard,
    link: publicCard ? { status: linkStatus, cardUnitId: publicCard.unitId } : { status: linkStatus },
  };
}

export { entryRepository };

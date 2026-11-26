// Links standardized catalog entries (awesome-dsh-med-plugin@integrate) to
// per-entry evaluation rows (entry-scores.tsv on user-card-taxonomy-20261112).
//
// The two datasets share no identifier. Each evaluation row carries a
// `stable_id` of the form `entry:{Repo}:{type}:{component root}[:{name}]`,
// which can be rebuilt from the entry's repository, type, definition file
// location and name. A card is attached only when exactly one row matches an
// entry and no other entry claims that row.

const SEP = "\u0000";
const BLOB_URL = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/[0-9a-f]{7,40}\/([^#?]*)/i;

const key = (...parts) => parts.join(SEP);
const dirname = (path) => {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : ".";
};

/** Returns `{ repo, path }` from a GitHub blob URL or a plain repository path. */
export function parseSourceRef(sourceRef) {
  const match = BLOB_URL.exec(sourceRef ?? "");
  if (match) {
    let path = match[2];
    try { path = decodeURIComponent(path); } catch { /* keep the raw path when it is not valid percent-encoding */ }
    return { repo: match[1], path };
  }
  if (!sourceRef || /^https?:/i.test(sourceRef)) return { repo: undefined, path: undefined };
  return { repo: undefined, path: sourceRef };
}

/** Repository in `owner/name` form, preferring the original letter case. */
export function entryRepository(entry, record) {
  const fromRef = parseSourceRef(entry.source_ref).repo;
  if (fromRef) return fromRef;
  const url = record?.source?.repository;
  if (typeof url === "string" && url.includes("github.com/")) return url.split("github.com/")[1].replace(/\/$/, "");
  return entry.provider.split(":").slice(1).join(":").split("--")[0];
}

const providerService = (entry) => {
  const index = entry.provider.indexOf("--");
  return index >= 0 ? entry.provider.slice(index + 2).toLowerCase() : undefined;
};

/** All join keys an entry may match; more than one key means several roots. */
export function entryJoinKeys(entry, record) {
  const repo = entryRepository(entry, record).toLowerCase();
  const refPath = parseSourceRef(entry.source_ref).path;
  const evidence = Array.isArray(record?.evidence) ? record.evidence : [];
  switch (entry.type) {
    case "skill": {
      // The entry's own SKILL.md wins; entry-index evidence is only a fallback.
      const isSkillFile = (path) => typeof path === "string" && /(^|\/)SKILL\.md$/.test(path);
      const skillFiles = isSkillFile(refPath) ? [refPath] : evidence.filter(isSkillFile);
      const roots = skillFiles.length ? [...new Set(skillFiles.map(dirname))] : refPath ? [dirname(refPath)] : [];
      return roots.map(root => key("skill", repo, root));
    }
    case "mcp":
      return [key("mcp", repo, entry.source_name)];
    case "cli":
      return [key("cli", repo, refPath ? dirname(refPath) : ".", entry.source_name)];
    case "dsh-plugin":
      return [key("dsh-plugin", repo, refPath ? dirname(refPath) : ".")];
    default:
      return [];
  }
}

/** Join key of an evaluation row, mirroring `entryJoinKeys`. */
export function rowJoinKey(row) {
  const parts = row.stable_id.split(":");
  const repo = parts[1].toLowerCase();
  switch (row.type) {
    case "skill": return key("skill", repo, parts.slice(3).join(":"));
    case "mcp-tool": return key("mcp", repo, parts[parts.length - 1]);
    case "cli": return key("cli", repo, parts.slice(3, -1).join(":"), parts[parts.length - 1]);
    case "dsh-plugin": return key("dsh-plugin", repo, parts.slice(3).join(":"));
    default: return key("unknown", row.stable_id);
  }
}

const rowService = (row) => {
  const parts = row.stable_id.split(":");
  return parts.length >= 6 ? parts[parts.length - 2].toLowerCase() : undefined;
};

/** Pairs each entry with its entry-index record: by id, else by a unique provider + source name. */
export function pairIndexRecords(entries, records) {
  const byId = new Map(records.map(record => [record.id, record]));
  const byName = new Map();
  for (const record of records) {
    const name = key(record.provider, record.source_name);
    byName.set(name, [...(byName.get(name) ?? []), record]);
  }
  const paired = new Map();
  for (const entry of entries) {
    const direct = byId.get(entry.id);
    const named = byName.get(key(entry.provider, entry.source_name)) ?? [];
    const record = direct ?? (named.length === 1 ? named[0] : undefined);
    if (record) paired.set(entry.id, record);
  }
  return paired;
}

/**
 * @returns {{ links: Map<string, object>, status: Map<string, "unique" | "ambiguous" | "unmatched">, stats: object }}
 */
export function linkEntriesToRows(entries, recordsByEntryId, rows) {
  const seenStableIds = new Set();
  for (const row of rows) {
    if (seenStableIds.has(row.stable_id)) throw new Error(`duplicate stable_id in evaluation table: ${row.stable_id}`);
    seenStableIds.add(row.stable_id);
  }
  const rowsByKey = new Map();
  for (const row of rows) {
    const rowKey = rowJoinKey(row);
    rowsByKey.set(rowKey, [...(rowsByKey.get(rowKey) ?? []), row]);
  }

  const candidates = new Map();
  for (const entry of entries) {
    const found = new Map();
    for (const entryKey of entryJoinKeys(entry, recordsByEntryId.get(entry.id))) {
      for (const row of rowsByKey.get(entryKey) ?? []) found.set(row.stable_id, row);
    }
    let options = [...found.values()];
    const service = providerService(entry);
    if (options.length > 1 && entry.type === "mcp" && service) {
      const narrowed = options.filter(row => rowService(row) === service);
      if (narrowed.length === 1) options = narrowed;
    }
    candidates.set(entry.id, options);
  }

  // Every candidate counts as a claim, including those of ambiguous entries.
  const claims = new Map();
  for (const options of candidates.values()) {
    for (const row of options) claims.set(row.stable_id, (claims.get(row.stable_id) ?? 0) + 1);
  }

  const links = new Map();
  const status = new Map();
  const stats = { unique: 0, ambiguous: 0, unmatched: 0, byType: {} };
  for (const entry of entries) {
    const options = candidates.get(entry.id);
    let outcome = "unmatched";
    if (options.length === 1 && claims.get(options[0].stable_id) === 1) {
      outcome = "unique";
      links.set(entry.id, options[0]);
    } else if (options.length > 0) {
      outcome = "ambiguous";
    }
    status.set(entry.id, outcome);
    stats[outcome] += 1;
    const typeStats = stats.byType[entry.type] ?? { unique: 0, ambiguous: 0, unmatched: 0 };
    typeStats[outcome] += 1;
    stats.byType[entry.type] = typeStats;
  }
  return { links, status, stats };
}

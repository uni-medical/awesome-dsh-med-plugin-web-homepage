#!/usr/bin/env node
// Builds the static component catalogue from pinned upstream commits.
//
//   npm run data:import                       # clone/fetch into ~/.cache and import
//   npm run data:import -- --source <git dir>  # use an existing clone of awesome-dsh-med-plugin
//
// Inputs and commits are pinned in ../data/upstream-lock.json. Outputs:
//   public/data/components/index.json         list/search records (fetched at runtime)
//   public/data/components/detail/NNN.json    detail records, sharded by id
//   src/data/componentSummary.json            counts bundled into the app
//   ../data/component-import-report.json      provenance and link coverage

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { linkEntriesToRows, pairIndexRecords, entryRepository } from "./lib/link-cards.mjs";
import { toComponentDetail, toComponentSummary, toPublicCard } from "./lib/public-fields.mjs";
import { shardOf } from "./lib/shard.mjs";

const SHARD_COUNT = 128;
const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontendDir, "..");
const lock = JSON.parse(readFileSync(join(repoRoot, "data/upstream-lock.json"), "utf8"));

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const git = (dir, args, encoding = "utf8") => execFileSync("git", ["-C", dir, ...args], { encoding, maxBuffer: 1024 * 1024 * 512 });

function prepareSource() {
  const given = argument("--source");
  const dir = resolve(given ?? join(homedir(), ".cache/medical-component-market/awesome-dsh-med-plugin"));
  if (!existsSync(join(dir, ".git")) && !existsSync(join(dir, "HEAD"))) {
    if (given) throw new Error(`--source ${dir} is not a git repository`);
    mkdirSync(dirname(dir), { recursive: true });
    execFileSync("git", ["clone", "--filter=blob:none", "--no-checkout", lock.cloneUrl, dir], { stdio: "inherit" });
  }
  const commits = [...new Set(Object.values(lock.sources).map(source => source.commit))];
  const missing = commits.filter(commit => { try { git(dir, ["cat-file", "-e", `${commit}^{commit}`]); return false; } catch { return true; } });
  if (missing.length) {
    const branches = [...new Set(Object.values(lock.sources).map(source => source.branch))];
    execFileSync("git", ["-C", dir, "fetch", "--filter=blob:none", "origin", ...branches], { stdio: "inherit" });
  }
  return dir;
}

function readSource(dir, source) {
  const bytes = git(dir, ["show", `${source.commit}:${source.path}`], "buffer");
  return source.path.endsWith(".gz") ? gunzipSync(bytes).toString("utf8") : bytes.toString("utf8");
}

const jsonLines = (text) => text.split("\n").filter(line => line.trim()).map(line => JSON.parse(line));

function parseTsv(text) {
  const [header, ...lines] = text.split("\n").filter(line => line.length);
  const columns = header.split("\t");
  return lines.map(line => Object.fromEntries(line.split("\t").map((value, index) => [columns[index], value])));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`);
  return statSync(path).size;
}

function count(values) {
  const result = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function main() {
  const dir = prepareSource();
  const entries = jsonLines(readSource(dir, lock.sources.entries));
  const indexRecords = JSON.parse(readSource(dir, lock.sources.entryIndex)).entries;
  const cards = jsonLines(readSource(dir, lock.sources.cards));
  const rows = parseTsv(readSource(dir, lock.sources.entryTable));
  const commitDate = (commit) => git(dir, ["show", "-s", "--format=%cI", commit]).trim();

  const cardsByUnit = new Map(cards.map(card => [card.unit_id, card]));
  if (cardsByUnit.size !== cards.length) throw new Error("duplicate card unit_id values");
  const records = pairIndexRecords(entries, indexRecords);
  const { links, status, stats } = linkEntriesToRows(entries, records, rows);

  const summaries = [];
  const shards = Array.from({ length: SHARD_COUNT }, () => ({}));
  let missingCard = 0;
  for (const entry of [...entries].sort((a, b) => a.id.localeCompare(b.id))) {
    const row = links.get(entry.id);
    const card = row ? cardsByUnit.get(row.card_unit_id) : undefined;
    if (row && !card) missingCard += 1;
    const publicCard = card ? toPublicCard(card, row) : null;
    const repo = row?.repository || entryRepository(entry, records.get(entry.id));
    summaries.push(toComponentSummary(entry, repo, publicCard));
    shards[shardOf(entry.id, SHARD_COUNT)][entry.id] = toComponentDetail(entry, records.get(entry.id), repo, publicCard, status.get(entry.id));
  }

  const upstream = Object.fromEntries(Object.entries(lock.sources).map(([name, source]) => [name, { ...source, committedAt: commitDate(source.commit) }]));
  const outputDir = join(frontendDir, "public/data/components");
  rmSync(outputDir, { recursive: true, force: true });
  const indexBytes = writeJson(join(outputDir, "index.json"), { schemaVersion: "2", repository: lock.repository, upstream, components: summaries });
  let detailBytes = 0;
  let largestShard = 0;
  shards.forEach((shard, index) => {
    const size = writeJson(join(outputDir, "detail", `${String(index).padStart(3, "0")}.json`), { schemaVersion: "2", shard: index, components: shard });
    detailBytes += size;
    largestShard = Math.max(largestShard, size);
  });

  const evaluated = summaries.filter(item => item.risk !== null);
  const summary = {
    schemaVersion: "2",
    total: summaries.length,
    evaluated: evaluated.length,
    byType: count(summaries.map(item => item.type)),
    byGroup: count(summaries.map(item => item.group)),
    byRisk: count(evaluated.map(item => item.risk)),
    upstream: Object.fromEntries(Object.entries(upstream).map(([name, source]) => [name, { branch: source.branch, commit: source.commit, committedAt: source.committedAt }])),
  };
  writeJson(join(frontendDir, "src/data/componentSummary.json"), summary);

  const linkedRows = new Set([...links.values()].map(row => row.stable_id));
  const unmatchedRows = rows.filter(row => !linkedRows.has(row.stable_id));
  const idsWith = (outcome) => entries.filter(entry => status.get(entry.id) === outcome).map(entry => entry.id);
  const frontendCommit = execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const report = {
    schemaVersion: 1,
    frontendBaseCommit: frontendCommit,
    upstreamRepository: lock.repository,
    upstream,
    counts: {
      entries: entries.length,
      entryIndexRecords: indexRecords.length,
      entriesPairedWithIndex: records.size,
      cards: cards.length,
      entryTableRows: rows.length,
      exported: summaries.length,
      evaluatedExported: evaluated.length,
      linkedRowWithoutCard: missingCard,
    },
    link: {
      rule: "repository (lower case) + type + component root path (case-sensitive) + name; skill root = SKILL.md directory, mcp = tool name (same-named tools narrowed by the provider's service suffix), cli = definition-file directory + name, dsh-plugin = cordis.patch.yml directory. A card is attached only when one row matches the entry and no other entry claims that row.",
      ...stats,
      coverage: Number((stats.unique / entries.length).toFixed(4)),
      evaluationRowsWithoutEntry: count(unmatchedRows.map(row => row.type)),
      ambiguousEntryIds: idsWith("ambiguous"),
      unmatchedEntrySamples: idsWith("unmatched").slice(0, 40),
    },
    outputs: {
      indexBytes,
      detailShards: SHARD_COUNT,
      detailBytes,
      largestShardBytes: largestShard,
    },
  };
  writeJson(join(repoRoot, "data/component-import-report.json"), report);
  writeFileSync(join(repoRoot, "data/component-import-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`entries ${entries.length} · cards ${cards.length} · linked ${stats.unique} (${(report.link.coverage * 100).toFixed(1)}%) · ambiguous ${stats.ambiguous} · unmatched ${stats.unmatched}`);
  console.log(`index ${(indexBytes / 1e6).toFixed(2)} MB · details ${(detailBytes / 1e6).toFixed(2)} MB in ${SHARD_COUNT} shards (largest ${(largestShard / 1e3).toFixed(0)} KB)`);
}

main();

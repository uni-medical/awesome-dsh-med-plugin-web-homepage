import { describe, expect, it } from "vitest";
import { entryJoinKeys, linkEntriesToRows, pairIndexRecords, rowJoinKey } from "../scripts/lib/link-cards.mjs";

const blob = (repo: string, path: string) => `https://github.com/${repo}/blob/00ad54c022a3effb9e848bb70b158b79584f6014/${path}#evidence-1`;

const entry = (id: string, type: string, provider: string, sourceName: string, sourceRef: string) => ({ id, type, provider, source_name: sourceName, source_ref: sourceRef });
const indexRecord = (id: string, type: string, provider: string, sourceName: string, repository: string, evidence: string[] = []) => ({ id, type, provider, source_name: sourceName, evidence, source: { repository: `https://github.com/${repository.toLowerCase()}`, revision: "00ad54c022a3effb9e848bb70b158b79584f6014" } });
const row = (stableId: string, type: string, cardUnitId = stableId) => ({ stable_id: stableId, type, card_unit_id: cardUnitId, repository: stableId.split(":")[1] });

describe("row and entry join keys", () => {
  it("derives a skill key from the SKILL.md directory and keeps path case", () => {
    const skill = entry("skill:o/r/x", "skill", "skill:o/r", "o/r:Skills/Genomics/qc", blob("O/R", "Skills/Genomics/qc/SKILL.md"));
    expect(entryJoinKeys(skill, undefined)).toEqual([["skill", "o/r", "Skills/Genomics/qc"].join("\u0000")]);
    expect(rowJoinKey(row("entry:O/R:skill:Skills/Genomics/qc", "skill"))).toBe(["skill", "o/r", "Skills/Genomics/qc"].join("\u0000"));
    expect(rowJoinKey(row("entry:O/R:skill:Skills/genomics/qc", "skill"))).not.toBe(entryJoinKeys(skill, undefined)[0]);
  });

  it("uses the entry-index evidence when the source reference is not a SKILL.md path", () => {
    const skill = entry("skill:o/r/x", "skill", "skill:o/r", "x", "README.md");
    const record = indexRecord("skill:o/r/x-1", "skill", "skill:o/r", "x", "O/R", ["tools/x/SKILL.md"]);
    expect(entryJoinKeys(skill, record)).toEqual([["skill", "o/r", "tools/x"].join("\u0000")]);
  });

  it("keys cli entries by definition directory and name, with the repository root as '.'", () => {
    const cli = entry("cli:o/r/a--cli-a", "cli", "cli:o/r", "a", "pyproject.toml");
    const nested = entry("cli:o/r/a--cli-npm-a", "cli", "cli:o/r", "a", blob("O/R", "npm/package.json"));
    expect(entryJoinKeys(cli, indexRecord("cli:o/r/a-1", "cli", "cli:o/r", "a", "O/R"))[0]).toBe(rowJoinKey(row("entry:O/R:cli:.:a", "cli")));
    expect(entryJoinKeys(nested, undefined)[0]).toBe(rowJoinKey(row("entry:O/R:cli:npm:a", "cli")));
  });

  it("keys mcp tools by repository and tool name", () => {
    const tool = entry("mcp:o/r/search", "mcp", "mcp:o/r", "search", "server.py");
    expect(entryJoinKeys(tool, indexRecord("mcp:o/r/search", "mcp", "mcp:o/r", "search", "O/R"))[0]).toBe(rowJoinKey(row("entry:O/R:mcp:pypi:r:search", "mcp-tool")));
  });
});

describe("linkEntriesToRows", () => {
  it("links one entry to one row and reports it as unique", () => {
    const entries = [entry("cli:o/r/a", "cli", "cli:o/r", "a", blob("O/R", "pyproject.toml"))];
    const result = linkEntriesToRows(entries, new Map(), [row("entry:O/R:cli:.:a", "cli", "install:O/R:cli:.:a")]);
    expect(result.links.get("cli:o/r/a")?.card_unit_id).toBe("install:O/R:cli:.:a");
    expect(result.status.get("cli:o/r/a")).toBe("unique");
  });

  it("leaves entries without a row unmatched", () => {
    const entries = [entry("skill:o/r/x", "skill", "skill:o/r", "x", blob("O/R", "x/SKILL.md"))];
    const result = linkEntriesToRows(entries, new Map(), [row("entry:O/R:skill:y", "skill")]);
    expect(result.links.size).toBe(0);
    expect(result.status.get("skill:o/r/x")).toBe("unmatched");
  });

  it("does not attach a card when one entry has several candidate rows", () => {
    const entries = [entry("mcp:o/r/calc", "mcp", "mcp:o/r", "calc", "index.js")];
    const rows = [row("entry:O/R:mcp:npm:svc-a:calc", "mcp-tool"), row("entry:O/R:mcp:npm:svc-b:calc", "mcp-tool")];
    const result = linkEntriesToRows(entries, new Map(), rows);
    expect(result.links.size).toBe(0);
    expect(result.status.get("mcp:o/r/calc")).toBe("ambiguous");
  });

  it("resolves same-named tools when the provider suffix names the service", () => {
    const entries = [entry("mcp:o/r--svc-b/calc", "mcp", "mcp:o/r--svc-b", "calc", "index.js")];
    const record = indexRecord("mcp:o/r--svc-b/calc", "mcp", "mcp:o/r--svc-b", "calc", "O/R");
    const rows = [row("entry:O/R:mcp:npm:svc-a:calc", "mcp-tool"), row("entry:O/R:mcp:npm:svc-b:calc", "mcp-tool")];
    const result = linkEntriesToRows(entries, new Map([[entries[0].id, record]]), rows);
    expect(result.links.get(entries[0].id)?.stable_id).toBe("entry:O/R:mcp:npm:svc-b:calc");
  });

  it("does not attach a card when two entries claim the same row", () => {
    const entries = [
      entry("cli:o/r/a-1", "cli", "cli:o/r", "a", blob("O/R", "pyproject.toml")),
      entry("cli:o/r/a-2", "cli", "cli:o/r", "a", blob("O/R", "setup.cfg")),
    ];
    const result = linkEntriesToRows(entries, new Map(), [row("entry:O/R:cli:.:a", "cli")]);
    expect(result.links.size).toBe(0);
    expect([...result.status.values()]).toEqual(["ambiguous", "ambiguous"]);
    expect(result.stats).toMatchObject({ unique: 0, ambiguous: 2, unmatched: 0 });
  });
});

describe("claim and fallback edge cases", () => {
  it("does not attach a row that an ambiguous entry also matches", () => {
    const entries = [
      entry("mcp:o/r/calc", "mcp", "mcp:o/r", "calc", "index.js"),
      entry("cli:o/r/calc", "cli", "cli:o/r", "calc", blob("O/R", "pyproject.toml")),
    ];
    const rows = [row("entry:O/R:mcp:npm:svc-a:calc", "mcp-tool"), row("entry:O/R:mcp:npm:svc-b:calc", "mcp-tool"), row("entry:O/R:cli:.:calc", "cli")];
    const shared = entry("mcp:o/r--svc-a/calc", "mcp", "mcp:o/r--svc-a", "calc", "index.js");
    const result = linkEntriesToRows([...entries, shared], new Map(), rows);
    expect(result.status.get("mcp:o/r/calc")).toBe("ambiguous");
    expect(result.links.has("mcp:o/r--svc-a/calc")).toBe(false);
    expect(result.links.get("cli:o/r/calc")?.stable_id).toBe("entry:O/R:cli:.:calc");
  });

  it("uses the entry's own SKILL.md and ignores other skills listed as evidence", () => {
    const skill = entry("skill:o/r/a", "skill", "skill:o/r", "a", blob("O/R", "skills/a/SKILL.md"));
    const record = indexRecord("skill:o/r/a", "skill", "skill:o/r", "a", "O/R", ["skills/a/SKILL.md", "skills/b/SKILL.md"]);
    expect(entryJoinKeys(skill, record)).toEqual([["skill", "o/r", "skills/a"].join("\u0000")]);
  });

  it("keeps a raw path when the source URL has invalid percent-encoding", () => {
    const skill = entry("skill:o/r/x", "skill", "skill:o/r", "x", blob("O/R", "100%/SKILL.md"));
    expect(entryJoinKeys(skill, undefined)).toEqual([["skill", "o/r", "100%"].join("\u0000")]);
  });

  it("rejects an evaluation table with duplicate stable ids", () => {
    expect(() => linkEntriesToRows([], new Map(), [row("entry:O/R:cli:.:a", "cli"), row("entry:O/R:cli:.:a", "cli")])).toThrow("duplicate stable_id");
  });
});

describe("pairIndexRecords", () => {
  it("pairs by id first, then by a unique provider and source name", () => {
    const entries = [entry("cli:o/r/a", "cli", "cli:o/r", "a", "x"), entry("cli:o/r/b", "cli", "cli:o/r", "b", "x"), entry("cli:o/r/c", "cli", "cli:o/r", "c", "x")];
    const records = [
      indexRecord("cli:o/r/a", "cli", "cli:o/r", "a", "O/R"),
      indexRecord("cli:o/r/b-hash", "cli", "cli:o/r", "b", "O/R"),
      indexRecord("cli:o/r/c-1", "cli", "cli:o/r", "c", "O/R"),
      indexRecord("cli:o/r/c-2", "cli", "cli:o/r", "c", "O/R"),
    ];
    const paired = pairIndexRecords(entries, records);
    expect(paired.get("cli:o/r/a")?.id).toBe("cli:o/r/a");
    expect(paired.get("cli:o/r/b")?.id).toBe("cli:o/r/b-hash");
    expect(paired.has("cli:o/r/c")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { createComponentClient } from "../src/api/componentClient";
import { parseComponentDetail, parseComponentDetailShard, parseComponentIndex } from "../src/lib/components";
import { shardOf } from "../src/lib/shard";

const summary = { id: "cli:o/r/a", name: "A", type: "cli", repo: "O/R", description: "d", tags: [], group: "tools", domain: "general", tasks: [], risk: null, functionPrimary: null };
const detail = {
  id: "cli:o/r/a", name: "A", type: "cli", repo: "O/R", provider: "cli:o/r", sourceName: "a", sourceUrl: "https://github.com/O/R", repositoryUrl: "https://github.com/O/R",
  license: null, callable: true, aliases: [], description: "d", tags: [], capabilities: [{ domain: "general", subdomain: "s", task: "t", inputs: ["q"], outputs: [], databases: [] }],
  evaluation: null, link: { status: "unmatched" },
};
const card = { unitId: "install:O/R:cli:.:a", risk: { verdict: "暂未发现风险", level: "green" }, function: {}, quality: [], medical: {}, review: {} };

describe("component index parsing", () => {
  it("keeps valid records and skips invalid or duplicate ones", () => {
    const index = parseComponentIndex({ schemaVersion: "2", components: [summary, { ...summary }, { ...summary, id: "x", type: "plugin" }, null] });
    expect(index.components.map(item => item.id)).toEqual(["cli:o/r/a"]);
    expect(index.skipped).toBe(3);
    expect(index.components[0].functionLabels).toEqual([]);
  });

  it("rejects an index from an unsupported schema", () => {
    expect(() => parseComponentIndex({ schemaVersion: "1", entries: [] })).toThrow("Unsupported component index");
  });
});

describe("component detail parsing", () => {
  it("reads a record without an evaluation as not evaluated", () => {
    expect(parseComponentDetail(detail)).toMatchObject({ evaluation: null, link: { status: "unmatched" }, capabilities: [{ inputs: ["q"] }] });
  });

  it("accepts older records that lack optional fields", () => {
    const parsed = parseComponentDetail({ id: "cli:o/r/a", name: "A", type: "cli", repo: "O/R" });
    expect(parsed).toMatchObject({ sourceUrl: "https://github.com/O/R", capabilities: [], evaluation: null, link: { status: "unmatched" } });
  });

  it("attaches an evaluation only to a unique link", () => {
    expect(parseComponentDetail({ ...detail, evaluation: card, link: { status: "unique" } })?.link).toEqual({ status: "unique", cardUnitId: "install:O/R:cli:.:a" });
    expect(parseComponentDetail({ ...detail, evaluation: { ...card, risk: { level: "purple" } }, link: { status: "unique" } })).toMatchObject({ evaluation: null, link: { status: "unmatched" } });
  });

  it("renders only GitHub https links", () => {
    expect(parseComponentDetail({ ...detail, sourceUrl: "javascript:alert(1)", repositoryUrl: "http://example.com" })).toMatchObject({ sourceUrl: "https://github.com/O/R", repositoryUrl: "https://github.com/O/R" });
    expect(parseComponentDetail({ ...detail, repo: "../x?y", sourceUrl: "data:text/html,x" })?.sourceUrl).toBe("https://github.com/");
  });

  it("indexes a shard by component id", () => {
    expect([...parseComponentDetailShard({ components: { a: detail, b: { id: 1 } } }).keys()]).toEqual(["cli:o/r/a"]);
  });
});

describe("static component client", () => {
  it("loads the index once and reads details from the matching shard", async () => {
    const requested: string[] = [];
    const client = createComponentClient(async url => {
      requested.push(url);
      const body = url.endsWith("index.json") ? { schemaVersion: "2", components: [summary] } : { components: { [detail.id]: detail } };
      return { ok: true, status: 200, json: async () => body };
    }, "/base");
    await client.loadIndex();
    await client.loadIndex();
    expect(await client.getDetail(detail.id)).toMatchObject({ id: detail.id });
    expect(await client.getDetail(detail.id)).toMatchObject({ id: detail.id });
    expect(requested).toEqual(["/base/data/components/index.json", `/base/data/components/detail/${String(shardOf(detail.id)).padStart(3, "0")}.json`]);
  });

  it("surfaces HTTP failures and retries on the next call", async () => {
    let calls = 0;
    const client = createComponentClient(async () => { calls += 1; return { ok: calls > 1, status: calls > 1 ? 200 : 503, json: async () => ({ schemaVersion: "2", components: [] }) }; }, "/");
    await expect(client.loadIndex()).rejects.toThrow("HTTP 503");
    await expect(client.loadIndex()).resolves.toMatchObject({ components: [] });
  });
});

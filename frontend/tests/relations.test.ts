import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogueRelations, compactEdges, installHint, relationsByComponent, requirementsIndex } from "../scripts/lib/relations.mjs";
import { EVALUATION_GLOSSARY_EN } from "../src/data/evaluationGlossary";
import { catalogueNeighbours, normaliseName, prepare, queryTermGroups, searchCandidates } from "../src/lib/capabilitySearch";
import { parseComponentDetail, parseComponentIndex, type ComponentSummary } from "../src/lib/components";
import { evaluationText } from "../src/lib/evaluationText";

const indexToCatalogue = new Map([["mcp:o/r/a-1", "mcp:o/r/a"], ["mcp:o/r/b-2", "mcp:o/r/b"], ["skill:o/r/c-3", "skill:o/r/c"]]);

describe("catalogue relations import", () => {
  const relations = [
    { from: "mcp:o/r/a-1", to: "mcp:o/r/b-2", type: "requires", condition: "  search first  " },
    { from: "mcp:o/r/a-1", to: "skill:o/r/c-3", type: "composes_with", kind: "data-flow", condition: null },
    { from: "mcp:o/r/a-1", to: "skill:o/r/c-3", type: "composes_with", kind: "data-flow", condition: null },
    { from: "mcp:o/r/a-1", to: "cap:123", type: "provides" },
    { from: "mcp:o/r/a-1", to: "mcp:other/x-9", type: "alternative_to" },
    { from: "mcp:o/r/b-2", to: "mcp:o/r/b-2", type: "requires" },
    { from: "mcp:o/r/b-2", to: "mcp:o/r/a-1", type: "mystery" },
  ];

  it("keeps component-to-component relations between catalogue entries, mapped to catalogue ids", () => {
    const { edges, skipped } = catalogueRelations(relations, indexToCatalogue);
    expect(edges).toEqual([
      { from: "mcp:o/r/a", to: "mcp:o/r/b", type: "requires", condition: "search first" },
      { from: "mcp:o/r/a", to: "skill:o/r/c", type: "data-flow", condition: null },
    ]);
    expect(skipped).toEqual({ provides: 1, unknownType: 1, outsideCatalogue: 1, selfLoop: 1, duplicate: 1 });
  });

  it("lists relations from both ends and compacts edges to index positions", () => {
    const { edges } = catalogueRelations(relations, indexToCatalogue);
    expect(relationsByComponent(edges).get("mcp:o/r/b")).toEqual([{ direction: "in", type: "requires", otherId: "mcp:o/r/a", condition: "search first" }]);
    expect(compactEdges(edges, new Map([["mcp:o/r/a", 0], ["mcp:o/r/b", 1], ["skill:o/r/c", 2]]))).toEqual([[0, 1, 0], [0, 2, 2]]);
  });

  it("builds an install hint from the entry-index record and declared requirements", () => {
    const requirements = requirementsIndex([{ entryId: "mcp:o/r/a-1", dependencyKind: "configuration" }, { entryId: "mcp:o/r/a-1", dependencyKind: "source-context" }, { entryId: "mcp:o/r/a-1", dependencyKind: "configuration" }]);
    expect(installHint({ id: "mcp:o/r/a-1", trust: "formal", install: { installability: "ready", verification: "runtime-tested" } }, requirements))
      .toEqual({ entryId: "mcp:o/r/a-1", installability: "ready", verification: "runtime-tested", trust: "formal", requires: ["configuration"] });
    expect(installHint(undefined, requirements)).toBeNull();
  });
});

describe("English evaluation text", () => {
  it("covers every closed-vocabulary value from the current import", () => {
    const vocabulary = JSON.parse(readFileSync(new URL("../../data/evaluation-vocabulary.json", import.meta.url), "utf8")) as Record<string, string[]>;
    const missing = [...new Set(Object.values(vocabulary).flat())].filter(value => !(value in EVALUATION_GLOSSARY_EN));
    expect(missing).toEqual([]);
  });

  it("translates known values, footers and sources, and leaves free text as published", () => {
    expect(evaluationText("en", "暂未发现风险")).toBe("No risk found in this review");
    expect(evaluationText("zh", "暂未发现风险")).toBe("暂未发现风险");
    expect(evaluationText("en", "检测日期 2026-11-03 · 代码版本 77f5361")).toBe("Checked 2026-11-03 · code version 77f5361");
    expect(evaluationText("en", "judge")).toBe("AI review");
    expect(evaluationText("zh", "rule v4")).toBe("规则 v4");
    expect(evaluationText("en", "组件通过 PubMed 检索论文。")).toBe("组件通过 PubMed 检索论文。");
  });
});

const summary = (id: string, name: string, overrides: Partial<ComponentSummary> = {}): ComponentSummary => ({
  id, name, type: "mcp", repo: "o/r", description: "", tags: [], group: "literature", domain: "literature", tasks: [], risk: null, functionPrimary: null, functionLabels: [], ...overrides,
});

describe("relations in the browser", () => {
  it("reads compact edges and drops malformed ones", () => {
    const index = parseComponentIndex({ schemaVersion: "2", components: [summary("a", "A"), summary("b", "B")], relations: { types: ["requires", "data-flow"], edges: [[0, 1, 0], [1, 0, 1], [0, 9, 0], [0, 1, 7], "x"] } });
    expect(index.edges).toEqual([{ from: "a", to: "b", type: "requires" }, { from: "b", to: "a", type: "data-flow" }]);
  });

  it("reads install hints and relation lists on detail records", () => {
    const detail = parseComponentDetail({ id: "a", name: "A", type: "mcp", repo: "o/r", install: { entryId: "mcp:o/r/a-1", requires: ["configuration"] }, relations: [{ direction: "out", type: "requires", otherId: "b", condition: null }, { direction: "sideways", type: "requires", otherId: "c" }] });
    expect(detail?.install).toEqual({ entryId: "mcp:o/r/a-1", installability: "unknown", verification: "unknown", trust: "unknown", requires: ["configuration"] });
    expect(detail?.relations).toEqual([{ direction: "out", type: "requires", otherId: "b", condition: null }]);
  });

  it("finds catalogue neighbours of a group, merged by name and labelled by direction", () => {
    const items = [summary("a1", "PubMed search"), summary("a2", "PubMed search"), summary("b", "Get full text"), summary("c", "Citation export"), summary("d", "Get full text")];
    const byId = new Map(items.map(item => [item.id, item]));
    const group = searchCandidates(prepare(items), "pubmed").groups.find(item => item.key === normaliseName("PubMed search"))!;
    const neighbours = catalogueNeighbours(group, [
      { from: "a1", to: "b", type: "data-flow" }, { from: "d", to: "a2", type: "requires" }, { from: "c", to: "a1", type: "alternative_to" }, { from: "a1", to: "a2", type: "requires" },
    ], byId);
    expect(neighbours.map(item => [item.name, item.members.length, item.relations])).toEqual([
      ["Get full text", 2, [{ type: "data-flow", direction: "out" }, { type: "requires", direction: "in" }]],
      ["Citation export", 1, [{ type: "alternative_to", direction: "in" }]],
    ]);
  });

  it("groups query terms under the Chinese phrase they came from", () => {
    expect(queryTermGroups("检索神经肿瘤论文 PubMed")).toEqual(expect.arrayContaining([
      { source: "神经肿瘤", terms: ["neuro-oncology", "glioma", "brain tumor"] },
      { source: null, terms: ["pubmed"] },
    ]));
  });
});

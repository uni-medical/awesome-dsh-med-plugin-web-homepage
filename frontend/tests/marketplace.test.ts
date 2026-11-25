import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ComponentSummary } from "../src/lib/components";
import { searchText } from "../src/lib/components";
import { countBy, filterComponents, matchesQuery, toggleMultiValue } from "../src/lib/marketplace";

const summary = (overrides: Partial<ComponentSummary>): ComponentSummary => ({
  id: "skill:o/r/x", name: "x", type: "skill", repo: "O/R", description: "", tags: [], group: "tools", domain: "general", tasks: [], risk: null, functionPrimary: null, functionLabels: [], ...overrides,
});

const items = [
  summary({ id: "mcp:a/pubmed/search", name: "PubMed Search", type: "mcp", group: "literature", domain: "literature", description: "Search PubMed abstracts", risk: "green", functionPrimary: "数据检索与查询" }),
  summary({ id: "skill:b/scanpy/qc", name: "Single-cell QC", type: "skill", group: "omics", domain: "transcriptomics", tags: ["single-cell"], risk: "red", functionPrimary: "分析流程" }),
  summary({ id: "cli:c/tool/x", name: "Citation tool", type: "cli", group: "literature", domain: "literature", tasks: ["citation-management"] }),
];
const indexed = items.map(item => ({ item, text: searchText(item) }));
const ids = (params: string, ignore?: string[]) => filterComponents(indexed, new URLSearchParams(params), ignore).map(item => item.id);

describe("component list filters", () => {
  it("matches every search term, case-insensitively, across name, tags and tasks", () => {
    expect(ids("q=pubmed")).toEqual(["mcp:a/pubmed/search"]);
    expect(ids("q=SINGLE-CELL qc")).toEqual(["skill:b/scanpy/qc"]);
    expect(ids("q=pubmed citation")).toEqual([]);
  });

  it("expands a Chinese term through the glossary", () => {
    expect(matchesQuery("search pubmed abstracts", "摘要")).toBe(true);
    expect(ids("q=引用")).toEqual(["cli:c/tool/x"]);
  });

  it("combines group, type, risk and function filters", () => {
    expect(ids("group=literature")).toEqual(["mcp:a/pubmed/search", "cli:c/tool/x"]);
    expect(ids("type=skill&type=cli")).toEqual(["skill:b/scanpy/qc", "cli:c/tool/x"]);
    expect(ids("risk=none")).toEqual(["cli:c/tool/x"]);
    expect(ids("risk=green&risk=red&group=omics")).toEqual(["skill:b/scanpy/qc"]);
    expect(ids(`fn=${encodeURIComponent("分析流程")}`)).toEqual(["skill:b/scanpy/qc"]);
  });

  it("can ignore one facet so its counts reflect the other filters", () => {
    expect(ids("group=omics&type=mcp", ["type"])).toEqual(["skill:b/scanpy/qc"]);
    expect(countBy(items, item => item.functionPrimary)).toEqual(new Map([["数据检索与查询", 1], ["分析流程", 1]]));
  });

  it("toggles repeated query values without disturbing other filters", () => {
    const params = new URLSearchParams("group=omics&type=skill&type=mcp");
    const removed = toggleMultiValue(params, "type", "skill");
    expect(removed.getAll("type")).toEqual(["mcp"]);
    expect(removed.get("group")).toBe("omics");
    expect(toggleMultiValue(removed, "type", "cli").getAll("type")).toEqual(["mcp", "cli"]);
  });
});

describe("workspace routes", () => {
  it("generates static entry points for every workspace route, including redirects", () => {
    const script = readFileSync(new URL("../scripts/generate-routes.mjs", import.meta.url), "utf8");
    for (const route of ["marketplace", "graph", "settings", "collections", "research"]) {
      expect(script).toContain(`"${route}"`);
    }
  });

  it("keeps one shared navigation rail and plan bar across workspace routes", () => {
    const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../src/components/WorkbenchLayout.tsx", import.meta.url), "utf8");
    const navigation = readFileSync(new URL("../src/components/MarketplaceNavRail.tsx", import.meta.url), "utf8");
    expect(app).toContain("<Route element={<WorkbenchLayout/>}>");
    expect(app).toContain('path="/graph"');
    expect(layout).toContain("<PlanBar/>");
    expect(navigation).toContain('to="/graph"');
    expect(navigation.match(/viewTransition/g)?.length).toBeGreaterThanOrEqual(4);
  });
});

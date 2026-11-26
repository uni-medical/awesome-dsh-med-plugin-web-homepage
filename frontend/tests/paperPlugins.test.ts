import { describe, expect, it } from "vitest";
import { MECHANISM_ROLES, linkPaperCards, paperPluginSuffix, paperPluginTitle, toPaperPluginDetail, toPaperPluginSummary } from "../scripts/lib/paper-plugins.mjs";
import { parseComponentDetail, parseComponentIndex } from "../src/lib/components";
import type { ComponentSummary } from "../src/lib/components";
import { searchText } from "../src/lib/components";
import { countBy, filterComponents } from "../src/lib/marketplace";

const UPSTREAM = { repository: "uni-medical/awesome-dsh-med-plugin", commit: "4026002899fb12a84c138d691a7ccca4632d77da" };

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "dsh-plugin:user/added/cdcd7f9826fe4f5b657cecf6",
  stable_id: "paper-plugin:fcce",
  entry_version: "84d7",
  type: "dsh-plugin",
  name: "上下文预算监控与历史摘要扩展：注册唯一前缀 systemPrompt context 输出可读的上下文预算状态。局限：未验证临床效果。",
  description: "上下文预算监控与历史摘要扩展：注册唯一前缀 systemPrompt context 输出可读的上下文预算状态。局限：未验证临床效果。",
  trust: "formal",
  source: { kind: "literature", number: 1, label: "MedicalHarness", title: "MedicalHarness: A Controlled Evaluation", url: "https://arxiv.org/abs/2610.05778", pdf_sha256: "af5c" },
  locator: { definition_file: "formal-inventory/plugins/cdcd7f9826fe4f5b657cecf6/84d7/index.mjs", manifest: "formal-inventory/plugins/cdcd7f9826fe4f5b657cecf6/84d7/manifest.json" },
  details: { harness: { role: "contextMemory" } },
  installation: { kind: "dsh-plugin", installability: "ready", requires_allow_unreviewed: true },
  evidence: { status: "passed", report: "formal-inventory/checks/x/result.json" },
  ...overrides,
});

const card = (suffix = "cdcd7f9826fe4f5b657cecf6") => ({ unit_id: `install:paper-plugin/${suffix}:dsh-plugin:.`, source: `paper-plugin/${suffix}` });
const row = (suffix = "cdcd7f9826fe4f5b657cecf6") => ({ card_unit_id: `install:paper-plugin/${suffix}:dsh-plugin:.`, repository: `paper-plugin/${suffix}`, review_rejected_claims: "0" });

const publicCard = { risk: { level: "green" }, function: { primary: "智能体编排", subLabels: ["智能体运行与评测编排"] } };

describe("paper mechanism plugins: titles and ids", () => {
  it("uses the text before the first colon as the title and keeps the full text as the description", () => {
    expect(paperPluginTitle("上下文预算监控与历史摘要扩展：注册唯一前缀")).toBe("上下文预算监控与历史摘要扩展");
    expect(paperPluginTitle("Context-memory extension for chest X-ray VQA: stores findings")).toBe("Context-memory extension for chest X-ray VQA");
  });

  it("shortens titles without a usable colon at a word or clause boundary", () => {
    const long = "确定性的 CellVoyager Algorithm 1 外层编排服务，在每一步之后记录状态并在预算耗尽前结束回合，同时向宿主报告进度和最终结果";
    expect(paperPluginTitle(long)).toBe("确定性的 CellVoyager Algorithm 1 外层编排服务");
    const unbroken = "x".repeat(90);
    expect(paperPluginTitle(unbroken)).toHaveLength(60);
    expect(paperPluginTitle(unbroken).endsWith("…")).toBe(true);
    expect(paperPluginTitle("短标题")).toBe("短标题");
  });

  it("extracts the id suffix shared by the inventory entry, card and entry-table row", () => {
    expect(paperPluginSuffix("dsh-plugin:user/added/cdcd7f9826fe4f5b657cecf6")).toBe("cdcd7f9826fe4f5b657cecf6");
    expect(paperPluginSuffix("install:paper-plugin/cdcd7f9826fe4f5b657cecf6:dsh-plugin:.")).toBe("cdcd7f9826fe4f5b657cecf6");
    expect(paperPluginSuffix("paper-plugin/cdcd7f9826fe4f5b657cecf6")).toBe("cdcd7f9826fe4f5b657cecf6");
    expect(paperPluginSuffix("mcp:o/r/tool")).toBeNull();
  });
});

describe("paper mechanism plugins: card links", () => {
  it("links a card and row by the shared suffix", () => {
    const { links, stats } = linkPaperCards([entry()], [card()], [row()]);
    expect(links.get(entry().id)?.card.unit_id).toBe(card().unit_id);
    expect(links.get(entry().id)?.row?.review_rejected_claims).toBe("0");
    expect(stats).toEqual({ entries: 1, linked: 1, unmatched: 0, duplicateCards: 0 });
  });

  it("attaches no card when the suffix is missing or appears on more than one card", () => {
    const other = entry({ id: "dsh-plugin:user/added/aaaaaaaaaaaaaaaaaaaaaaaa" });
    const { links, stats } = linkPaperCards([entry(), other], [card(), card()], []);
    expect(links.size).toBe(0);
    expect(stats).toEqual({ entries: 2, linked: 0, unmatched: 2, duplicateCards: 1 });
  });
});

describe("paper mechanism plugins: public records", () => {
  it("builds a list record in the mechanisms group with its role and paper", () => {
    const summary = toPaperPluginSummary(entry(), UPSTREAM.repository, publicCard);
    expect(summary).toMatchObject({
      id: entry().id, name: "上下文预算监控与历史摘要扩展", type: "dsh-plugin", repo: UPSTREAM.repository,
      group: "mechanisms", domain: "agent-mechanism", mechanism: "contextMemory", paper: "MedicalHarness",
      risk: "green", functionPrimary: "智能体编排", functionLabels: ["智能体运行与评测编排"],
    });
    expect(summary.description.length).toBeLessThanOrEqual(320);
    expect(summary.tasks).toEqual([]);
    expect(summary.tags).toEqual(["agent mechanism", "context memory"]);
  });

  it("drops an unknown role instead of guessing one", () => {
    expect(MECHANISM_ROLES).toEqual(["orchestration", "contextMemory", "evaluationFeedback", "permissions"]);
    expect(toPaperPluginSummary(entry({ details: { harness: { role: "other" } } }), UPSTREAM.repository, null).mechanism).toBeNull();
  });

  it("builds a detail record with the paper, the pinned source file and a formal install hint", () => {
    const detail = toPaperPluginDetail(entry(), UPSTREAM, null);
    expect(detail.paper).toEqual({ label: "MedicalHarness", title: "MedicalHarness: A Controlled Evaluation", url: "https://arxiv.org/abs/2610.05778" });
    expect(detail.sourceUrl).toBe(`https://github.com/${UPSTREAM.repository}/blob/${UPSTREAM.commit}/data/formal-inventory/plugins/cdcd7f9826fe4f5b657cecf6/84d7/index.mjs`);
    expect(detail.install).toEqual({ entryId: entry().id, installability: "ready", verification: "passed", trust: "formal", requires: [], formalInventory: true });
    expect(detail.mechanism).toBe("contextMemory");
    expect(detail.link).toEqual({ status: "unmatched" });
    expect(detail.description).toBe(entry().description);
  });

  it("does not export a non-https paper link", () => {
    const detail = toPaperPluginDetail(entry({ source: { label: "X", title: "T", url: "javascript:alert(1)" } }), UPSTREAM, null);
    expect(detail.paper).toEqual({ label: "X", title: "T", url: null });
  });
});

describe("paper mechanism plugins in the app", () => {
  const base = { id: "a", name: "a", type: "dsh-plugin", repo: "O/R", description: "", tags: [], domain: "agent-mechanism", tasks: [], risk: null, functionPrimary: null, functionLabels: [] };

  it("keeps a valid role and paper and drops an invalid role", () => {
    const index = parseComponentIndex({ schemaVersion: "2", components: [
      { ...base, id: "a", group: "mechanisms", mechanism: "permissions", paper: "GuardAgent" },
      { ...base, id: "b", group: "mechanisms", mechanism: "bogus", paper: 3 },
    ] });
    expect(index.components.map(item => [item.mechanism, item.paper])).toEqual([["permissions", "GuardAgent"], [null, null]]);
    expect(index.skipped).toBe(0);
  });

  it("filters and counts by mechanism role, and searches the paper name", () => {
    const items: ComponentSummary[] = [
      { ...base, id: "m1", group: "mechanisms", mechanism: "contextMemory", paper: "CellVoyager" } as ComponentSummary,
      { ...base, id: "m2", group: "mechanisms", mechanism: "orchestration", paper: "AutoBA" } as ComponentSummary,
      { ...base, id: "t1", type: "mcp", group: "tools" } as ComponentSummary,
    ];
    const indexed = items.map(item => ({ item, text: searchText(item) }));
    expect(filterComponents(indexed, new URLSearchParams("mech=contextMemory")).map(item => item.id)).toEqual(["m1"]);
    expect(filterComponents(indexed, new URLSearchParams("q=cellvoyager")).map(item => item.id)).toEqual(["m1"]);
    expect([...countBy(filterComponents(indexed, new URLSearchParams("mech=contextMemory"), ["mech"]), item => item.mechanism ?? null)]).toEqual([["contextMemory", 1], ["orchestration", 1]]);
  });

  it("validates the paper link and formal install flag in a detail record", () => {
    const detail = parseComponentDetail({ ...base, repo: "uni-medical/awesome-dsh-med-plugin", mechanism: "orchestration",
      paper: { label: "AutoBA", title: "AutoBA paper", url: "http://example.com" },
      install: { entryId: "dsh-plugin:user/added/x", installability: "ready", verification: "passed", trust: "formal", requires: [], formalInventory: true } });
    expect(detail?.paper).toEqual({ label: "AutoBA", title: "AutoBA paper", url: null });
    expect(detail?.mechanism).toBe("orchestration");
    expect(detail?.install?.formalInventory).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { domainGroup, toComponentDetail, toComponentSummary, toPublicCard } from "../scripts/lib/public-fields.mjs";
import { shardOf as scriptShardOf } from "../scripts/lib/shard.mjs";
import { DETAIL_SHARD_COUNT, shardOf } from "../src/lib/shard";

const card = {
  unit_id: "install:O/R:cli:.:a", title: "a", kind: "命令行工具", source: "O/R",
  compatibility: { state: "installed", label: "沙箱安装通过", warnings: [] },
  risk: { verdict: "暂未发现风险", level: "green", subcategory: "未见敏感行为", threats: [], lines: [] },
  function: { status: "ok", primary: "数据检索与查询", secondary: null, sub_labels: ["文献检索与综述"], unmapped: ["raw-label"] },
  behaviour: { 运行方式: ["含可执行脚本"] },
  quality: [
    { key: "safety_disclosure", label: "风险披露", score: 3, source: "judge", notes: [] },
    { key: "cost", label: "成本透明", score: null, source: "rule v4", reason: "有成本来源，未交代", drivers: ["需要账号或API密钥"], disclosure_classes: {}, driver_candidates: ["x"], judge_score: 3 },
  ],
  medical: { status: "ok", groups: { 医学与生命科学数据: [{ code: "B4", label: "查询数据库", text: "检索 PubMed。", evidence: ["README.md:70"] }] }, codes: ["B4"], no_medical_content: false, none_reason: "", audience: "开发者", author_statements: [], expert_review: false, undetermined: "审核看不出：适用病种" },
  footer: ["检测方式：自动代码扫描、AI 评审", "检测日期 2026-11-03"],
  review: { status: "ok", model: "m", valid: false, validation_errors: ["internal detail"] },
};

describe("toPublicCard", () => {
  it("keeps the published card fields and their original wording", () => {
    const result = toPublicCard(card, { review_rejected_claims: "2" });
    expect(result.risk).toEqual({ verdict: "暂未发现风险", level: "green", subcategory: "未见敏感行为", threats: [], lines: [] });
    expect(result.function).toEqual({ status: "ok", primary: "数据检索与查询", secondary: null, subLabels: ["文献检索与综述"] });
    expect(result.medical.groups["医学与生命科学数据"][0].evidence).toEqual(["README.md:70"]);
    expect(result.review).toEqual({ status: "ok", valid: false, rejectedClaims: 2 });
  });

  it("drops reviewer-only fields and keeps missing scores missing", () => {
    const result = toPublicCard(card, undefined);
    const text = JSON.stringify(result);
    expect(text).not.toContain("raw-label");
    expect(text).not.toContain("internal detail");
    expect(text).not.toContain("driver_candidates");
    expect(result.quality[1]).toEqual({ key: "cost", label: "成本透明", score: null, source: "rule v4", reason: "有成本来源，未交代", drivers: ["需要账号或API密钥"] });
  });

  it("carries the rejected-all medical marking when present", () => {
    const rejected = { ...card, medical: { ...card.medical, groups: {}, rejected_all: true, rejected: [{ code: "B4", label: "查询数据库", reason: "subject_gate" }] } };
    expect(toPublicCard(rejected, undefined).medical).toMatchObject({ rejectedAll: true, rejected: [{ code: "B4", label: "查询数据库", reason: "subject_gate" }] });
  });
});

describe("summary and detail records", () => {
  const entry = {
    id: "cli:o/r/a", type: "cli", name: "A", provider: "cli:o/r", source_name: "a", source_ref: "pyproject.toml", license: null, callable: true, aliases: [],
    description: "Searches PubMed.", tags: ["pubmed", "search"],
    capabilities: [{ domain: "literature", subdomain: "search", task: "literature-search", inputs: [{ type: "query" }], outputs: [{ type: "records" }], database: ["PubMed"] }],
  };
  const record = { source: { repository: "https://github.com/o/r", revision: "00ad54c022a3effb9e848bb70b158b79584f6014" } };

  it("summarises an evaluated entry for the list", () => {
    expect(toComponentSummary(entry, "O/R", toPublicCard(card, undefined))).toEqual({
      id: "cli:o/r/a", name: "A", type: "cli", repo: "O/R", description: "Searches PubMed.", tags: ["pubmed", "search"],
      group: "literature", domain: "literature", tasks: ["search", "literature-search"], risk: "green", functionPrimary: "数据检索与查询",
    });
  });

  it("marks an entry without a verified card as not evaluated", () => {
    const summary = toComponentSummary(entry, "O/R", null);
    expect(summary.risk).toBeNull();
    expect(summary.functionPrimary).toBeNull();
    const detail = toComponentDetail(entry, record, "O/R", null, "unmatched");
    expect(detail.evaluation).toBeNull();
    expect(detail.link).toEqual({ status: "unmatched" });
    expect(detail.sourceUrl).toBe("https://github.com/O/R/blob/00ad54c022a3effb9e848bb70b158b79584f6014/pyproject.toml");
    expect(detail.capabilities[0]).toEqual({ domain: "literature", subdomain: "search", task: "literature-search", inputs: ["query"], outputs: ["records"], databases: ["PubMed"] });
  });

  it("maps upstream domains onto the six market groups", () => {
    expect(domainGroup("genomics")).toBe("omics");
    expect(domainGroup("pharmacology")).toBe("drug");
    expect(domainGroup("clinical-research")).toBe("clinical");
    expect(domainGroup("medical-imaging")).toBe("imaging");
    expect(domainGroup("literature")).toBe("literature");
    expect(domainGroup("astrodynamics")).toBe("tools");
  });
});

describe("detail sharding", () => {
  it("assigns the same shard in the import script and in the browser", () => {
    const ids = ["cli:o/r/a", "mcp:mims-harvard/tooluniverse/acc_list_guidelines", "skill:中文/路径/x", ""];
    for (const id of ids) {
      expect(shardOf(id)).toBe(scriptShardOf(id, DETAIL_SHARD_COUNT));
      expect(shardOf(id)).toBeGreaterThanOrEqual(0);
      expect(shardOf(id)).toBeLessThan(DETAIL_SHARD_COUNT);
    }
  });
});

import { getCatalogSummary, type CatalogIndex } from "./catalog";

export function getLandingEvidence(index: CatalogIndex) {
  return {
    ...getCatalogSummary(index.entries),
    types: [...new Set(index.entries.map(entry => entry.primaryCategory))].sort(),
    generatedAt: index.generatedAt,
  };
}

export const landingCopy = {
  en: {
    eyebrow: "OPEN COMPONENTS · MEDICAL RESEARCH",
    title: "Medical research,",
    titleAccent: "composed from traceable components.",
    description: "A catalogue of plugins, skills, tools, MCP servers, and CLIs for medical AI, medicine, and life-science research. Discover by domain, compare public metadata, and return to each source repository.",
    browse: "Browse Marketplace", explore: "Explore the research path", snapshot: "CATALOGUE SNAPSHOT",
    records: "Public records", recordsHint: "An open directory. A source behind every record.",
    medical: "Medical-domain records", medicalHint: "Start with your field of research.",
    types: "Component types", typesHint: "Different tools. One place to discover them.",
    date: "Snapshot generated", dateHint: "Recorded evidence, ready to inspect.",
    path: "DISCOVER / COMPARE / TRACE", principles: "A clearer path to the source.",
    discover: "Discover by medical domain", discoverText: "Start with a medicine or life-science research area and find the components around it.",
    compare: "Compare research metadata", compareText: "Read type, source description, observed stars, license, tags, and update context together.",
    trace: "Trace the research source", traceText: "Open the repository and inspect the record before reuse.",
  },
  zh: {
    eyebrow: "开放组件 · 医学研究", title: "让医学研究，", titleAccent: "由可追溯组件构成。",
    description: "面向医疗 AI、医学与生命科学研究的插件、技能、工具、MCP Server 和 CLI 目录。按领域发现、比较公开元数据，并回到来源仓库继续检查。",
    browse: "浏览组件市场", explore: "探索医学研究路径", snapshot: "医疗目录快照",
    records: "已收录公开记录", recordsHint: "开放的目录，每条记录都有来源。",
    medical: "医疗领域记录", medicalHint: "从你关注的研究领域开始。",
    types: "组件类型", typesHint: "不同的工具，共同的发现入口。",
    date: "快照生成时间", dateHint: "留存证据，随时回到来源检查。",
    path: "发现 / 比较 / 追溯", principles: "通向来源的清晰路径。",
    discover: "按医学领域发现", discoverText: "从医学或生命科学研究方向开始，寻找相关组件。",
    compare: "比较研究元数据", compareText: "并列查看类型、来源描述、观测 Star、许可证、标签和更新时间。",
    trace: "追溯研究来源", traceText: "打开来源仓库，在复用前检查项目内容。",
  },
};

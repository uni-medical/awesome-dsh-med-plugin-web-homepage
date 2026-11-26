import { MECHANISM_ROLES, type ComponentType } from "./components";
import { MECHANISM_ORDER } from "./componentCopy";

export interface ComponentCatalogSummary {
  total: number;
  evaluated: number;
  byType: Partial<Record<ComponentType, number>>;
  byMechanism?: Partial<Record<string, number>>;
  upstream: Record<string, { branch: string; commit: string; committedAt: string }>;
}

export function getLandingEvidence(summary: ComponentCatalogSummary) {
  const dates = Object.values(summary.upstream).map(source => source.committedAt).filter(Boolean).sort();
  return {
    total: summary.total,
    evaluated: summary.evaluated,
    types: (Object.keys(summary.byType) as ComponentType[]).filter(type => (summary.byType[type] ?? 0) > 0).sort(),
    mechanisms: MECHANISM_ORDER.filter(role => (summary.byMechanism?.[role] ?? 0) > 0),
    mechanismTotal: MECHANISM_ROLES.reduce((sum, role) => sum + (summary.byMechanism?.[role] ?? 0), 0),
    snapshotAt: dates[dates.length - 1] ?? "",
  };
}

export const landingCopy = {
  en: {
    eyebrow: "OPEN COMPONENTS · MEDICAL RESEARCH",
    title: "Medical research,",
    titleAccent: "composed from traceable components.",
    description: "A catalogue for medical AI, medicine and life-science research that covers both tools (skills, MCP tools, CLIs) and the four runtime mechanism classes generated from papers (orchestration, context and memory, permissions and governance, evaluation and feedback). Search by task, read each component's evaluation card, and return to the source.",
    browse: "Browse components", explore: "Explore the research path", snapshot: "CATALOGUE SNAPSHOT",
    records: "Catalogued components", recordsHint: "An open directory. A source behind every record.",
    medical: "With evaluation cards", medicalHint: "Security, function, quality and medical content from automated review.",
    types: "Capabilities and mechanisms", typesHint: "A capability environment plus four runtime mechanism classes in one harness.",
    date: "Upstream snapshot", dateHint: "Pinned upstream commits, ready to inspect.",
    path: "DISCOVER / COMPARE / TRACE", principles: "A clearer path to the source.",
    discover: "Discover by research task", discoverText: "Start with a medicine or life-science task and find the components around it.",
    compare: "Read the evaluation card", compareText: "See security risk, function, a five-axis quality profile and medical content together.",
    trace: "Trace the research source", traceText: "Open the repository and inspect the definition file before reuse.",
  },
  zh: {
    eyebrow: "开放组件 · 医学研究", title: "让医学研究，", titleAccent: "由可追溯组件构成。",
    description: "面向医疗 AI、医学与生命科学研究的组件目录，既有 Skill、MCP、CLI 等工具，也有从论文生成的执行编排、上下文与记忆、权限治理、评价反馈四类运行机制。按任务检索，查看每个组件的评估卡，并回到来源继续检查。",
    browse: "浏览组件生态", explore: "探索医学研究路径", snapshot: "医疗目录快照",
    records: "已收录组件", recordsHint: "开放的目录，每条记录都有来源。",
    medical: "已挂接评估卡", medicalHint: "安全、功能、质量与医学内容，来自自动化评审。",
    types: "能力与机制", typesHint: "能力环境加四类运行机制，在同一个框架中按需组合。",
    date: "上游快照", dateHint: "固定的上游提交，随时回到来源检查。",
    path: "发现 / 比较 / 追溯", principles: "通向来源的清晰路径。",
    discover: "按研究任务发现", discoverText: "从医学或生命科学研究任务开始，寻找相关组件。",
    compare: "查看评估卡", compareText: "并列查看安全风险、功能、五轴质量画像和医学相关内容。",
    trace: "追溯研究来源", traceText: "打开来源仓库，在复用前检查定义文件。",
  },
};

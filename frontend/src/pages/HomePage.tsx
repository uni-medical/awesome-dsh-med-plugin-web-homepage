import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../components/Brand";
import { ScrollJourney } from "../components/ScrollJourney";
import { catalog } from "../data/catalog";
import { getCatalogSummary } from "../lib/catalog";

export function HomePage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const summary = getCatalogSummary(catalog.entries);
  const typeCount = new Set(catalog.entries.map((entry) => entry.primaryCategory)).size;
  const snapshotDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(catalog.generatedAt));
  const zh = language === "zh";
  const copy = zh ? { eyebrow: "医疗 RSI 组件市场", title: "让医学研究由可追溯组件构成。", desc: "面向医疗 AI、医学与生命科学研究的插件、技能、工具、MCP Server 和 CLI 目录。按领域发现、比较公开元数据，并回到来源仓库继续检查。", browse: "浏览医疗组件 ↗", snapshot: "医疗目录快照", records: "已收录公开记录", types: "组件类型", medical: "医疗领域记录", discover: "按医学领域发现", discoverText: "从医学或生命科学研究方向开始，寻找相关组件。", compare: "比较研究元数据", compareText: "并列查看类型、来源描述、观测 Star、许可证、标签和更新时间。", trace: "追溯研究来源", traceText: "打开来源仓库，在复用前检查项目内容。" } : { eyebrow: "MEDICAL RSI COMPONENT MARKET", title: "Medical research, composed from traceable components.", desc: "A catalogue of plugins, skills, tools, MCP servers, and CLIs for medical AI, medicine, and life-science research. Discover by domain, compare public metadata, and return to each source repository.", browse: "Browse medical components ↗", snapshot: "MEDICAL CATALOGUE SNAPSHOT", records: "catalogued public records", types: "component types", medical: "medical-domain records", discover: "Discover by medical domain", discoverText: "Start with a medicine or life-science research area and find the components around it.", compare: "Compare research metadata", compareText: "Read type, source description, observed stars, license, tags, and update context together.", trace: "Trace the research source", traceText: "Open the repository and inspect the record before reuse." };
  const heroImageUrl = `${import.meta.env.BASE_URL}images/doctor-researcher-hero.jpg`;
  return <main className="home"><div className="hero-image" style={{backgroundImage: `url(${heroImageUrl})`}} aria-hidden="true"/><div className="grid" /><nav><Brand/><div><Link to="/marketplace">{zh ? "组件市场" : "Marketplace"}</Link><button className="language-toggle" type="button" onClick={() => setLanguage(zh ? "en" : "zh")} aria-label={zh ? "Switch to English" : "切换中文"}>{zh ? "EN" : "中文"}</button><a href="https://github.com/uni-medical/awesome-dsh-med-plugin-web-homepage">GitHub</a></div></nav><section className="hero"><div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.desc}</p><button onClick={() => navigate("/marketplace")}>{copy.browse}</button></div><aside className="snapshot"><small>{copy.snapshot}</small><strong>{summary.total}</strong><span>{copy.records} · {snapshotDate}</span><hr/><div><b>{typeCount}</b> {copy.types}</div><div><b>{summary.medical}</b> {copy.medical}</div></aside></section><ScrollJourney language={language}/><section className="pillars"><article><b>01</b><h2>{copy.discover}</h2><p>{copy.discoverText}</p></article><article><b>02</b><h2>{copy.compare}</h2><p>{copy.compareText}</p></article><article><b>03</b><h2>{copy.trace}</h2><p>{copy.traceText}</p></article></section></main>;
}

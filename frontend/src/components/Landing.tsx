import { Link } from "react-router-dom";
import { Brand } from "./Brand";
import { catalog } from "../data/catalog";
import { getLandingEvidence, landingCopy } from "../lib/landing";
import { useUiLanguage } from "../state/useUiLanguage";

const repositoryUrl = "https://github.com/uni-medical/awesome-dsh-med-plugin-web-homepage";

export function LandingHeader() {
  const { zh, toggleLocale } = useUiLanguage();
  return <nav className="landing-header" aria-label={zh ? "首页导航" : "Home navigation"}>
    <Brand/>
    <div className="landing-nav-links">
      <a className="landing-path-link" href="#research-path">{zh ? "研究路径" : "Research path"}</a>
      <Link viewTransition to="/marketplace">{zh ? "组件市场" : "Marketplace"}</Link>
      <button type="button" onClick={toggleLocale} aria-label={zh ? "Switch to English" : "切换中文"}>{zh ? "EN" : "中文"}</button>
      <a className="landing-github" href={repositoryUrl}>GitHub ↗</a>
    </div>
  </nav>;
}

export function LandingMotionLayer() {
  return <div className="landing-motion" aria-hidden="true"><i className="landing-orbit orbit-one"/><i className="landing-orbit orbit-two"/><div className="landing-halo"/></div>;
}

export function EvidenceCardGrid() {
  const { locale, formatDate, formatNumber } = useUiLanguage();
  const copy = landingCopy[locale];
  const evidence = getLandingEvidence(catalog);
  return <section className="landing-evidence" aria-label={copy.snapshot}>
    <div className="evidence-caption"><span>{copy.snapshot}</span><span aria-hidden="true">↗</span></div>
    <div className="evidence-grid">
      <Link viewTransition to="/marketplace" className="evidence-card evidence-records">
        <div className="evidence-art" aria-hidden="true"><i/><i/><i/><i/></div>
        <span className="evidence-index">01 / {copy.records}</span><strong>{formatNumber(evidence.total)}</strong><p>{copy.recordsHint}</p><span className="evidence-arrow" aria-hidden="true">↗</span>
      </Link>
      <Link viewTransition to="/marketplace?domain=medical" className="evidence-card evidence-medical">
        <div className="evidence-signal" aria-hidden="true"><svg viewBox="0 0 240 90"><path d="M0 48h50l15-12 16 28 20-49 21 60 18-27h100"/></svg></div>
        <span className="evidence-index">02 / {copy.medical}</span><strong>{formatNumber(evidence.medical)}</strong><p>{copy.medicalHint}</p><span className="evidence-arrow" aria-hidden="true">↗</span>
      </Link>
      <Link viewTransition to="/marketplace" className="evidence-card evidence-types">
        <span className="evidence-index">03 / {copy.types}</span><strong>{formatNumber(evidence.types.length)}</strong><div className="evidence-type-tags">{evidence.types.map(type => <span key={type}>{type}</span>)}</div><p>{copy.typesHint}</p><span className="evidence-arrow" aria-hidden="true">↗</span>
      </Link>
      <article className="evidence-card evidence-date">
        <span className="evidence-index">04 / {copy.date}</span><span className="evidence-snapshot-mark" aria-hidden="true">⌘</span><time dateTime={evidence.generatedAt}>{formatDate(evidence.generatedAt)}</time><p>{copy.dateHint}</p>
      </article>
    </div>
  </section>;
}

export function LandingHero() {
  const { locale } = useUiLanguage();
  const copy = landingCopy[locale];
  return <section className="landing-hero">
    <div className="landing-hero-copy"><span className="landing-eyebrow">{copy.eyebrow}</span><h1>{copy.title}<br/><span>{copy.titleAccent}</span></h1><p>{copy.description}</p>
      <div className="landing-actions"><Link viewTransition className="landing-primary" to="/marketplace">{copy.browse}<span aria-hidden="true">↗</span></Link><a className="landing-secondary" href={repositoryUrl}>GitHub <span aria-hidden="true">↗</span></a></div>
      <a className="landing-explore" href="#research-path"><span aria-hidden="true">↓</span>{copy.explore}</a>
    </div>
    <EvidenceCardGrid/>
  </section>;
}

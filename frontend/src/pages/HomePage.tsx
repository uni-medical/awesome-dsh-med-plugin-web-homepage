import { LandingHeader, LandingHero, LandingMotionLayer } from "../components/Landing";
import { ScrollJourney } from "../components/ScrollJourney";
import { landingCopy } from "../lib/landing";
import { useUiLanguage } from "../state/useUiLanguage";
import "../styles/landing.css";

export function HomePage() {
  const { locale } = useUiLanguage();
  const copy = landingCopy[locale];
  return <main className="home landing-page">
    <LandingMotionLayer/>
    <LandingHeader/>
    <LandingHero/>
    <section className="landing-principles" aria-labelledby="principles-title">
      <div className="landing-section-heading"><span className="landing-eyebrow">{copy.path}</span><h2 id="principles-title">{copy.principles}</h2></div>
      <div className="landing-principle-grid">{[
        [copy.discover, copy.discoverText], [copy.compare, copy.compareText], [copy.trace, copy.traceText],
      ].map(([title, description], index) => <article key={index}><span className="principle-number">0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
    </section>
    <div id="research-path"><ScrollJourney language={locale}/></div>
  </main>;
}

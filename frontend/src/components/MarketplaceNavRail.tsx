import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useUiLanguage } from "../state/useUiLanguage";

type IconName = "home" | "search" | "graph" | "settings";

function RailIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    graph: <><circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="18" cy="19" r="2"/><circle cx="5" cy="18" r="2"/><path d="m6.5 6.5 3.3 3.3M17.3 7.2l-3 3M16.6 17.6l-2.4-3.4M6.6 16.7l3.2-3"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
export function MarketplaceNavRail() {
  const { zh, t, toggleLocale } = useUiLanguage();
  return <nav className="market-rail" aria-label={t("nav.navigation")}>
    <NavLink viewTransition className="rail-brand" to="/" aria-label={t("nav.brandHome")}>M</NavLink>
    <div className="rail-links">
      <NavLink viewTransition className="rail-item" to="/" end aria-label={t("nav.home")} data-label={t("nav.home")}><RailIcon name="home"/></NavLink>
      <NavLink viewTransition className="rail-item" to="/marketplace" aria-label={t("nav.marketplace")} data-label={t("nav.marketplace")}><RailIcon name="search"/></NavLink>
      <NavLink viewTransition className="rail-item" to="/graph" aria-label={t("nav.graph")} data-label={t("nav.graph")}><RailIcon name="graph"/></NavLink>
      <NavLink viewTransition className="rail-item rail-settings" to="/settings" aria-label={t("nav.settings")} data-label={t("nav.settings")}><RailIcon name="settings"/></NavLink>
      <button type="button" className="rail-item rail-locale" aria-label={zh ? t("nav.switchEnglish") : t("nav.switchChinese")} data-label={zh ? "English" : "中文"} onClick={toggleLocale}>{zh ? "EN" : "中"}</button>
      <ThemeToggle className="rail-item rail-theme"/>
    </div>
  </nav>;
}

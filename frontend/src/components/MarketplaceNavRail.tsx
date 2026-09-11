import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type IconName = "home" | "search" | "layers" | "research" | "settings";

function RailIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></>,
    research: <><path d="M9 3h6"/><path d="M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
export function MarketplaceNavRail() {
  return <nav className="market-rail" aria-label="Marketplace navigation">
    <NavLink className="rail-brand" to="/" aria-label="Medical Component Market home">M</NavLink>
    <div className="rail-links">
      <NavLink className="rail-item" to="/" end aria-label="Home" data-label="Home"><RailIcon name="home"/></NavLink>
      <NavLink className="rail-item" to="/marketplace" aria-label="Marketplace" data-label="Marketplace"><RailIcon name="search"/></NavLink>
      <NavLink className="rail-item" to="/collections" aria-label="Collections" data-label="Collections"><RailIcon name="layers"/></NavLink>
      <NavLink className="rail-item" to="/research" aria-label="Research" data-label="Research"><RailIcon name="research"/></NavLink>
      <NavLink className="rail-item rail-settings" to="/settings" aria-label="Settings" data-label="Settings"><RailIcon name="settings"/></NavLink>
    </div>
  </nav>;
}

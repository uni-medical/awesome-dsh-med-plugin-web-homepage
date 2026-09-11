import type { ReactNode } from "react";
import { MarketplaceNavRail } from "./MarketplaceNavRail";

export function WorkbenchShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`market marketplace-workbench ${className}`}><MarketplaceNavRail/><div className="workspace-page-stage">{children}</div></main>;
}

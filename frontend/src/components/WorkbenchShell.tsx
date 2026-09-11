import type { ReactNode } from "react";
export function WorkbenchShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`workspace-page-stage workspace-route-view ${className}`}>{children}</div>;
}

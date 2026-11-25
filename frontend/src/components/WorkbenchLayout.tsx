import { Outlet } from "react-router-dom";
import { MarketplaceNavRail } from "./MarketplaceNavRail";
import { PlanBar } from "./PlanBar";
import "../styles/marketplace.css";
import "../styles/components.css";

export function WorkbenchLayout() {
  return <main className="market marketplace-workbench"><MarketplaceNavRail/><div className="workbench-column"><Outlet/><PlanBar/></div></main>;
}

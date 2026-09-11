import { Outlet } from "react-router-dom";
import { MarketplaceNavRail } from "./MarketplaceNavRail";

export function WorkbenchLayout() {
  return <main className="market marketplace-workbench"><MarketplaceNavRail/><Outlet/></main>;
}

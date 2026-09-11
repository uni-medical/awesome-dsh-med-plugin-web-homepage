import { Link, Route, Routes } from "react-router-dom";
import { WorkbenchLayout } from "./components/WorkbenchLayout";
import { CollectionsPage } from "./pages/CollectionsPage";
import { HomePage } from "./pages/HomePage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { ResearchPage } from "./pages/ResearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import "./styles/index.css";
import "./styles/journey.css";
import "./styles/journey-overrides.css";

export default function App() {
  return <>
    <Routes>
      <Route path="/" element={<HomePage/>}/>
      <Route element={<WorkbenchLayout/>}>
        <Route path="/marketplace" element={<MarketplacePage/>}/>
        <Route path="/collections" element={<CollectionsPage/>}/>
        <Route path="/research" element={<ResearchPage/>}/>
        <Route path="/settings" element={<SettingsPage/>}/>
      </Route>
      <Route path="*" element={<main className="market"><h1>Page not found</h1><Link to="/">Return home</Link></main>}/>
    </Routes>
    <footer className="footer">Inclusion is not medical validation, security review, or proof of compatibility. Inspect the source and license before use. <span>Preview · snapshot data</span></footer>
  </>;
}

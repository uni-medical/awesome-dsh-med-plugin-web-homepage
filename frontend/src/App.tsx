import { Link, Navigate, Route, Routes } from "react-router-dom";
import { WorkbenchLayout } from "./components/WorkbenchLayout";
import { CapabilityGraphPage } from "./pages/CapabilityGraphPage";
import { HomePage } from "./pages/HomePage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { SettingsPage } from "./pages/SettingsPage";
import { useUiLanguage } from "./state/useUiLanguage";
import "./styles/theme.css";
import "./styles/index.css";
import "./styles/journey.css";
import "./styles/journey-overrides.css";

export default function App() {
  const { t } = useUiLanguage();
  return <>
    <Routes>
      <Route path="/" element={<HomePage/>}/>
      <Route element={<WorkbenchLayout/>}>
        <Route path="/marketplace" element={<MarketplacePage/>}/>
        <Route path="/graph" element={<CapabilityGraphPage/>}/>
        <Route path="/settings" element={<SettingsPage/>}/>
      </Route>
      <Route path="/collections" element={<Navigate to="/marketplace" replace/>}/>
      <Route path="/research" element={<Navigate to="/marketplace" replace/>}/>
      <Route path="*" element={<main className="market"><h1>{t("app.notFound")}</h1><Link to="/">{t("app.returnHome")}</Link></main>}/>
    </Routes>
    <footer className="footer">{t("app.footer")} <span>{t("app.snapshot")}</span></footer>
  </>;
}

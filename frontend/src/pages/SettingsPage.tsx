import { useState } from "react";
import { WorkbenchShell } from "../components/WorkbenchShell";
import type { UiLocale } from "../lib/i18n";
import type { MarketplaceView } from "../lib/marketplace";
import { DEFAULT_PREFERENCES, type Density, type MotionMode } from "../lib/workspace";
import { useUiLanguage } from "../state/useUiLanguage";
import { useWorkspace } from "../state/WorkspaceContext";
import "../styles/marketplace.css";

function Choice<T extends string>({ value, values, label, onChange }: { value: T; values: readonly T[]; label: (value: T) => string; onChange: (value: T) => void }) {
  return <div className="setting-choice">{values.map(item => <button key={item} type="button" className={value === item ? "active" : ""} aria-pressed={value === item} onClick={() => onChange(item)}>{label(item)}</button>)}</div>;
}

export function SettingsPage() {
  const { preferences, collections, updatePreferences, restorePreferences, clearCollections } = useWorkspace();
  const { t } = useUiLanguage();
  const [confirmClear, setConfirmClear] = useState(false);
  const viewLabel = (value: MarketplaceView) => t(value === "cards" ? "settings.cards" : value === "table" ? "settings.table" : "settings.gallery");
  const densityLabel = (value: Density) => t(value === "comfortable" ? "settings.comfortable" : "settings.compact");
  const motionLabel = (value: MotionMode) => t(value === "system" ? "settings.system" : value === "full" ? "settings.full" : "settings.reduced");

  return <WorkbenchShell className="workspace-content-page settings-page">
    <header className="workspace-page-header settings-header"><span>{t("settings.eyebrow")}</span><h1>{t("settings.title")}</h1><p>{t("settings.description")}</p><div className="settings-local-note">{t("settings.saved")} · {collections.length} {t("settings.personalCollections")}</div></header>
    <div className="workspace-page-scroll settings-grid">
      <section className="settings-card"><div className="settings-card-heading"><span>01</span><div><h2>{t("settings.browsing")}</h2><p>{t("settings.browsingHint")}</p></div></div>
        <label><span>{t("settings.interfaceLanguage")}<small>{t("settings.interfaceLanguageHint")}</small></span><Choice value={preferences.locale} values={["en", "zh"] as UiLocale[]} label={value => value === "en" ? "English" : "中文"} onChange={locale => updatePreferences({ locale })}/></label>
        <label><span>{t("settings.defaultView")}<small>{t("settings.defaultViewHint")}</small></span><Choice value={preferences.defaultView} values={["cards", "table", "gallery"] as MarketplaceView[]} label={viewLabel} onChange={defaultView => updatePreferences({ defaultView })}/></label>
        <label><span>{t("settings.resultDensity")}<small>{t("settings.resultDensityHint")}</small></span><Choice value={preferences.density} values={["comfortable", "compact"] as Density[]} label={densityLabel} onChange={density => updatePreferences({ density })}/></label>
      </section>
      <section className="settings-card"><div className="settings-card-heading"><span>02</span><div><h2>{t("settings.details")}</h2><p>{t("settings.detailsHint")}</p></div></div>
        <label><span>{t("settings.repositoryWidth")}<small>{preferences.splitRatio}% {t("settings.repositoryPart")} · {100 - preferences.splitRatio}% {t("settings.detailsPart")}</small></span><input type="range" min="40" max="70" value={preferences.splitRatio} onChange={event => updatePreferences({ splitRatio: Number(event.target.value) })}/></label>
        <label className="setting-toggle"><span>{t("settings.rememberWidth")}<small>{t("settings.rememberWidthHint")}</small></span><input type="checkbox" checked={preferences.rememberSplitRatio} onChange={event => updatePreferences({ rememberSplitRatio: event.target.checked })}/></label>
        <label className="setting-toggle"><span>{t("settings.focusDetails")}<small>{t("settings.focusDetailsHint")}</small></span><input type="checkbox" checked={preferences.focusDetails} onChange={event => updatePreferences({ focusDetails: event.target.checked })}/></label>
      </section>
      <section className="settings-card"><div className="settings-card-heading"><span>03</span><div><h2>{t("settings.motion")}</h2><p>{t("settings.motionHint")}</p></div></div>
        <label><span>{t("settings.animationMode")}<small>{t("settings.animationModeHint")}</small></span><Choice value={preferences.motion} values={["system", "full", "reduced"] as MotionMode[]} label={motionLabel} onChange={motion => updatePreferences({ motion })}/></label>
        <div className={`motion-preview motion-${preferences.motion}`}><i/><span>{t("settings.preview")}</span></div>
      </section>
      <section className="settings-card settings-danger"><div className="settings-card-heading"><span>04</span><div><h2>{t("settings.localData")}</h2><p>{t("settings.localDataHint")}</p></div></div><div className="settings-actions"><button type="button" onClick={restorePreferences}>{t("settings.restore")}</button>{confirmClear ? <div className="inline-confirm"><span>{t("settings.clearQuestion")}</span><button onClick={() => { clearCollections(); setConfirmClear(false); }}>{t("settings.clearNow")}</button><button onClick={() => setConfirmClear(false)}>{t("settings.cancel")}</button></div> : <button type="button" className="danger-button" disabled={!collections.length} onClick={() => setConfirmClear(true)}>{t("settings.clearCollections")}</button>}</div><small>{t("settings.defaultRatio")} {DEFAULT_PREFERENCES.splitRatio}%.</small></section>
    </div>
  </WorkbenchShell>;
}

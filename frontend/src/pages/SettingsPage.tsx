import { useState } from "react";
import { WorkbenchShell } from "../components/WorkbenchShell";
import type { UiLocale } from "../lib/i18n";
import type { Density, MotionMode } from "../lib/workspace";
import { useUiLanguage } from "../state/useUiLanguage";
import { useWorkspace } from "../state/WorkspaceContext";

function Choice<T extends string>({ value, values, label, onChange }: { value: T; values: readonly T[]; label: (value: T) => string; onChange: (value: T) => void }) {
  return <div className="setting-choice">{values.map(item => <button key={item} type="button" className={value === item ? "active" : ""} aria-pressed={value === item} onClick={() => onChange(item)}>{label(item)}</button>)}</div>;
}

export function SettingsPage() {
  const { preferences, plan, updatePreferences, restorePreferences, clearPlan } = useWorkspace();
  const { t } = useUiLanguage();
  const [confirmClear, setConfirmClear] = useState(false);
  const densityLabel = (value: Density) => t(value === "comfortable" ? "settings.comfortable" : "settings.compact");
  const motionLabel = (value: MotionMode) => t(value === "system" ? "settings.system" : value === "full" ? "settings.full" : "settings.reduced");

  return <WorkbenchShell className="workspace-content-page settings-page">
    <header className="workspace-page-header settings-header"><span>{t("settings.eyebrow")}</span><h1>{t("settings.title")}</h1><p>{t("settings.description")}</p><div className="settings-local-note">{t("settings.saved")} · {plan.length} {t("settings.personalCollections")}</div></header>
    <div className="workspace-page-scroll settings-grid">
      <section className="settings-card"><div className="settings-card-heading"><span>01</span><div><h2>{t("settings.browsing")}</h2><p>{t("settings.browsingHint")}</p></div></div>
        <div className="setting-appearance"><span id="appearance-label">{t("theme.appearance")}<small>{t("theme.appearanceHint")}</small></span><div role="group" aria-labelledby="appearance-label"><Choice value={preferences.theme} values={["dark", "light"] as const} label={value => t(value === "dark" ? "theme.dark" : "theme.light")} onChange={theme => updatePreferences({ theme })}/></div></div>
        <label><span>{t("settings.interfaceLanguage")}<small>{t("settings.interfaceLanguageHint")}</small></span><Choice value={preferences.locale} values={["en", "zh"] as UiLocale[]} label={value => value === "en" ? "English" : "中文"} onChange={locale => updatePreferences({ locale })}/></label>
        <label><span>{t("settings.resultDensity")}<small>{t("settings.resultDensityHint")}</small></span><Choice value={preferences.density} values={["comfortable", "compact"] as Density[]} label={densityLabel} onChange={density => updatePreferences({ density })}/></label>
      </section>
      <section className="settings-card"><div className="settings-card-heading"><span>02</span><div><h2>{t("settings.motion")}</h2><p>{t("settings.motionHint")}</p></div></div>
        <label><span>{t("settings.animationMode")}<small>{t("settings.animationModeHint")}</small></span><Choice value={preferences.motion} values={["system", "full", "reduced"] as MotionMode[]} label={motionLabel} onChange={motion => updatePreferences({ motion })}/></label>
        <div className={`motion-preview motion-${preferences.motion}`}><i/><span>{t("settings.preview")}</span></div>
      </section>
      <section className="settings-card settings-danger"><div className="settings-card-heading"><span>03</span><div><h2>{t("settings.localData")}</h2><p>{t("settings.localDataHint")}</p></div></div><div className="settings-actions"><button type="button" onClick={restorePreferences}>{t("settings.restore")}</button>{confirmClear ? <div className="inline-confirm"><span>{t("settings.clearQuestion")}</span><button onClick={() => { clearPlan(); setConfirmClear(false); }}>{t("settings.clearNow")}</button><button onClick={() => setConfirmClear(false)}>{t("settings.cancel")}</button></div> : <button type="button" className="danger-button" disabled={!plan.length} onClick={() => setConfirmClear(true)}>{t("settings.clearCollections")}</button>}</div></section>
    </div>
  </WorkbenchShell>;
}

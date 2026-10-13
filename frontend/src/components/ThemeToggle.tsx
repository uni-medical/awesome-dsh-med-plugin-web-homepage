import { useUiLanguage } from "../state/useUiLanguage";
import { useWorkspace } from "../state/WorkspaceContext";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { preferences, updatePreferences } = useWorkspace();
  const { t } = useUiLanguage();
  const light = preferences.theme === "light";
  const label = t(light ? "theme.switchDark" : "theme.switchLight");
  return <button type="button" className={`theme-toggle ${className}`} title={label} aria-label={label} data-label={label} aria-pressed={light} onClick={() => updatePreferences({ theme: light ? "dark" : "light" })}>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {light ? <path d="M20.5 13.2A8.6 8.6 0 0 1 10.8 3.5 8.6 8.6 0 1 0 20.5 13.2Z"/> : <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>}
    </svg>
  </button>;
}

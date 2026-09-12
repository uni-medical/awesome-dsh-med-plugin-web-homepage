import { formatUiDate, translate, type TranslationKey, type UiLocale } from "../lib/i18n";
import { useWorkspace } from "./WorkspaceContext";

export function useUiLanguage() {
  const { preferences, updatePreferences } = useWorkspace();
  const locale = preferences.locale;
  return {
    locale,
    zh: locale === "zh",
    t: (key: TranslationKey) => translate(locale, key),
    formatDate: (value: string) => formatUiDate(value, locale),
    formatNumber: (value: number) => value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US"),
    setLocale: (next: UiLocale) => updatePreferences({ locale: next }),
    toggleLocale: () => updatePreferences({ locale: locale === "zh" ? "en" : "zh" }),
  };
}

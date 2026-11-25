import { EVALUATION_GLOSSARY_EN } from "../data/evaluationGlossary";
import type { UiLocale } from "./i18n";

const FOOTER_DATE_LINE = /^检测日期 (\S+) · 代码版本 (\S+)$/;
const SOURCE_LABELS: Record<UiLocale, Record<string, string>> = {
  en: { judge: "AI review", "rule v4": "Rule v4" },
  zh: { judge: "AI 评审", "rule v4": "规则 v4" },
};

/**
 * Closed-vocabulary evaluation text in the interface language. Chinese is the
 * published original; English comes from the glossary. Unknown strings are
 * returned unchanged rather than guessed.
 */
export function evaluationText(locale: UiLocale, text: string): string {
  if (!text) return text;
  if (SOURCE_LABELS[locale][text]) return SOURCE_LABELS[locale][text];
  if (locale === "zh") return text;
  const known = EVALUATION_GLOSSARY_EN[text];
  if (known) return known;
  const footer = FOOTER_DATE_LINE.exec(text);
  return footer ? `Checked ${footer[1]} · code version ${footer[2]}` : text;
}

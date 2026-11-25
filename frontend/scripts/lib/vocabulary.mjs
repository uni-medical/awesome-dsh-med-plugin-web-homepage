// Closed vocabularies used by the evaluation cards. The site shows them in
// English through src/data/evaluationGlossary.ts; tests fail when a re-import
// brings a value the glossary does not cover. Free text (medical item text,
// reasons, relation conditions) is not listed: it is shown as published.

const add = (map, field, value) => {
  if (typeof value !== "string" || !value.trim()) return;
  if (!map.has(field)) map.set(field, new Set());
  map.get(field).add(value);
};

/** Footer lines like "检测日期 2026-11-03 · 代码版本 77f5361" are translated by pattern, not listed. */
export const FOOTER_DATE_LINE = /^检测日期 \S+ · 代码版本 \S+$/;

export function collectVocabulary(publicCards) {
  const map = new Map();
  for (const card of publicCards) {
    add(map, "kind", card.kind);
    add(map, "risk.verdict", card.risk.verdict);
    add(map, "risk.subcategory", card.risk.subcategory);
    card.risk.threats.forEach(threat => { add(map, "risk.threat", threat.type); threat.subLabels.forEach(label => add(map, "risk.threatTarget", label)); });
    card.risk.lines.forEach(line => add(map, "risk.line", line));
    add(map, "compatibility.label", card.compatibility.label);
    card.compatibility.warnings.forEach(line => add(map, "compatibility.warning", line));
    add(map, "function.primary", card.function.primary);
    add(map, "function.secondary", card.function.secondary);
    card.function.subLabels.forEach(label => add(map, "function.subLabel", label));
    Object.entries(card.behaviour).forEach(([group, labels]) => { add(map, "behaviour.group", group); labels.forEach(label => add(map, "behaviour.label", label)); });
    card.quality.forEach(axis => {
      add(map, "quality.label", axis.label);
      (axis.notes ?? []).forEach(note => add(map, "quality.note", note));
      add(map, "quality.costReason", axis.reason);
      (axis.drivers ?? []).forEach(driver => add(map, "quality.costDriver", driver));
    });
    Object.entries(card.medical.groups).forEach(([group, items]) => { add(map, "medical.group", group); items.forEach(item => add(map, "medical.itemLabel", item.label)); });
    (card.medical.rejected ?? []).forEach(item => add(map, "medical.itemLabel", item.label));
    add(map, "medical.audience", card.medical.audience);
    add(map, "medical.undetermined", card.medical.undetermined);
    card.footer.filter(line => !FOOTER_DATE_LINE.test(line)).forEach(line => add(map, "footer", line));
  }
  return Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)).map(([field, values]) => [field, [...values].sort((a, b) => a.localeCompare(b, "zh"))]));
}

// Catalogue relations and install hints from awesome-dsh-med-plugin@integrate.
//
// data/capabilities/component-relations.json keys components by entry-index id
// (e.g. `skill:o/r/name-a39e32e8`); the catalogue uses standardized ids. Only
// component-to-component relations whose both ends are catalogue entries are kept.
// `provides` links a component to its own capability node and is not a relation
// between components.

/** Relation types shown on the site, in display order. */
export const RELATION_TYPES = ["requires", "declared-use", "data-flow", "precedes", "shared-input", "wrapper", "composes_with", "contains", "alternative_to"];

/** `composes_with` carries its subtype in `kind` (declared-use, data-flow, precedes, shared-input, wrapper). */
export function relationType(relation) {
  if (relation.type === "composes_with") return RELATION_TYPES.includes(relation.kind) ? relation.kind : "composes_with";
  return relation.type;
}

/** Maps entry-index ids to catalogue ids using the pairing from link-cards. */
export function indexToCatalogueIds(recordsByEntryId) {
  const map = new Map();
  for (const [entryId, record] of recordsByEntryId) map.set(record.id, entryId);
  return map;
}

/**
 * @returns {{ edges: { from: string, to: string, type: string, condition: string | null }[], skipped: Record<string, number> }}
 */
export function catalogueRelations(relations, indexToCatalogue) {
  const seen = new Set();
  const edges = [];
  const skipped = { provides: 0, unknownType: 0, outsideCatalogue: 0, selfLoop: 0, duplicate: 0 };
  for (const relation of relations) {
    if (relation.type === "provides") { skipped.provides += 1; continue; }
    const type = relationType(relation);
    if (!RELATION_TYPES.includes(type)) { skipped.unknownType += 1; continue; }
    const from = indexToCatalogue.get(relation.from);
    const to = indexToCatalogue.get(relation.to);
    if (!from || !to) { skipped.outsideCatalogue += 1; continue; }
    if (from === to) { skipped.selfLoop += 1; continue; }
    const key = `${from}\u0000${to}\u0000${type}`;
    if (seen.has(key)) { skipped.duplicate += 1; continue; }
    seen.add(key);
    edges.push({ from, to, type, condition: typeof relation.condition === "string" && relation.condition.trim() ? relation.condition.trim() : null });
  }
  return { edges, skipped };
}

/** Per-component relation lists for the detail dialog, outgoing and incoming. */
export function relationsByComponent(edges) {
  const result = new Map();
  const add = (id, item) => result.set(id, [...(result.get(id) ?? []), item]);
  for (const edge of edges) {
    add(edge.from, { direction: "out", type: edge.type, otherId: edge.to, condition: edge.condition });
    add(edge.to, { direction: "in", type: edge.type, otherId: edge.from, condition: edge.condition });
  }
  return result;
}

/** Compact edge list for the list index: positions refer to the components array. */
export function compactEdges(edges, positionById) {
  return edges.map(edge => [positionById.get(edge.from), positionById.get(edge.to), RELATION_TYPES.indexOf(edge.type)]);
}

const REQUIREMENT_KINDS = ["configuration", "runtime", "resource"];

/** Install hint for the detail dialog, from the entry-index record and declared external requirements. */
export function installHint(record, requirementsByIndexId) {
  if (!record?.id || !record.install) return null;
  const kinds = [...new Set(requirementsByIndexId.get(record.id) ?? [])].filter(kind => REQUIREMENT_KINDS.includes(kind)).sort();
  return {
    entryId: record.id,
    installability: String(record.install.installability ?? "unknown"),
    verification: String(record.install.verification ?? "unknown"),
    trust: String(record.trust ?? "unknown"),
    requires: kinds,
  };
}

export function requirementsIndex(externalRequirements) {
  const map = new Map();
  for (const item of externalRequirements ?? []) {
    if (typeof item?.entryId !== "string" || typeof item?.dependencyKind !== "string") continue;
    map.set(item.entryId, [...(map.get(item.entryId) ?? []), item.dependencyKind]);
  }
  return map;
}

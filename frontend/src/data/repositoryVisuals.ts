import raw from "../../../data/repository-visuals.json";

export const REPOSITORY_VISUAL_SOURCE_KINDS = [
  "project-logo",
  "homepage-icon",
  "github-owner-avatar",
] as const;

export type RepositoryVisualSourceKind = (typeof REPOSITORY_VISUAL_SOURCE_KINDS)[number];

export interface RepositoryVisual {
  repositoryId: string;
  localPath: string;
  sourceUrl: string;
  sourceKind: RepositoryVisualSourceKind;
  checkedAt: string;
  usageNote: string;
}

interface RepositoryVisualIndex {
  schemaVersion: "1";
  generatedAt: string;
  visuals: RepositoryVisual[];
}

const LOCAL_PATH_PATTERN = /^images\/repositories\/[a-z0-9_.-]+\.webp$/;

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertTimestamp(value: unknown, label: string): asserts value is string {
  assertString(value, label);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${label} must be a valid timestamp`);
}

function parseRepositoryVisualIndex(value: unknown): RepositoryVisualIndex {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("repository visual manifest must be an object");
  }
  const index = value as Record<string, unknown>;
  if (index.schemaVersion !== "1") throw new Error("repository visual schemaVersion must be 1");
  assertTimestamp(index.generatedAt, "repository visual generatedAt");
  if (!Array.isArray(index.visuals)) throw new Error("repository visual manifest needs a visuals array");

  const seen = new Set<string>();
  const visuals = index.visuals.map((candidate, position) => {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
      throw new Error(`visuals[${position}] must be an object`);
    }
    const visual = candidate as Record<string, unknown>;
    assertString(visual.repositoryId, `visuals[${position}].repositoryId`);
    assertString(visual.localPath, `visuals[${position}].localPath`);
    assertString(visual.sourceUrl, `visuals[${position}].sourceUrl`);
    assertTimestamp(visual.checkedAt, `visuals[${position}].checkedAt`);
    assertString(visual.usageNote, `visuals[${position}].usageNote`);
    if (!LOCAL_PATH_PATTERN.test(visual.localPath)) {
      throw new Error(`visuals[${position}].localPath must be a repository WebP path`);
    }
    if (!visual.sourceUrl.startsWith("https://")) {
      throw new Error(`visuals[${position}].sourceUrl must use HTTPS`);
    }
    if (!REPOSITORY_VISUAL_SOURCE_KINDS.includes(visual.sourceKind as RepositoryVisualSourceKind)) {
      throw new Error(`visuals[${position}].sourceKind is unsupported`);
    }
    if (seen.has(visual.repositoryId.toLowerCase())) {
      throw new Error(`duplicate repository visual: ${visual.repositoryId}`);
    }
    seen.add(visual.repositoryId.toLowerCase());
    return visual as unknown as RepositoryVisual;
  });

  return { schemaVersion: "1", generatedAt: index.generatedAt, visuals };
}

const index = parseRepositoryVisualIndex(raw);
const visualByRepository = new Map(index.visuals.map(visual => [visual.repositoryId.toLowerCase(), visual]));

export const repositoryVisuals = index.visuals;

export function resolveRepositoryVisual(repositoryId: string): RepositoryVisual | undefined {
  return visualByRepository.get(repositoryId.toLowerCase());
}

export function repositoryVisualAssetUrl(visual: RepositoryVisual | undefined, baseUrl: string): string | undefined {
  if (!visual) return undefined;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${visual.localPath}`;
}

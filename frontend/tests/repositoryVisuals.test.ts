import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { catalog } from "../src/data/catalog";
import {
  repositoryVisualAssetUrl,
  repositoryVisuals,
  resolveRepositoryVisual,
} from "../src/data/repositoryVisuals";

describe("repository visual provenance", () => {
  it("covers every catalog entry exactly once", () => {
    const catalogIds = catalog.entries.map(entry => entry.id).sort();
    const visualIds = repositoryVisuals.map(visual => visual.repositoryId).sort();
    expect(visualIds).toEqual(catalogIds);
    expect(new Set(visualIds).size).toBe(visualIds.length);
  });

  it("uses traceable HTTPS sources and repository-local asset paths", () => {
    for (const visual of repositoryVisuals) {
      expect(visual.sourceUrl).toMatch(/^https:\/\//);
      expect(visual.localPath).toMatch(/^images\/repositories\/[a-z0-9_.-]+\.webp$/);
      expect(Number.isNaN(Date.parse(visual.checkedAt))).toBe(false);
      expect(visual.usageNote.length).toBeGreaterThan(10);
    }
  });

  it("resolves visuals by repository id and leaves missing ids undefined", () => {
    expect(resolveRepositoryVisual("bowang-lab/MedSAMSlicer")?.sourceKind).toBe("github-owner-avatar");
    expect(resolveRepositoryVisual("missing/repository")).toBeUndefined();
  });

  it("points every manifest record to a committed local image", () => {
    for (const visual of repositoryVisuals) {
      expect(existsSync(resolve(process.cwd(), "public", visual.localPath))).toBe(true);
    }
  });

  it("builds image URLs beneath the configured GitHub Pages base path", () => {
    const visual = resolveRepositoryVisual("bowang-lab/MedSAMSlicer");
    expect(repositoryVisualAssetUrl(visual, "/awesome-dsh-med-plugin-web-homepage/")).toBe(
      "/awesome-dsh-med-plugin-web-homepage/images/repositories/bowang-lab__medsamslicer.webp",
    );
    expect(repositoryVisualAssetUrl(undefined, "/awesome-dsh-med-plugin-web-homepage/")).toBeUndefined();
  });
});

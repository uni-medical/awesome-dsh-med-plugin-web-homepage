import { existsSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
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
      if (visual.sourceKind === "generated-neutral-visual") expect(visual.sourceUrl).toBeNull();
      else expect(visual.sourceUrl).toMatch(/^https:\/\//);
      expect(visual.localPath).toMatch(/^images\/repositories\/[a-z0-9_.-]+\.webp$/);
      expect(Number.isNaN(Date.parse(visual.checkedAt))).toBe(false);
      expect(visual.usageNote.length).toBeGreaterThan(10);
    }
  });

  it("does not use personal owner avatars for the reviewed problem entries", () => {
    const reviewedIds = new Set([
      "affaan-m/ECC",
      "andybrandt/mcp-simple-pubmed",
      "Ericwong5021/deepseek-plugin-store",
      "FreedomIntelligence/OpenClaw-Medical-Skills",
      "obra/superpowers",
      "oobabooga/textgen",
      "Wangyixinxin/MMedAgent",
    ]);
    for (const visual of repositoryVisuals.filter(item => reviewedIds.has(item.repositoryId))) {
      expect(visual.sourceKind).not.toBe("github-owner-avatar");
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

  it("stores normalized 320 × 320 WebP snapshots", async () => {
    await Promise.all(repositoryVisuals.map(async visual => {
      const metadata = await sharp(resolve(process.cwd(), "public", visual.localPath)).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(320);
      expect(metadata.height).toBe(320);
    }));
  });

  it("builds image URLs beneath the configured GitHub Pages base path", () => {
    const visual = resolveRepositoryVisual("bowang-lab/MedSAMSlicer");
    expect(repositoryVisualAssetUrl(visual, "/awesome-dsh-med-plugin-web-homepage/")).toBe(
      "/awesome-dsh-med-plugin-web-homepage/images/repositories/bowang-lab__medsamslicer.webp",
    );
    expect(repositoryVisualAssetUrl(undefined, "/awesome-dsh-med-plugin-web-homepage/")).toBeUndefined();
  });
});

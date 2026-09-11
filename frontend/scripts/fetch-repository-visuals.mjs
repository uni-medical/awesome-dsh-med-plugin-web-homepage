import { access, mkdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendDirectory = resolve(scriptDirectory, "..");
const manifestPath = resolve(frontendDirectory, "../data/repository-visuals.json");
const publicDirectory = resolve(frontendDirectory, "public");
const repositoryImageDirectory = resolve(publicDirectory, "images/repositories");
const maximumBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.schemaVersion !== "1" || !Array.isArray(manifest.visuals)) {
  throw new Error("repository visual manifest is invalid");
}

await mkdir(repositoryImageDirectory, { recursive: true });

async function fetchImage(visual) {
  const source = new URL(visual.sourceUrl);
  if (visual.sourceKind === "github-owner-avatar") source.searchParams.set("size", "640");
  const response = await fetch(source, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*",
      "User-Agent": "awesome-dsh-med-plugin-visual-snapshot/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${visual.repositoryId}: source returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase();
  if (!contentType || !allowedTypes.has(contentType)) {
    throw new Error(`${visual.repositoryId}: unsupported source type ${contentType ?? "missing"}`);
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error(`${visual.repositoryId}: source exceeds ${maximumBytes} bytes`);
  }
  const input = Buffer.from(await response.arrayBuffer());
  if (input.length > maximumBytes) throw new Error(`${visual.repositoryId}: downloaded source is too large`);
  return input;
}

async function normalizeVisual(visual) {
  if (typeof visual.localPath !== "string" || !visual.localPath.startsWith("images/repositories/")) {
    throw new Error(`${visual.repositoryId}: localPath is outside the repository image directory`);
  }
  const outputPath = resolve(publicDirectory, visual.localPath);
  if (!outputPath.startsWith(`${repositoryImageDirectory}/`)) {
    throw new Error(`${visual.repositoryId}: resolved localPath escapes the repository image directory`);
  }
  if (visual.sourceKind === "generated-neutral-visual") {
    const existing = await access(outputPath).then(() => true).catch(() => false);
    if (!existing) throw new Error(`${visual.repositoryId}: generated visual is missing at ${outputPath}`);
    return join("public", visual.localPath);
  }
  const temporaryPath = `${outputPath}.tmp`;
  const input = await fetchImage(visual);
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 64 || metadata.height < 64) {
    throw new Error(`${visual.repositoryId}: source image is smaller than 64 × 64`);
  }
  const fit = visual.sourceKind === "github-owner-avatar" ? "cover" : "contain";
  try {
    await sharp(input)
      .resize(320, 320, { fit, position: "centre", background: { r: 8, g: 17, b: 31, alpha: 0 } })
      .webp({ quality: 85, effort: 5 })
      .toFile(temporaryPath);
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
  return join("public", visual.localPath);
}

for (const visual of manifest.visuals) {
  const output = await normalizeVisual(visual);
  console.log(`${visual.repositoryId} -> ${output}`);
}

# Repository Source Icons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace generated letter tiles with locally snapshotted, source-traceable visuals for every Marketplace repository while preserving an honest fallback.

**Architecture:** Keep visual provenance separate from the public catalog in `data/repository-visuals.json`. A curator-side Node script downloads approved source images, validates and normalizes them to committed WebP assets, and the React frontend resolves them by repository id. Runtime stays static and makes no GitHub requests.

**Tech Stack:** Vite, React 19, TypeScript, Node 20 fetch, Sharp for curator-side normalization, Vitest.

---

## Verified baseline

- The catalog contains 20 public repositories: four each for Plugin, Skill, Tool, MCP Server, and CLI.
- Twelve entries have a homepage URL and eight do not.
- All 20 GitHub repository endpoints currently resolve, are not archived or disabled, and expose an owner/org `avatar_url`.
- `CatalogEntry` has no image field; `EntryVisual` currently renders a deterministic CSS tile with category initials.
- Existing static images live under `frontend/public/images/`; no repository-specific visual directory exists.

## Source policy

Use the first acceptable source in this order:

1. Official project logo/icon stored in the repository or linked from its README.
2. Official project homepage icon when the repository has no suitable project asset.
3. GitHub owner/organization avatar, labelled as an owner avatar rather than a project logo.
4. Existing deterministic category tile when download, validation, or provenance fails.

Do not use screenshots containing patient data, paper figures, performance charts, GitHub social cards with embedded claims, or arbitrary README illustrations. Record the exact source URL, source kind, check date, and usage note for every accepted image.

### Task 1: Create the visual manifest and validation contract

**Files:**
- Create: `data/repository-visuals.json`
- Create: `frontend/src/data/repositoryVisuals.ts`
- Test: `frontend/tests/repositoryVisuals.test.ts`

1. Write a failing test requiring one visual record for every catalog id and rejecting extra ids.
2. Define each record as:
   ```ts
   interface RepositoryVisual {
     repositoryId: string;
     localPath: string;
     sourceUrl: string;
     sourceKind: "project-logo" | "homepage-icon" | "github-owner-avatar";
     checkedAt: string;
     usageNote: string;
   }
   ```
3. Require HTTPS source URLs, relative local paths under `images/repositories/`, valid dates, and unique repository ids.
4. Populate the initial 20-record manifest using audited sources; owner avatars are the default until a clearly official project-specific asset is confirmed.
5. Run `npm test -- repositoryVisuals.test.ts`; expect the manifest coverage test to pass.
6. Commit: `feat: add repository visual provenance manifest`.

### Task 2: Add the curator-side snapshot pipeline

**Files:**
- Create: `frontend/scripts/fetch-repository-visuals.mjs`
- Modify: `frontend/package.json`
- Create: `frontend/public/images/repositories/`

1. Add Sharp as a dev dependency and add `npm run visuals:sync`.
2. Fetch only URLs listed in the manifest with a descriptive User-Agent, timeout, redirect limit, and maximum response size.
3. Reject non-image MIME types, SVG with active content, failed responses, and files below a minimum usable dimension.
4. Normalize each accepted image to `320 × 320` WebP, quality 85:
   - `contain` for project logos and homepage icons to avoid cutting marks;
   - `cover` for square GitHub avatars.
5. Strip metadata and write deterministic names such as `bowang-lab__medsamslicer.webp`.
6. Fail the script if a manifest record does not produce a valid local asset; never silently substitute a different remote image.
7. Run `npm run visuals:sync` twice and verify the second run produces identical files.
8. Commit: `feat: snapshot repository source visuals`.

### Task 3: Render source visuals in all Marketplace surfaces

**Files:**
- Modify: `frontend/src/components/MarketplaceResults.tsx`
- Modify: `frontend/src/components/EntryDetail.tsx`
- Modify: `frontend/src/styles/marketplace.css`

1. Replace the letter-only `EntryVisual` with a component that resolves the manifest record by `entry.id`.
2. Build image URLs with `import.meta.env.BASE_URL + localPath` so GitHub Pages works under `/awesome-dsh-med-plugin-web-homepage/`.
3. Render the visual in:
   - Card view at compact square size;
   - Table view before the repository name;
   - Gallery view as the primary visual area;
   - Detail header beside the repository title.
4. Use `loading="lazy"` and `decoding="async"` for list/gallery assets. Use empty alt text where the adjacent visible repository title already names the item.
5. On image error, hide the broken image and reveal the current deterministic category tile without changing layout.
6. Add a `Visual source` row in the detail Links section showing source kind and linking to `sourceUrl`.
7. Preserve card/row click behavior, filtering, URL state, detail close, and splitter behavior.
8. Commit: `feat: show source visuals across marketplace views`.

### Task 4: Verify source integrity, layout, and deployment

**Files:**
- Modify: `frontend/tests/repositoryVisuals.test.ts`
- Modify: `docs/frontend-architecture.md`

1. Test exact 20/20 manifest coverage, local file existence, WebP MIME, 320×320 dimensions, HTTPS provenance, and absence of runtime remote image URLs.
2. Run:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
3. Start a local production preview and inspect Card, Table, Gallery, detail pane, filters, narrow split pane, and 390px mobile layout.
4. Confirm every image is visually associated with the correct repository and that project logo vs owner avatar is labelled accurately.
5. Document the static visual manifest, refresh command, source precedence, and fallback behavior.
6. Push the feature branch, merge only after visual review, then confirm GitHub Pages serves the committed local images without 404s.
7. Commit: `docs: document repository visual snapshots`.

## Acceptance criteria

- All 20 entries display a real, locally hosted source visual in Card, Table, Gallery, and detail views.
- No browser-time request is made to GitHub avatars or third-party homepages.
- Every visual has an auditable source URL and source kind.
- Owner avatars are never presented as project logos.
- Missing/broken visuals retain the current deterministic fallback without layout shift.
- GitHub Pages base-path navigation and existing Marketplace interactions remain unchanged.

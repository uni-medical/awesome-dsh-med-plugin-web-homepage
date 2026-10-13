# Medical Component Market frontend

This directory contains the Vite + React homepage and marketplace routes deployed by GitHub Pages.

## Current data boundary

- The browser reads the checked-in `../data/prototype-catalog.json` snapshot.
- Search and filters run locally in the browser.
- The snapshot contains 20 public-safe repository records assembled from the sources recorded in the catalog.
- Star counts and update timestamps are observations from that snapshot, not live GitHub metrics.
- Stable means an entry is present in the reviewed `main` snapshot; Candidate means it is present only in the automated discovery snapshot. Neither indicates medical validity, security, compatibility, or quality.
- The frontend does not call GitHub or a runtime API.
- Repository icons are committed local snapshots described by `../data/repository-visuals.json`. The manifest distinguishes official project assets, homepage icons, GitHub owner avatars, and generated neutral visuals. Personal owner photos are not used as project icons; neutral visuals are explicitly identified as non-official demo assets.

The doctor-researcher hero is an AI-generated fictional editorial image. It does not depict a real clinician, patient, institution, or clinical result. The RSI Component Market mascot is an original generated mark based only on the friendly rounded-robot mood of the supplied visual reference; the exact wordmark is rendered in HTML.

## Local development

```bash
npm ci
npm run dev
```

With the repository base path configured, open:

```text
http://localhost:5173/awesome-dsh-med-plugin-web-homepage/
http://localhost:5173/awesome-dsh-med-plugin-web-homepage/marketplace/
```

## Verify

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

## Appearance

The site starts in dark mode. The sun/moon control on the home page and workspace navigation, or Appearance in Settings, switches the entire site to daylight mode. The choice is saved with the existing browser-local v1 preferences; older preferences without a theme continue to use dark mode. Restoring defaults resets the theme while preserving personal collections.

`public/theme-init.js` applies the saved theme before the app's stylesheet loads. `src/styles/theme.css` defines daylight color roles; existing CSS fallbacks preserve the dark palette. Photographs and carousel scrims keep their original colors. The selected dark table row uses a brighter source label for readable contrast.

The coverage check targets theme application and workspace preference/collection helpers, with an 80% minimum. Browser verification also covers the home, marketplace, detail, collection, research and settings views in both languages and themes at 320, 390, 768, 1024 and 1440 pixels.

## Refresh repository visuals

Review and update the source URLs and provenance notes in `../data/repository-visuals.json`, then run:

```bash
npm run visuals:generate-neutral
npm run visuals:sync
```

The first command reproduces any manifest entries marked as generated neutral visuals. The sync command validates official remote image types and dimensions, then writes deterministic 320 × 320 WebP files to `public/images/repositories/`. These files are committed so the deployed site does not contact the original image hosts at runtime.

Pushing `main` runs `.github/workflows/deploy-pages.yml` and publishes `dist/` to the repository's GitHub Pages site.

# Medical Component Market frontend

This directory contains the Vite + React homepage and marketplace routes deployed by GitHub Pages.

## Current data boundary

- The browser reads the checked-in `../data/prototype-catalog.json` snapshot.
- Search and filters run locally in the browser.
- The snapshot contains 20 public-safe repository records assembled from the sources recorded in the catalog.
- Star counts and update timestamps are observations from that snapshot, not live GitHub metrics.
- Stable means an entry is present in the reviewed `main` snapshot; Candidate means it is present only in the automated discovery snapshot. Neither indicates medical validity, security, compatibility, or quality.
- The frontend does not call GitHub, CRC-MDT, or a runtime API.

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
npm run build
```

Pushing `main` runs `.github/workflows/deploy-pages.yml` and publishes `dist/` to the repository's GitHub Pages site.

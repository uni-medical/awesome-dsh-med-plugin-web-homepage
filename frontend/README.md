# Medical Component Market frontend

This directory contains the Vite + React site deployed by GitHub Pages: the home page, the component ecosystem (`/marketplace`), the capability map (`/graph`) and settings.

## Data boundary

- The catalogue is generated at build-preparation time from pinned commits of [`uni-medical/awesome-dsh-med-plugin`](https://github.com/uni-medical/awesome-dsh-med-plugin). Commits and paths are pinned in `../data/upstream-lock.json`; provenance, counts and link coverage are written to `../data/component-import-report.json`.
- Generated files are committed so GitHub Pages builds do not need access to the upstream repository:
  - `public/data/components/index.json`: list, search and capability-map records (fetched at runtime).
  - `public/data/components/detail/NNN.json`: detail records in 128 shards, fetched when a detail dialog opens.
  - `src/data/componentSummary.json`: counts bundled into the app (home page).
- Search, filters and the capability map run in the browser. The site does not call GitHub or a runtime API.

### Linking evaluation cards

The standardized catalogue (`integrate:data/standardization/entries.jsonl`) and the per-entry evaluation cards (`user-card-taxonomy-20261112:…/cards/cards.jsonl.gz`) share no identifier. The import rebuilds the evaluation table's `stable_id` key (`entry:{Repo}:{type}:{component root}[:{name}]`) from each entry:

| Type | Key |
|---|---|
| skill | repository + `SKILL.md` directory |
| mcp | repository + tool name; same-named tools are narrowed by the provider's service suffix |
| cli | repository + definition-file directory + name |
| dsh-plugin | repository + `cordis.patch.yml` directory |

A card is attached only when exactly one evaluation row matches an entry and no other entry claims that row. Other entries remain searchable and show "No evaluation", which is not a finding of no risk.

Only public card fields are exported (see `scripts/lib/public-fields.mjs`). Evaluation text is shown in Chinese as published upstream. Cards come from automated scanning and AI review and are not reviewed by people or medical experts; the detail dialog keeps that statement.

### Capability map

The upstream data carries no dependency or call relations. The capability map ranks catalogue records against a task description, merges records that share a name ("×N source records"), and draws other candidates from the same search around the selected one by shared vocabulary. The page labels these as "candidates from the same search, not catalogue relations". Chinese queries are expanded to English terms through `src/data/queryAliases.ts`.

## Refresh the catalogue

```bash
npm run data:import                                      # clone/fetch into ~/.cache and import
npm run data:import -- --source /path/to/awesome-dsh-med-plugin   # reuse an existing clone
```

To move to newer upstream data, update the commits in `../data/upstream-lock.json`, run the import, review `../data/component-import-report.json`, and commit the regenerated files. The output is deterministic for a given lock file and frontend commit.

## Local development

```bash
npm ci
npm run dev
```

With the repository base path configured, open `http://localhost:5173/awesome-dsh-med-plugin-web-homepage/`.

## Verify

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Appearance

The site starts in dark mode. The sun/moon control or Appearance in Settings switches the entire site to daylight mode, saved with the browser-local v1 preferences. `public/theme-init.js` applies the saved theme before the stylesheet loads; `src/styles/theme.css` defines daylight colour roles and existing CSS fallbacks keep the dark palette.

The plan ("方案") is stored in the browser under `medical-workbench.plan.v1`. Personal collections and research comparison from the earlier repository browser were removed; `/collections` and `/research` redirect to `/marketplace`.

The doctor-researcher hero is an AI-generated fictional editorial image. It does not depict a real clinician, patient, institution, or clinical result.

Pushing `main` runs `.github/workflows/deploy-pages.yml` and publishes `dist/` to the repository's GitHub Pages site.

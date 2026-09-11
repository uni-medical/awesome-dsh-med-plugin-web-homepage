# Frontend architecture

The public homepage is a Vite + React application in `frontend/`. Pages, reusable components, data access, state, utilities, and styles are separated so a future API or database can replace the static catalog client without changing page composition. The current release has two routes: `/` and `/marketplace`.

Repository visuals are static, source-traceable snapshots. `data/repository-visuals.json` maps every catalog id to a committed file under `frontend/public/images/repositories/`, its original HTTPS source, source kind, check date, and usage note. The browser never hotlinks GitHub avatars or project homepages. Curators refresh the snapshots with `npm run visuals:sync`; a failed or missing image falls back to the deterministic category tile.

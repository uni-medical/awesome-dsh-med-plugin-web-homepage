# Medical Component Market Homepage

Public homepage and component catalogue for medical AI research components: skills, MCP tools, CLIs and DSH plugins from [`uni-medical/awesome-dsh-med-plugin`](https://github.com/uni-medical/awesome-dsh-med-plugin), with per-component evaluation cards. It is a static Vite + React site; search, filters and the capability map run in the browser.

## Routes

- `/` — homepage
- `/marketplace` — component ecosystem (search, filters, detail dialog with evaluation card)
- `/graph` — capability map (task search, candidate list, same-search candidate graph)
- `/settings` — appearance, language, density, motion, local data

The catalogue is imported from pinned upstream commits; see `frontend/README.md` for the import step and how evaluation cards are linked.

## Local development

```bash
cd frontend
npm install
npm run dev
```

The site does not request GitHub at runtime. Future backend boundaries are documented in `docs/backend-integration.md`.

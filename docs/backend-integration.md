# Backend integration boundary

The frontend currently reads `data/prototype-catalog.json` locally. A future backend can implement `GET /api/catalog`, `GET /api/catalog/:id`, `GET /api/catalog/summary`, `GET /api/catalog/domains`, and `GET /api/catalog/categories`. The public data contract is documented by the JSON fixture and must not include patient, credential, or private repository data.

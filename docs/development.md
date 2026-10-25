# Development

The runtime is dependency-free: browser-native JavaScript plus Python's standard library. Node tooling supports tests, icon generation, and this documentation site.

## Source layout

| Path | Purpose |
|---|---|
| `public/index.html` | Accessible editor shell and dialogs |
| `public/app.js` | Editor interactions, autosave, import, and export |
| `public/model.js` | Project schema, validation, layout, and SVG rendering |
| `public/state.js` | Pure state, conflict, selection, and PNG-size helpers |
| `public/catalog.js` | Logo metadata and lookup helpers |
| `public/logos/` | Reviewed local SVG assets |
| `public/licenses/` | Logo source manifest and upstream licenses |
| `server.py` | Restricted static server and `/healthz` endpoint |
| `scripts/` | Deterministic icon build and validation |
| `tests/` | Node model/state tests and Python server tests |
| `docs/` | VitePress documentation and approved sample assets |

## Checks

Use Node.js 20 or newer for app tooling and Python 3.10 or newer for server tests:

```sh
npm test
npm run build:icons
npm run check:icons
docker compose config
```

`npm test` runs icon validation, Node tests, and Python unit tests. Avoid relying on a fixed test count; it changes as coverage grows.

## Documentation

The docs use an isolated VitePress dependency:

```sh
npm --prefix docs ci
npm --prefix docs run dev
npm --prefix docs run build
npm --prefix docs run preview
```

The configured base is `/homelab-atlas/`, including locally. The dev server prints the exact local URL; use that path when checking direct links and assets.

## Adding or updating logos

1. Use a legitimate, pinned SVG source whose license permits inclusion.
2. Add or replace the reviewed SVG in `public/logos/`.
3. Update `public/licenses/logo-sources.json` with exact source and license information.
4. Add any required license text or notice.
5. Run `npm run build:icons` and `npm run check:icons`.
6. Include the generated `public/icon-data.js` change.

Keep logos local. Do not change runtime imports to CDNs or add remote font/image dependencies. Product names and trademarks remain their owners' property; see [THIRD_PARTY_NOTICES.md on GitHub](https://github.com/aiden0rchad/homelab-atlas/blob/main/THIRD_PARTY_NOTICES.md).

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
| `scripts/` | Deterministic icon and release artifact tooling |
| `tests/` | Node model/state tests and Python server/release tests |
| `docs/` | VitePress documentation and approved sample assets |
| `compose.release.yaml` | Hardened deployment of the published GHCR image |

## Checks

Use Node.js 20 or newer for app tooling and Python 3.10 or newer for server tests:

```sh
npm test
npm run build:icons
npm run check:icons
docker compose config
docker compose -f compose.release.yaml config
python3 scripts/release.py v0.1.0 --output dist
```

`npm test` runs icon validation, Node tests, and Python unit tests. Release artifacts are written to ignored `dist/`; the release workflow also verifies their checksums.

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
3. Register metadata in `public/catalog.js`, including the light/dark contrast plate sets when needed.
4. Update `public/licenses/logo-sources.json` with exact source and license information.
5. Update `THIRD_PARTY_NOTICES.md` and add any applicable license file.
6. Run `npm run build:icons` and `npm run check:icons`.
7. Include the generated `public/icon-data.js` change.

Keep logos local. Do not change runtime imports to CDNs or add remote font/image dependencies. Product names and trademarks remain their owners' property; see [THIRD_PARTY_NOTICES.md on GitHub](https://github.com/aiden0rchad/homelab-atlas/blob/main/THIRD_PARTY_NOTICES.md).

## Preparing a release

Update the root package version, `compose.release.yaml` default tag, release notes, and `CHANGELOG.md` together. Run the app, docs, Compose, and release artifact checks before pushing a strict `vMAJOR.MINOR.PATCH` tag. The [release guide](/releases/) contains the maintainer checklist and package visibility requirement.

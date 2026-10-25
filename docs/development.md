# Development

The app itself uses browser JavaScript and Python's standard library, with no runtime packages to install. Node.js is used for tests, building the logo data, and this documentation site.

## Source layout

| Path | Purpose |
|---|---|
| `public/index.html` | Editor page and dialogs |
| `public/app.js` | Editor controls, autosave, import, and export |
| `public/model.js` | Project schema, validation, layout, and SVG rendering |
| `public/state.js` | State, conflict, selection, and PNG-size helpers |
| `public/catalog.js` | Logo metadata and lookup helpers |
| `public/custom-logos.js` | Uploaded PNG validation and browser normalization |
| `public/logos/` | Included SVG logo files |
| `public/licenses/` | Logo sources and upstream licenses |
| `server.py` | Restricted static server and `/healthz` endpoint |
| `scripts/` | Repeatable icon and release artifact tools |
| `tests/` | Node model/state tests and Python server/release tests |
| `docs/` | VitePress documentation and sample files |
| `compose.release.yaml` | Docker Compose file for the published GHCR image |

## Checks

Use Node.js 20 or newer for the app tools and Python 3.10 or newer for the server tests:

```sh
npm test
npm run build:icons
npm run check:icons
docker compose config
docker compose -f compose.release.yaml config
python3 scripts/release.py v0.5.0 --output dist
```

`npm test` checks the logo data, runs the Node tests, and runs the Python tests. Release files go into the ignored `dist/` directory, and the release workflow checks their checksums too.

## Documentation

The docs keep their VitePress dependency inside `docs/`:

```sh
npm --prefix docs ci
npm --prefix docs run dev
npm --prefix docs run build
npm --prefix docs run preview
```

The configured base path is `/homelab-atlas/`, even when you run the docs locally. The dev server prints the full local URL. Use that URL when checking links and images.

## Adding or updating logos

1. Use a legitimate, pinned SVG source with a license that allows it to be included.
2. Add or replace the SVG in `public/logos/`.
3. Add its metadata to `public/catalog.js`, including the light/dark contrast plate sets if it needs them.
4. Add the exact source and license information to `public/licenses/logo-sources.json`.
5. Update `THIRD_PARTY_NOTICES.md` and add any license file that applies.
6. Run `npm run build:icons` and `npm run check:icons`.
7. Include the generated `public/icon-data.js` change.

Keep the logos in the repository. Do not load them, fonts, or other images from a CDN at runtime. Product names and trademarks still belong to their owners; see [THIRD_PARTY_NOTICES.md on GitHub](https://github.com/aiden0rchad/homelab-atlas/blob/main/THIRD_PARTY_NOTICES.md).

Project uploads are different from bundled logos. They are decoded by the browser, converted to PNG, limited to 512px and 200,000 data-URL characters each, and stored only in project JSON. Imports validate PNG structure before native browser decode. Projects allow 32 uploads and 1,200,000 total custom data-URL characters. Original files are limited to 2,000,000 bytes, 4096px per side, and 16 million pixels.

## Preparing a release

Update the root package version, the default tag in `compose.release.yaml`, the release notes, and `CHANGELOG.md` together. Run the app, docs, Compose, and release-file checks before pushing a strict `vMAJOR.MINOR.PATCH` tag. The [release guide](/releases/) has the full checklist and the first-package visibility step.

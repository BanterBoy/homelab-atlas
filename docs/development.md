# Development

The app uses browser JavaScript and the Go standard library, with no runtime packages to install. Node.js is used for tests, building logo data, and this documentation site. Python is retained for deterministic release packaging tests.

At startup, the Go server prepares reusable gzip representations for compressible embedded assets when they are smaller than the originals. Static responses use encoding-specific ETags and `Cache-Control: no-cache` revalidation; discovery API and collector inventory responses remain private and uncompressed.

The final container includes `LICENSE` and `THIRD_PARTY_NOTICES.md` under `/usr/share/licenses/homelab-atlas/`, including the notice for the adapted Nmap XML projections.

## Source layout

| Path | Purpose |
|---|---|
| `public/index.html` | Editor page and dialogs |
| `public/app.js` | Editor controls, autosave, import, and export |
| `public/export.js` | Pure image-export filtering and snapshot preparation |
| `public/model.js` | Project schema, validation, layout, and SVG rendering |
| `public/state.js` | State, conflict, selection, and PNG-size helpers |
| `public/catalog.js` | Logo metadata and lookup helpers |
| `public/custom-logos.js` | Uploaded PNG validation and browser normalization |
| `public/discovery.js` | Snapshot validation, matching, and atomic merge planning |
| `public/logos/` | Included SVG logo files |
| `public/licenses/` | Logo sources and upstream licenses |
| `main.go` | Embedded assets and the server, `healthcheck`, and `collect` commands |
| `server.go` | Restricted static server, discovery API, and collector HTTP handler |
| `docker.go` | Bounded read-only Docker client and sanitized grouping |
| `discovery.go` | Discovery snapshot and configured-source validation |
| `nmap.go` | Strict Nmap XML projection, normalization, limits, and identities |
| `scripts/` | Repeatable icon and release artifact tools |
| `tests/` | Node model/discovery tests and Python release tests |
| `docs/` | VitePress documentation and sample files |
| `compose.release.yaml` | Docker Compose file for the published GHCR image |

## Checks

Use Go 1.26, Node.js 20 or newer, and Python 3.10 or newer:

```sh
npm test
go test -race ./...
go vet ./...
npm run build:icons
npm run check:icons
docker compose config
docker compose -f compose.release.yaml config
python3 scripts/release.py v0.8.0 --output dist
```

`npm test` checks logo data, runs the Node tests, runs `go test ./...`, and runs the Python release tests. Release files go into the ignored `dist/` directory, and the release workflow checks their checksums too.

Docker and discovery tests use fictional fixtures. The collector must keep its fixed read-only endpoint set, response bounds, timeout, redirect rejection, and secret-safe errors. The editor server must never mount the Docker socket or accept a browser-supplied target URL.

## Upstream reuse decisions

| Project | License and evidence | Atlas decision |
|---|---|---|
| Hawser | [MIT license](https://github.com/Finsys/hawser/blob/bd1282901f7f33537adaebea33121c1831ef07a5/LICENSE) and [Standard HTTP server](https://github.com/Finsys/hawser/blob/bd1282901f7f33537adaebea33121c1831ef07a5/internal/server/http.go) | Implemented only its `X-Hawser-Token` and Docker-path protocol. MIT permits reuse, but Atlas copied no upstream code and does not vendor the full manager. |
| Docker/Moby client | [Client source](https://github.com/moby/moby/tree/master/client) and [Apache-2.0 license](https://github.com/moby/moby/blob/master/client/LICENSE) | Not used. It remains useful if Atlas needs a broader Docker SDK; the current two-read standard-library client is smaller. |
| Ullaakut/nmap | [Pinned MIT wrapper](https://github.com/Ullaakut/nmap/tree/95091f90b599d00827e6d42c609cbe4c3afeb0ac) | Adapted only small host/address/hostname/status/port/state/service XML field projections from `xml.go`. Atlas implements validation, limits, identity, normalization, and merging. No wrapper, scanner execution, broad dependency tree, or Go module dependency is included. |
| Nmap | [NPSL §3](https://nmap.org/npsl/npsl-annotated.html) and [XML format](https://nmap.org/book/output-formats-xml-output.html) | Atlas recommends user-supplied XML import first and ships no Nmap engine or data files. NPSL §3 distinguishes importing end-user results from copying or distributing Nmap; applicable terms would be checked before any executable integration. |

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

Project uploads are different from bundled logos. They are decoded by the browser, converted to PNG, limited to 512px and 200,000 data-URL characters each, and stored only in project JSON. Imports validate PNG structure, native zlib output within a fixed bound, and native browser image decoding. Projects allow 32 uploads and 1,200,000 total custom data-URL characters. Original files are limited to 2,000,000 bytes, 4096px per side, and 16 million pixels.

## Preparing a release

Update the root package version, the default tag in `compose.release.yaml`, the release notes, and `CHANGELOG.md` together. Run the app, docs, Compose, and release-file checks before pushing a strict `vMAJOR.MINOR.PATCH` tag. The [release guide](/releases/) has the full checklist and the first-package visibility step.

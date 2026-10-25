# Contributing

Thanks for helping improve Homelab Atlas.

## Before opening an issue

- Search existing issues and the [documentation](https://aiden0rchad.github.io/homelab-atlas/).
- Use the bug template for reproducible failures and the feature template for a concrete use case.
- Do not attach personal lab exports, credentials, private hostnames, domains, or addresses. Reduce a project to fictional data first.
- Report security problems privately as described in [SECURITY.md](SECURITY.md).

## Pull requests

Keep changes focused. Explain the problem and approach, note user-visible effects, and include screenshots for interface changes. Do not add runtime dependencies, remote assets, telemetry, or CDN imports.

Run the checks relevant to your change:

```sh
npm test
docker compose config
npm --prefix docs ci
npm --prefix docs run build
```

For logo changes, use a pinned legitimate SVG source, update `public/licenses/logo-sources.json` and applicable license notices, then run:

```sh
npm run build:icons
npm run check:icons
```

Generated `public/icon-data.js` must match the reviewed SVG files. Do not commit `docs/.vitepress/cache/` or `docs/.vitepress/dist/`.

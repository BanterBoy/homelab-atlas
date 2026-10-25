# Homelab Atlas

A local-first visual editor for polished homelab diagrams: automatic layouts, device cards, hardware facts, searchable service tiles, VLANs, logical connections, themes, and matching SVG/PNG export. No AI, accounts, database, telemetry, network scanning, or Docker socket access.

## Quick start

```sh
git clone https://github.com/aiden0rchad/homelab-atlas.git
cd homelab-atlas
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080). Compose binds to localhost by default. To deliberately expose it on your LAN, set `ATLAS_BIND=0.0.0.0` before starting. This is a trusted-local-use app with no backend authentication.

## Use it

1. Start with the editable example or choose **Start empty**.
2. Add a device template from the inventory rail.
3. Select a card to edit its name, hardware, icon, groups, and services.
4. Add network nodes, VLAN chips, and named logical connections.
5. Save portable JSON backups or download the same diagram as SVG/PNG.

Changes autosave to browser `localStorage`; that is not server storage and does not follow you to another browser or device. Use **Save project** for backup/sharing. Imports are validated before replacing the current diagram and can be undone. Concurrent-tab conflicts offer explicit keep, load, or download choices.

The searchable catalog bundles more than 60 attributed homelab brand marks and works fully offline. Multi-select apps across searches, add custom services, edit VLANs with name/color controls, and use **Fit** or manual zoom for the preview. PNG export caps output at 36 megapixels and 16,384 pixels per side; SVG remains resolution-independent.

Limitations: automatic layout only; connections are logical relationships, not switch-port maps; no discovery or live monitoring.

## Development

Requires Python 3.10+ and Node 20+ only for tests.

```sh
python3 server.py
npm run build:icons
npm test
docker compose config
```

`npm run build:icons` deterministically rebuilds the synchronous export map from reviewed files in `public/logos/`. The server exposes only `public/` and sends a restrictive CSP. The container runs as non-root and supports a read-only root filesystem. Python's static server is intended for trusted local/LAN use, not hardened public internet hosting.

## Licensing

Original code is MIT licensed. Bundled logos retain their upstream licenses; product names and trademarks belong to their owners. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

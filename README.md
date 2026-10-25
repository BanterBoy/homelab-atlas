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

Changes autosave to browser `localStorage`; that is not server storage and does not follow you to another browser or device. Use **Save project** for backup/sharing. Imports are validated before replacing the current diagram and can be undone. Concurrent-tab changes are detected instead of silently overwritten.

Limitations: automatic layout only; connections are logical relationships, not switch-port maps; no discovery/live monitoring; bundled catalog art uses local letter tiles rather than third-party marks. Large PNGs are capped at 36 megapixels.

## Development

Requires Python 3.10+ and Node 20+ only for tests.

```sh
python3 server.py
npm test
docker compose config
```

The server exposes only `public/` and sends a restrictive CSP. The container runs as non-root and supports a read-only root filesystem.

## Licensing

Original code is MIT licensed. Product names and trademarks belong to their owners. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

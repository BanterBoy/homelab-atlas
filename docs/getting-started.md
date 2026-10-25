# Getting started

Homelab Atlas is a static browser editor served from your own machine. The published container is the preferred installation.

## Requirements

- Docker Engine or Docker Desktop with Compose v2
- A current desktop browser

Git is needed only for a source build. The direct-server fallback requires Python 3.10 or newer. Node.js is only for app tests, icon maintenance, and documentation development.

## Install the released image

Download the release Compose file, then start the container:

```sh
curl -fsSLO https://github.com/aiden0rchad/homelab-atlas/releases/download/v0.1.0/compose.release.yaml
docker compose -f compose.release.yaml up -d
```

Open `http://localhost:8080`. Verify the server if needed:

```sh
curl http://localhost:8080/healthz
```

A healthy response is `ok`. The Compose file pulls `ghcr.io/aiden0rchad/homelab-atlas:0.1.0` by default and retains the source deployment's loopback binding, read-only filesystem, dropped capabilities, and no-new-privileges policy.

## Pin and update versions

Create `.env` beside `compose.release.yaml` to choose an explicit image tag:

```dotenv
ATLAS_VERSION=0.1.0
```

To update an explicit pin, edit `ATLAS_VERSION` in `.env` to a published target first. Then pull and recreate without changing the hostname or port:

```sh
docker compose -f compose.release.yaml pull
docker compose -f compose.release.yaml up -d
```

Save an editable JSON project before any update or downgrade. Projects live in browser storage, not a container volume. Keeping the same origin—hostname, port, and protocol—keeps the same browser storage namespace. A downgrade may require a project compatible with that version's JSON schema; no automatic migration is promised.

Version tags have different stability:

- `0.1.0` and `v0.1.0` identify this release.
- `0.1` moves to the newest compatible 0.1 patch.
- `latest` moves to the newest stable release.
- A published image digest is immutable; see the [release guide](/releases/) for digest pinning.

## Build from source

Install Git, then build the current checkout:

```sh
git clone https://github.com/aiden0rchad/homelab-atlas.git
cd homelab-atlas
docker compose up --build -d
```

Update a source deployment with:

```sh
git pull --ff-only
docker compose up --build -d
```

Stop a released-image deployment with:

```sh
docker compose -f compose.release.yaml down
```

Stop a source-built deployment from its checkout with:

```sh
docker compose down
```

## Direct Python fallback

From a source checkout, run:

```sh
python3 server.py
```

For the portable release, extract the ZIP and enter its top-level directory first:

```sh
unzip homelab-atlas-0.1.0.zip
cd homelab-atlas-0.1.0
python3 server.py
```

Open `http://localhost:8080`. The server exposes only `public/` and defaults to loopback.

## Trusted-LAN access

The app has no authentication. Use LAN binding only on a network you trust:

```sh
ATLAS_BIND=0.0.0.0 docker compose -f compose.release.yaml up -d
```

Open `http://<server-address>:8080` from the trusted client. That hostname is a different origin from `localhost`, so its browser storage is separate. Save JSON before changing hostname, port, or protocol. Do not expose Homelab Atlas directly to the public internet.

## First diagram

1. Choose **Load example** to explore or **Start empty**.
2. Add a device from the inventory rail.
3. Select its card or inventory row to open the inspector.
4. Add a service group and local logo tiles.
5. Choose **Save project** before sharing or changing origins.

Continue with the [editor guide](/editor) or review [privacy and deployment boundaries](/privacy).

# Getting started

Homelab Atlas runs in your browser and is served from your own machine. The published Docker image is the easiest way to run it.

## Requirements

- Docker Engine or Docker Desktop with Compose v2
- A current desktop browser

You only need Git if you're building from source. Running without Docker requires Python 3.10 or newer. Node.js is only needed for tests, logo maintenance, and work on these docs.

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

A healthy response is `ok`. By default, the Compose file pulls `ghcr.io/aiden0rchad/homelab-atlas:0.1.0`. It only listens on the machine running Docker and keeps the container read-only, drops its capabilities, and enables the no-new-privileges setting.

## Pin and update versions

To pin a version, create `.env` next to `compose.release.yaml`:

```dotenv
ATLAS_VERSION=0.1.0
```

When you want to update, change `ATLAS_VERSION` in `.env` to a version that has been published. Then pull it and recreate the container without changing the hostname or port:

```sh
docker compose -f compose.release.yaml pull
docker compose -f compose.release.yaml up -d
```

Save an editable JSON project before you update or downgrade. Your project is stored by the browser, not in a container volume. The browser treats each combination of hostname, port, and protocol as a separate site, so keep those the same if you want the same autosaved project to appear. If you downgrade, the older version may not understand a project saved with a newer JSON format. Atlas does not automatically migrate projects backward.

The image tags work like this:

- `0.1.0` and `v0.1.0` identify this release.
- `0.1` moves to the newest compatible 0.1 patch.
- `latest` moves to the newest stable release.
- A published image digest never changes; the [release guide](/releases/) explains how to pin one.

## Build from source

Install Git, clone the repository, and build the current source:

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

## Run without Docker {#direct-python-fallback}

From a source checkout, run:

```sh
python3 server.py
```

For the portable release, extract the ZIP and move into its top-level directory first:

```sh
unzip homelab-atlas-0.1.0.zip
cd homelab-atlas-0.1.0
python3 server.py
```

Open `http://localhost:8080`. The server only exposes `public/` and, by default, only listens on the same machine.

## Open it from another computer {#trusted-lan-access}

Atlas has no login system. Only make it available on a LAN you trust:

```sh
ATLAS_BIND=0.0.0.0 docker compose -f compose.release.yaml up -d
```

Open `http://<server-address>:8080` from the other computer. The browser sees that address as a different site from `localhost`, so it has separate browser storage. Save JSON before changing the hostname, port, or protocol. Do not expose Homelab Atlas directly to the public internet.

## First diagram

1. Choose **Load example** to explore or **Start empty**.
2. Add a device from the inventory rail.
3. Select its card or inventory row to open the inspector.
4. Add a service group and local logo tiles.
5. Choose **Save project** before sharing or changing origins.

The [editor guide](/editor) covers the controls. The [privacy and deployment page](/privacy) explains what stays in the browser and why Atlas should stay off the public internet.

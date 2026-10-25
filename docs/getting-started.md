# Getting started

Homelab Atlas is a static browser editor served from your own machine. Docker Compose is the shortest supported path.

## Requirements

- Git
- Docker Engine or Docker Desktop with Compose v2
- A current desktop browser

The direct-server fallback requires Python 3.10 or newer. Node.js is only needed for app tests, icon maintenance, and documentation development—not to run the app.

## Start with Docker Compose

```sh
git clone https://github.com/aiden0rchad/homelab-atlas.git
cd homelab-atlas
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080), then verify the server if needed:

```sh
curl http://localhost:8080/healthz
```

A healthy response is `ok`.

## Stop, start, and update

```sh
# Stop and remove the container
docker compose down

# Start it again
docker compose up -d

# Update from source
git pull --ff-only
docker compose up --build -d
```

Save an editable JSON project before updating. The container has no project volume because project data lives in browser storage, not on the app server.

## Direct Python fallback

From the repository root:

```sh
python3 server.py
```

Then open [http://localhost:8080](http://localhost:8080). The server exposes only `public/` and defaults to loopback.

## Trusted-LAN access

The app has no authentication. Use LAN binding only on a network you trust:

```sh
ATLAS_BIND=0.0.0.0 docker compose up --build -d
```

Open `http://<server-address>:8080` from the trusted client. That hostname creates a different browser origin from `localhost`, so its browser storage is separate. Save JSON before changing hostname, port, or protocol. Do not expose Homelab Atlas directly to the public internet.

## First diagram

1. Choose **Load example** to explore or **Start empty**.
2. Add a device from the inventory rail.
3. Select its card or inventory row to open the inspector.
4. Add a service group and local logo tiles.
5. Choose **Save project** before sharing or changing origins.

Continue with the [editor guide](/editor) or review [privacy and deployment boundaries](/privacy).

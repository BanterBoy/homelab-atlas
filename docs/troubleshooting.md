# Troubleshooting

Start with the symptom below. Browser developer tools and `docker compose logs` can provide additional detail, but sanitize logs before sharing them.

| Symptom | Action |
|---|---|
| Project is empty at another URL | Use the same browser profile and exact origin, including hostname, port, and protocol. Import a saved JSON backup when changing origins. |
| “Not saved — storage unavailable” | Allow site storage, leave private mode, check browser quota/policy, then download JSON immediately if the project is still open. |
| Another-tab conflict banner | Download your current project first, then choose **Keep my edits** or **Load saved version** intentionally. |
| Import rejected | Confirm it is valid Homelab Atlas schema-version-1 JSON, under 1 MB, with no unknown keys, duplicate/unsafe IDs, unknown logo IDs, or invalid connection endpoints. |
| Port 8080 already in use | Stop the conflicting service or use a different local port as shown below. |
| Released container does not start | Run `docker compose -f compose.release.yaml config`, then `pull`, inspect `ps`, and read `logs atlas` with the same `-f compose.release.yaml` argument. Confirm the GHCR package is public. |
| Source-built container does not start | Run `docker compose config`, rebuild, inspect `docker compose ps`, and read `docker compose logs atlas`. |
| Health check fails | Try `curl http://localhost:8080/healthz`; confirm the container is running and bound to the expected interface. |
| Labels collide or cards are too tall | Shorten labels, use Compact density, adjust 1–4 columns, reorder devices, or use **Fit page**/**Fit width**. |
| PNG export fails or is reduced | Simplify the diagram, try another current browser, or export SVG. PNG is capped at 36 MP and 16,384 px per side. |

## Use another port

With the direct Python server:

```sh
PORT=8081 python3 server.py
```

With Compose, build the image and publish an explicit alternate host port:

```sh
docker compose build
docker compose run --rm -p 127.0.0.1:8081:8080 atlas
```

Open `http://localhost:8081`. This is a different browser origin from port 8080, so import a JSON backup rather than expecting the old autosave to appear.

For the released image, Compose `run` does not publish the service's default ports, so provide the alternate mapping explicitly:

```sh
docker compose -f compose.release.yaml run --rm -p 127.0.0.1:8081:8080 atlas
```

Keep the container's internal port at 8080. There is no `ATLAS_PORT` setting.

## Import validation details

Imports are strict and atomic: a rejected file does not replace the current project. Common causes include:

- unsupported or missing `schemaVersion`
- a file larger than 1,000,000 bytes
- unknown object keys or invalid field types
- IDs that are duplicated, longer than 64 characters, or contain unsupported characters
- unknown bundled device/service logo IDs
- service counts outside 1–99
- a connection to a missing endpoint or to itself
- collection or text limits described in [project format](/project-format)

If storage or import trouble persists, reduce the problem to fictional data before opening a [bug report](https://github.com/aiden0rchad/homelab-atlas/issues/new?template=bug_report.yml).

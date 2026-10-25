# Troubleshooting

Find the symptom that matches what you're seeing. Browser developer tools and `docker compose logs` can help, but remove private details before sharing any output.

| Symptom | Action |
|---|---|
| Project is empty at another URL | Use the same browser profile, hostname, port, and protocol. If you changed the address, import a saved JSON backup. |
| “Not saved - storage unavailable” | Allow site storage, leave private mode, and check the browser's storage quota or policy. If the project is still open, download JSON right away. |
| Another-tab conflict banner | Download the project in the current tab first. Then choose **Keep my edits** or **Load saved version** based on which copy you want. |
| Import rejected | Make sure it is valid Homelab Atlas schema-version-1 JSON under 1 MB. Unknown keys, duplicate or unsafe IDs, unknown logo IDs, and bad connection endpoints are rejected. |
| Port 8080 already in use | Stop the conflicting service or use a different local port as shown below. |
| Released container does not start | Run `docker compose -f compose.release.yaml config`, then use the same `-f compose.release.yaml` argument with `pull`, `ps`, and `logs atlas`. Also confirm the GHCR package is public. |
| Source-built container does not start | Run `docker compose config`, rebuild it, check `docker compose ps`, and read `docker compose logs atlas`. |
| Health check fails | Try `curl http://localhost:8080/healthz`. Make sure the container is running and listening on the interface you expected. |
| Labels collide or cards are too tall | Shorten labels, use Compact density, adjust 1–4 columns, reorder devices, or use **Fit page**/**Fit width**. |
| PNG export fails or is reduced | Simplify the diagram, try another current browser, or export SVG. PNG is capped at 36 MP and 16,384 px per side. |

## Use another port

With the direct Python server:

```sh
PORT=8081 python3 server.py
```

For a source build, build the image and publish a different host port:

```sh
docker compose build
docker compose run --rm -p 127.0.0.1:8081:8080 atlas
```

Open `http://localhost:8081`. The browser treats port 8081 as a different site from port 8080, so import a JSON backup instead of expecting the old autosave to appear.

For the released image, Compose `run` does not publish the service's normal ports. Add the alternate mapping yourself:

```sh
docker compose -f compose.release.yaml run --rm -p 127.0.0.1:8081:8080 atlas
```

Leave the port inside the container at 8080. There is no `ATLAS_PORT` setting.

## Import validation details

Atlas checks the entire import before replacing your current project. If the file is rejected, the current project stays open. Common causes include:

- unsupported or missing `schemaVersion`
- a file larger than 1,000,000 bytes
- unknown object keys or invalid field types
- IDs that are duplicated, longer than 64 characters, or contain unsupported characters
- unknown bundled device/service logo IDs
- service counts outside 1–99
- a connection to a missing endpoint or to itself
- collection or text limits described in [project format](/project-format)

If the storage or import problem continues, replace any private details with fictional data before opening a [bug report](https://github.com/aiden0rchad/homelab-atlas/issues/new?template=bug_report.yml).

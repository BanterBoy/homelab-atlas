# Troubleshooting

Find the symptom that matches what you're seeing. Browser developer tools and `docker compose logs` can help, but remove private details before sharing any output.

| Symptom | Action |
|---|---|
| Project is empty at another URL | Use the same browser profile, hostname, port, and protocol. If you changed the address, import a saved JSON backup. |
| “Not saved — storage unavailable” | Allow site storage, leave private mode, and check the browser's storage quota or policy. If the project is still open, download JSON right away. |
| Another-tab conflict banner | Download the project in the current tab first. Then choose **Keep my edits** or **Load saved version** based on which copy you want. |
| Import rejected | Make sure it is valid Homelab Atlas schema-version-1 through schema-version-5 JSON no larger than 2 MB. Schema version 5 requires Atlas 0.6 or newer. Unknown keys, duplicate or unsafe IDs, unknown logo IDs, and bad references are rejected. |
| Custom logo upload rejected | Use a PNG, JPG, WebP, or safe SVG no larger than 2 MB, 4096px per side, or 16 million pixels. Active or externally loaded SVG content is rejected. |
| Port 8080 already in use | Stop the conflicting service or use a different local port as shown below. |
| Released container does not start | Run `docker compose -f compose.release.yaml config`, then use the same `-f compose.release.yaml` argument with `pull`, `ps`, and `logs atlas`. Also confirm the GHCR package is public. |
| Source-built container does not start | Run `docker compose config`, rebuild it, check `docker compose ps`, and read `docker compose logs atlas`. |
| Health check fails | Try `curl http://localhost:8080/healthz`. Make sure the container is running and listening on the interface you expected. |
| No discovery collectors listed | Set `ATLAS_COLLECTOR_TOKEN` in `.env`, restart with `docker compose --profile discovery up -d`, and check `docker compose logs collector`. An explicit `ATLAS_DISCOVERY_SOURCES` file takes precedence over the local collector. |
| Collector exits immediately | `ATLAS_COLLECTOR_TOKEN` must be at least 32 characters. Check the read-only Docker socket mount and `docker compose logs collector`. |
| Scan returns 401 | Enter the separate `ATLAS_API_TOKEN` configured on the editor server. The UI keeps it in memory only. |
| Scan returns 403 from another hostname | Add the exact browser hostname or IP to `ATLAS_ALLOWED_HOSTS`. A non-loopback entry also requires `ATLAS_API_TOKEN` of at least 32 characters. |
| Network scan says Nmap is unavailable | Install Nmap on the Atlas server. For a source Docker build, set `ATLAS_WITH_NMAP=true` and rebuild. The published base image intentionally does not include it. |
| Network target is rejected | Use numeric IPv4 or a canonical CIDR within `ATLAS_NMAP_ALLOWED_CIDRS`. Live scans reject IPv6, hostnames, URLs, option syntax, link-local, multicast, unspecified, and more than 256 expanded addresses. |
| Network scan finds no host | Nmap host discovery can be blocked by a firewall. The scan runs from the server/container network and does not add `-Pn` automatically. Check that vantage and the configured allowed ranges. |
| Scan returns 502 | Check collector reachability, token agreement, TLS certificates, fixed source URL, Docker socket access, and collector logs. Backend response bodies are intentionally hidden. |
| Discovery says to make room | The selected additions would grow a card into another card. Move the lower card, enlarge available space, or add the findings to a new device card. |
| Labels collide or cards are too tall | Shorten labels, use Compact density, adjust 1–4 columns, reorder devices, arrange device cards, or use **Fit page**/**Fit width**. Device cards cannot be resized below their content. |
| PNG export fails or is reduced | Simplify the diagram, try another current browser, or export SVG. PNG is capped at 36 MP and 16,384 px per side. |

## Use another port

With the direct Go server:

```sh
PORT=8081 go run .
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
- a file larger than 2,000,000 bytes
- unknown object keys or invalid field types
- IDs that are duplicated, longer than 64 characters, or contain unsupported characters
- unknown bundled or custom logo IDs
- service counts outside 1–99
- a connection to a missing endpoint or to itself
- a discovery binding whose source/key is duplicated or whose service is not on its stated device
- collection or text limits described in [project format](/project-format)

If the storage or import problem continues, replace any private details with fictional data before opening a [bug report](https://github.com/aiden0rchad/homelab-atlas/issues/new?template=bug_report.yml).

## Discovery snapshot rejection

Snapshots must be at most 2,000,000 bytes and use `homelab-atlas.docker-discovery` version 1. Atlas rejects unknown fields, duplicate or malformed finding keys, invalid dates or counts, more than 1,000 containers, more than 20 ports per finding, oversized text, and source mismatches from a live collector. A rejected scan or import does not change the project.

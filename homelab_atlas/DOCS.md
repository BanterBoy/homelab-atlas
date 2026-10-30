# Homelab Atlas

Build diagrams of your home network and homelab from the Home Assistant sidebar.

## Install

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**.
2. Open the **⋮** menu → **Repositories**, add `https://github.com/BanterBoy/homelab-atlas`, then close the dialog.
3. Find **Homelab Atlas** in the store, select **Install** (the first build takes a few minutes because it compiles the app on your device).
4. Turn on **Show in sidebar**, then select **Start**.
5. Open **Homelab Atlas** from the sidebar.

## Saving your diagram

Your project is saved automatically to the add-on's storage (`/data/project.json`), so it is the same on every browser and device you open it from, and it is included in Home Assistant backups. The last save wins if two people edit at once. Use **File → Save project** for an extra JSON copy.

## Options

| Option | What it does |
| --- | --- |
| `nmap_allowed_cidrs` | Comma-separated private IPv4 ranges Atlas may scan, for example `192.168.1.0/24`. Empty turns network scanning off. |
| `collector_url` | Optional Docker collector, ending in `/inventory`, for example `http://192.168.1.20:8081/inventory`. |
| `collector_token` | The `ATLAS_COLLECTOR_TOKEN` set on that collector (32+ characters). |

Restart the add-on after changing options.

### Network scanning

Scans run from inside the add-on container, so they find devices and open ports but not MAC addresses.

### Docker discovery

The add-on cannot read Home Assistant's own Docker. To discover containers on another server, run the collector there:

```sh
docker run -d --name atlas-collector -p 8081:8081 \
  -e ATLAS_COLLECTOR_TOKEN=change-me-to-a-random-32-plus-character-string \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  ghcr.io/aiden0rchad/homelab-atlas:0.12.0 collect --listen :8081
```

Then set `collector_url` and `collector_token` in the add-on options.

## Security

Access goes through Home Assistant's login. The add-on only accepts requests from the Home Assistant ingress proxy and does not open a port on your network.

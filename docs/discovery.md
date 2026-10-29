# Discovery

Discovery is optional. Atlas needs no account or AI service, and manual diagrams work without a scanner or Docker socket.

Choose **Discover devices** at the bottom of the inventory, then follow three steps:

1. **Choose** Docker apps, Network devices / Nmap, or Import saved scan. Opening discovery only checks readiness.
2. **Find** results with that method. One-step-at-a-time setup help appears when needed.
3. **Review** unchecked findings, choose their destination diagram card, then select **Add selected to diagram**.

<GuideFigure name="discovery-choose" />

Screenshots use fictional devices and test results.

## Requirements by method

| Method | Requirements |
|---|---|
| Manual diagram | Running Atlas and a browser. No scanner or Docker socket. |
| Docker | Optional collector with access to the intended Docker daemon, matching collector token of at least 32 characters, and a server-configured source. Snapshot import needs no live daemon. The collector lists that daemon, not every LAN host. |
| Live Nmap | Nmap and its detection data installed on the Atlas server. Docker deployments use the opt-in source build. The server or container needs IPv4 route and firewall reachability, and targets must be inside configured CIDRs. The fixed TCP-connect scan needs no root, privileged container, or extra capability. |
| Nmap XML | A complete supported XML file selected by the user. Atlas needs no installed scanner. Explicitly open TCP/UDP and IPv4/IPv6 results use the same review. |

## Network scan

Atlas can run a bounded Nmap TCP scan from the server or container where Atlas runs. It starts only when you choose **Find devices**. Start with one numeric IPv4 address from your router's connected-device list, or enter an allowed CIDR. The default **Homelab app ports** preset checks `22,53,80,443,445,1883,2283,3000,5000,5055,5432,6379,6767,7878,8000,8006,8080,8081,8090,8096,8123,8443,8686,8888,8920,8989,9000,9090,9443,9696,11434,32400`; **Common 100 TCP ports** sends a blank port list to Nmap; **Custom ports** accepts up to 1,000 TCP ports. Service identification is on by default but remains imperfect. Live scans support at most 16 target terms, 256 expanded addresses, 120 seconds, and one running scan per server.

The fixed scan uses unprivileged TCP connect mode, no DNS, conservative timing, and no customizable scripts, OS detection, UDP, raw sockets, caller flags, or credentials. Ordinary scans use a 15-second per-host timeout. Optional service identification uses Nmap's fixed lightweight version probes, including its packaged version-detection scripts, and allows 45 seconds per host because those probes take longer. The global scan limit remains 120 seconds. A host that exceeds its per-host timeout can be omitted with its endpoints. **Stop scan**, closing the dialog, changing inputs, or changing the project cancels it. Host discovery remains enabled, so a firewall can hide a host. The scan runs from the Atlas server's network, which may differ from the browser's network.

The default allowed ranges are `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16`. Administrators can set canonical comma-separated IPv4 prefixes with `ATLAS_NMAP_ALLOWED_CIDRS`. Atlas reports the configured ranges to the editor but does not expose server credentials or configuration secrets.

When Nmap is unavailable, Atlas asks whether it runs with Docker Compose or native Go. Native Go users install Nmap and its service-detection data on the server with its operating-system package manager, restart Atlas, then choose **Check setup**. Compose users must use a source checkout or extracted release ZIP: the published GHCR image stays scanner-free and cannot gain Nmap from an environment flag alone. From that source folder, the opt-in Alpine build installs `nmap`, `nmap-nselibs`, and `nmap-scripts`:

```sh
ATLAS_WITH_NMAP=true docker compose up -d --build
```

Put `ATLAS_WITH_NMAP=true` in `.env` to retain the choice on later builds.

Nmap is independently licensed under the [Nmap Public Source License](https://nmap.org/npsl/npsl-annotated.html). The source ZIP contains only Atlas and the local build recipe, not Nmap binaries or data.

Choose **Discover devices → Network devices / Nmap**, then:

1. Enter one device IP or an allowed network range.
2. Open **Advanced settings** only to change the port preset, service identification, or stable network name.
3. Choose **Find devices**, then review the candidates before adding anything.

<GuideFigure name="network-scan" />

The form uses fictional `192.0.2.10`. No real lab was scanned.

### Review network findings

Move between discovered devices, choose a destination, and check only the rows to add or link. Pending choices stay with each device while the scan remains open. **Add selected to diagram** affects only the current device and creates one Undo step.

<GuideFigure name="discovery-review" />

This review uses fabricated TCP Nmap output processed by the real discovery API.

## Import Nmap XML

Import accepts a user-selected file and does not execute a scanner or network probe. It also remains available when Nmap is not installed. Live scans accept IPv4 targets; XML import continues to accept normalized IPv4 and IPv6 results.

In Atlas:

1. Choose **Discover devices**.
2. Choose **Import saved scan**, then **Nmap scan**.
3. Under advanced settings, keep or change the **Import scope name**. Reuse it for later imports or scans from the same network.
4. Select a device and destination card, or keep the suggested new card.
5. Check the host or endpoints you want, then choose **Add selected to diagram**.

Every row starts unchecked. **Select all shown** affects only the filtered visible page and skips items already on the diagram; **Clear selection** clears the current device across pages. A host row adds or links a device card. An endpoint adds or links a service. Ping-only scans still offer the host row. Review choices are retained while moving between devices in the same open scan. Each **Add selected to diagram** affects only the current device and creates one Undo step. MAC identity survives an IP change; without a MAC, an IP change creates a new identity. A scan changing between MAC-present and MAC-absent can also appear new, so review and link it explicitly.

Only explicitly up hosts with a valid IP and explicitly open TCP/UDP ports qualify. Filtered, `open|filtered`, closed, unsupported, down, and summarized `extraports` results count as ports not imported. Even a summarized `open` state lacks individual protocol/port identity, so Atlas does not fabricate endpoints from it. Limits are 2 MB, 256 host records, 1,000 normalized findings, 16 addresses and 16 names per host, and 64 XML nesting levels. Eligible output over a limit is rejected instead of silently truncated.

The full XML or live output is held transiently for parsing. Results are not saved on the server. Normalized review data discards command arguments, NSE/script output, service fingerprints, traces, and unknown XML fields. Retained hostnames, vendor, service, product, and version text can still contain private or credential-like content; inspect it before adding or sharing. Canceling before **Add selected to diagram** changes nothing. Existing names, metadata, connections, and card geometry are never overwritten; card growth that would overlap another card is blocked. Existing SVG/PNG privacy filtering applies after findings are explicitly added.

## Docker discovery

Docker discovery is optional and explicit. A **Configured** badge means Atlas has one or more server entries; it does not prove a collector is reachable. Choose **Docker apps**, select **Which server runs your containers?**, then choose **Find Docker apps**. The button stays disabled until a server is selected. Every finding starts unchecked, and the project changes only after **Add selected to diagram**.

## Local Compose setup

If no server is configured, the in-app guide first asks where Docker runs. For **Same server as Atlas**, choose the matching install type. The guide shows one instruction at a time: generate a token, preserve the existing `.env`, run only the matching Compose command, then **Check setup**. It never runs commands, creates or stores a token, edits configuration, or grants Docker access. The restricted collector needs Docker access; the main Atlas editor does not. **Connect another server** opens the same guide without removing configured server choices.

Generate a collector token:

```sh
openssl rand -hex 32
```

Create `.env` beside `compose.yaml` or `compose.release.yaml`:

```dotenv
ATLAS_COLLECTOR_TOKEN=replace-with-the-generated-value
```

Start the editor and collector profile:

```sh
docker compose --profile discovery up -d
```

For the released Compose file, run `docker compose -f compose.release.yaml --profile discovery up -d`. Open Atlas, choose **Discover devices → Docker apps**, then **Find Docker apps**. **Check setup** reloads configuration only; it does not contact or scan a collector.

<GuideFigure name="docker-setup" />

The editor and collector use the same image but have separate privileges:

- `atlas` runs as uid 10001, has no Docker socket, and remains usable without discovery.
- `collector` has a read-only `/var/run/docker.sock` mount, no published port, an internal-only network, no capabilities, a read-only filesystem, and `no-new-privileges`.
- The collector refuses to start unless `ATLAS_COLLECTOR_TOKEN` is at least 32 characters.

The read-only socket mount does not restrict Docker API operations, so treat the collector as privileged.

Treat the token like a password. Do not commit `.env`; it is ignored by Git.

## Review findings

Atlas suggests a destination only from an authoritative source binding or a unique exact source-name match; otherwise it suggests a new card. It suggests a single existing group or a unique **Discovered services** group, otherwise a new group. These remain visible review choices, never automatic merges.

Each finding can:

- add a new service with a catalog logo and the discovered replica count; or
- link to an existing service on the chosen device without changing its name, logo, count, order, group, or card.

An exact unique service-name match is shown as **Use existing [name]**, but the finding remains unchecked and **Change** exposes other targets. Existing bindings are disabled and show **Already on diagram**. Stopped, unknown, and unidentified states remain visible. Missing services from later scans are not deleted.

Findings are sorted by name and shown 50 at a time. Search checks names, image references, and Compose project/service metadata. Selections and actions persist while searching or changing pages; changing the destination clears them across the full result set. **Select all shown** selects only the filtered visible page and skips existing bindings.

**Add selected to diagram** is one undoable change. Existing card positions and widths stay fixed. If an added service needs card height that would collide with another card, Atlas asks you to make room or use a new card. A new card is placed below existing cards.

<GuideFigure name="docker-review" />

This review uses a fixture collector returning sanitized fictional snapshot JSON.

## Import a snapshot

Docker users can run the published collector once and redirect its sanitized JSON output to a file outside the repository:

```sh
docker run --rm \
  --user 0:0 \
  --read-only \
  --network none \
  --cap-drop ALL \
  --security-opt no-new-privileges=true \
  -e ATLAS_HOST_ID=nas \
  -e 'ATLAS_HOST_NAME=NAS Docker' \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  ghcr.io/aiden0rchad/homelab-atlas:0.12.0 collect \
  > ../nas-docker-snapshot.json
```

The one-off container runs as root only to reach the read-only Docker socket. It has no network, capabilities, or writable container filesystem. If you are developing from source, the equivalent command is:

```sh
ATLAS_HOST_ID=nas ATLAS_HOST_NAME="NAS Docker" go run ./app collect > ../nas-docker-snapshot.json
```

`ATLAS_DOCKER_HOST` defaults to `unix:///var/run/docker.sock`. The **Another server** setup branch presents this one-time snapshot as the simplest no-network-setup route; **Import Docker snapshot** opens the existing import directly. You can also choose **Discover devices → Import saved scan → Docker snapshot**. Snapshot import has the same unchecked review and 2 MB limit as a live scan. Ongoing live collection remains available through [Remote collectors](#remote-collectors).

Snapshots contain only:

- source ID, source name, and scan time
- stable hashed finding keys
- display name, image name, state counts, published/private port numbers without bind IPs
- Compose project/service names and container names

They do not contain container IDs, environment variables, mounts, commands, logs, arbitrary labels, credentials, or backend URLs. Review the file before sharing it; names and image references can still reveal private details.

## Remote collectors

Run the collector near Docker and put it behind HTTPS. The collector itself serves HTTP and should not be exposed directly to the internet:

```sh
ATLAS_COLLECTOR_TOKEN="$COLLECTOR_TOKEN" \
ATLAS_HOST_ID=nas \
ATLAS_HOST_NAME="NAS Docker" \
./atlas collect --listen :8081
```

Create a source file for the main Atlas server:

```json
[
  {
    "id": "nas",
    "name": "NAS Docker",
    "url": "https://collector.example.internal/inventory",
    "tokenEnv": "NAS_COLLECTOR_TOKEN"
  }
]
```

The source ID must match the collector's `ATLAS_HOST_ID`. Configure the main server with `ATLAS_DISCOVERY_SOURCES=/run/atlas/discovery-sources.json`, mount that file read-only, and provide `NAS_COLLECTOR_TOKEN` in its environment. The file accepts at most 16 exact `id`, `name`, `url`, and `tokenEnv` records. Tokens and URLs are never returned to the browser.

An explicit source file takes precedence over the local Compose source. Atlas rejects redirects, URL credentials, query strings, fragments, oversized responses, mismatched source IDs, and unrecognized snapshot fields.

## Portainer and HTTPS Docker APIs

The collector can use a fixed HTTPS Docker API base, including a Portainer endpoint prefix:

```dotenv
ATLAS_DOCKER_HOST=https://portainer.example.internal/api/endpoints/3/docker
ATLAS_DOCKER_API_KEY=replace-with-a-restricted-portainer-key
```

TLS certificates are verified. Plain HTTP Docker backends are accepted only on localhost for testing. The collector calls only `GET /version` and the matching versioned `GET /containers/json?all=1` endpoint. It never proxies browser-supplied URLs and has no Docker write route.

## Hawser Standard mode

Atlas can use a [Hawser](https://github.com/Finsys/hawser) Standard-mode HTTPS agent as the Docker endpoint. Hawser accepts `X-Hawser-Token` and proxies Docker paths; Atlas still calls only `GET /version` and `GET /v…/containers/json?all=1`. Hawser is a broader management agent, so configure and protect it for that wider capability even though Atlas uses only these two inventory reads.

Load the Hawser token into `HAWSER_TOKEN` with your existing secret manager, then run a one-shot collector near Atlas:

```sh
ATLAS_DOCKER_HOST=https://hawser.example.internal \
ATLAS_HAWSER_TOKEN="$HAWSER_TOKEN" \
ATLAS_HOST_ID=nas \
ATLAS_HOST_NAME="NAS Docker" \
./atlas collect > ../nas-docker-snapshot.json
```

This remote-agent path needs no Docker socket mount. TLS certificates are verified; do not disable verification or expose an unauthenticated Docker or Hawser endpoint. `ATLAS_HAWSER_TOKEN` and `ATLAS_DOCKER_API_KEY` are mutually exclusive, and neither credential appears in the snapshot.

Only Hawser Standard mode is compatible. Hawser Edge mode uses an outbound WebSocket protocol that Atlas does not support. The protocol integration is tested with an HTTP/HTTPS fixture at the pinned upstream contract, not a live user agent. Keep literal secrets out of commands and shell history by loading them through your existing environment or secret manager.

## Remote editor access

Discovery API requests validate the request host and origin. The default host allowlist is `localhost,127.0.0.1,::1`. If the browser uses another hostname or IP, set `ATLAS_ALLOWED_HOSTS` to the exact comma-separated hostnames and set `ATLAS_API_TOKEN` to a separate random value of at least 32 characters.

After a `401`, enter the server's `ATLAS_API_TOKEN` in the **Access token** field and choose **Unlock**. A still-current Docker or Nmap scan, or XML import, retries once; changed or canceled work does not restart. Collector and Nmap availability then refresh without clearing a valid review. The token stays in memory only; it is not written to the project or browser storage. It is separate from `ATLAS_COLLECTOR_TOKEN`. Snapshot import remains available without backend authentication. See [Getting started](/getting-started#trusted-lan-access) for an example.

For common availability, token, reachability, and review problems, see the [FAQ](/faq) and [troubleshooting guide](/troubleshooting).

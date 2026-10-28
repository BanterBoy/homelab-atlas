# Discovery

Discovery is optional. Atlas needs no account or AI service, and manual diagrams work without a scanner or Docker socket.

## Requirements by method

| Method | Requirements |
|---|---|
| Manual diagram | Running Atlas and a browser. No scanner or Docker socket. |
| Docker | Optional collector with access to the intended Docker daemon, matching collector token of at least 32 characters, and a server-configured source. Snapshot import needs no live daemon. The collector lists that daemon, not every LAN host. |
| Live Nmap | Nmap and its detection data on the Atlas server, plus the opt-in source build. The server or container needs IPv4 route and firewall reachability, and targets must be inside configured CIDRs. The fixed TCP-connect scan needs no root, privileged container, or extra capability. |
| Nmap XML | A complete supported XML file selected by the user. Atlas needs no installed scanner. Explicitly open TCP/UDP and IPv4/IPv6 results use the same review. |

## Network scan

Atlas can run a bounded Nmap TCP scan from the server or container where Atlas runs. It starts only when you choose **Scan network**. Enter numeric IPv4 addresses or CIDRs within the configured ranges, optionally enter up to 1,000 TCP ports, and optionally enable service identification. Blank ports use Nmap's common 100 TCP ports. Live scans support at most 16 target terms, 256 expanded addresses, 120 seconds, and one running scan per server.

The fixed scan uses unprivileged TCP connect mode, no DNS, conservative timing, and no customizable scripts, OS detection, UDP, raw sockets, caller flags, or credentials. Ordinary scans use a 15-second per-host timeout. Optional service identification uses Nmap's fixed lightweight version probes, including its packaged version-detection scripts, and allows 45 seconds per host because those probes take longer. The global scan limit remains 120 seconds. A host that exceeds its per-host timeout can be omitted with its endpoints. **Stop**, closing the dialog, changing inputs, or changing the project cancels it. Host discovery remains enabled, so a firewall can hide a host. The scan runs from the Atlas server's network, which may differ from the browser's network.

The default allowed ranges are `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16`. Administrators can set canonical comma-separated IPv4 prefixes with `ATLAS_NMAP_ALLOWED_CIDRS`. Atlas reports the configured ranges to the editor but does not expose server credentials or configuration secrets.

Install Nmap and its service-detection data on the server with its operating-system package manager. A native Go setup must restart Atlas after installation because Nmap availability is resolved at startup. The published GHCR image stays scanner-free. From a source checkout, the opt-in Alpine build installs `nmap`, `nmap-nselibs`, and `nmap-scripts`:

```sh
ATLAS_WITH_NMAP=true docker compose up -d --build
```

Put `ATLAS_WITH_NMAP=true` in the existing `.env` to retain the choice on later builds. From an extracted release source ZIP:

```sh
docker compose -f compose.release.yaml -f compose.nmap.yaml up -d --build
```

Nmap is independently licensed under the [Nmap Public Source License](https://nmap.org/npsl/npsl-annotated.html). The source ZIP contains only Atlas and the local build recipe, not Nmap binaries or data.

Use the scan form in this order:

1. Enter a stable network name.
2. Enter allowed IPv4 targets and optional TCP ports.
3. Enable service identification only when its slower probes are useful.
4. Choose **Scan network**, then review the candidates before applying anything.

<GuideFigure name="network-scan" />

These Atlas v0.9.0 screenshots use fictional names and addresses. The example target shown above was filled in but never scanned.

## Import Nmap XML

Import accepts a user-selected file and does not execute a scanner or network probe. It also remains available when Nmap is not installed. Live scans accept IPv4 targets; XML import continues to accept normalized IPv4 and IPv6 results.

In Atlas:

1. Choose **Discover devices**.
2. Enter a **Network name**, such as `Home network`. Reuse the same name for later imports or scans; it separates overlapping private networks.
3. Choose **Import Nmap XML** and select the `.xml` file.
4. Select a scan host and destination card, or choose a new card.
5. Check the host or endpoints you want, then choose **Apply selected**.

Every row starts unchecked. A host row adds a host card or links the host identity to an existing card. An endpoint adds or links a service. Ping-only scans still offer the host row. You can apply one host, keep the review open, and move to another host without re-uploading. Each Apply is one undo step. MAC identity survives an IP change; without a MAC, an IP change creates a new identity. A scan changing between MAC-present and MAC-absent can also appear new, so review and link it explicitly.

<GuideFigure name="discovery-review" />

This review came from imported Nmap XML. Its UDP row is not live-scan output; live scans are TCP-only.

Only explicitly up hosts with a valid IP and explicitly open TCP/UDP ports qualify. Filtered, `open|filtered`, closed, unsupported, down, and summarized `extraports` results count as ports not imported. Even a summarized `open` state lacks individual protocol/port identity, so Atlas does not fabricate endpoints from it. Limits are 2 MB, 256 host records, 1,000 normalized findings, 16 addresses and 16 names per host, and 64 XML nesting levels. Eligible output over a limit is rejected instead of silently truncated.

The full XML or live output is held transiently for parsing. Results are not saved on the server. Normalized review data discards command arguments, NSE/script output, service fingerprints, traces, and unknown XML fields. Retained hostnames, vendor, service, product, and version text can still contain private or credential-like content; inspect it before applying or sharing. Canceling before Apply changes nothing. Existing names, metadata, connections, and card geometry are never overwritten; card growth that would overlap another card is blocked. Existing SVG/PNG privacy filtering applies after findings are explicitly added.

## Docker discovery

Docker discovery is optional and explicit. Opening the dialog does not scan. Every finding starts unchecked, and the project changes only after you choose **Apply selected**.

## Local Compose setup

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

For the released Compose file, include `-f compose.release.yaml` in that command. Open Atlas, choose **Discover devices**, select **Docker**, then choose **Scan**.

The editor and collector use the same image but have separate privileges:

- `atlas` runs as uid 10001, has no Docker socket, and remains usable without discovery.
- `collector` has a read-only `/var/run/docker.sock` mount, no published port, an internal-only network, no capabilities, a read-only filesystem, and `no-new-privileges`.
- The collector refuses to start unless `ATLAS_COLLECTOR_TOKEN` is at least 32 characters.

The read-only socket mount does not restrict Docker API operations, so treat the collector as privileged.

Treat the token like a password. Do not commit `.env`; it is ignored by Git.

## Review findings

Choose an existing destination device or a new Docker device. For additions, choose an existing service group or a new **Discovered services** group.

Each finding can:

- add a new service with a catalog logo and the discovered replica count; or
- link to an existing service on the chosen device without changing its name, logo, count, order, group, or card.

An exact unique service-name match is suggested as a link, but the finding remains unchecked. Existing bindings are disabled and show their current target. Stopped containers are marked in the review. Missing services from later scans are not deleted.

Findings are sorted by name and shown 50 at a time. Search checks names, image references, and Compose project/service metadata. Selections and actions persist while searching or changing pages; changing the destination clears them across the full result set.

Applying a review is one undoable change. Existing card positions and widths stay fixed. If an added service needs card height that would collide with another card, Atlas asks you to make room or use a new card. A new card is placed below existing cards.

<GuideFigure name="docker-review" />

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
  ghcr.io/aiden0rchad/homelab-atlas:0.9.0 collect \
  > ../nas-docker-snapshot.json
```

The one-off container runs as root only to reach the read-only Docker socket. It has no network, capabilities, or writable container filesystem. If you are developing from source, the equivalent command is:

```sh
ATLAS_HOST_ID=nas ATLAS_HOST_NAME="NAS Docker" go run . collect > ../nas-docker-snapshot.json
```

`ATLAS_DOCKER_HOST` defaults to `unix:///var/run/docker.sock`. Then use **Import snapshot** in the discovery dialog. Snapshot import has the same review and 2 MB limit as a live scan.

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

After a `401`, enter the API token in the masked field and choose **Unlock**. A still-current Nmap scan or XML import retries once; changed or canceled work does not restart. Collector and Nmap availability then refresh without clearing a valid review. The token stays in memory only; it is not written to the project or browser storage. Snapshot import remains available without backend authentication. See [Getting started](/getting-started#trusted-lan-access) for an example.

For common availability, token, reachability, and review problems, see the [FAQ](/faq) and [troubleshooting guide](/troubleshooting).

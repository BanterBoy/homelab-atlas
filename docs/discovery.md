# Discovery

## Import Nmap XML

Atlas imports a file you generated; it never runs Nmap, probes the network, fetches a URL, or updates the diagram automatically. Nmap recommends XML for programmatic use. A minimal documentation example using an RFC 5737 address is:

```sh
nmap -oX atlas-scan.xml 192.0.2.10
```

In Atlas:

1. Choose **Discover devices**.
2. Enter a **Network name**, such as `Home network`. Reuse the same name for later scans; it separates overlapping private networks.
3. Choose **Import Nmap XML** and select the `.xml` file.
4. Select a scan host and destination card, or choose a new card.
5. Check the host or endpoints you want, then choose **Apply selected**.

Every row starts unchecked. A host row adds a host card or links the host identity to an existing card. An endpoint adds or links a service. Ping-only scans still offer the host row. You can apply one host, keep the review open, and move to another host without re-uploading. Each Apply is one undo step. MAC identity survives an IP change; without a MAC, an IP change creates a new identity. A scan changing between MAC-present and MAC-absent can also appear new, so review and link it explicitly.

Only explicitly up hosts with a valid IP and explicitly open TCP/UDP ports qualify. Filtered, `open|filtered`, closed, unsupported, down, and summarized `extraports` results count as ports not imported. Even a summarized `open` state lacks individual protocol/port identity, so Atlas does not fabricate endpoints from it. Limits are 2 MB, 256 host records, 1,000 normalized findings, 16 addresses and 16 names per host, and 64 XML nesting levels. Eligible output over a limit is rejected instead of silently truncated.

The full XML is sent only to the Atlas backend serving the current editor and held transiently for parsing. Normalized review data discards command arguments, NSE/script output, service fingerprints, traces, and unknown XML fields. Retained hostnames, vendor, service, product, and version text can still contain private or credential-like content; inspect it before applying or sharing. Canceling before Apply changes nothing. Existing names, metadata, connections, and card geometry are never overwritten; card growth that would overlap another card is blocked.

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
  ghcr.io/aiden0rchad/homelab-atlas:0.8.0 collect \
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

After a `401`, enter the API token in the masked field and choose **Unlock**. Unlock reloads the collector list but never starts a scan. The token stays in memory only; it is not written to the project or browser storage. Snapshot import remains available without backend authentication. See [Getting started](/getting-started#trusted-lan-access) for an example.

# Privacy and deployment

Atlas runs on your own machine, but you still need to think about where you expose it and what you type into it.

## Where your data goes {#data-flow}

The editor has:

- no accounts or editor login
- no backend project store or database
- no telemetry, analytics, external fonts, or AI calls
- no automatic scans or background polling
- a local bundled logo catalog

The Go editor process serves embedded app files and, when configured, proxies fixed discovery-source requests. Your project stays in the browser's `localStorage`. Atlas creates JSON or image files only when you choose to download them. Collector and API tokens stay in server environment variables; an API token entered in the UI is held in memory only.

The normal editor container has no Docker socket. Optional Docker discovery runs as a separate collector with a read-only socket mount and no published port. It calls only Docker's version and container-list endpoints after you choose **Scan**. The returned snapshot excludes container IDs, environment variables, mounts, commands, logs, arbitrary labels, credentials, and backend URLs. See [Docker discovery](/discovery).

Nmap import accepts only a user-selected XML file. Atlas runs no scanner, network probe, URL fetch, or disk read. The full file reaches only your Atlas backend transiently; normalized review discards NSE/script output, raw command arguments, service fingerprints, traces, and unknown fields. Retained hostname, vendor, service, product, and version strings can still be private or contain credential-like text. Applied names and IP address facts remain in project JSON. The existing SVG/PNG privacy filter can hide network literals from image exports.

## Documentation is separate

This GitHub Pages site only hosts the documentation. It does not run the editor and cannot read or edit the project in your browser. GitHub handles its own hosting and access logs under its policies.

## Where to run it {#deployment-boundary}

Run the app on localhost or a LAN you trust. Atlas has no login screen, user roles, or built-in TLS. Its optional bearer token protects only discovery API calls; it is not an account system or general editor access control. Do not put Atlas directly on the public internet, and never mount the Docker socket into the editor service.

If you bind Compose to `0.0.0.0`, anyone who can reach port 8080 can open the editor. Each browser still has its own project storage, but the app itself has no authentication. Keep the default localhost binding unless you need access from a trusted LAN.

## Before you share {#content-and-sharing}

Atlas only sees what you type or import. The SVG and PNG Export dialog hides IP addresses, MAC addresses, URLs, and emails by default. You can list custom hostnames, domains, or other names as literal terms. The preview shows the filtered result before download.

That filter does not make a diagram anonymous. It does not guess which arbitrary names are private, inspect text baked into uploaded logos, filter screenshots, or change saved JSON. Before sharing any file, still check for:

- addresses, hostnames, and private domains
- device roles or hardware details
- VLAN and relationship labels
- service names that reveal sensitive capabilities
- Docker image, project, service, and container names in discovery snapshots

The documentation screenshots use a fictional sample. See [sharing and backup](/sharing) for details about each file format.

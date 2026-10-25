# Privacy and deployment

Homelab Atlas is local-first by design, but safe use still depends on where you run it and what you enter.

## Data flow

The editor has:

- no accounts or authentication
- no backend project store or database
- no telemetry, analytics, external fonts, or AI calls
- no network scanner, credentials, or Docker socket access
- a local bundled logo catalog

The Python process serves static files. Project state stays in the browser's `localStorage`; JSON and image files are created only when you request a download.

## Documentation is separate

The GitHub Pages site contains documentation only. It does not host the editor and cannot load or edit your browser project. GitHub's hosting and access logs are governed by GitHub's own policies.

## Deployment boundary

The app server is intended for loopback or a trusted LAN. It has no login screen, user roles, TLS termination, or authorization layer. Do not publish it directly to the internet. Never mount the Docker socket into it.

If you deliberately bind Compose to `0.0.0.0`, every client that can reach port 8080 can load the editor. Project data is still per-browser, but the unauthenticated application is exposed. Prefer loopback unless trusted-LAN access is necessary.

## Content and sharing

Homelab Atlas sees only the content you type or import. It does not discover omitted data and does not redact entered data. Before sharing JSON, SVG, PNG, or screenshots, inspect them for:

- addresses, hostnames, and private domains
- device roles or hardware details
- VLAN and relationship labels
- service names that reveal sensitive capabilities

Documentation screenshots use a generic fictional sample. Follow [sharing and backup](/sharing) for format-specific guidance.

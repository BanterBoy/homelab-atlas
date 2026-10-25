# Privacy and deployment

Atlas runs on your own machine, but you still need to think about where you expose it and what you type into it.

## Where your data goes {#data-flow}

The editor has:

- no accounts or authentication
- no backend project store or database
- no telemetry, analytics, external fonts, or AI calls
- no network scanner, credentials, or Docker socket access
- a local bundled logo catalog

The Python process only serves the app files. Your project stays in the browser's `localStorage`. Atlas creates JSON or image files only when you choose to download them.

## Documentation is separate

This GitHub Pages site only hosts the documentation. It does not run the editor and cannot read or edit the project in your browser. GitHub handles its own hosting and access logs under its policies.

## Where to run it {#deployment-boundary}

Run the app on localhost or a LAN you trust. Atlas has no login screen, user roles, built-in TLS, or authorization layer. Do not put it directly on the public internet, and never mount the Docker socket into it.

If you bind Compose to `0.0.0.0`, anyone who can reach port 8080 can open the editor. Each browser still has its own project storage, but the app itself has no authentication. Keep the default localhost binding unless you need access from a trusted LAN.

## Before you share {#content-and-sharing}

Atlas only sees what you type or import. It does not scan for missing details, and it does not redact anything you entered. Before sharing JSON, SVG, PNG, or screenshots, check for:

- addresses, hostnames, and private domains
- device roles or hardware details
- VLAN and relationship labels
- service names that reveal sensitive capabilities

The documentation screenshots use a fictional sample. See [sharing and backup](/sharing) for details about each file format.

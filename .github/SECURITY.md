# Security policy

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/aiden0rchad/homelab-atlas/security/advisories/new). Do not open a public issue for a suspected vulnerability.

Describe the affected version or commit, reproduction steps, impact, and any suggested mitigation. Never include credentials, secrets, private addresses, or a personal homelab export; create a minimal fictional project if a file is necessary.

## Security scope

Homelab Atlas is a trusted-local web app served by one Go binary. It has no accounts or backend project store and is not designed for public exposure. Reports about import validation, browser storage boundaries, exports, static serving, discovery API authorization, collector isolation, Docker metadata sanitization, or container isolation are in scope. The GitHub Pages site hosts documentation only, not the editor.

The normal editor container runs as uid 10001 and never mounts the Docker socket. Docker discovery is an optional, separate collector profile with a read-only socket mount, an internal-only network, a required token, no published port, dropped capabilities, and no write/control proxy. Keep both services on localhost or a trusted LAN. Use HTTPS for collectors reached across a network.

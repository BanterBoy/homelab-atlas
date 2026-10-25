# Security policy

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/aiden0rchad/homelab-atlas/security/advisories/new). Do not open a public issue for a suspected vulnerability.

Describe the affected version or commit, reproduction steps, impact, and any suggested mitigation. Never include credentials, secrets, private addresses, or a personal homelab export; create a minimal fictional project if a file is necessary.

## Security scope

Homelab Atlas is a trusted-local static web app served by a small Python server. It has no accounts or backend project store and is not designed for unauthenticated public exposure. Reports about import validation, browser storage boundaries, exports, static serving, or container isolation are in scope. The GitHub Pages site hosts documentation only, not the editor.

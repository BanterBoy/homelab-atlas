# Networking

Homelab Atlas models a diagram's logical structure. It does not inspect or configure a real network.

## Network nodes

Use **Add network node** or choose a Router, Switch, Wi-Fi, or Internet template from **Add device**. A network node has a name, kind, and accent color. Its kind selects a suitable bundled icon when possible.

## VLAN chips and device labels

Open **Settings** to add, rename, recolor, or remove VLAN chips. They form a visual reference row in the diagram.

Each device also has a free-text **Network / VLAN** field. Use matching names when you want its card to describe membership. The editor does not enforce a foreign-key relationship between the label and a VLAN chip, so reserved VLANs, management networks, or special-purpose segments can be represented directly in text.

## Logical connections

Choose **Edit connections**, then set:

- **From** endpoint
- **To** endpoint
- optional **Label** such as `LAN`, `IoT`, or `Tailscale`

Endpoints can be network nodes or devices. Connections express logical relationships, not exact switch ports, cable paths, routing tables, or link state. Some relationships cannot be drawn cleanly through the automatic layout; the exported diagram includes a relationship list as a fallback so they are not lost.

## Deliberate boundaries

Homelab Atlas does not:

- discover hosts or services
- request device credentials
- access the Docker socket
- monitor reachability, traffic, or health
- configure VLANs, routers, switches, or firewalls

Use it to document what you intentionally enter. Review [privacy guidance](/privacy) before sharing topology labels.

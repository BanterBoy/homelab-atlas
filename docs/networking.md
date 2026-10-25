# Networking

Networking in Atlas is for showing how things relate to each other. Atlas does not inspect or configure your real network.

## Network nodes

Use **Add network node**, or pick Router, Switch, Wi-Fi, or Internet from **Add device**. Each network node has a name, kind, and accent color. Atlas uses the kind to choose an included icon when it can.

## VLAN chips and device labels

Open **Settings** to add, rename, recolor, or remove VLAN chips. Atlas shows them as a reference row in the diagram.

Each device also has a free-text **Network / VLAN** field. Use the same name as a chip when you want the card to show that membership. Atlas does not link this field to the VLAN chip behind the scenes. You can type reserved VLANs, management networks, or other special segments directly into the field.

## Logical connections

Choose **Edit connections**, then set:

- **From** endpoint
- **To** endpoint
- optional **Label** such as `LAN`, `IoT`, or `Tailscale`

An endpoint can be a network node or a device. Connections show relationships, not exact switch ports, cable paths, routing tables, or live link state. If the automatic layout cannot draw a relationship clearly, Atlas also lists it in the diagram so it is not lost.

## What Atlas doesn't do {#deliberate-boundaries}

Homelab Atlas does not:

- discover hosts or services
- request device credentials
- access the Docker socket
- monitor reachability, traffic, or health
- configure VLANs, routers, switches, or firewalls

Atlas only shows what you enter yourself. Read the [privacy guidance](/privacy) before sharing network names or other topology details.

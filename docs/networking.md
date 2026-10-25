# Networking

Networking in Atlas is for showing how things relate to each other. Atlas does not inspect or configure your real network.

## Network nodes

Use **Add network node**, or pick Router, Switch, Wi-Fi, or Internet from **Add device**. Each network node has a name, kind, accent color, and optional logo choices. The primary logo defaults to **Auto**, which follows the kind. You can choose any bundled local mark instead, independent of the node name or kind.

An optional **Secondary logo** can represent a backup provider in the same node. Atlas stacks the two marks in the network card and keeps both in SVG and PNG exports. Choose **None** to remove the secondary mark. These choices label the diagram only; Atlas does not contact or inspect either provider.

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

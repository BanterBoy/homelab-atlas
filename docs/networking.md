# Networking

Discovery scans are inventory input, not diagram connections. A live Nmap scan runs from the Atlas server's network only after **Scan network**, then waits in the unchecked review. It does not infer links, VLANs, or topology, and it does not change a network card until you explicitly apply a host or endpoint.

Networking in Atlas is for showing how things relate to each other. Atlas does not inspect or configure your real network.

## Network nodes

Use **Add network node**, or pick Router, Switch, Wi-Fi, or Internet from **Add device**. Each network node has a name, kind, accent color, and optional logo choices. The primary logo defaults to **Auto**, which follows the kind. You can choose a bundled mark or a project upload instead, independent of the node name or kind.

An optional **Secondary logo** can represent a backup provider in the same node. Atlas stacks the two marks in the network card and keeps bundled and uploaded images in SVG and PNG exports. Choose **None** to remove the secondary mark. These choices label the diagram only; Atlas does not contact or inspect either provider.

The provider picker includes these locally bundled marks:

| Region | Major providers included |
|---|---|
| US | AT&T, Verizon, T-Mobile, Xfinity, Frontier, Google Fiber, Spectrum, Cox, Starlink |
| Europe | KPN, Orange, Deutsche Telekom, Vodafone, Free, BT, Movistar, O2, Sky, Sunrise, Telenor, Ziggo, Bouygues Telecom, TIM, Swisscom, Virgin Media, 1&1, Telia |

Search by provider name, `ISP`, `US`, `Europe`, country, or a known brand alias such as Comcast or Telefónica. The marks are bundled with Atlas and remain available offline.

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

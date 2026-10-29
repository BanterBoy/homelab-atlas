# Networking

Discovery scans are inventory input, not diagram connections. A live Nmap scan runs from the Atlas server's network only after **Find devices**, then waits in the unchecked review. It does not infer links, VLANs, or topology, and it does not change a network card until you explicitly apply a host or endpoint.

Networking in Atlas is for showing how things relate to each other. Connections and VLANs are drawn manually; discovery only supplies inventory.

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

Choose **Diagram settings** in the canvas header to add, rename, recolor, or remove VLAN chips. Atlas shows them as a reference row in the diagram.

Each device also has a free-text **Network / VLAN** field. Use the same name as a chip when you want the card to show that membership. Atlas does not link this field to the VLAN chip behind the scenes. You can type reserved VLANs, management networks, or other special segments directly into the field.

## Logical connections

Choose **Edit connections**, then set:

- **From** endpoint
- **To** endpoint
- optional **Label** such as `LAN`, `IoT`, or `Tailscale`

An endpoint can be a network node or a device. Connections show relationships, not exact switch ports, cable paths, routing tables, or live link state. If the automatic layout cannot draw a relationship clearly, Atlas also lists it in the diagram so it is not lost.

## What Atlas doesn't do {#deliberate-boundaries}

Homelab Atlas does not:

- scan automatically or in the background
- request device credentials
- monitor reachability, traffic, or health
- configure VLANs, routers, switches, or firewalls

Explicit Nmap scans, Docker collection, and imports enter the review; only findings you apply appear in the diagram. The editor has no Docker socket. The optional collector accesses only its configured Docker API. See [Discovery](/discovery) and read the [privacy guidance](/privacy) before sharing topology details.

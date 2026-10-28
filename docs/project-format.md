# Project format

**Save project** downloads schema-version-5 JSON. Atlas 0.6 and newer can open it. Schema versions 1 through 4 still import after strict validation. Version 1 gains automatic layout, versions 1 and 2 gain empty network-logo fields, and versions 1 through 3 gain an empty `customLogos` array. Every older version gains empty discovery bindings without changing inventory, uploaded logos, manual rectangles, or revision. Older Atlas versions cannot open schema version 5.

## Top-level fields

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | integer | Must be `5` |
| `revision` | integer | Browser conflict/change revision, from 0 through 1,000,000,000 |
| `title`, `subtitle` | string | Diagram heading text, at most 120 characters each |
| `theme` | string | `navy`, `light`, or `midnight` |
| `columns` | integer | Device layout columns, 1–4 |
| `density` | string | `comfortable` or `compact` |
| `layout` | object | Device-card layout mode and saved rectangles |
| `customLogos` | array | Uploaded PNG assets stored with the project |
| `discovery` | object | Stable Docker finding-to-service bindings only |
| `networks` | array | Network node records |
| `vlans` | array | VLAN chip records |
| `devices` | array | Device cards, hardware facts, groups, and services |
| `connections` | array | Directed logical relationships between network/device endpoints |

## Record fields

| Record | Exact fields |
|---|---|
| Network | `id`, `name`, `kind`, `accent`, `icon`, `secondaryIcon` |
| VLAN | `id`, `name`, `color` |
| Device | `id`, `name`, `role`, `icon`, `accent`, `network`, `hardware`, `groups` |
| Group | `id`, `name`, `services` |
| Service | `id`, `logo`, `name`, `count` |
| Connection | `id`, `from`, `to`, `label` |
| Layout | `mode`, `cards` |
| Layout card | `id`, `x`, `y`, `w`, `h` |
| Custom logo | `id`, `label`, `dataUrl`, `background` |
| Discovery | `bindings` |
| Discovery binding | `sourceId`, `key`, `deviceId`, `serviceId` |

Colors use six-digit hexadecimal values such as `#55d6c9`. A device `icon`, service `logo`, or nonempty network logo field must exist in the bundled catalog or `customLogos`. An empty network `icon` selects the automatic kind-based mark; an empty `secondaryIcon` means no secondary mark. A service `count` must be an integer from 1 through 99.

Custom logo IDs start with `custom-` and use the same safe ASCII ID characters, with a total limit of 64 characters. Labels are trimmed, nonempty text up to 120 characters. `background` is `none`, `light`, or `dark`. `dataUrl` is a canonical `data:image/png;base64,...` value. Raw SVG, remote URLs, blob URLs, extra fields, duplicates, and IDs colliding with catalog or project records are rejected.

`discovery.bindings` maps one stable finding identity to one existing service. `sourceId` is a safe ID of at most 64 characters. `key` is `compose:` or `container:` followed by a 64-character lowercase SHA-256 digest. Each `(sourceId, key)` pair is unique. `serviceId` must belong to `deviceId`. Raw inventories, scan times, image names, ports, collector URLs, and tokens are never saved in a project.

## IDs and references

Every network, VLAN, device, group, service, and connection needs a unique ID across the whole project. IDs must match:

```text
^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$
```

Connection `from` and `to` values must point to two different existing network or device IDs. VLAN, group, and service IDs cannot be used as connection endpoints.

## Device layout

`layout.mode` is `auto` or `manual`. Automatic layout requires an empty `cards` array. Each manual card ID references one existing device, with no duplicates. A device may be omitted; Atlas places it below the saved cards until its position is saved.

Coordinates are integer diagram units relative to the upper-left of the device region, not browser pixels. `x` and `y` range from 0 through 100,000. Width ranges from 240 through 100,000 and height from 100 through 100,000. Atlas clamps cards to the poster width and treats the rendered content height as the effective minimum.

## Limits

| Item | Limit |
|---|---:|
| UTF-8 import file | 2,000,000 bytes |
| Any text field | 120 characters |
| Devices | 80 |
| Network nodes | 30 |
| VLAN chips | 30 |
| Connections | 160 |
| Service groups, total | 160 |
| Services, total | 800 |
| Hardware facts per device | 12 |
| Manual card rectangles | No more than the device count |
| Custom logos | 32 |
| Original upload | 2,000,000 bytes; 4096px per side; 16,000,000 pixels |
| Stored custom PNG | 512px per side; 200,000 data-URL characters |
| Custom data URLs, total | 1,200,000 characters |
| Discovery bindings | 1,600 |

The group limit applies to each device array and to the whole project. Each object only accepts the keys listed above. Extra fields are rejected rather than preserved.

## Minimal valid project

```json
{
  "schemaVersion": 5,
  "revision": 1,
  "title": "Small Lab",
  "subtitle": "Fictional example",
  "theme": "navy",
  "columns": 1,
  "density": "comfortable",
  "layout": {
    "mode": "auto",
    "cards": []
  },
  "customLogos": [],
  "discovery": {
    "bindings": []
  },
  "networks": [],
  "vlans": [],
  "devices": [],
  "connections": []
}
```

For a full example with every record type, see [`docs/example.json` on GitHub](https://github.com/aiden0rchad/homelab-atlas/blob/main/docs/example.json). Atlas does not have a separate schema file or a project API endpoint.

# Project format

**Save project** downloads schema-version-3 JSON. Atlas 0.4 and newer can open it. Schema-version-1 and schema-version-2 files still import: v1 gains automatic layout, while v2 keeps its automatic or manual layout. Both gain the default network-logo fields without changing their inventory or revision. When you import a file, Atlas rejects unknown keys, wrong value types, unsafe IDs, unknown logos, broken references, and invalid card geometry before it replaces the project you have open.

## Top-level fields

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | integer | Must be `3` |
| `revision` | integer | Browser conflict/change revision, from 0 through 1,000,000,000 |
| `title`, `subtitle` | string | Diagram heading text, at most 120 characters each |
| `theme` | string | `navy`, `light`, or `midnight` |
| `columns` | integer | Device layout columns, 1–4 |
| `density` | string | `comfortable` or `compact` |
| `layout` | object | Device-card layout mode and saved rectangles |
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

Colors use six-digit hexadecimal values such as `#55d6c9`. A device `icon`, service `logo`, or nonempty network logo field must exist in the included catalog. An empty network `icon` selects the automatic kind-based mark; an empty `secondaryIcon` means no secondary mark. A service `count` must be an integer from 1 through 99.

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
| UTF-8 import file | 1,000,000 bytes |
| Any text field | 120 characters |
| Devices | 80 |
| Network nodes | 30 |
| VLAN chips | 30 |
| Connections | 160 |
| Service groups, total | 160 |
| Services, total | 800 |
| Hardware facts per device | 12 |
| Manual card rectangles | No more than the device count |

The group limit applies to each device array and to the whole project. Each object only accepts the keys listed above. Extra fields are rejected rather than preserved.

## Minimal valid project

```json
{
  "schemaVersion": 3,
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
  "networks": [],
  "vlans": [],
  "devices": [],
  "connections": []
}
```

For a full example with every record type, see [`docs/example.json` on GitHub](https://github.com/aiden0rchad/homelab-atlas/blob/main/docs/example.json). Atlas does not have a separate schema file or a project API endpoint.

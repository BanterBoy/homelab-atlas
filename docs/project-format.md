# Project format

**Save project** downloads schema-version-1 JSON. When you import a file, Atlas rejects unknown keys, wrong value types, unsafe IDs, unknown logos, and broken references before it replaces the project you have open.

## Top-level fields

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | integer | Must be `1` |
| `revision` | integer | Browser conflict/change revision, from 0 through 1,000,000,000 |
| `title`, `subtitle` | string | Diagram heading text, at most 120 characters each |
| `theme` | string | `navy`, `light`, or `midnight` |
| `columns` | integer | Device layout columns, 1–4 |
| `density` | string | `comfortable` or `compact` |
| `networks` | array | Network node records |
| `vlans` | array | VLAN chip records |
| `devices` | array | Device cards, hardware facts, groups, and services |
| `connections` | array | Directed logical relationships between network/device endpoints |

## Record fields

| Record | Exact fields |
|---|---|
| Network | `id`, `name`, `kind`, `accent` |
| VLAN | `id`, `name`, `color` |
| Device | `id`, `name`, `role`, `icon`, `accent`, `network`, `hardware`, `groups` |
| Group | `id`, `name`, `services` |
| Service | `id`, `logo`, `name`, `count` |
| Connection | `id`, `from`, `to`, `label` |

Colors use six-digit hexadecimal values such as `#55d6c9`. A device `icon` or service `logo` must exist in the included catalog. A service `count` must be an integer from 1 through 99.

## IDs and references

Every network, VLAN, device, group, service, and connection needs a unique ID across the whole project. IDs must match:

```text
^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$
```

Connection `from` and `to` values must point to two different existing network or device IDs. VLAN, group, and service IDs cannot be used as connection endpoints.

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

The group limit applies to each device array and to the whole project. Each object only accepts the keys listed above. Extra fields are rejected rather than preserved.

## Minimal valid project

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "title": "Small Lab",
  "subtitle": "Fictional example",
  "theme": "navy",
  "columns": 1,
  "density": "comfortable",
  "networks": [],
  "vlans": [],
  "devices": [],
  "connections": []
}
```

For a full example with every record type, see [`docs/example.json` on GitHub](https://github.com/aiden0rchad/homelab-atlas/blob/main/docs/example.json). Atlas does not have a separate schema file or a project API endpoint.

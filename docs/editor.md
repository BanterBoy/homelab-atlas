# Editor guide

The editor turns structured inventory into an automatic diagram. It is designed for consistent documentation, not freeform drawing.

## Start from a sample or empty project

**Load example** replaces the current project with the built-in fictional sample. **Start empty** creates a blank inventory. Both actions ask for confirmation and can be undone during the current session.

## Add and organize devices

Choose **Add device** in the inventory rail, then select a template such as Server, NAS, Hypervisor, Media server, AI server, Raspberry Pi, or Cloud server. Router, Switch, Wi-Fi, and Internet templates create network nodes.

Select a device to edit:

- name, role, and accent color
- a free-text **Network / VLAN** label
- a bundled device icon
- hardware facts, one per line
- named service groups and their services

Use the duplicate button in the device inspector to copy a device with fresh internal IDs. Arrow buttons in the inventory and service rows reorder items. Deleting a device or network node also removes its connections.

## Add service tiles

Create a service group, then choose **Apps**. Search the local logo catalog and select multiple services. Selections remain while you issue different search queries, so you can assemble a group in one pass.

Each service has an editable name and an instance count from 1 through 99. **Add custom service** creates a named tile with the generic bundled icon; it does not upload or accept custom SVG files.

## Appearance

Open **Settings**, or scroll to appearance controls in an inspector, to change:

- project subtitle
- Navy, Light, or Midnight diagram theme
- 1–4 columns
- Comfortable or Compact density
- VLAN chip names and colors

The title field is in the top bar. These appearance settings affect the generated diagram, independent of the documentation site's light/dark switch.

## Preview and layout

Use **Fit page**, **Fit width**, zoom in, or zoom out. Device and network elements in the preview are selectable with a pointer or keyboard.

Layout is automatic. Inventory order, column count, content length, and density influence placement; there is no drag-to-position mode. For long labels or crowded cards, shorten text, change density, reorder devices, or adjust the column count.

## Undo and redo

Use the top-bar buttons or:

- Undo: `Ctrl+Z` on Windows/Linux, `Command+Z` on macOS
- Redo: `Ctrl+Shift+Z` on Windows/Linux, `Command+Shift+Z` on macOS

Shortcuts do not fire while typing in a field. Undo history exists only in the current page session; reloading clears it. See [sharing and backup](/sharing) before importing or updating.

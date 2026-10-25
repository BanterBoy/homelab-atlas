# Editor guide

You enter your devices and services, and Atlas lays out the diagram for you. It is not a freeform drawing tool.

## Start from a sample or empty project

**Load example** replaces the current project with the included fictional sample. **Start empty** gives you a blank project. Atlas asks before doing either one, and you can undo it until you reload the page.

## Add and organize devices

Choose **Add device** in the inventory on the left, then pick a template such as Server, NAS, Hypervisor, Media server, AI server, Raspberry Pi, or Cloud server. The Router, Switch, Wi-Fi, and Internet templates add network nodes instead of device cards.

Select a device to edit:

- name, role, and accent color
- a free-text **Network / VLAN** label
- a bundled device icon
- hardware facts, one per line
- named service groups and their services

The duplicate button copies a device and gives the copy new internal IDs. Use the arrow buttons to reorder devices or services. Deleting a device or network node also deletes its connections.

## Add service tiles

Create a service group, then choose **Apps**. You can search the built-in logo catalog and select more than one service. Your selections stay checked when you run another search, so you can build a group without reopening the picker.

You can change a service name and set its instance count from 1 through 99. **Add custom service** adds a named tile with the included generic icon. It does not upload or accept custom SVG files.

## Appearance

Open **Settings**, or scroll to appearance controls in an inspector, to change:

- project subtitle
- Navy, Light, or Midnight diagram theme
- 1–4 columns
- Comfortable or Compact density
- VLAN chip names and colors

The project title is in the top bar. These settings change your diagram. They are separate from the light/dark switch on this documentation site.

## Preview and layout

Use **Fit page**, **Fit width**, zoom in, or zoom out to adjust the preview. You can select devices and network nodes in the preview with a pointer or keyboard.

The layout is automatic, so you cannot drag cards into place. Their positions depend on inventory order, column count, content length, and density. If a card is crowded, shorten its text, switch density, reorder devices, or try a different column count.

## Undo and redo

Use the top-bar buttons or:

- Undo: `Ctrl+Z` on Windows/Linux, `Command+Z` on macOS
- Redo: `Ctrl+Shift+Z` on Windows/Linux, `Command+Shift+Z` on macOS

These shortcuts do not run while you are typing in a field. Undo history only lasts for the current page session, and reloading clears it. Read [sharing and backup](/sharing) before importing a project or updating Atlas.

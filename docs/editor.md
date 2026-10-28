# Editor guide

You enter your devices and services, and Atlas starts with an automatic layout. You can arrange device cards yourself when you need a specific composition.

## Start from a sample or empty project

**Load example** replaces the current project with the included fictional sample. **Start empty** gives you a blank project. Atlas asks before doing either one, and you can undo it until you reload the page.

## Add and organize devices

Choose **Add device** in the inventory on the left, then pick a template such as Server, NAS, Hypervisor, Media server, AI server, Raspberry Pi, or Cloud server. The Router, Switch, Wi-Fi, and Internet templates add network nodes instead of device cards.

Use **Search inventory** to filter devices by name or role and network nodes by name or kind. It only changes the visible list. Your selection and project stay intact. On a narrow screen, open or close the inventory with the **Inventory** button below the canvas.

Select a network node to edit its name, kind, accent, and logos. **Logo** starts on Auto, which follows the node kind. **Secondary logo** can show an optional backup provider in the same node. Both selectors include the bundled catalog and uploaded project logos. Choosing Auto or None clears the corresponding explicit choice.

Select a device to edit:

- name, role, and accent color
- a free-text **Network / VLAN** label
- a visual device icon picker
- hardware facts, one per line, optionally written as `Label: value`
- named service groups and their services

The duplicate button copies a device and gives the copy new internal IDs without copying discovery bindings. Use the arrow buttons to reorder devices or services. Deleting a device or network node also deletes its connections. Deleting a device, group, or service removes discovery bindings that point to it.

## Discover devices

Choose **Discover devices** to review an optional Docker collector, import a sanitized Docker snapshot or Nmap XML, or run a bounded Nmap TCP scan. Opening the dialog never scans. Docker and live Nmap discovery each require their explicit scan button; XML import alone runs no scanner or network probe.

For Nmap, enter a stable **Network name**, then import XML or enter allowed IPv4 targets and choose **Scan network**. Optional custom TCP ports and service identification apply only to a live scan. Select a host in multi-host results. The scope, host addresses, names, vendor, scan time, and ports not imported appear in the review. Reuse the same network name for later scans.

Choose a destination device and service group. Every finding starts unchecked. Docker and Nmap endpoint rows can add a service or link to one already on the destination device. Nmap host rows add a host card or link the host identity to an existing card. Ping-only hosts therefore work without a fake service. Suggestions never check a row automatically.

Linking keeps existing metadata and layout unchanged. Docker additions use the discovered name, logo match, and replica count. Nmap endpoint names include the detected product or service plus protocol and port. New Nmap cards persist bounded canonical IP addresses as hardware facts. Missing findings never delete existing services.

The review summary shows additions, links, new cards/groups, and card-height changes. **Apply selected** is disabled for an empty or invalid review. One application creates one undo step. A Nmap file stays open after applying one host so another can be reviewed. Canceling, pressing `Escape`, scanning, or importing without applying does not change the project. See [Discovery](/discovery) for setup, limits, and security boundaries.

## Add service tiles

Create a service group, then choose **Apps**. You can search the logo catalog and select more than one service. Selections stay checked across searches. Click the logo beside an existing service to replace it without changing its name, count, ID, or position.

Choose **Upload logo** in any picker to add a PNG, JPG, WebP, or SVG file up to 2 MB. Check the preview, edit its name, and choose a transparent, light, or dark background. SVG is converted to PNG, and stored images are at most 512px. Uploaded logos appear first under **Uploaded** and can be reused throughout the project. In the multi-service picker, uploaded drafts are only saved when selected services are added. Cancel leaves the project unchanged.

You can change a service name and set its instance count from 1 through 99. **Add custom service** still adds a named tile with the included generic icon.

Groups with one or two services use readable horizontal rows. Groups with three or four services use a compact icon grid, and larger groups use a denser grid. Atlas keeps the service order you set.

## Appearance

Open **Settings** to change:

- project subtitle
- Navy, Light, or Midnight diagram theme
- 1–4 columns
- Comfortable or Compact density
- VLAN chip names and colors

The project title is in the top bar. These settings change your diagram. They are separate from the light/dark switch on this documentation site.

## Preview and layout

Use **Fit page**, **Fit width**, zoom in, or zoom out to adjust the preview. You can select devices and network nodes in the preview with a pointer or keyboard.

**Focus canvas** hides the inventory and inspector. Select a card or press `Escape` to leave focus view. On mobile, opening **Inventory** also leaves focus view so the drawer is visible.

Automatic layout uses inventory order, column count, content length, and density. Choose **Arrange** to move or resize device cards without moving network nodes or VLANs. Drag a card to move it or use its lower-right handle to resize it. Movement snaps to an 8-unit grid, nearby card edges and centers, and a 24-unit vertical gap. Hold `Alt` while dragging to bypass snapping.

With a card selected in Arrange mode, arrow keys move it by 8 units and `Shift` increases that to 32. `Alt` plus an arrow resizes it. The Position fields in the device inspector accept exact X, Y, Width, and Height values.

**Columns** still controls the poster width. Cards stay inside that width, and their minimum height grows when their hardware or services need more room. A larger height adds whitespace. New or duplicated devices appear below existing manually placed cards. **Auto layout** clears all saved card rectangles; use **Undo** if you change your mind.

Manual positions are part of the project JSON and appear in SVG and PNG exports. Arrange handles, selection outlines, and alignment guides are editor-only.

## Undo and redo

Use the top-bar buttons or:

- Undo: `Ctrl+Z` on Windows/Linux, `Command+Z` on macOS
- Redo: `Ctrl+Shift+Z` on Windows/Linux, `Command+Shift+Z` on macOS

These shortcuts do not run while you are typing in a field. Undo history only lasts for the current page session, and reloading clears it. Read [sharing and backup](/sharing) before importing a project or updating Atlas.

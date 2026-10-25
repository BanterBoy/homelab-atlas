# Sharing and backup

JSON is your editable project file. SVG and PNG are images of it.

## Browser autosave

Changes autosave to `localStorage` in the current browser profile. The browser keeps separate storage for each hostname, port, and protocol. Nothing is saved to the Python server or a container volume.

A project can appear missing after you:

- clear site data
- use a private browsing session
- switch browsers or browser profiles
- open the app through a different hostname, port, or protocol

Use **Save project** regularly, especially before updates or before changing the address you use to open Atlas.

## JSON backup and transfer

**Save project** downloads an editable JSON file. To move it to another browser or address, choose **Import** and select that file. Atlas checks the whole file before replacing the current project. You can undo an import during the same page session, but reloading clears the undo history.

Try the [complete fictional example on GitHub](https://github.com/aiden0rchad/homelab-atlas/blob/main/docs/example.json), or choose **Load example** in the editor.

## Concurrent tabs

If another tab changes the saved project, the current tab stops before overwriting it and offers:

- **Keep my edits**: replace the browser's saved copy with this tab's project
- **Load saved version**: load the other tab's saved copy here
- **Download my project**: save this tab as JSON before deciding

Try not to edit the same project in several tabs. These choices help you recover from a conflict, but they do not turn Atlas into a collaborative editor.

## Export formats

| Format | Best for | Important behavior |
|---|---|---|
| JSON | Backup, transfer, later editing | Checked project data; the only editable-project backup |
| SVG | Documentation, scaling, print | Vector image with the bundled logos included |
| PNG | Chats, wikis, broad compatibility | Rendered at 3× when possible, capped at 36 megapixels and 16,384 px per side |

SVG and PNG files cannot be imported to restore a project. Atlas may reduce a large PNG to stay within browser limits. Use SVG when you need to scale the image without a fixed resolution.

## Before you post it {#share-intentionally}

Atlas does not hide IP addresses, hostnames, domains, roles, network labels, or service names for you. Check the diagram and JSON, remove anything private, and only share what you mean to share. The included example and documentation screenshots use fictional data.

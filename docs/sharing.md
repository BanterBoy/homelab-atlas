# Sharing and backup

Treat JSON as the project and SVG/PNG as publications of it.

## Browser autosave

Changes autosave to `localStorage` for the current browser profile and origin. No data is written to the Python server or a container volume.

A project can appear missing after you:

- clear site data
- use a private browsing session
- switch browsers or browser profiles
- open the app through a different hostname, port, or protocol

Use **Save project** regularly and before updates or origin changes.

## JSON backup and transfer

**Save project** downloads the editable project as JSON. On another browser or origin, choose **Import** and select that file. Import validates the complete project, then replaces the current one. You can undo the replacement in the same page session, but reloading clears undo history.

Try the [complete fictional example on GitHub](https://github.com/aiden0rchad/homelab-atlas/blob/main/docs/example.json), or choose **Load example** in the editor.

## Concurrent tabs

If another tab changes the saved project, the current tab stops before overwriting it and offers:

- **Keep my edits** — replace saved browser state with this tab's project
- **Load saved version** — bring the other saved version into this tab
- **Download my project** — preserve this tab as JSON before deciding

Avoid routine editing in multiple tabs; conflict handling is a recovery path, not collaborative editing.

## Export formats

| Format | Best for | Important behavior |
|---|---|---|
| JSON | Backup, transfer, later editing | Validated project data; the only editable-project backup |
| SVG | Documentation, scaling, print | Vector output with bundled logos embedded; self-contained |
| PNG | Chats, wikis, broad compatibility | Rendered at 3× when possible, capped at 36 megapixels and 16,384 px per side |

SVG and PNG are image exports; they cannot be imported to restore a project. Large PNGs may be reduced to stay within browser limits—use SVG when unlimited scaling matters.

## Share intentionally

The app does not automatically redact IP addresses, hostnames, domains, roles, network labels, or service names. Review the diagram and JSON, remove sensitive details, and share only intentional content. The bundled example and documentation screenshots use fictional data.

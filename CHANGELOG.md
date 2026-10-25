# Changelog

This file lists the notable changes in each Homelab Atlas release.

## [0.3.0] - 2026-10-25

### Added

- Added Arrange mode for moving and resizing device cards with pointer, keyboard, numeric, grid, and alignment-guide controls.
- Added undoable **Auto layout** reset while preserving manual positions and sizes in saved projects and exports.

### Changed

- Saved projects now use schema version 2. Schema-version-1 imports upgrade automatically to automatic layout.

## [0.2.0] - 2026-10-25

### Changed

- Refined diagram typography, hardware facts, CPU badges, service groups, network cards, and multi-column layout.
- Reworked the editor with quieter controls, inventory search, focused canvas view, and a mobile inventory drawer.
- Combined SVG and PNG choices under **Export** while keeping editable JSON under **Save project**.
- Kept schema-version 1 project files compatible with the updated editor.

## [0.1.0] - 2026-10-25

### Added

- Editor for devices, hardware notes, grouped services, network nodes, VLAN chips, and connections.
- Automatic layouts with three diagram themes, two spacing options, and one to four columns.
- Browser autosave, multi-tab conflict handling, and checked JSON import/export.
- SVG and high-resolution PNG export with included local logos.
- Docker Compose deployment, a portable Python/static ZIP, and Linux AMD64 and ARM64 images on GHCR.
- Documentation for setup, editing, backups, privacy, troubleshooting, development, and the project format.

[0.1.0]: https://github.com/aiden0rchad/homelab-atlas/releases/tag/v0.1.0
[0.2.0]: https://github.com/aiden0rchad/homelab-atlas/releases/tag/v0.2.0
[0.3.0]: https://github.com/aiden0rchad/homelab-atlas/releases/tag/v0.3.0

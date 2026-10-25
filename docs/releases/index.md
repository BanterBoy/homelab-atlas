# Releases and packages

**v0.1.0** is the first public release. See its [release notes](/releases/v0.1.0) and [GitHub release with downloads](https://github.com/aiden0rchad/homelab-atlas/releases/tag/v0.1.0). Releases publish only after the complete validation and packaging workflow succeeds.

## Release assets

| Asset | Platforms | Purpose |
|---|---|---|
| `ghcr.io/aiden0rchad/homelab-atlas:0.1.0` | Linux AMD64, ARM64 | Published container image |
| `homelab-atlas-0.1.0.zip` | Python 3.10+ and a current browser | Portable Python/static distribution |
| `compose.release.yaml` | Docker Compose v2 | Hardened deployment using the released image |
| `SHA256SUMS` | Linux/macOS | Integrity checks for the ZIP and Compose file |

The [GitHub releases page](https://github.com/aiden0rchad/homelab-atlas/releases) provides downloads. The [package page](https://github.com/users/aiden0rchad/packages/container/package/homelab-atlas) lists published image versions.

## Verify downloads

Place the ZIP, Compose file, and `SHA256SUMS` in one directory.

Linux:

```sh
sha256sum -c SHA256SUMS
```

macOS:

```sh
shasum -a 256 -c SHA256SUMS
```

Both covered files must report `OK`.

## Container tags and digests

| Tag | Behavior |
|---|---|
| `0.1.0` | Exact stable release |
| `v0.1.0` | Exact stable release, matching the Git tag |
| `0.1` | Newest stable patch in the 0.1 line |
| `latest` | Newest stable release |

Exact version tags identify a release, while `0.1` and `latest` move when later stable releases publish. For immutable deployment, obtain the verified manifest digest from the registry or successful release workflow, then replace the image's colon-prefixed tag with `@` followed by that `sha256:` digest.

## Maintainer checklist

1. Update the root `package.json` version, default image tag in `compose.release.yaml`, `docs/releases/vVERSION.md`, and `CHANGELOG.md`.
2. Run `npm test`, release artifact tests, both Compose validations, and the documentation build.
3. Confirm the release notes describe real behavior and use the matching version.
4. Commit on `main`, create the strict stable tag `vMAJOR.MINOR.PATCH`, and push the tag.
5. Watch the full release workflow: validation, multi-architecture image publication, anonymous image verification, and GitHub release creation.

For the first GHCR publication, GitHub may create the package as private. Change it to public, then rerun only the failed **Publish GitHub release** job. The workflow deliberately refuses to create a release until the versioned image is anonymously readable with both architectures and the expected digest.

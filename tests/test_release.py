import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("atlas_release", Path(__file__).parents[1] / "scripts/release.py")
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def fixture(self, root: Path, version: str = "0.1.0") -> None:
        (root / "public/licenses").mkdir(parents=True)
        files = {
            "package.json": json.dumps({"version": version}),
            "go.mod": "module example.invalid/atlas\n\ngo 1.26\n",
            "main.go": "package main\nfunc main() {}\n",
            "server.go": "package main\n",
            "docker.go": "package main\n",
            "discovery.go": "package main\n",
            "nmap.go": "package main\n",
            "Dockerfile": "FROM golang:1.26-alpine\n",
            "compose.release.yaml": "services:\n  atlas:\n    image: ghcr.io/aiden0rchad/homelab-atlas:${ATLAS_VERSION:-0.1.0}\n  collector:\n    image: ghcr.io/aiden0rchad/homelab-atlas:${ATLAS_VERSION:-0.1.0}\n",
            "README.md": "# Atlas\n",
            "LICENSE": "MIT\n",
            "THIRD_PARTY_NOTICES.md": "Notices\n",
            "public/index.html": "<!doctype html>\n",
            "public/licenses/logo.txt": "license\n",
        }
        for name, content in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
        (root / ".agent").mkdir()
        (root / ".agent/private.json").write_text('{"host":"private.invalid"}\n')
        (root / "docs").mkdir()
        (root / "docs/screenshot.png").write_bytes(b"private fixture")

    def test_repeatable_archive_checksums_and_contents(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            first = release.build(root, "v0.1.0", root / "first")
            second = release.build(root, "v0.1.0", root / "second")
            self.assertEqual(first[0].read_bytes(), second[0].read_bytes())
            self.assertEqual(first[2].read_text(), second[2].read_text())
            with zipfile.ZipFile(first[0]) as bundle:
                names = set(bundle.namelist())
            self.assertIn("homelab-atlas-0.1.0/public/index.html", names)
            self.assertIn("homelab-atlas-0.1.0/public/licenses/logo.txt", names)
            self.assertIn("homelab-atlas-0.1.0/go.mod", names)
            self.assertIn("homelab-atlas-0.1.0/docker.go", names)
            self.assertIn("homelab-atlas-0.1.0/nmap.go", names)
            self.assertIn("homelab-atlas-0.1.0/THIRD_PARTY_NOTICES.md", names)
            self.assertNotIn("homelab-atlas-0.1.0/.agent/private.json", names)
            self.assertNotIn("homelab-atlas-0.1.0/docs/screenshot.png", names)

    def test_invalid_tag_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            for tag in ("0.1.0", "v01.1.0", "v0.1.0-rc.1"):
                with self.subTest(tag=tag), self.assertRaises(ValueError):
                    release.build(root, tag, root / "dist")

    def test_mismatched_version_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root, "0.2.0")
            with self.assertRaisesRegex(ValueError, "does not match"):
                release.build(root, "v0.1.0", root / "dist")

    def test_mismatched_compose_default_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            (root / "compose.release.yaml").write_text(
                "services:\n  atlas:\n    image: ghcr.io/aiden0rchad/homelab-atlas:${ATLAS_VERSION:-0.2.0}\n  collector:\n    image: ghcr.io/aiden0rchad/homelab-atlas:${ATLAS_VERSION:-0.2.0}\n"
            )
            with self.assertRaisesRegex(ValueError, "editor and collector images"):
                release.build(root, "v0.1.0", root / "dist")

    def test_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self.fixture(root)
            (root / "public/link.html").symlink_to(root / "public/index.html")
            with self.assertRaisesRegex(ValueError, "symlink"):
                release.build(root, "v0.1.0", root / "dist")


if __name__ == "__main__":
    unittest.main()

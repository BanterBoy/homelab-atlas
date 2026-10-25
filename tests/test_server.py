import http.client
import os
from pathlib import Path
import threading
import unittest

from server import Handler
from http.server import ThreadingHTTPServer


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        except PermissionError:
            raise unittest.SkipTest("sandbox forbids localhost bind")
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "server"):
            cls.server.shutdown()
            cls.server.server_close()
            cls.thread.join(timeout=3)

    def get(self, path):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=2)
        try:
            connection.request("GET", path)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_index_assets_and_headers(self):
        status, headers, body = self.get("/")
        self.assertEqual(status, 200)
        self.assertIn(b"Homelab Atlas", body)
        self.assertIn("default-src 'self'", headers["Content-Security-Policy"])
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        status, _, body = self.get("/model.js")
        self.assertEqual(status, 200)
        self.assertIn(b"validateProject", body)

    def test_health(self):
        status, _, body = self.get("/healthz")
        self.assertEqual((status, body), (200, b"ok\n"))

    def test_source_traversal_and_directory_listing_denied(self):
        for path in ["/server.py", "/../server.py", "/%2e%2e/server.py", "/.git/config", "/licenses/"]:
            status, _, body = self.get(path)
            self.assertEqual(status, 404, path)
            self.assertNotIn(b"Directory listing", body)

    def test_symlink_escape_denied(self):
        public = Path("public")
        link = public / "escape-test"
        try:
            link.symlink_to(Path("../server.py"))
        except (OSError, NotImplementedError):
            self.skipTest("symlinks unavailable")
        try:
            status, _, _ = self.get("/escape-test")
            self.assertEqual(status, 404)
        finally:
            os.unlink(link)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Restricted static server for Homelab Atlas."""
import argparse
import http.server
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

PUBLIC = Path(__file__).resolve().parent / "public"

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js":"text/javascript", ".svg":"image/svg+xml", ".json":"application/json"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def end_headers(self):
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()

    def translate_path(self, path):
        relative = unquote(urlsplit(path).path).lstrip("/")
        candidate = (PUBLIC / relative).resolve()
        if candidate != PUBLIC and PUBLIC not in candidate.parents:
            return str(PUBLIC / "__not_found__")
        return str(candidate)

    def list_directory(self, path):
        self.send_error(404, "Not found")

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/healthz":
            body = b"ok\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

def main():
    parser = argparse.ArgumentParser(description="Serve Homelab Atlas from public/ only.")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8080")))
    args = parser.parse_args()
    with http.server.ThreadingHTTPServer((args.host, args.port), Handler) as server:
        print(f"Homelab Atlas: http://{args.host}:{server.server_address[1]}", flush=True)
        server.serve_forever()

if __name__ == "__main__":
    main()

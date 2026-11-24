#!/usr/bin/env python3
"""Minimal static file server for the installed Knits bundle.

Usage: knits-serve.py <directory> <port>

Serves only files inside <directory>, binds to loopback, and disables
directory listings so the local install exposes nothing beyond the app.
"""

import os
import posixpath
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".json": "application/json",
    ".woff2": "font/woff2",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return CONTENT_TYPES.get(ext, "application/octet-stream")

    def list_directory(self, path):
        self.send_error(404, "Not found")
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, *args):
        pass

    def translate_path(self, path):
        # Strip query/fragment and normalise so ../ cannot escape the bundle.
        clean = posixpath.normpath(path.split("?")[0].split("#")[0]).lstrip("/")
        if clean in ("", "."):
            clean = "index.html"
        return os.path.join(self.directory, clean)


def main():
    if len(sys.argv) != 3:
        print("usage: knits-serve.py <directory> <port>", file=sys.stderr)
        return 2
    directory = os.path.abspath(sys.argv[1])
    port = int(sys.argv[2])
    server = ThreadingHTTPServer(("127.0.0.1", port), lambda *a, **k: Handler(*a, directory=directory, **k))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())

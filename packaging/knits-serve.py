#!/usr/bin/env python3
"""Minimal static file server for the installed Knits bundle.

Usage: knits-serve.py <directory> <port> [overlay-directory]

Serves only files inside <directory>, binds to loopback, and disables
directory listings so the local install exposes nothing beyond the app.

The optional overlay directory is checked first. In-app updates unpack a newer
bundle there, so an update lands in the user's home directory and never needs
root, a password prompt or a reinstall.

Endpoints (loopback only):
  GET  /api/version  the version of the bundle being served
  GET  /api/update   compares that version with the published manifest
  POST /api/update   downloads the published bundle and unpacks it into the overlay
"""

import hashlib
import io
import json
import os
import posixpath
import shutil
import sys
import tarfile
import tempfile
import urllib.parse
import urllib.request
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

# Where the app looks for new builds: the deployed Knits site, which publishes
# latest.json on every deployment. Override with KNITS_UPDATE_URL to point an install
# at another channel.
MANIFEST_URL = os.environ.get(
    "KNITS_UPDATE_URL", "https://knits-nine.vercel.app/latest.json"
)
MAX_MANIFEST = 256 * 1024
MAX_BUNDLE = 40 * 1024 * 1024
LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


def version_tuple(text):
    """'1.10.0' -> (1, 10, 0); anything unreadable sorts as the oldest version."""
    parts = []
    for piece in str(text or "").split("."):
        digits = "".join(ch for ch in piece if ch.isdigit())
        parts.append(int(digits) if digits else 0)
    return tuple(parts)


def read_version(directory):
    if not directory:
        return ""
    try:
        with open(os.path.join(directory, "version.json"), encoding="utf-8") as handle:
            return str(json.load(handle).get("version") or "")
    except (OSError, ValueError):
        return ""


def url_allowed(url):
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or "").lower()
    if not host:
        return False
    if parsed.scheme == "https":
        return True
    # Plain HTTP is only accepted for a loopback test manifest.
    return parsed.scheme == "http" and host in LOOPBACK_HOSTS


def fetch(url, limit):
    request = urllib.request.Request(url, headers={"User-Agent": "Knits-Updater/1.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("That update is larger than Knits will accept.")
    return data


def load_manifest():
    return json.loads(fetch(MANIFEST_URL, MAX_MANIFEST).decode("utf-8"))


def apply_update(base_dir, overlay_dir):
    """Download the published bundle and unpack it into the overlay directory."""
    if not overlay_dir:
        raise ValueError("This install has nowhere to put an update.")
    current = read_version(overlay_dir) or read_version(base_dir)
    manifest = load_manifest()
    latest = str(manifest.get("version") or "")
    if not latest:
        raise ValueError("The update manifest has no version.")
    if version_tuple(latest) <= version_tuple(current):
        return {"updated": False, "current": current, "latest": latest}

    bundle_url = urllib.parse.urljoin(MANIFEST_URL, str(manifest.get("bundle") or ""))
    if not url_allowed(bundle_url):
        raise ValueError("That update URL is not allowed.")
    data = fetch(bundle_url, MAX_BUNDLE)
    expected = str(manifest.get("sha256") or "").lower()
    if expected and hashlib.sha256(data).hexdigest() != expected:
        raise ValueError("The downloaded update did not match its checksum.")

    staging = tempfile.mkdtemp(prefix="knits-update-")
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
            for member in archive.getmembers():
                name = posixpath.normpath(member.name)
                if name.startswith("..") or name.startswith("/"):
                    raise ValueError("That update archive is not safe to unpack.")
                if not (member.isfile() or member.isdir()):
                    raise ValueError("That update archive contains something unexpected.")
            archive.extractall(staging)
        if not os.path.isfile(os.path.join(staging, "index.html")):
            raise ValueError("That update archive has no app in it.")

        os.makedirs(overlay_dir, exist_ok=True)
        for entry in os.listdir(staging):
            target = os.path.join(overlay_dir, entry)
            if os.path.isdir(target) and not os.path.islink(target):
                shutil.rmtree(target)
            elif os.path.exists(target):
                os.remove(target)
            shutil.move(os.path.join(staging, entry), target)
        with open(os.path.join(overlay_dir, "version.json"), "w", encoding="utf-8") as handle:
            json.dump({"version": latest}, handle)
        return {"updated": True, "version": latest, "from": current}
    finally:
        shutil.rmtree(staging, ignore_errors=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, overlay=None, **kwargs):
        self.overlay = overlay
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
        if self.overlay:
            candidate = os.path.join(self.overlay, clean)
            if os.path.isfile(candidate):
                return candidate
        return os.path.join(self.directory, clean)

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def origin_ok(self):
        """Only the app itself may start an install, not another page on the machine."""
        origin = self.headers.get("Origin")
        if not origin:
            return True
        port = self.server.server_address[1]
        return origin in {
            "http://127.0.0.1:%d" % port,
            "http://localhost:%d" % port,
            "http://[::1]:%d" % port,
        }

    def route(self):
        return self.path.split("?")[0].split("#")[0]

    def do_GET(self):
        route = self.route()
        if route == "/api/version":
            self.send_json({"version": read_version(self.overlay) or read_version(self.directory)})
            return
        if route == "/api/update":
            current = read_version(self.overlay) or read_version(self.directory)
            try:
                manifest = load_manifest()
            except Exception as error:  # noqa: BLE001 - reported to the app as-is
                self.send_json({"current": current, "error": str(error)}, 502)
                return
            latest = str(manifest.get("version") or "")
            self.send_json(
                {
                    "current": current,
                    "latest": latest,
                    "available": bool(latest) and version_tuple(latest) > version_tuple(current),
                }
            )
            return
        super().do_GET()

    def do_POST(self):
        if self.route() != "/api/update":
            self.send_error(404, "Not found")
            return
        if not self.origin_ok():
            self.send_json({"error": "That request did not come from Knits."}, 403)
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length:
            self.rfile.read(length)
        try:
            result = apply_update(self.directory, self.overlay)
        except Exception as error:  # noqa: BLE001 - the app shows the reason
            self.send_json({"updated": False, "error": str(error)}, 502)
            return
        self.send_json(result)


def main():
    if len(sys.argv) < 3:
        print("usage: knits-serve.py <directory> <port> [overlay-directory]", file=sys.stderr)
        return 2
    directory = os.path.abspath(sys.argv[1])
    port = int(sys.argv[2])
    overlay = os.path.abspath(sys.argv[3]) if len(sys.argv) > 3 else None
    if overlay:
        os.makedirs(overlay, exist_ok=True)
    server = ThreadingHTTPServer(
        ("127.0.0.1", port),
        lambda *a, **k: Handler(*a, directory=directory, overlay=overlay, **k),
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())

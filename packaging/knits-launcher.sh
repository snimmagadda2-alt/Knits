#!/bin/sh
# Knits — serve the bundled desktop app locally and open it in an app window.
set -eu

WEB_DIR="${KNITS_WEB_DIR:-/opt/knits/web}"
SERVE="${KNITS_SERVE:-/opt/knits/serve.py}"
# Updates unpack here, in the user's own files, so applying one needs no root.
OVERLAY="${KNITS_OVERLAY:-${XDG_DATA_HOME:-$HOME/.local/share}/knits/web}"
mkdir -p "$OVERLAY"
TARGET="/#/desktop"

if [ ! -f "$WEB_DIR/index.html" ]; then
  echo "knits: $WEB_DIR/index.html is missing — reinstall the package" >&2
  exit 1
fi

PORT="$(python3 -c 'import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()')"
BASE="http://127.0.0.1:$PORT"
URL="$BASE$TARGET"

python3 "$SERVE" "$WEB_DIR" "$PORT" "$OVERLAY" >/dev/null 2>&1 &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

# Wait until the local server answers before handing the URL to the browser.
i=0
while [ "$i" -lt 100 ]; do
  if python3 - "$BASE/" <<'PY' 2>/dev/null
import sys, urllib.request
urllib.request.urlopen(sys.argv[1], timeout=1).read(1)
PY
  then
    break
  fi
  i=$((i + 1))
  sleep 0.1
done

BROWSER=""
for candidate in chromium chromium-browser google-chrome google-chrome-stable microsoft-edge; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER="$candidate"
    break
  fi
done

if [ -n "${KNITS_BROWSER:-}" ]; then
  "$KNITS_BROWSER" "$URL" || true
elif [ -n "$BROWSER" ]; then
  # App mode: no tabs, no address bar — it looks like a native desktop.
  "$BROWSER" --app="$URL" --class=Knits --new-window >/dev/null 2>&1 || true
elif command -v firefox >/dev/null 2>&1; then
  firefox --new-window "$URL" --wait-for-browser >/dev/null 2>&1 || xdg-open "$URL" || true
else
  echo "knits: no Chromium or Firefox found, opening the default browser" >&2
  echo "knits: if it does not open, visit $URL" >&2
  xdg-open "$URL" >/dev/null 2>&1 || true
  wait "$SERVER_PID"
fi

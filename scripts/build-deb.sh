#!/usr/bin/env bash
# Build the Knits .deb from an already-built web bundle (dist/web).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
ARCH="all"
NAME="knits_${VERSION}_${ARCH}"
OUT="$ROOT/dist/$NAME.deb"

if [ ! -f "$ROOT/dist/web/index.html" ]; then
  echo "build-deb: dist/web is missing — run 'npm run build:web' first" >&2
  exit 1
fi

# The app reads version.json to know which build it is running; the updater compares it
# with latest.json before downloading anything. Both, and the bundle an update installs,
# come from the same script the static site runs, so a package and a deployment cannot
# disagree about what the newest build is.
node "$ROOT/scripts/build-feed.mjs"

if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "build-deb: dpkg-deb is required (apt install dpkg-dev)" >&2
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
PKG="$STAGE/$NAME"

mkdir -p \
  "$PKG/DEBIAN" \
  "$PKG/opt/knits/web" \
  "$PKG/usr/bin" \
  "$PKG/usr/share/applications" \
  "$PKG/usr/share/icons/hicolor/scalable/apps" \
  "$PKG/usr/share/doc/knits"

cp -a "$ROOT/dist/web/." "$PKG/opt/knits/web/"
# Never ship the downloadable packages inside the installed app: that would nest the
# previous .deb in every new one and double the package on each release.
rm -rf "$PKG/opt/knits/web/downloads"
install -m 755 "$ROOT/packaging/knits-launcher.sh" "$PKG/usr/bin/knits"
install -m 644 "$ROOT/packaging/knits.desktop" "$PKG/usr/share/applications/knits.desktop"
install -m 644 "$ROOT/packaging/knits.svg" "$PKG/usr/share/icons/hicolor/scalable/apps/knits.svg"
install -m 644 "$ROOT/packaging/knits-serve.py" "$PKG/opt/knits/serve.py"
install -m 644 "$ROOT/README.md" "$PKG/usr/share/doc/knits/README.md"

SIZE="$(du -sk --exclude=DEBIAN "$PKG" | cut -f1)"

sed "s/__VERSION__/$VERSION/; s/__SIZE__/$SIZE/" "$ROOT/packaging/control" > "$PKG/DEBIAN/control"
install -m 755 "$ROOT/packaging/postinst" "$PKG/DEBIAN/postinst"
install -m 755 "$ROOT/packaging/postrm" "$PKG/DEBIAN/postrm"

mkdir -p "$ROOT/dist" "$ROOT/public/downloads"
dpkg-deb --root-owner-group -Zxz --build "$PKG" "$OUT" >/dev/null

# Keep the downloadable copy next to the site so the page and the package ship together.
# The stable knits_all.deb name is what the download buttons link to, so a version bump
# never leaves the page pointing at a file that is not there.
cp -f "$OUT" "$ROOT/public/downloads/$NAME.deb"
cp -f "$OUT" "$ROOT/public/downloads/knits_all.deb"
mkdir -p "$ROOT/dist/web/downloads"
cp -f "$OUT" "$ROOT/dist/web/downloads/$NAME.deb"
cp -f "$OUT" "$ROOT/dist/web/downloads/knits_all.deb"

echo "build-deb: $OUT"
echo "build-deb: $(du -h "$OUT" | cut -f1) — $(dpkg-deb -f "$OUT" Package) $(dpkg-deb -f "$OUT" Version) ($(dpkg-deb -f "$OUT" Architecture))"

# The update feed — latest.json and the bundle it names — was published at the top of
# this script, before the package was built, so the bundle holds the app and never an
# installer.
echo "build-deb: dist/web/latest.json → $VERSION (deploy dist/web to publish it)"

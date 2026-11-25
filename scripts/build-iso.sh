#!/usr/bin/env bash
# Build a bootable Debian live ISO that starts straight into Knits.
#
#   sudo bash scripts/build-iso.sh
#
# Runs live-build on a Debian or Ubuntu host with live-build, debootstrap,
# squashfs-tools and xorriso installed. The image is written to
# dist/knits-<version>-amd64.iso and to the stable dist/knits-amd64.iso that the
# website links to. GitHub Actions does the same thing in .github/workflows/iso.yml.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
NAME="knits-${VERSION}-amd64"
DEB="dist/knits_${VERSION}_all.deb"
WORK="dist/iso"

die() { printf 'build-iso: %s\n' "$*" >&2; exit 1; }
say() { printf 'build-iso: %s\n' "$*"; }

# lb build debootstraps a chroot, which needs root.
[ "$(id -u)" -eq 0 ] || die "run as root: sudo bash scripts/build-iso.sh"

for tool in lb debootstrap mksquashfs xorriso; do
  command -v "$tool" >/dev/null 2>&1 ||
    die "$tool is missing — apt install live-build debootstrap squashfs-tools xorriso"
done

# The image installs the same package the site hands out, so build it first.
if [ ! -f dist/web/index.html ]; then
  say "building the app bundle"
  npm run build:web
fi

if [ ! -f "$DEB" ]; then
  say "building $DEB"
  npm run deb
fi

rm -rf "$WORK"
mkdir -p "$WORK/config/packages.chroot"
cp -a packaging/iso/config/. "$WORK/config/"
# live-build installs anything here in preference to the archive, which is how the
# image gets the exact build this repository just made.
cp "$DEB" "$WORK/config/packages.chroot/"

say "configuring live-build (Debian 12, amd64)"
(
  cd "$WORK"
  lb config \
    --architectures amd64 \
    --distribution bookworm \
    --archive-areas main \
    --binary-images iso-hybrid \
    --bootappend-live "boot=live components hostname=knits quiet splash loglevel=3" \
    --debian-installer none \
    --memtest none \
    --iso-application "Knits ${VERSION}" \
    --iso-publisher "Knits" \
    --iso-volume "KNITS"
)

say "building the image — this downloads a few hundred megabytes and takes a while"
(cd "$WORK" && lb build)

BUILT="$WORK/live-image-amd64.hybrid.iso"
[ -f "$BUILT" ] || die "live-build finished without producing an image"

mv -f "$BUILT" "dist/${NAME}.iso"
cp -f "dist/${NAME}.iso" dist/knits-amd64.iso
(cd dist && sha256sum "${NAME}.iso" > "${NAME}.iso.sha256")

say "dist/${NAME}.iso ($(du -h "dist/${NAME}.iso" | cut -f1))"
say "dist/knits-amd64.iso — the stable name the download button uses"
say "checksum: $(cut -d' ' -f1 "dist/${NAME}.iso.sha256")"

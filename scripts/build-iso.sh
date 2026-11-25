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

# Read the version without needing Node: the ISO job can run inside a plain Debian
# container, where Node is not installed.
if command -v node >/dev/null 2>&1; then
  VERSION="$(node -p "require('./package.json').version")"
else
  VERSION="$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' package.json | head -n 1)"
fi
[ -n "$VERSION" ] || { echo "build-iso: could not read the version from package.json" >&2; exit 1; }

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

# live-build assembles the boot loader itself; without these it fails late and quietly.
if [ ! -f /usr/lib/ISOLINUX/isolinux.bin ] && ! command -v grub-mkstandalone >/dev/null 2>&1; then
  say "warning: no isolinux.bin and no grub-mkstandalone — install syslinux-common, isolinux and grub-pc-bin"
fi
say "live-build: $(lb --version 2>/dev/null | head -n 1)"

# The image installs the same package the site hands out, so build it first.
if [ ! -f dist/web/index.html ] || [ ! -f "$DEB" ]; then
  command -v npm >/dev/null 2>&1 ||
    die "dist/ is incomplete and npm is not installed — run 'npm run build' first"
  if [ ! -f dist/web/index.html ]; then
    say "building the app bundle"
    npm run build:web
  fi
  if [ ! -f "$DEB" ]; then
    say "building $DEB"
    npm run deb
  fi
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
LOG="$WORK/build.log"
# Keep the log and turn its tail into workflow annotations (::error:: lines are public
# on the run, so a failure is readable without admin access to the job log).
if ! (cd "$WORK" && lb build) 2>&1 | tee "$LOG"; then
  echo "::error::live-build failed. Last lines of build.log:"
  tail -n 40 "$LOG" | sed 's/\r//g; s/^/::error::/'
  exit 1
fi

BUILT="$WORK/live-image-amd64.hybrid.iso"
[ -f "$BUILT" ] || die "live-build finished without producing an image"

mv -f "$BUILT" "dist/${NAME}.iso"
cp -f "dist/${NAME}.iso" dist/knits-amd64.iso
(cd dist && sha256sum "${NAME}.iso" > "${NAME}.iso.sha256")

say "dist/${NAME}.iso ($(du -h "dist/${NAME}.iso" | cut -f1))"
say "dist/knits-amd64.iso — the stable name the download button uses"
say "checksum: $(cut -d' ' -f1 "dist/${NAME}.iso.sha256")"

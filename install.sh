#!/usr/bin/env bash
# Install Knits from this repository.
#
#   curl -fsSL https://raw.githubusercontent.com/snimmagadda2-alt/Knits/main/install.sh | bash
#   ./install.sh                    # from a checkout
#   KNITS_BRANCH=dev ./install.sh   # from another branch
set -euo pipefail

REPO_URL="${KNITS_REPO_URL:-https://github.com/snimmagadda2-alt/Knits.git}"
BRANCH="${KNITS_BRANCH:-main}"

say() { printf '\033[1;35mknits\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mknits\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = "Linux" ] || die "Knits packages for Debian-based Linux. Other platforms can use the web version."

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || die "run this as root or install sudo"
  SUDO="sudo"
fi

command -v dpkg >/dev/null 2>&1 || die "dpkg not found — this installer is for Debian, Ubuntu, Mint, Pop!_OS, Kali and similar."

for tool in git node npm; do
  command -v "$tool" >/dev/null 2>&1 || die "$tool is required. Install it, then run this script again."
done

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js 20 or newer is required (found $(node -v))."

if ! command -v dpkg-deb >/dev/null 2>&1; then
  say "installing dpkg-dev"
  $SUDO apt-get update -qq
  $SUDO apt-get install -y dpkg-dev
fi

CLEANUP_DIR=""
cleanup() { [ -n "$CLEANUP_DIR" ] && rm -rf "$CLEANUP_DIR"; }
trap cleanup EXIT

if [ -f "$(dirname "$0")/package.json" ]; then
  SRC="$(cd "$(dirname "$0")" && pwd)"
  say "building from $SRC"
else
  CLEANUP_DIR="$(mktemp -d)"
  SRC="$CLEANUP_DIR/knits"
  say "fetching $REPO_URL ($BRANCH)"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$SRC"
fi

cd "$SRC"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

npm run build
DEB="$(ls -1 dist/knits_*_all.deb | head -n 1)"
say "installing $(basename "$DEB")"
$SUDO dpkg -i "$DEB"

say "done — launch Knits from your application menu, or run: knits"

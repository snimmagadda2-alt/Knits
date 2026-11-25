# Knits

A macOS-style desktop environment that runs in a browser and installs as a single
`.deb` on Debian-based Linux devices.

Knits is a **simulation**, not a virtual machine: it reproduces the look and feel
of macOS (menu bar, dock, windows, Finder, Terminal) with web technology. It does
not run macOS binaries and does not ship or require Apple firmware.

## What's in the box

- **Window server** — draggable, resizable, focusable windows with z-order,
  minimise to the dock, zoom, and double-click title bars.
- **Menu bar** — Apple-style menu, per-app menu, status items and a live clock.
- **Dock** — hover magnification, running indicators, window restore.
- **Spotlight** — `⌘Space` / `Ctrl+Space`, searches apps and files.
- **Apps** — Finder over a virtual disk with quick-look, Terminal with a working
  shell subset (`ls`, `cd`, `cat`, `neofetch`, …), Notes that persist, a working
  Calculator, and System Settings for appearance, wallpaper and accent colour.
- **Welcome and sign-in** — the first run asks for your name, then a password, and saves
  the account on the device. The login screen asks for that password from then on, and
  so does locking the desktop.
- **Lock screen** — the account's password, with the name and avatar you set up.
- **Update log** — the first run of a new version shows what changed; close it with the
  X button or `Esc`, and reopen it from the Apple menu → *What's New in Knits*.
- **Safari** (installed app only) — address bar with Google search, back/forward, reload and a
  **Reader/Web** switch. Reader fetches a page through the Knits reader service and renders
  its headings, text and links, so pages show even when the site blocks frames; Web shows
  the page in a frame where the site allows it. Links inside a page open in place.
- **Knits Store** (installed app only, preinstalled) — categories, search, one-click *Get*,
  *Open* and *Uninstall* for the packages in `public/packages/`, with its own app logo.
- **Packages** (installed app only) — Safari downloads `.pkg` and `.dmg` files into a
  Downloads shelf. A `.pkg` opens Installer, which follows the macOS steps: welcome,
  licence, destination, install type, password, progress and summary. A `.dmg` mounts on
  the desktop as an ejectable disk whose volume window holds the app beside an
  Applications folder — drag it across, or double-click it. Installed apps appear in the
  Dock and Spotlight and are remembered in `localStorage`. Nothing is written to the
  real computer and no macOS software is executed.
- **Wi-Fi** (installed app only) — the menu-bar Wi-Fi item is a real switch: turn it
  off, on, or move between networks. Safari refuses to load anything while it is off.
- **Jelly animations** (installed app only) — minimising sends the window flying into
  its dock icon with a squash-and-stretch, reopening springs it back, and new windows
  bounce in.

Preferences, notes, wallpaper choices and your account are stored in `localStorage`.
The password is kept as a salted hash, and nothing is sent over the network.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

The site is at `/`; the desktop itself is at `/#/desktop`.

## Build the site

```bash
npm run build        # web bundle + .deb, both written under dist/
```

`dist/web/` is the deployable static site. It includes the package at
`dist/web/downloads/knits_<version>_all.deb` and at the stable alias
`dist/web/downloads/knits_all.deb`, so the download links on the page work from a
single deployment. `scripts/build-deb.sh` also refreshes `public/downloads/`, which
is committed — that way hosts without `dpkg-deb` (Vercel, any static host) still
serve a real package.

`npm run build:web` is the whole site build, and it also publishes the update feed:
`scripts/build-feed.mjs` writes `dist/web/version.json`, the app bundle at
`dist/web/downloads/knits_<version>_web.tar.gz` and `dist/web/latest.json` beside the
page. It is plain Node — no `dpkg-deb`, no `tar` binary — so the same command works on
Vercel, on any static host, and locally.

## Build and install the package

```bash
npm run build:web    # app bundle only
npm run deb          # packages dist/web into dist/knits_<version>_all.deb
sudo apt install ./dist/knits_1.9.0_all.deb
knits
```

Or install straight from this repository (clones, builds, installs):

```bash
curl -fsSL https://raw.githubusercontent.com/snimmagadda2-alt/Knits/main/install.sh | bash
```

### Package layout

| Path | Purpose |
| --- | --- |
| `/opt/knits/web/` | The bundled app |
| `/opt/knits/serve.py` | Loopback-only static server |
| `/usr/bin/knits` | Launcher: serves the app and opens it in an app window |
| `/usr/share/applications/knits.desktop` | Menu entry |
| `/usr/share/icons/hicolor/scalable/apps/knits.svg` | Icon |

The package is architecture-independent and depends only on `python3`. It
recommends a Chromium or Firefox browser for the app window. `knits` serves the
bundle on `127.0.0.1` on a free port and shuts the server down when the window
closes.

## Boot the live ISO

The site also offers a bootable image: a clean Debian 12 system with nothing on it but
Knits, which starts straight into the desktop. Download `knits-amd64.iso` from the site
(or from the `iso` GitHub release), then either run it in QEMU:

```bash
qemu-system-x86_64 -m 4096 -smp 2 -enable-kvm -cdrom knits-amd64.iso
```

…attach it to a VirtualBox or UTM machine with no virtual disk, or write it to a USB
stick:

```bash
sudo dd if=knits-amd64.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

It boots on BIOS and UEFI; turn Secure Boot off, the image is unsigned. There is no
installer and no second desktop — the image installs the same `.deb` the site hands
out, logs in on tty1, starts X and runs Chromium in kiosk mode against `127.0.0.1`, so
the whole screen is the app build of Knits. The live system runs from RAM: nothing is
written to the disk you booted from, and your account and files last until shutdown.

Build it yourself:

```bash
sudo apt install live-build debootstrap squashfs-tools xorriso
npm run build
sudo npm run build:iso        # dist/knits-<version>-amd64.iso
```

`.github/workflows/iso.yml` does the same on a `v*` tag or from the Actions tab and
uploads the image to the `iso` release, which is what the site's download button
points at. `packaging/iso/README.md` covers the image in detail.

## Updates

An installed copy updates itself. On launch the app asks its local server
(`GET /api/update`) what has been published at
`https://knits-nine.vercel.app/latest.json` — the deployed site, which serves the feed
every build publishes. If the manifest names a
newer version, it downloads that bundle, checks its SHA-256, unpacks it into
`~/.local/share/knits/web` and reloads into it. The launcher serves that overlay
before `/opt/knits/web`, so an update needs no root, no password prompt and no
reinstall — your files, installed apps and settings stay where they are.
`System Settings › Software Update` runs the same check by hand.

`npm run build:web` writes `dist/web/latest.json` and
`dist/web/downloads/knits_<version>_web.tar.gz` beside the page, so deploying
`dist/web` is all it takes: every install picks the new build up on its next launch.
The channel is one constant in `packaging/knits-serve.py`; point a single install at
another one with `KNITS_UPDATE_URL=https://example.com/latest.json knits`.

The updater accepts only HTTPS downloads (plain HTTP is allowed for a loopback
test manifest), refuses archives that would unpack outside the overlay, and
verifies the checksum before replacing anything.

## Project layout

```
src/
  App.tsx              hash router: landing page or desktop
  apps/                Finder, Terminal, Notes, Calculator, Settings, About
  components/          Window, MenuBar, Dock, Spotlight, icons
  desktop/             desktop shell, window manager, lock screen
  pages/Landing.tsx    marketing + download page
  prefs.tsx            persisted appearance/wallpaper/accent
  vfs.ts               virtual file system shared by Finder and Terminal
  account.ts           the local account: name and salted password hash
packaging/             Debian control files, launcher, icon, server
packaging/iso/         live-build config for the bootable Debian image
scripts/build-deb.sh   dpkg-deb build
scripts/build-feed.mjs update feed: version.json, web bundle, latest.json
scripts/build-iso.sh   live-build ISO
.github/workflows/     ISO build and release upload
install.sh             one-command install from this repository
```

## Deploy the site

`vercel.json` builds the static site from this repository:

- install: `npm ci`
- build: `npm run build:web` (no `dpkg-deb` needed)
- output: `dist/web`

That build publishes the update feed as well as the site, so a deployment is what makes
a release reach installed copies. Because the package at `public/downloads/` is
committed, the download buttons work on Vercel (or any static host) with no extra build
step.

If the site moves to another domain, change the default in
`packaging/knits-serve.py` (and `src/reader.ts` for Safari's reader service) so
installs poll the new home.

Safari, the Wi-Fi switch and the jelly window animations are gated on the app build
(`src/environment.ts`): they appear when Knits is served from `127.0.0.1` by the
launcher, and stay out of the website. Add `?app=1` to a dev or preview URL to see the
app build in a browser, or `?app=0` to force the website build.

## Packages (.pkg and .dmg)

Knits cannot run real macOS software, so its packages are a small JSON format with the
same file extensions. Safari downloads them, and Installer turns the manifest into an
app that Knits renders natively:

```json
{
  "format": "knits-pkg",
  "id": "clock",
  "name": "Clock",
  "version": "1.2",
  "publisher": "Knits Labs",
  "kind": "clock",
  "payload": { "zones": [{ "label": "Local", "zone": null }] }
}
```

A disk image uses `"format": "knits-dmg"`, a `volume` name and the same object under
`"app"`. `kind` is one of `clock`, `weather` or `gallery`. The three packages served
from `public/packages/` are listed in Safari's *Knits Software* section; add your own
file there and it becomes downloadable too. Installs are stored under `knits.apps` in
`localStorage` — inside Knits only.

## The reader service

Browsers cannot fetch most cross-origin pages, so Safari's Reader mode uses
`/api/read` on the deployed Knits site (`deploy/worker.js`). It fetches one http(s) URL,
refuses loopback and private addresses, caps the body at 2 MB and returns it with
`access-control-allow-origin: *`. The app tries a direct fetch first (fine for
CORS-friendly sites) and falls back to that endpoint. The origin lives in
`src/reader.ts`; if you deploy the site somewhere else, update it there.

## Version and release notes

Bump `version` in `package.json`, then add a matching entry at the top of
`src/changelog.ts` and rebuild the package. The desktop compares the running version
against the one stored in `localStorage` and opens the update log with the new notes
the first time a build runs.

```bash
npm version 1.2.0 --no-git-tag-version   # bump
# edit src/changelog.ts, then:
npm run build                            # bundle + fresh .deb in public/downloads/
```

## Notes

- Requires Node.js 20+ to build. `dpkg-deb` (from `dpkg-dev`) is needed only for the
  `.deb` (`npm run build`, `npm run deb`); `npm run build:web` and the update feed need
  nothing but Node. The ISO additionally needs `live-build`, `debootstrap`,
  `squashfs-tools` and `xorriso`, and root.
- `dist/` is generated. `public/downloads/*.deb` is committed on purpose so static
  hosting can serve the package without the Debian toolchain.
- Knits is not affiliated with Apple.

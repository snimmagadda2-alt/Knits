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
- **Lock screen** — click to unlock (any password).
- **Update log** — the first run of a new version shows what changed; close it with the
  X button or `Esc`, and reopen it from the Apple menu → *What's New in Knits*.
- **Safari** (installed app only) — address bar with search, back/forward, reload,
  favourites, an offline page, and an escape hatch that opens a page in a real tab.
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

Preferences, notes and wallpaper choices are stored in `localStorage`. Nothing is
sent over the network.

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

## Build and install the package

```bash
npm run build:web    # app bundle only
npm run deb          # packages dist/web into dist/knits_<version>_all.deb
sudo apt install ./dist/knits_1.4.0_all.deb
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
packaging/             Debian control files, launcher, icon, server
scripts/build-deb.sh   dpkg-deb build
install.sh             one-command install from this repository
```

## Deploy the site

`vercel.json` builds the static site from this repository:

- install: `npm ci`
- build: `npm run build:web` (no `dpkg-deb` needed)
- output: `dist/web`

Because the package at `public/downloads/` is committed, the download buttons work on
Vercel (or any static host) with no extra build step.

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

- Requires Node.js 20+ to build. `dpkg-deb` (from `dpkg-dev`) is needed for `npm run build`.
- `dist/` is generated. `public/downloads/*.deb` is committed on purpose so static
  hosting can serve the package without the Debian toolchain.
- Knits is not affiliated with Apple.

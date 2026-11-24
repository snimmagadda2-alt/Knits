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
`dist/web/downloads/knits_<version>_all.deb`, so the download link on the page
works from a single deployment.

## Build and install the package

```bash
npm run build:web    # app bundle only
npm run deb          # packages dist/web into dist/knits_<version>_all.deb
sudo apt install ./dist/knits_1.0.0_all.deb
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

## Notes

- Requires Node.js 20+ to build. `dpkg-deb` (from `dpkg-dev`) is needed for `npm run build`.
- The `.deb` and `dist/` are generated artifacts and are not committed.
- Knits is not affiliated with Apple.

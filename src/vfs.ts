export interface FsNode {
  name: string;
  kind: 'folder' | 'file';
  children?: FsNode[];
  content?: string;
  size?: string;
}

const note = (name: string, content: string, size: string): FsNode => ({ name, kind: 'file', content, size });
const folder = (name: string, children: FsNode[] = []): FsNode => ({ name, kind: 'folder', children });

export const HOME: FsNode = folder('knits', [
  folder('Desktop'),
  folder('Documents', [
    note(
      'welcome.md',
      `# Welcome to Knits

Knits is a desktop environment that looks and behaves like macOS but runs
anywhere a browser runs — including Debian-based Linux devices.

## What works

- Menu bar with an Apple-style menu and a live clock
- Dock with running indicators and window restore
- Draggable, resizable, minimisable windows
- Finder, Terminal, Notes, Calculator and System Settings
- Spotlight: press Command+Space (or Ctrl+Space)

## What it is not

Knits is a simulation, not a virtual machine. It does not run macOS
binaries and it does not need an Apple ROM.`,
      '1.1 KB',
    ),
    note(
      'stitch-guide.txt',
      `KNIT STITCH CHEAT SHEET

Knit        \u2014 the flat, V-shaped stitch
Purl        \u2014 the bumpy, pearl-shaped stitch
Stockinette \u2014 knit one row, purl one row
Garter      \u2014 knit every row
Ribbing     \u2014 knit one, purl one, repeat

Cast on:   slip knot, then loop stitches onto the needle
Bind off:  knit two, lift the first over the second, repeat

Tip: the yarn ball in the Knits icon is wound from the same
ribbon as the wallpaper.`,
      '412 B',
    ),
    folder('Projects', [
      note(
        'roadmap.md',
        `# Knits roadmap

- [x] Window server with drag, resize and z-order
- [x] Finder over a virtual file system
- [x] Terminal with a working shell subset
- [x] .deb package with a desktop entry
- [ ] Real Apple silicon emulation (not planned: needs Apple ROMs)
- [ ] Multi-monitor support`,
        '268 B',
      ),
      note('palette.css', `--accent: #0a84ff;\n--surface: rgba(28, 28, 32, 0.58);\n--radius: 12px;\n`, '96 B'),
    ]),
  ]),
  folder('Downloads', [
    note(
      'knits-clock_1.2_all.deb',
      `{
  "format": "knits-deb",
  "id": "clock",
  "name": "Clock",
  "version": "1.2",
  "publisher": "Knits Labs",
  "kind": "clock",
  "payload": {
    "zones": [
      { "label": "Local", "zone": null },
      { "label": "London", "zone": "Europe/London" },
      { "label": "Tokyo", "zone": "Asia/Tokyo" },
      { "label": "New York", "zone": "America/New_York" }
    ]
  }
}`,
      '18 KB',
    ),
    note(
      'install-deb.txt',
      `INSTALLING A .DEB INSIDE KNITS

1. Right-click the .deb file in Finder.
2. Choose Install.
3. The Knits installer opens: Welcome, Licence, Destination, Installation Type,
   Password, then a progress bar and the summary — the same steps macOS uses.

The .deb format here is a Knits package with a Debian filename. Nothing is
installed on the real computer, and the app appears in the Dock when it is done.

From the terminal the same thing is:

  dpkg -i knits-clock_1.2_all.deb`,
      '512 B',
    ),
  ]),
  folder('Pictures', [
    note('wallpaper.jpg', 'Knits Flow \u2014 the default wallpaper. Change it in System Settings.', '1.4 MB'),
    note('dock-preview.png', 'A screenshot of the dock at 1x.', '212 KB'),
  ]),
  folder('Music'),
  folder('Applications', [
    note('Finder.app', 'Browse the file system.', '2.4 MB'),
    note('Terminal.app', 'A small shell with a few working commands.', '1.8 MB'),
    note('Notes.app', 'Write notes; they persist in local storage.', '3.1 MB'),
    note('Calculator.app', 'Arithmetic, macOS style.', '1.2 MB'),
    note('System Settings.app', 'Appearance, wallpaper and accent colour.', '4.6 MB'),
  ]),
]);

/** Resolve a path relative to the home folder into node parts. */
export function resolvePath(cwd: string[], input: string): string[] | null {
  const raw = input.trim();
  if (!raw) return cwd;

  let parts: string[];
  if (raw === '~' || raw.startsWith('~/')) {
    parts = [];
    const rest = raw.slice(1).replace(/^\//, '');
    if (rest) parts = rest.split('/');
  } else if (raw.startsWith('/')) {
    parts = raw.split('/');
  } else {
    parts = [...cwd, ...raw.split('/')];
  }

  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }
  return resolved;
}

export function getNode(parts: string[]): FsNode | null {
  let node: FsNode = HOME;
  for (const part of parts) {
    if (node.kind !== 'folder') return null;
    const next = node.children?.find((child) => child.name === part);
    if (!next) return null;
    node = next;
  }
  return node;
}

export function pathLabel(parts: string[]): string {
  return parts.length === 0 ? 'knits' : `knits/${parts.join('/')}`;
}

export interface FlatFile {
  name: string;
  path: string;
  content: string;
}

export function flattenFiles(node: FsNode = HOME, prefix: string[] = []): FlatFile[] {
  const out: FlatFile[] = [];
  for (const child of node.children ?? []) {
    if (child.kind === 'folder') {
      out.push(...flattenFiles(child, [...prefix, child.name]));
    } else {
      out.push({ name: child.name, path: [...prefix, child.name].join('/'), content: child.content ?? '' });
    }
  }
  return out;
}

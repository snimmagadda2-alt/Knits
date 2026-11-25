export interface Release {
  version: string;
  date: string;
  changes: string[];
}

/** Newest first. Add a new entry at the top whenever the version in package.json goes up. */
export const RELEASES: Release[] = [
  {
    version: '1.6.0',
    date: '25 November 2026',
    changes: [
      'Knits 1.6.0 packages the Safari reader and Knits Store work into the installed app, so an updated copy reports the new version everywhere.',
      'About This Knits, neofetch, the landing page, the package and this log all read the same version number.',
      'Installed copies on an older build show this log the first time the new version runs.',
    ],
  },
  {
    version: '1.5.0',
    date: '25 November 2026',
    changes: [
      'Safari works now: Reader mode fetches any page through the Knits reader service and renders its text, headings and links, so sites that block embedding still show.',
      'A Reader/Web switch in the toolbar: Reader for the text, Web for sites that allow frames.',
      'Search and links work in Safari: type a query or click a link and the page loads in place.',
      'New: Knits Store, preinstalled in the Dock, with a custom logo, categories, search, one-click Get, Open and Uninstall.',
      'Both are installed-app features only, as before.',
    ],
  },
  {
    version: '1.4.0',
    date: '25 November 2026',
    changes: [
      'Installer now walks through the same steps macOS uses: welcome, licence agreement, destination disk, install type, password, progress and a success summary.',
      'A .dmg mounts on the desktop as a disk you can eject, and its volume window shows the app beside an Applications folder.',
      'Install a disk image the Mac way: drag the app onto Applications, or double-click it.',
      'Every step still installs inside Knits only — nothing is written to your real computer.',
    ],
  },
  {
    version: '1.3.0',
    date: '25 November 2026',
    changes: [
      'Safari can download .pkg and .dmg files. They land in a Downloads shelf instead of being rendered as pages.',
      'Installer opens .pkg files and installs them into Knits: the new app appears in the Dock and Spotlight straight away.',
      'Disk images mount with a Move to Applications step, then eject when you close them.',
      'Nothing is written to the real computer — installs live in Knits and are remembered in this browser.',
      'Knits Software on the Safari start page has three packages to try: Clock, Weather and Gallery.',
    ],
  },
  {
    version: '1.2.0',
    date: '25 November 2026',
    changes: [
      'Safari: an address bar, back and forward, reload, favourites and an offline page — in the installed app only.',
      'Wi-Fi now works: click the Wi-Fi icon in the menu bar to switch it off, on and between networks. Safari cannot load a page while it is off.',
      'Windows fly to their dock icon with a jelly squash-and-stretch when you minimise them, and spring back when you reopen them.',
      'Opening a window has the same little jelly bounce, in the installed app only.',
    ],
  },
  {
    version: '1.1.0',
    date: '25 November 2026',
    changes: [
      'The Download .deb button now serves the real package from any static host, including Vercel.',
      'The download link points at the latest package build, so version bumps cannot break it.',
      'Knits now shows what changed: this update log opens the first time a new version runs.',
      'The update log closes with the X button, and can be reopened from the Apple menu.',
    ],
  },
  {
    version: '1.0.0',
    date: '24 November 2026',
    changes: [
      'First release: menu bar, dock, window server and lock screen.',
      'Finder, Terminal, Notes, Calculator, System Settings and About.',
      'Architecture-independent .deb package with a loopback app launcher.',
      'Download site with install instructions.',
    ],
  },
];

export const LATEST = RELEASES[0];

/**
 * The releases newer than the version the user last ran. Passing null returns the whole
 * history, which is what a first run and the Apple menu entry show.
 */
export function releaseNotes(since: string | null): Release[] {
  if (!since) return RELEASES;
  const index = RELEASES.findIndex((release) => release.version === since);
  if (index <= 0) return index === 0 ? [] : RELEASES;
  return RELEASES.slice(0, index);
}

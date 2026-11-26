import { APPS } from '../apps';
import { AppIcon } from '../components/Icon';

// Stable path: scripts/build-deb.sh keeps knits_all.deb pointed at the newest build.
const DEB = `${import.meta.env.BASE_URL}downloads/knits_all.deb`;
const DEB_NAME = `knits_${__VERSION__}_all.deb`;
const REPO = 'https://github.com/snimmagadda2-alt/Knits';
// GitHub Actions publishes the image to the "iso" release, so this link never changes.
const ISO = `${REPO}/releases/download/iso/knits-amd64.iso`;
const ISO_RELEASE = `${REPO}/releases/tag/iso`;
const ISO_NAME = 'knits-amd64.iso';

const FEATURES = [
  {
    title: 'A desktop that behaves',
    body: 'Draggable, resizable windows with real z-order, minimise to the dock, double-click to zoom, and traffic lights that do what they say.',
  },
  {
    title: 'Apps that actually do something',
    body: 'Finder browses a virtual disk with a quick-look pane. Terminal runs ls, cd, cat, neofetch and more. Notes persist between visits.',
  },
  {
    title: 'Yours to tune',
    body: 'Light and dark appearance, three wallpapers and six accent colours, all remembered locally.',
  },
  {
    title: 'Google, built in',
    body: 'A real Google app sits in the dock: search, open a result, and read any site inside its own window.',
  },
  {
    title: 'Offline by design',
    body: 'The installed package serves its own files from 127.0.0.1. No accounts, no telemetry, no network calls.',
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="nav">
        <a className="nav-brand" href="#/">
          <AppIcon id="about" size={30} />
          <span>Knits</span>
        </a>
        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#install">Install</a>
          <a href="#iso">Live ISO</a>
          <a href="#/desktop">Demo</a>
        </nav>
        <a className="btn btn-small" href={DEB} download={DEB_NAME}>
          Download .deb
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Knits {__VERSION__} · for Debian-based Linux</span>
            <h1>
              macOS,
              <br />
              knitted for Linux.
            </h1>
            <p className="hero-sub">
              Knits is a macOS-style desktop that runs in a browser — and installs as a single <code>.deb</code> on any
              Debian, Ubuntu, Mint or Pop!_OS device. Real windows, a real dock, a working Finder and Terminal.
            </p>
            <div className="hero-actions">
              <a className="btn" href={DEB} download={DEB_NAME}>
                Download .deb
              </a>
              <a className="btn btn-ghost" href="#/desktop">
                Open the desktop
              </a>
            </div>
            <p className="hero-meta">Architecture-independent · Python 3 only · works offline</p>
          </div>

          <div className="hero-visual" aria-hidden>
            <div className="preview">
              <div className="preview-menubar">
                <span className="preview-apple">◉</span>
                <span>Finder</span>
                <span>File</span>
                <span>Edit</span>
                <span className="preview-clock">Tue 9:41 AM</span>
              </div>
              <div
                className="preview-body"
                style={{ backgroundImage: `url("${import.meta.env.BASE_URL}wallpaper.svg")` }}
              >
                <div className="preview-window">
                  <div className="preview-dots">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="preview-lines">
                    <b />
                    <b />
                    <b />
                    <b />
                    <b />
                  </div>
                </div>
                <div className="preview-dock">
                  {APPS.map((app) => (
                    <AppIcon key={app.id} id={app.id} size={26} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <h2>Built like a desktop, shipped like a package.</h2>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="install" id="install">
          <h2>Install it on your device</h2>
          <p className="install-sub">
            Download the package below, or build it from the repository in one command. Both paths install the same
            bundle and add Knits to your application menu.
          </p>

          <div className="install-grid">
            <div className="install-card">
              <h3>1 · Install the package</h3>
              <pre className="code">
                <code>{`# after downloading
sudo apt install ./knits_${__VERSION__}_all.deb

# then launch it
knits`}</code>
              </pre>
            </div>

            <div className="install-card">
              <h3>2 · Or install from the repo</h3>
              <pre className="code">
                <code>{`curl -fsSL ${REPO}/raw/main/install.sh | bash`}</code>
              </pre>
              <p className="install-hint">Clones, builds and installs with apt. Needs Node.js 20+ to build.</p>
            </div>
          </div>

          <div className="requirements">
            <div>
              <h4>Supported</h4>
              <p>Debian, Ubuntu, Linux Mint, Pop!_OS, Kali and derivatives</p>
            </div>
            <div>
              <h4>Requires</h4>
              <p>Python 3.7+, plus Chromium or Firefox for the app window</p>
            </div>
            <div>
              <h4>Footprint</h4>
              <p>One package, a few hundred kilobytes, no background services</p>
            </div>
          </div>
        </section>

        <section className="install" id="iso">
          <h2>Boot it for real</h2>
          <p className="install-sub">
            The ISO is a clean Debian 12 image with nothing on it but Knits. It boots straight into the desktop
            above — same menu bar, same dock, same apps — because it runs the same installed build from
            127.0.0.1. There is no installer and no second desktop environment: Knits is the session.
          </p>

          <div className="hero-actions" style={{ marginTop: 22 }}>
            <a className="btn" href={ISO} download={ISO_NAME}>
              Download ISO (amd64)
            </a>
            <a className="btn btn-ghost" href={ISO_RELEASE}>
              Checksum and build log
            </a>
          </div>
          <p className="install-hint">
            {ISO_NAME} · about 560 MB · boots on UEFI and BIOS · built by GitHub Actions from this repository.
            To build it yourself, run <code>npm run build:iso</code> or start the{' '}
            <a href={`${REPO}/actions/workflows/iso.yml`}>Build live ISO</a> workflow.
          </p>

          <img
            className="iso-shot"
            src={`${import.meta.env.BASE_URL}images/iso-boot.jpg`}
            alt="The Knits live ISO running on a laptop, showing the menu bar, dock and wallpaper"
            loading="lazy"
          />

          <div className="install-grid">
            <div className="install-card">
              <h3>Fastest · QEMU</h3>
              <pre className="code">
                <code>{`qemu-system-x86_64 -m 4096 -smp 2 \\
  -enable-kvm -cdrom ${ISO_NAME}`}</code>
              </pre>
              <p className="install-hint">On macOS use -accel hvf instead of -enable-kvm.</p>
            </div>

            <div className="install-card">
              <h3>VirtualBox or UTM</h3>
              <ol className="iso-steps">
                <li>New machine → Debian 64-bit, 4 GB RAM, 2 CPUs.</li>
                <li>Choose “Do not add a virtual hard disk”.</li>
                <li>Settings → Storage → attach the ISO to the optical drive.</li>
                <li>Start it. If you land in a shell, turn EFI off (System → uncheck Enable EFI).</li>
              </ol>
            </div>

            <div className="install-card">
              <h3>USB stick · real hardware</h3>
              <pre className="code">
                <code>{`sudo dd if=${ISO_NAME} of=/dev/sdX \\
  bs=4M status=progress oflag=sync`}</code>
              </pre>
              <p className="install-hint">
                Rufus, balenaEtcher or Ventoy work too. Turn Secure Boot off — the image is unsigned.
              </p>
            </div>
          </div>

          <div className="requirements">
            <div>
              <h4>First boot</h4>
              <p>A minute of loading, then the welcome screen asks for your name and a password.</p>
            </div>
            <div>
              <h4>Sign in</h4>
              <p>Knits asks for that password every time it starts, and when you lock the desktop.</p>
            </div>
            <div>
              <h4>Runs from RAM</h4>
              <p>Nothing is written to your disk. Notes, apps and your account live until you shut down.</p>
            </div>
            <div>
              <h4>Same build</h4>
              <p>Debian 12, the .deb from this site, and Chromium in kiosk mode — no extra desktop.</p>
            </div>
          </div>
        </section>

        <section className="closing">
          <h2>Want to see it first?</h2>
          <p>The whole desktop runs in this tab — menu bar, dock, windows and all.</p>
          <a className="btn" href="#/desktop">
            Launch the demo
          </a>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Knits</strong> · a macOS-style simulation, not a macOS distribution
        </div>
        <a href={REPO}>Source on GitHub</a>
      </footer>
    </div>
  );
}

import { APPS } from '../apps';
import { AppIcon } from '../components/Icon';

const DEB = `./downloads/knits_${__VERSION__}_all.deb`;
const REPO = 'https://github.com/snimmagadda2-alt/Knits';

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
          <a href="#/desktop">Demo</a>
        </nav>
        <a className="btn btn-small" href={DEB} download>
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
              <a className="btn" href={DEB} download>
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

import { useState } from 'react';
import { ACCENTS, WALLPAPERS, usePrefs } from '../prefs';
import { IS_APP } from '../environment';
import { checkForUpdate, installUpdate } from '../updater';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'wallpaper', label: 'Wallpaper' },
  { id: 'accent', label: 'Accent Colour' },
  { id: 'install', label: 'Install on Linux' },
  { id: 'update', label: 'Software Update' },
  { id: 'about', label: 'About' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export function Settings() {
  const { prefs, setPrefs } = usePrefs();
  const [section, setSection] = useState<SectionId>('appearance');

  return (
    <div className="settings">
      <aside className="settings-side">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            className={`settings-nav${section === item.id ? ' is-active' : ''}`}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </aside>

      <div className="settings-body">
        {section === 'appearance' && (
          <>
            <h2>Appearance</h2>
            <p className="settings-note">Choose how Knits looks. Your choice is remembered on this device.</p>
            <div className="appearance-options">
              {(['light', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  className={`appearance-card${prefs.appearance === mode ? ' is-active' : ''}`}
                  onClick={() => setPrefs({ appearance: mode })}
                >
                  <span className={`appearance-swatch swatch-${mode}`}>
                    <span className="appearance-bar" />
                    <span className="appearance-win" />
                  </span>
                  <span className="appearance-label">{mode === 'light' ? 'Light' : 'Dark'}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {section === 'wallpaper' && (
          <>
            <h2>Wallpaper</h2>
            <p className="settings-note">Three bundled backgrounds — no downloads required.</p>
            <div className="wallpaper-grid">
              {WALLPAPERS.map((paper) => (
                <button
                  key={paper.id}
                  className={`wallpaper-card${prefs.wallpaper === paper.id ? ' is-active' : ''}`}
                  onClick={() => setPrefs({ wallpaper: paper.id })}
                >
                  <span className="wallpaper-thumb" style={{ background: paper.background }} />
                  <span>{paper.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {section === 'accent' && (
          <>
            <h2>Accent Colour</h2>
            <p className="settings-note">Used for selections, highlights and focus rings.</p>
            <div className="accent-row">
              {ACCENTS.map((colour) => (
                <button
                  key={colour}
                  className={`accent-dot${prefs.accent === colour ? ' is-active' : ''}`}
                  style={{ background: colour }}
                  onClick={() => setPrefs({ accent: colour })}
                  aria-label={`Accent ${colour}`}
                />
              ))}
            </div>
          </>
        )}

        {section === 'install' && (
          <>
            <h2>Install on Linux</h2>
            <p className="settings-note">
              Knits ships as a single architecture-independent .deb for Debian, Ubuntu, Mint, Pop!_OS and Kali.
            </p>
            <div className="settings-row">
              <span>Download the package</span>
              <code>{`knits_${__VERSION__}_all.deb`}</code>
            </div>
            <div className="settings-row">
              <span>Install it</span>
              <code>{`sudo apt install ./knits_${__VERSION__}_all.deb`}</code>
            </div>
            <div className="settings-row">
              <span>Launch it</span>
              <code>knits</code>
            </div>
            <p className="settings-note">
              The package needs Python 3 and a Chromium or Firefox browser. It serves itself on 127.0.0.1 and never
              touches the network.
            </p>
          </>
        )}

        {section === 'update' && <SoftwareUpdate />}

        {section === 'about' && (
          <>
            <h2>About</h2>
            <div className="settings-row">
              <span>Knits</span>
              <code>{__VERSION__}</code>
            </div>
            <div className="settings-row">
              <span>Model</span>
              <code>Simulation — not a macOS virtual machine</code>
            </div>
            <div className="settings-row">
              <span>Storage</span>
              <code>localStorage</code>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SoftwareUpdate() {
  const [available, setAvailable] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const check = async () => {
    setBusy(true);
    setMessage(null);
    const result = await checkForUpdate();
    setBusy(false);
    if (!result) {
      setMessage('Knits could not reach the update service. Check the connection and try again.');
      return;
    }
    setAvailable(result.available ? result.latest : null);
    setMessage(result.available ? `Knits ${result.latest} is available.` : 'Knits is up to date.');
  };

  const install = async () => {
    setBusy(true);
    setMessage('Downloading the update…');
    const result = await installUpdate();
    if (!result.updated) {
      setBusy(false);
      setMessage(result.error ?? 'The update could not be installed.');
      return;
    }
    setMessage(`Knits ${result.version} installed. Reloading…`);
    window.setTimeout(() => window.location.reload(), 700);
  };

  return (
    <>
      <h2>Software Update</h2>
      <div className="settings-row">
        <span>Version</span>
        <code>{__VERSION__}</code>
      </div>
      <div className="settings-row">
        <span>Channel</span>
        <code>Stable</code>
      </div>
      <p className="settings-note">
        {IS_APP
          ? 'Knits checks for a newer build when it starts and updates itself in place — no password and no reinstall. An update unpacks beside the installed app and keeps your files, apps and settings.'
          : 'Automatic updates belong to the installed app. Download the package to run one.'}
      </p>
      {IS_APP && (
        <div className="settings-actions">
          <button className="settings-action" onClick={check} disabled={busy}>
            Check for Updates
          </button>
          {available && (
            <button className="settings-action is-primary" onClick={install} disabled={busy}>
              Update to {available}
            </button>
          )}
        </div>
      )}
      {message && <p className="settings-status">{message}</p>}
    </>
  );
}

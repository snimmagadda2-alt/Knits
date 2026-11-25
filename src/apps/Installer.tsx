import { useEffect, useRef, useState } from 'react';
import { formatSize, useLibrary, type Download } from '../library';
import { AppletIcon } from './Applet';
import { Glyph } from '../components/Icon';

interface Props {
  download: Download;
  onClose: () => void;
  onRun: (id: string) => void;
}

export function PackageInstaller({ download, onClose, onRun }: Props) {
  const { install, installed } = useLibrary();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);

  const app = download.app;
  const existing = app ? installed(app.id) : undefined;
  const installing = progress > 0 && !done;
  const finished = done || Boolean(existing);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !installing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [installing, onClose]);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  useEffect(() => {
    if (progress < 100 || done) return;
    install(download);
    setDone(true);
  }, [progress, done, install, download]);

  const start = () => {
    if (!app || installing) return;
    setProgress(6);
    timer.current = window.setInterval(() => {
      setProgress((value) => Math.min(100, value + 6 + Math.random() * 10));
    }, 90);
  };

  useEffect(() => {
    if (progress >= 100 && timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, [progress]);

  const heading = download.format === 'dmg' ? `Disk Image — ${download.volume ?? 'Untitled'}` : 'Installer';

  return (
    <div className="installer-backdrop">
      <div className="installer" role="dialog" aria-modal="true" aria-labelledby="installer-title">
        <header className="installer-head">
          <span id="installer-title">{heading}</span>
          <button className="whatsnew-x" onClick={onClose} aria-label="Close the installer" disabled={installing}>
            ×
          </button>
        </header>

        <div className="installer-body">
          {!app ? (
            <div className="installer-error">
              <Glyph name="disk" size={38} />
              <h2>This file cannot be installed</h2>
              <p>{download.error ?? 'Unknown package.'}</p>
              <p className="installer-note">
                Knits installs its own signed packages. Nothing was written to your real computer.
              </p>
            </div>
          ) : (
            <>
              <div className="installer-app">
                <AppletIcon kind={app.kind} size={64} />
                <div>
                  <h2>{app.name}</h2>
                  <p>
                    Version {app.version} · {formatSize(download.size)} · {app.publisher}
                  </p>
                </div>
              </div>

              {download.format === 'dmg' ? (
                <div className="installer-mount">
                  <div className="installer-volume">
                    <div className="installer-volume-app">
                      <AppletIcon kind={app.kind} size={46} />
                      <span>{app.name}</span>
                    </div>
                    <span className="installer-arrow" aria-hidden>
                      →
                    </span>
                    <div className="installer-folder">
                      <Glyph name="folder" size={30} />
                      <span>Applications</span>
                    </div>
                  </div>
                  <p className="installer-note">
                    Mounted from {download.fileName}. Installing copies the app into Knits, not onto your real disk.
                  </p>
                </div>
              ) : (
                <div className="installer-destination">
                  <span>Install for</span>
                  <strong>Knits HD — 128 GB (virtual)</strong>
                </div>
              )}

              {installing && (
                <div className="installer-progress">
                  <div className="installer-progress-track">
                    <span style={{ width: `${Math.round(progress)}%` }} />
                  </div>
                  <span>{Math.round(progress)}%</span>
                </div>
              )}

              {finished && (
                <div className="installer-done">
                  <Glyph name="check" size={18} />
                  <div>
                    <strong>{app.name} is installed in Knits.</strong>
                    <p>It is in the Dock and Spotlight. Your real computer was not touched.</p>
                  </div>
                </div>
              )}

              {!finished && (
                <p className="installer-note">
                  Installs inside Knits only. Nothing is written to your real computer, and no macOS software runs.
                </p>
              )}
            </>
          )}
        </div>

        <footer className="installer-foot">
          {!app ? (
            <button className="btn btn-small" onClick={onClose}>
              Close
            </button>
          ) : finished ? (
            <>
              <button className="btn btn-small btn-ghost" onClick={onClose}>
                Done
              </button>
              <button
                className="btn btn-small"
                onClick={() => {
                  onRun(`app:${app.id}`);
                  onClose();
                }}
              >
                Open {app.name}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-small btn-ghost" onClick={onClose} disabled={installing}>
                Cancel
              </button>
              <button className="btn btn-small" onClick={start} disabled={installing}>
                {installing ? 'Installing…' : download.format === 'dmg' ? 'Move to Applications' : 'Install'}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

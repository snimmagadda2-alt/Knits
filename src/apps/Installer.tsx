import { useEffect, useState } from 'react';
import { formatSize, useLibrary, type Download } from '../library';
import { AppletIcon } from './Applet';
import { Glyph } from '../components/Icon';

type Step = 'intro' | 'license' | 'destination' | 'type' | 'auth' | 'install' | 'summary';

interface Props {
  download: Download;
  onClose: () => void;
  onRun: (id: string) => void;
}

const PHASES = [
  'Validating packages…',
  'Preparing the installation…',
  'Writing files…',
  'Running package scripts…',
];

const LICENCE = `KNITS SOFTWARE LICENCE AGREEMENT

1. This software runs inside Knits. It does not run on macOS, and it does not install anything on the operating system hosting your browser.

2. Installs are stored in this browser profile only. Clearing site data removes them.

3. The package is provided as is, with no warranty of any kind.

4. You may copy, modify and redistribute this package.

5. Nothing in this agreement grants you any rights in Apple's trademarks or software. Knits is not affiliated with Apple.`;

export function PackageInstaller({ download, onClose, onRun }: Props) {
  const { install, installed } = useLibrary();
  const app = download.app;
  const [step, setStep] = useState<Step>('intro');
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const done = step === 'summary';
  // Remembered before installing, so the summary can tell a fresh install from a reinstall.
  const [wasInstalled] = useState(() => (app ? Boolean(installed(app.id)) : false));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'install') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onClose]);

  useEffect(() => {
    if (step !== 'install' || done) return;
    const tick = window.setInterval(() => {
      setProgress((value) => Math.min(100, value + 2.5 + Math.random() * 4));
    }, 60);
    return () => window.clearInterval(tick);
  }, [step, done]);

  useEffect(() => {
    if (step !== 'install' || done) return;
    if (progress >= 22 && phase < 1) setPhase(1);
    if (progress >= 52 && phase < 2) setPhase(2);
    if (progress >= 82 && phase < 3) setPhase(3);
    if (progress >= 100) {
      if (app) install(download);
      setStep('summary');
    }
  }, [progress, phase, step, done, install, download, app]);

  const next = () => {
    if (step === 'intro') setStep('license');
    else if (step === 'license') setStep('destination');
    else if (step === 'destination') setStep('type');
    else if (step === 'type') setStep('auth');
  };

  const back = () => {
    if (step === 'license') setStep('intro');
    else if (step === 'destination') setStep('license');
    else if (step === 'type') setStep('destination');
    else if (step === 'auth') setStep('type');
  };

  return (
    <div className="installer-backdrop">
      <div className="installer" role="dialog" aria-modal="true" aria-labelledby="installer-title">
        <header className="installer-head">
          <span id="installer-title">Install {app?.name ?? 'package'}</span>
          <button className="whatsnew-x" onClick={onClose} aria-label="Close the installer" disabled={step === 'install'}>
            ×
          </button>
        </header>

        {!app ? (
          <>
            <div className="installer-body">
              <div className="installer-error">
                <Glyph name="disk" size={38} />
                <h2>This package cannot be installed</h2>
                <p>{download.error ?? 'Unknown package.'}</p>
                <p className="installer-note">Knits only installs its own packages. Nothing was written to your real computer.</p>
              </div>
            </div>
            <footer className="installer-foot">
              <button className="btn btn-small" onClick={onClose}>
                Close
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="installer-body">
              <div className="installer-app">
                <AppletIcon kind={app.kind} size={64} />
                <div>
                  <h2>{app.name}</h2>
                  <p>
                    Version {app.version} · {formatSize(download.size)} · {app.publisher}
                  </p>
                </div>
              </div>

              {step === 'intro' && (
                <div className="installer-step">
                  <h3>Welcome to the {app.name} Installer</h3>
                  <p>
                    This package installs {app.name} into Knits. The app appears in your Dock and Spotlight, and it is
                    available the next time you open Knits.
                  </p>
                  <p className="installer-note">
                    Installations stay inside Knits. Nothing is written to your real computer and no macOS software runs.
                  </p>
                </div>
              )}

              {step === 'license' && (
                <div className="installer-step">
                  <h3>Software Licence Agreement</h3>
                  <pre className="installer-licence">{LICENCE}</pre>
                  <p className="installer-note">Click Agree to continue, or Disagree to cancel the installation.</p>
                </div>
              )}

              {step === 'destination' && (
                <div className="installer-step">
                  <h3>Select a Destination</h3>
                  <p>Select the disk where you want to install {app.name}.</p>
                  <ul className="installer-disks">
                    <li className="is-selected">
                      <Glyph name="disk" size={22} />
                      <span>
                        <strong>Knits HD</strong>
                        <em>128 GB virtual · 96.4 GB available</em>
                      </span>
                      <Glyph name="check" size={16} />
                    </li>
                  </ul>
                  <p className="installer-note">Other disks are not available: Knits is a single virtual machine.</p>
                </div>
              )}

              {step === 'type' && (
                <div className="installer-step">
                  <h3>Standard Install</h3>
                  <table className="installer-table">
                    <thead>
                      <tr>
                        <th>Package Name</th>
                        <th>Action</th>
                        <th>Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{app.name}</td>
                        <td>Install</td>
                        <td>{formatSize(download.size)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="installer-note">
                    This installs {formatSize(download.size)} of software on Knits HD. Your real disk is untouched.
                  </p>
                </div>
              )}

              {step === 'auth' && (
                <form
                  className="installer-step installer-auth"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep('install');
                  }}
                >
                  <div className="installer-lock">
                    <Glyph name="lock" size={22} />
                  </div>
                  <h3>Installer is trying to install new software</h3>
                  <p>Enter your password to allow this.</p>
                  <label>
                    <span>User Name</span>
                    <input value="knits" readOnly />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Any password works"
                      autoFocus
                    />
                  </label>
                  <button type="submit" className="visually-hidden" aria-hidden tabIndex={-1}>
                    Install Software
                  </button>
                </form>
              )}

              {step === 'install' && (
                <div className="installer-step">
                  <ul className="installer-phases">
                    {PHASES.map((label, index) => (
                      <li key={label} className={index < phase ? 'is-done' : index === phase ? 'is-active' : ''}>
                        <span className="installer-phase-dot">{index < phase ? '✓' : index === phase ? '•' : ''}</span>
                        {label}
                      </li>
                    ))}
                  </ul>
                  <div className="installer-progress">
                    <div className="installer-progress-track">
                      <span style={{ width: `${Math.round(progress)}%` }} />
                    </div>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              )}

              {step === 'summary' && (
                <div className="installer-step installer-summary">
                  <div className="installer-check">
                    <Glyph name="check" size={28} />
                  </div>
                  <h3>The installation was successful.</h3>
                  <p>
                    {app.name} was installed on Knits HD and added to your Dock and Spotlight.
                    {wasInstalled ? ' This replaced the copy that was already there.' : ''}
                  </p>
                  <p className="installer-note">Nothing was written to your real computer.</p>
                </div>
              )}
            </div>

            <footer className="installer-foot">
              {step === 'summary' ? (
                <>
                  <button className="btn btn-small btn-ghost" onClick={onClose}>
                    Close
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
              ) : step === 'install' ? (
                <span className="installer-foot-note">Installing into Knits…</span>
              ) : (
                <>
                  <button className="btn btn-small btn-ghost" onClick={onClose}>
                    Cancel
                  </button>
                  <span className="installer-foot-spacer" />
                  {step !== 'intro' && (
                    <button className="btn btn-small btn-ghost" onClick={back}>
                      Go Back
                    </button>
                  )}
                  {step === 'license' ? (
                    <>
                      <button className="btn btn-small btn-ghost" onClick={onClose}>
                        Disagree
                      </button>
                      <button className="btn btn-small" onClick={next}>
                        Agree
                      </button>
                    </>
                  ) : step === 'auth' ? (
                    <button className="btn btn-small" onClick={() => setStep('install')}>
                      Install Software
                    </button>
                  ) : (
                    <button className="btn btn-small" onClick={next}>
                      {step === 'type' ? 'Install' : 'Continue'}
                    </button>
                  )}
                </>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { APP_MAP, isInstalledId, type AppId } from '../apps';
import { usePrefs } from '../prefs';
import { useLibrary } from '../library';
import { IS_APP } from '../environment';
import { Applet } from '../apps/Applet';
import { PackageInstaller } from '../apps/Installer';
import { Dock } from '../components/Dock';
import { MenuBar } from '../components/MenuBar';
import { Spotlight } from '../components/Spotlight';
import { Window } from '../components/Window';
import { Finder } from '../apps/Finder';
import { Safari } from '../apps/Safari';
import { Terminal } from '../apps/Terminal';
import { Notes } from '../apps/Notes';
import { Calculator } from '../apps/Calculator';
import { Settings } from '../apps/Settings';
import { About } from '../apps/About';
import { LoginScreen } from './LoginScreen';
import { UpdateLog } from './UpdateLog';
import { useWindows } from './useWindows';

const SEEN_KEY = 'knits.seenVersion';

/** The version this browser last ran, or null when Knits has never run here (or storage is unavailable). */
function readSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function AppSurface({ app, onClose }: { app: AppId; onClose: () => void }) {
  const { apps } = useLibrary();

  if (isInstalledId(app)) {
    const entry = apps.find((item) => `app:${item.id}` === app);
    return entry ? <Applet app={entry} /> : null;
  }

  switch (app) {
    case 'finder':
      return <Finder />;
    case 'safari':
      return <Safari />;
    case 'terminal':
      return <Terminal onClose={onClose} />;
    case 'notes':
      return <Notes />;
    case 'calculator':
      return <Calculator />;
    case 'settings':
      return <Settings />;
    case 'about':
      return <About />;
  }
}

export default function Desktop() {
  const { wallpaper } = usePrefs();
  const { apps: installedApps, active: activePackage, close: closePackage } = useLibrary();
  const wm = useWindows();
  const [locked, setLocked] = useState(true);
  const [spotlight, setSpotlight] = useState(false);
  const [updates, setUpdates] = useState<{ since: string | null } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
        e.preventDefault();
        setSpotlight((open) => !open);
      }
      if (e.key === 'Escape') setSpotlight(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Every time a new build runs, show what changed. Dismissing the log records the version.
  useEffect(() => {
    if (locked) return;
    const seen = readSeenVersion();
    if (seen !== __VERSION__) setUpdates({ since: seen });
  }, [locked]);

  const closeUpdates = () => {
    setUpdates(null);
    try {
      localStorage.setItem(SEEN_KEY, __VERSION__);
    } catch {
      /* storage unavailable: the log will appear again next launch */
    }
  };

  if (locked) {
    return <LoginScreen wallpaper={wallpaper.background} onUnlock={() => setLocked(false)} />;
  }

  const running = new Set(wm.wins.map((win) => win.app));
  const activeWin = wm.wins.filter((win) => !win.minimized).sort((a, b) => b.z - a.z)[0] ?? null;

  const nameFor = (id: AppId): string => {
    if (isInstalledId(id)) return installedApps.find((app) => `app:${app.id}` === id)?.name ?? 'App';
    return APP_MAP[id].name;
  };

  return (
    <div className="desktop" style={{ background: wallpaper.background }}>
      <MenuBar
        activeApp={
          wm.activeApp ? { id: wm.activeApp, name: nameFor(wm.activeApp), width: 0, height: 0 } : null
        }
        onOpenApp={(id) => wm.openApp(id)}
        onSpotlight={() => setSpotlight(true)}
        onLock={() => setLocked(true)}
        onWhatsNew={() => setUpdates({ since: readSeenVersion() })}
        onRestart={() => {
          wm.closeAll();
          setLocked(true);
        }}
        onCloseActive={() => activeWin && wm.close(activeWin.id)}
      />

      <div className="desktop-area">
        {wm.wins
          .filter((win) => !win.minimized)
          .map((win) => (
            <Window
              key={win.id}
              win={win}
              title={nameFor(win.app)}
              active={activeWin?.id === win.id}
              onFocus={() => wm.focus(win.id)}
              onClose={() => wm.close(win.id)}
              onMinimize={() => wm.minimize(win.id)}
              onToggleMax={() => wm.toggleMax(win.id)}
              onMove={(x, y) => wm.move(win.id, x, y)}
              onResize={(w, h) => wm.resize(win.id, w, h)}
            >
              <AppSurface app={win.app} onClose={() => wm.close(win.id)} />
            </Window>
          ))}
      </div>

      <Dock runningApps={running} activeApp={wm.activeApp} onOpen={(id) => wm.openApp(id)} />

      {spotlight && <Spotlight onClose={() => setSpotlight(false)} onOpenApp={(id) => wm.openApp(id)} />}

      {updates && <UpdateLog since={updates.since} onClose={closeUpdates} />}

      {IS_APP && activePackage && (
        <PackageInstaller
          download={activePackage}
          onClose={closePackage}
          onRun={(id) => wm.openApp(id as AppId)}
        />
      )}
    </div>
  );
}

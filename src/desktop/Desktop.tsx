import { useEffect, useState } from 'react';
import { APP_MAP, isInstalledId, type AppId } from '../apps';
import { usePrefs } from '../prefs';
import { useLibrary } from '../library';
import { IS_APP } from '../environment';
import { Applet } from '../apps/Applet';
import { PackageInstaller } from '../apps/Installer';
import { DiskImage } from '../apps/DiskImage';
import { Dock } from '../components/Dock';
import { MenuBar } from '../components/MenuBar';
import { Spotlight } from '../components/Spotlight';
import { Glyph } from '../components/Icon';
import { Window } from '../components/Window';
import { Finder } from '../apps/Finder';
import { Google } from '../apps/Google';
import { Safari } from '../apps/Safari';
import { Store } from '../apps/Store';
import { Terminal } from '../apps/Terminal';
import { Notes } from '../apps/Notes';
import { Calculator } from '../apps/Calculator';
import { Settings } from '../apps/Settings';
import { About } from '../apps/About';
import { LoginScreen } from './LoginScreen';
import { Welcome } from './Welcome';
import { UpdateLog } from './UpdateLog';
import { readAccount, type Account } from '../account';
import { useWindows } from './useWindows';
import { checkForUpdate, installUpdate, markUpdateAttempt, updateAttempted } from '../updater';

const SEEN_KEY = 'knits.seenVersion';

/** The version this browser last ran, or null when Knits has never run here (or storage is unavailable). */
function readSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function AppSurface({ app, onClose, onOpen }: { app: AppId; onClose: () => void; onOpen: (id: AppId) => void }) {
  const { apps } = useLibrary();

  if (isInstalledId(app)) {
    const entry = apps.find((item) => `app:${item.id}` === app);
    return entry ? <Applet app={entry} /> : null;
  }

  switch (app) {
    case 'finder':
      return <Finder />;
    case 'google':
      return <Google />;
    case 'safari':
      return <Safari />;
    case 'store':
      return <Store onOpen={onOpen} />;
    case 'terminal':
      return <Terminal onClose={onClose} onOpen={onOpen} />;
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
  const {
    apps: installedApps,
    active: activePackage,
    close: closePackage,
    volumes,
    openVolume,
    selectVolume,
    eject,
  } = useLibrary();
  const wm = useWindows();
  // The account belongs to the installed app and the ISO. The website demo opens
  // straight into the desktop: visitors should not have to invent a password to look.
  const [account, setAccount] = useState<Account | null>(readAccount);
  const [locked, setLocked] = useState(IS_APP);
  const [spotlight, setSpotlight] = useState(false);
  const [updates, setUpdates] = useState<{ since: string | null } | null>(null);
  const [selfUpdate, setSelfUpdate] = useState<{ phase: 'working' | 'failed'; version: string } | null>(null);

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

  // An installed copy updates itself: ask the local server what has been published,
  // unpack a newer bundle when there is one, then reload into it. One attempt per
  // build per session keeps a broken download from looping.
  useEffect(() => {
    if (locked || !IS_APP) return;
    let cancelled = false;
    const run = async () => {
      const check = await checkForUpdate();
      if (cancelled || !check?.available || updateAttempted(check.latest)) return;
      markUpdateAttempt(check.latest);
      setSelfUpdate({ phase: 'working', version: check.latest });
      const result = await installUpdate();
      if (cancelled) return;
      if (result.updated) {
        setSelfUpdate({ phase: 'working', version: result.version ?? check.latest });
        window.setTimeout(() => window.location.reload(), 700);
      } else {
        setSelfUpdate({ phase: 'failed', version: check.latest });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [locked]);

  const closeUpdates = () => {
    setUpdates(null);
    try {
      localStorage.setItem(SEEN_KEY, __VERSION__);
    } catch {
      /* storage unavailable: the log will appear again next launch */
    }
  };

  if (IS_APP) {
    if (!account) {
      return <Welcome wallpaper={wallpaper.background} onCreated={setAccount} />;
    }
    if (locked) {
      return (
        <LoginScreen
          account={account}
          wallpaper={wallpaper.background}
          onUnlock={() => setLocked(false)}
        />
      );
    }
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
        onLock={() => {
          if (IS_APP) setLocked(true);
        }}
        onWhatsNew={() => setUpdates({ since: readSeenVersion() })}
        onRestart={() => {
          wm.closeAll();
          setLocked(IS_APP);
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
              <AppSurface
                app={win.app}
                onClose={() => wm.close(win.id)}
                onOpen={(id) => wm.openApp(id)}
              />
            </Window>
          ))}
      </div>

      {volumes.length > 0 && (
        <div className="desktop-volumes">
          {volumes.map((volume) => (
            <button
              key={volume.id}
              className="desktop-volume"
              onClick={() => selectVolume(volume.id)}
              title={`${volume.name} — mounted disk image`}
            >
              <Glyph name="disk" size={32} />
              <span>{volume.name}</span>
            </button>
          ))}
        </div>
      )}

      <Dock runningApps={running} activeApp={wm.activeApp} onOpen={(id) => wm.openApp(id)} />

      {spotlight && <Spotlight onClose={() => setSpotlight(false)} onOpenApp={(id) => wm.openApp(id)} />}

      {updates && <UpdateLog since={updates.since} onClose={closeUpdates} />}

      {selfUpdate && (
        <div className={`update-pill${selfUpdate.phase === 'failed' ? ' is-failed' : ''}`} role="status">
          {selfUpdate.phase === 'working'
            ? `Updating Knits to ${selfUpdate.version}…`
            : `Knits ${selfUpdate.version} could not be installed — System Settings › Software Update`}
        </div>
      )}

      {IS_APP && activePackage && (
        <PackageInstaller
          download={activePackage}
          onClose={closePackage}
          onRun={(id) => wm.openApp(id as AppId)}
        />
      )}

      {IS_APP &&
        volumes.map((volume) =>
          openVolume === volume.id ? (
            <DiskImage
              key={volume.id}
              volume={volume}
              onClose={() => selectVolume(null)}
              onEject={() => eject(volume.id)}
              onRun={(id) => wm.openApp(id as AppId)}
            />
          ) : null,
        )}
    </div>
  );
}

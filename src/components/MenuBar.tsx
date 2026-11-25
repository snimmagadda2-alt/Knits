import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Glyph } from './Icon';
import { NETWORKS, usePrefs } from '../prefs';
import { IS_APP } from '../environment';
import type { AppDef } from '../apps';

interface MenuItem {
  label: string;
  action?: () => void;
  divider?: boolean;
}

interface Props {
  activeApp: AppDef | null;
  onOpenApp: (id: 'settings' | 'about') => void;
  onSpotlight: () => void;
  onLock: () => void;
  onRestart: () => void;
  onWhatsNew: () => void;
  onCloseActive: () => void;
}

function clockText(now: Date) {
  const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
  const month = now.toLocaleDateString(undefined, { month: 'short' });
  const day = now.getDate();
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} ${month} ${day}  ${time}`;
}

/** App builds only: a working Wi-Fi switch that Safari reads before loading a page. */
function WifiStatus() {
  const { prefs, setPrefs } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div className="wifi" ref={ref}>
      <button
        className={`mb-status${open ? ' is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Wi-Fi"
      >
        <Glyph name={prefs.wifi ? 'wifi' : 'wifi-off'} size={16} />
      </button>

      {open && (
        <div className="wifi-panel">
          <div className="wifi-head">
            <span>Wi-Fi</span>
            <button
              className={`switch${prefs.wifi ? ' is-on' : ''}`}
              role="switch"
              aria-checked={prefs.wifi}
              aria-label="Wi-Fi"
              onClick={() => setPrefs({ wifi: !prefs.wifi })}
            >
              <span className="switch-knob" />
            </button>
          </div>

          {prefs.wifi ? (
            <>
              <p className="wifi-note">Connected to {prefs.network}</p>
              <div className="wifi-networks">
                {NETWORKS.map((network) => (
                  <button
                    key={network}
                    className={`wifi-row${prefs.network === network ? ' is-current' : ''}`}
                    onClick={() => setPrefs({ network })}
                  >
                    <Glyph name="wifi" size={15} />
                    <span>{network}</span>
                    <Glyph name="lock" size={13} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="wifi-note">Wi-Fi is off. Safari cannot load pages until it is back on.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MenuBar({
  activeApp,
  onOpenApp,
  onSpotlight,
  onLock,
  onRestart,
  onWhatsNew,
  onCloseActive,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const run = (action?: () => void) => {
    setOpen(null);
    action?.();
  };

  const renderMenu = (id: string, label: ReactNode, items: MenuItem[]) => (
    <div className="mb-menu">
      <button
        className={`mb-item${open === id ? ' is-open' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          setOpen(open === id ? null : id);
        }}
        onPointerEnter={() => open && setOpen(id)}
      >
        {label}
      </button>
      {open === id && (
        <div className="mb-dropdown" role="menu">
          {items.map((item, index) =>
            item.divider ? (
              <div className="mb-sep" key={`sep-${index}`} />
            ) : (
              <button className="mb-option" key={item.label} onClick={() => run(item.action)} role="menuitem">
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );

  const appName = activeApp?.name ?? 'Finder';

  return (
    <div className="menubar" ref={barRef}>
      <div className="mb-left">
        {renderMenu('apple', <Glyph name="apple" size={15} />, [
          { label: 'About This Knits', action: () => onOpenApp('about') },
          { label: "What's New in Knits", action: onWhatsNew },
          { label: 'System Settings…', action: () => onOpenApp('settings') },
          { label: '', divider: true },
          { label: 'Sleep', action: onLock },
          { label: 'Restart…', action: onRestart },
        ])}
        {renderMenu('app', appName, [
          { label: `About ${appName}`, action: () => onOpenApp('about') },
          { label: 'Settings…', action: () => onOpenApp('settings') },
          { label: '', divider: true },
          { label: `Quit ${appName}`, action: onCloseActive },
        ])}
        {renderMenu('file', 'File', [
          { label: 'New Window' },
          { label: 'Open…' },
          { label: '', divider: true },
          { label: 'Close Window', action: onCloseActive },
        ])}
        {renderMenu('edit', 'Edit', [
          { label: 'Undo' },
          { label: 'Cut' },
          { label: 'Copy' },
          { label: 'Paste' },
        ])}
        {renderMenu('view', 'View', [
          { label: 'as Icons' },
          { label: 'as List' },
          { label: '', divider: true },
          { label: 'Enter Full Screen' },
        ])}
        {renderMenu('window', 'Window', [
          { label: 'Minimise' },
          { label: 'Zoom' },
          { label: '', divider: true },
          { label: 'Bring All to Front' },
        ])}
        {renderMenu('help', 'Help', [{ label: 'Knits Help', action: () => onOpenApp('about') }])}
      </div>

      <div className="mb-right">
        <button className="mb-status" onClick={onSpotlight} aria-label="Spotlight search">
          <Glyph name="search" size={15} />
        </button>
        {IS_APP ? (
          <WifiStatus />
        ) : (
          <span className="mb-status" aria-hidden>
            <Glyph name="wifi" size={16} />
          </span>
        )}
        <span className="mb-status" aria-hidden>
          <Glyph name="battery" size={18} />
        </span>
        <span className="mb-status" aria-hidden>
          <Glyph name="control" size={15} />
        </span>
        <span className="mb-clock">{clockText(now)}</span>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Glyph } from './Icon';
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
  onCloseActive: () => void;
}

function clockText(now: Date) {
  const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
  const month = now.toLocaleDateString(undefined, { month: 'short' });
  const day = now.getDate();
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} ${month} ${day}  ${time}`;
}

export function MenuBar({ activeApp, onOpenApp, onSpotlight, onLock, onRestart, onCloseActive }: Props) {
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
        <span className="mb-status" aria-hidden>
          <Glyph name="wifi" size={16} />
        </span>
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

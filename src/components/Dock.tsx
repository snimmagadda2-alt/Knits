import { APPS, type AppId } from '../apps';
import { AppIcon } from './Icon';

interface Props {
  runningApps: Set<AppId>;
  activeApp: AppId | null;
  onOpen: (id: AppId) => void;
}

export function Dock({ runningApps, activeApp, onOpen }: Props) {
  return (
    <div className="dock-wrap">
      <div className="dock" role="toolbar" aria-label="Dock">
        {APPS.map((app) => (
          <button
            key={app.id}
            className={`dock-item${activeApp === app.id ? ' is-active' : ''}`}
            onClick={() => onOpen(app.id)}
            aria-label={app.name}
          >
            <span className="dock-label">{app.name}</span>
            <AppIcon id={app.id} size={52} />
            <span className={`dock-dot${runningApps.has(app.id) ? ' is-on' : ''}`} />
          </button>
        ))}
        <span className="dock-sep" />
        <button className="dock-item" aria-label="Trash">
          <span className="dock-label">Trash</span>
          <AppIcon id="trash" size={52} />
        </button>
      </div>
    </div>
  );
}

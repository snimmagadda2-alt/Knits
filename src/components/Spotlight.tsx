import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { APPS, type AppId } from '../apps';
import { flattenFiles } from '../vfs';
import { useLibrary } from '../library';
import { AppletIcon } from '../apps/Applet';
import { AppIcon, Glyph } from './Icon';

interface Props {
  onClose: () => void;
  onOpenApp: (id: AppId) => void;
}

interface Result {
  key: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  run: () => void;
}

export function Spotlight({ onClose, onOpenApp }: Props) {
  const { apps } = useLibrary();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const appResults: Result[] = APPS.filter((app) => !q || app.name.toLowerCase().includes(q)).map((app) => ({
      key: `app-${app.id}`,
      title: app.name,
      subtitle: 'Application',
      icon: <AppIcon id={app.id} size={34} />,
      run: () => {
        onOpenApp(app.id);
        onClose();
      },
    }));

    const installedResults: Result[] = apps
      .filter((app) => !q || app.name.toLowerCase().includes(q))
      .map((app) => ({
        key: `installed-${app.id}`,
        title: app.name,
        subtitle: 'Installed in Knits',
        icon: <AppletIcon kind={app.kind} size={34} />,
        run: () => {
          onOpenApp(`app:${app.id}`);
          onClose();
        },
      }));

    const fileResults: Result[] = flattenFiles()
      .filter((file) => q.length > 1 && (file.name.toLowerCase().includes(q) || file.content.toLowerCase().includes(q)))
      .slice(0, 5)
      .map((file) => ({
        key: `file-${file.path}`,
        title: file.name,
        subtitle: file.path,
        icon: (
          <span className="spot-file-icon">
            <Glyph name="doc" size={20} />
          </span>
        ),
        run: () => {
          onOpenApp('finder');
          onClose();
        },
      }));

    return [...appResults, ...installedResults, ...fileResults];
  }, [query, apps, onOpenApp, onClose]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      results[cursor]?.run();
    }
  };

  return (
    <div className="spotlight-backdrop" onPointerDown={onClose}>
      <div className="spotlight" onPointerDown={(e) => e.stopPropagation()}>
        <div className="spotlight-field">
          <Glyph name="search" size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Spotlight Search"
            aria-label="Spotlight Search"
          />
        </div>
        {results.length > 0 ? (
          <ul className="spotlight-results">
            {results.map((result, index) => (
              <li key={result.key}>
                <button
                  className={`spotlight-row${index === cursor ? ' is-selected' : ''}`}
                  onPointerEnter={() => setCursor(index)}
                  onClick={result.run}
                >
                  {result.icon}
                  <span className="spotlight-text">
                    <span className="spotlight-title">{result.title}</span>
                    <span className="spotlight-sub">{result.subtitle}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="spotlight-empty">No results for “{query}”</p>
        )}
      </div>
    </div>
  );
}

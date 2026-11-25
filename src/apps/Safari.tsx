import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '../prefs';
import { Glyph } from '../components/Icon';

interface Favorite {
  title: string;
  url: string;
}

const FAVORITES: Favorite[] = [
  { title: 'Example', url: 'https://example.com' },
  { title: 'Wikipedia', url: 'https://en.wikipedia.org' },
  { title: 'Hacker News', url: 'https://news.ycombinator.com' },
  { title: 'OpenStreetMap', url: 'https://www.openstreetmap.org' },
];

function normalize(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(value)) return `https://${value}`;
  return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(value)}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function Safari() {
  const { prefs, setPrefs } = usePrefs();
  const [stack, setStack] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [field, setField] = useState('');
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const page = cursor >= 0 ? stack[cursor] : null;

  useEffect(() => {
    setField(page ?? '');
    setLoading(page !== null);
  }, [page]);

  const visit = (raw: string) => {
    const url = normalize(raw);
    if (!url) return;
    setStack((prev) => [...prev.slice(0, cursor + 1), url]);
    setCursor(cursor + 1);
    setLoading(true);
  };

  const step = (delta: number) => {
    const next = cursor + delta;
    if (next < 0 || next >= stack.length) return;
    setCursor(next);
    setLoading(true);
  };

  const reload = () => {
    if (!page) return;
    setNonce((n) => n + 1);
    setLoading(true);
  };

  const host = page ? hostOf(page) : '';

  return (
    <div className="safari">
      <div className="safari-toolbar">
        <div className="safari-nav">
          <button className="safari-btn" onClick={() => step(-1)} disabled={cursor <= 0} aria-label="Back">
            <Glyph name="chevron-left" size={16} />
          </button>
          <button
            className="safari-btn"
            onClick={() => step(1)}
            disabled={cursor >= stack.length - 1}
            aria-label="Forward"
          >
            <Glyph name="chevron-right" size={16} />
          </button>
        </div>

        <form
          className="safari-field"
          onSubmit={(e) => {
            e.preventDefault();
            visit(field);
            inputRef.current?.blur();
          }}
        >
          <Glyph name={page ? 'lock' : 'search'} size={14} />
          <input
            ref={inputRef}
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="Search or enter website name"
            aria-label="Address and search"
            spellCheck={false}
          />
          {page && (
            <button type="button" className="safari-icon-btn" onClick={reload} aria-label="Reload">
              <Glyph name="reload" size={14} />
            </button>
          )}
        </form>

        {page && (
          <a className="safari-btn" href={page} target="_blank" rel="noreferrer" aria-label="Open in a new tab">
            <Glyph name="external" size={15} />
          </a>
        )}
        {!prefs.wifi && (
          <span className="safari-offline-chip">
            <Glyph name="wifi-off" size={14} /> Offline
          </span>
        )}
      </div>

      {loading && page && <div className="safari-progress" />}

      <div className="safari-view">
        {!prefs.wifi ? (
          <div className="safari-offline">
            <Glyph name="wifi-off" size={42} />
            <h2>You are not connected to the Internet</h2>
            <p>Safari needs Wi-Fi. Turn it on in the menu bar, or right here.</p>
            <button className="btn btn-small" onClick={() => setPrefs({ wifi: true })}>
              Turn On Wi-Fi
            </button>
          </div>
        ) : page ? (
          <iframe
            key={`${page}-${nonce}`}
            className="safari-frame"
            src={page}
            title={host}
            onLoad={() => setLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="safari-start">
            <h2>Favourites</h2>
            <div className="safari-favs">
              {FAVORITES.map((fav) => (
                <button key={fav.url} className="safari-fav" onClick={() => visit(fav.url)}>
                  <span className="safari-fav-dot" />
                  <span className="safari-fav-title">{fav.title}</span>
                  <span className="safari-fav-url">{hostOf(fav.url)}</span>
                </button>
              ))}
            </div>
            <p className="safari-hint">
              Connected to {prefs.network}. Sites that refuse to be embedded in a frame load blank — the arrow in the
              toolbar opens them in a real browser tab.
            </p>
          </div>
        )}
      </div>

      <div className="safari-status">
        <span>{page ? host : 'Start Page'}</span>
        <span>{page ? (page.startsWith('https://') ? 'Secure' : 'Not secure') : 'Wi-Fi ' + (prefs.wifi ? 'on' : 'off')}</span>
      </div>
    </div>
  );
}

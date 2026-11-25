import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '../prefs';
import { formatSize, useLibrary } from '../library';
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

/** Packages that ship with Knits, served next to the app itself. */
const CATALOGUE = [
  { name: 'Clock', file: 'knits-clock.pkg', format: 'pkg', blurb: 'World clock with a live digital face.' },
  { name: 'Weather', file: 'knits-weather.pkg', format: 'pkg', blurb: 'Five day forecast for Knits Studio.' },
  { name: 'Gallery', file: 'knits-gallery.dmg', format: 'dmg', blurb: 'Colour tiles, shipped as a disk image.' },
];

const packageUrl = (file: string) => new URL(`${import.meta.env.BASE_URL}packages/${file}`, window.location.href).href;
const isPackageUrl = (url: string) => /\.(pkg|dmg)(?:$|[?#])/i.test(url);

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
  const { downloads, download, open, remove, clearDownloads, installed } = useLibrary();
  const [stack, setStack] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [field, setField] = useState('');
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [shelf, setShelf] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const page = cursor >= 0 ? stack[cursor] : null;

  useEffect(() => {
    setField(page ?? '');
    setLoading(page !== null);
  }, [page]);

  const visit = (raw: string) => {
    if (!prefs.wifi) return;
    const url = normalize(raw);
    if (!url) return;

    // A package is downloaded, not displayed.
    if (isPackageUrl(url)) {
      setShelf(true);
      void download(url);
      return;
    }

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

            <h2>Knits Software</h2>
            <div className="safari-packages">
              {CATALOGUE.map((item) => {
                const done = installed(item.file.replace(/^knits-/, '').replace(/\.(pkg|dmg)$/, ''));
                return (
                  <button
                    key={item.file}
                    className="safari-package"
                    onClick={() => {
                      setShelf(true);
                      void download(packageUrl(item.file));
                    }}
                  >
                    <span className={`safari-package-badge is-${item.format}`}>.{item.format}</span>
                    <span className="safari-package-title">{item.name}</span>
                    <span className="safari-package-blurb">{item.blurb}</span>
                    <span className="safari-package-state">{done ? 'Installed' : 'Download'}</span>
                  </button>
                );
              })}
            </div>

            <p className="safari-hint">
              Connected to {prefs.network}. Packages install inside Knits only — nothing is written to your real
              computer. Sites that refuse to be embedded load blank; the arrow in the toolbar opens them in a real tab.
            </p>
          </div>
        )}
      </div>

      {downloads.length > 0 && shelf && (
        <div className="safari-downloads">
          <div className="safari-downloads-head">
            <span>
              <Glyph name="download" size={13} /> Downloads
            </span>
            <span className="safari-downloads-actions">
              <button onClick={clearDownloads} aria-label="Clear downloads">
                Clear
              </button>
              <button onClick={() => setShelf(false)} aria-label="Hide downloads">
                ×
              </button>
            </span>
          </div>
          {downloads.map((item) => (
            <div key={item.id} className={`safari-download${item.error ? ' is-broken' : ''}`}>
              <button className="safari-download-open" onClick={() => open(item)}>
                <span className="safari-download-name">{item.fileName}</span>
                <span className="safari-download-meta">
                  {item.error ?? `${item.format === 'dmg' ? 'Disk image' : 'Package'} · ${formatSize(item.size)}`}
                </span>
              </button>
              <button className="safari-icon-btn" onClick={() => remove(item.id)} aria-label={`Remove ${item.fileName}`}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="safari-status">
        <span>{page ? host : 'Start Page'}</span>
        <span>
          {page ? (page.startsWith('https://') ? 'Secure' : 'Not secure') : `Wi-Fi ${prefs.wifi ? 'on' : 'off'}`}
        </span>
      </div>
    </div>
  );
}

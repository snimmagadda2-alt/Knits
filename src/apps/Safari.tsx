import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '../prefs';
import { formatSize, useLibrary } from '../library';
import { CATALOG, packageUrl } from '../catalog';
import { readPage, type ReaderDoc, type Span } from '../reader';
import { Glyph } from '../components/Icon';

type Mode = 'reader' | 'web';

const FAVORITES = [
  { title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/MacOS' },
  { title: 'Hacker News', url: 'https://news.ycombinator.com' },
  { title: 'Example', url: 'https://example.com' },
  { title: 'Knits repo', url: 'https://github.com/snimmagadda2-alt/Knits' },
];

const isPackageUrl = (url: string) => /\.(pkg|dmg)(?:$|[?#])/i.test(url);

function normalize(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(value)) return `https://${value}`;
  return `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(value)}`;
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
  const [mode, setMode] = useState<Mode>('reader');
  const [doc, setDoc] = useState<ReaderDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [shelf, setShelf] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const page = cursor >= 0 ? stack[cursor] : null;

  useEffect(() => {
    setField(page ?? '');
  }, [page]);

  useEffect(() => {
    if (!page) return;
    if (mode === 'web') {
      setDoc(null);
      setError(null);
      setLoading(true);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDoc(null);

    readPage(page, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setDoc(result);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : 'That page could not be read.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [page, mode, nonce]);

  const visit = (raw: string) => {
    if (!prefs.wifi) return;
    const url = normalize(raw);
    if (!url) return;

    if (isPackageUrl(url)) {
      setShelf(true);
      void download(url);
      return;
    }

    if (url === page) {
      setNonce((value) => value + 1);
      return;
    }

    setStack((prev) => [...prev.slice(0, cursor + 1), url]);
    setCursor(cursor + 1);
  };

  const step = (delta: number) => {
    const next = cursor + delta;
    if (next < 0 || next >= stack.length) return;
    setCursor(next);
  };

  const reload = () => {
    if (!page) return;
    if (mode === 'web') {
      setLoading(true);
      setNonce((value) => value + 1);
      return;
    }
    setNonce((value) => value + 1);
  };

  const renderSpans = (spans: Span[]) =>
    spans.map((span, index) =>
      span.href ? (
        <button key={`${span.href}-${index}`} className="reader-link" onClick={() => visit(span.href!)}>
          {span.text}
        </button>
      ) : (
        <span key={index}>{span.text}</span>
      ),
    );

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

        <div className="safari-modes" role="group" aria-label="Page mode">
          <button
            className={`safari-mode${mode === 'reader' ? ' is-active' : ''}`}
            onClick={() => setMode('reader')}
            title="Reader: text and links, works on almost every site"
          >
            Reader
          </button>
          <button
            className={`safari-mode${mode === 'web' ? ' is-active' : ''}`}
            onClick={() => setMode('web')}
            title="Web: the page in a frame, for sites that allow it"
          >
            Web
          </button>
        </div>

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
        ) : !page ? (
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
              {CATALOG.map((item) => {
                const done = installed(item.id);
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
              Reader shows the text and links of any page, which works where frames are blocked. Web mode shows the
              real page when the site allows embedding. Connected to {prefs.network}.
            </p>
          </div>
        ) : mode === 'web' ? (
          <iframe
            key={`${page}-${nonce}`}
            className="safari-frame"
            src={page}
            title={host}
            onLoad={() => setLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerPolicy="no-referrer"
          />
        ) : error ? (
          <div className="safari-offline">
            <Glyph name="doc" size={38} />
            <h2>Safari cannot open this page</h2>
            <p>{error}</p>
            <div className="safari-error-actions">
              <button className="btn btn-small" onClick={reload}>
                Try Again
              </button>
              <a className="btn btn-small btn-ghost" href={page} target="_blank" rel="noreferrer">
                Open in a Real Browser
              </a>
            </div>
          </div>
        ) : doc ? (
          <article className="reader">
            <header className="reader-head">
              <span className="reader-host">{doc.host}</span>
              <h1>{doc.title}</h1>
            </header>
            {doc.blocks.map((block, index) => {
              if (block.kind === 'heading') {
                return (
                  <h3 key={index} className={`reader-heading level-${block.level}`}>
                    {block.text}
                  </h3>
                );
              }
              if (block.kind === 'paragraph') {
                return (
                  <p key={index} className="reader-paragraph">
                    {renderSpans(block.spans)}
                  </p>
                );
              }
              if (block.kind === 'list') {
                return (
                  <ul key={index} className="reader-list">
                    {block.items.map((item, itemIndex) => (
                      <li key={itemIndex}>{renderSpans(item)}</li>
                    ))}
                  </ul>
                );
              }
              if (block.kind === 'quote') {
                return (
                  <blockquote key={index} className="reader-quote">
                    {renderSpans(block.spans)}
                  </blockquote>
                );
              }
              return (
                <pre key={index} className="reader-code">
                  {block.text}
                </pre>
              );
            })}
          </article>
        ) : (
          <div className="safari-offline">
            <Glyph name="reload" size={34} />
            <h2>Reading {host}…</h2>
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
        <span>{page ? (mode === 'reader' ? 'Reader' : 'Web') : `Wi-Fi ${prefs.wifi ? 'on' : 'off'}`}</span>
      </div>
    </div>
  );
}

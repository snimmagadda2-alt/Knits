import { useEffect, useRef, useState } from 'react';
import { readPage, type ReaderDoc, type Span } from '../reader';
import { Glyph } from '../components/Icon';

const QUICK = [
  { label: 'Images', url: 'https://www.google.com/imghp' },
  { label: 'Maps', url: 'https://www.google.com/maps' },
  { label: 'News', url: 'https://news.google.com' },
  { label: 'Gmail', url: 'https://mail.google.com' },
  { label: 'YouTube', url: 'https://www.youtube.com' },
];

const WORDMARK = [
  { letter: 'G', color: '#4285f4' },
  { letter: 'o', color: '#ea4335' },
  { letter: 'o', color: '#fbbc05' },
  { letter: 'g', color: '#4285f4' },
  { letter: 'l', color: '#34a853' },
  { letter: 'e', color: '#ea4335' },
];

const looksLikeUrl = (value: string) => /^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(value);
const asUrl = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);
const searchUrl = (query: string) =>
  // gbv=1 asks Google for its basic HTML page, which is the version Knits can read.
  `https://www.google.com/search?gbv=1&q=${encodeURIComponent(query)}`;

export function Google() {
  const [field, setField] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [doc, setDoc] = useState<ReaderDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!target) inputRef.current?.focus();
  }, [target]);

  useEffect(() => {
    if (!target) {
      setDoc(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDoc(null);
    readPage(target, controller.signal)
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
  }, [target, nonce]);

  const go = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const url = /^https?:\/\//i.test(trimmed) || looksLikeUrl(trimmed) ? asUrl(trimmed) : searchUrl(trimmed);
    setField(trimmed);
    setHistory((prev) => (target && target !== url ? [...prev, target] : prev));
    setTarget(url);
  };

  const back = () => {
    setHistory((prev) => {
      if (!prev.length) {
        setTarget(null);
        setField('');
        return prev;
      }
      const next = prev[prev.length - 1];
      setTarget(next);
      setField(next);
      return prev.slice(0, -1);
    });
  };

  const home = () => {
    setTarget(null);
    setField('');
    setHistory([]);
  };

  const openSpan = (spans: Span[]) =>
    spans.map((span, index) =>
      span.href ? (
        <button key={`${span.href}-${index}`} className="reader-link" onClick={() => go(span.href!)}>
          {span.text}
        </button>
      ) : (
        <span key={index}>{span.text}</span>
      ),
    );

  return (
    <div className="google">
      <div className="google-bar">
        <button className="google-icon-btn" onClick={back} disabled={!target} aria-label="Back">
          <Glyph name="chevron-left" size={16} />
        </button>
        <button className="google-icon-btn" onClick={home} disabled={!target} aria-label="Google home">
          <Glyph name="search" size={15} />
        </button>
        <form
          className="google-field"
          onSubmit={(event) => {
            event.preventDefault();
            go(field);
            inputRef.current?.blur();
          }}
        >
          <input
            ref={inputRef}
            value={field}
            onChange={(event) => setField(event.target.value)}
            placeholder="Search Google or type a URL"
            aria-label="Search Google or type a URL"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
          />
          {target && (
            <button
              type="button"
              className="google-icon-btn"
              onClick={() => setNonce((value) => value + 1)}
              aria-label="Reload"
            >
              <Glyph name="reload" size={14} />
            </button>
          )}
        </form>
        {target && (
          <a
            className="google-icon-btn"
            href={target}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in a new tab"
          >
            <Glyph name="external" size={15} />
          </a>
        )}
      </div>

      {loading && <div className="google-progress" />}

      <div className="google-view">
        {!target ? (
          <div className="google-home">
            <div className="google-wordmark" aria-label="Google">
              {WORDMARK.map((part, index) => (
                <span key={index} style={{ color: part.color }}>
                  {part.letter}
                </span>
              ))}
            </div>

            <form
              className="google-search"
              onSubmit={(event) => {
                event.preventDefault();
                go(field);
              }}
            >
              <Glyph name="search" size={18} />
              <input
                ref={inputRef}
                value={field}
                onChange={(event) => setField(event.target.value)}
                aria-label="Search Google"
                spellCheck={false}
                autoComplete="off"
              />
            </form>

            <div className="google-actions">
              <button className="google-button" onClick={() => go(field || 'Knits desktop')}>
                Google Search
              </button>
              <button
                className="google-button"
                onClick={() => go(field ? searchUrl(field) : 'https://www.google.com/doodles')}
              >
                I'm Feeling Lucky
              </button>
            </div>

            <div className="google-quick">
              {QUICK.map((item) => (
                <button key={item.url} className="google-quick-link" onClick={() => go(item.url)}>
                  {item.label}
                </button>
              ))}
            </div>

            <p className="google-note">
              Searches and pages open inside this window, read through the Knits reader service. Google blocks frames, so
              results arrive as text and links — every link opens here.
            </p>
          </div>
        ) : error ? (
          <div className="google-error">
            <Glyph name="doc" size={36} />
            <h2>Google could not be reached</h2>
            <p>{error}</p>
            <div className="google-error-actions">
              <button className="btn btn-small" onClick={() => setNonce((value) => value + 1)}>
                Try Again
              </button>
              <a className="btn btn-small btn-ghost" href={target} target="_blank" rel="noreferrer">
                Open in a Real Browser
              </a>
            </div>
          </div>
        ) : doc ? (
          <article className="reader google-results">
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
                    {openSpan(block.spans)}
                  </p>
                );
              }
              if (block.kind === 'list') {
                return (
                  <ul key={index} className="reader-list">
                    {block.items.map((item, itemIndex) => (
                      <li key={itemIndex}>{openSpan(item)}</li>
                    ))}
                  </ul>
                );
              }
              if (block.kind === 'quote') {
                return (
                  <blockquote key={index} className="reader-quote">
                    {openSpan(block.spans)}
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
          <div className="google-error">
            <Glyph name="reload" size={32} />
            <h2>Loading {target ? new URL(target).host : ''}…</h2>
          </div>
        )}
      </div>

      <div className="google-status">
        <span>{target ? new URL(target).host : 'Google'}</span>
        <span>{target ? 'Reader' : 'Ready'}</span>
      </div>
    </div>
  );
}

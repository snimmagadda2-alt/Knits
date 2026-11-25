import { useState } from 'react';
import { CATALOG, packageUrl, type CatalogItem } from '../catalog';
import { useLibrary } from '../library';
import { AppletIcon } from './Applet';
import { AppIcon, Glyph } from '../components/Icon';

interface Props {
  onOpen: (id: `app:${string}`) => void;
}

export function Store({ onOpen }: Props) {
  const { apps, installFromUrl, uninstall } = useLibrary();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(CATALOG.map((item) => item.category)))];
  const installedIds = new Set(apps.map((app) => app.id));
  const term = query.trim().toLowerCase();
  const items = CATALOG.filter(
    (item) =>
      (category === 'All' || item.category === category) &&
      (!term || item.name.toLowerCase().includes(term) || item.blurb.toLowerCase().includes(term)),
  );

  const get = async (item: CatalogItem) => {
    setBusy(item.id);
    setError(null);
    const record = await installFromUrl(packageUrl(item.file));
    setBusy(null);
    if (!record) setError(`${item.name} could not be installed. Check Wi-Fi and try again.`);
  };

  return (
    <div className="store">
      <aside className="store-side">
        <div className="store-brand">
          <AppIcon id="store" size={34} />
          <span>Knits Store</span>
        </div>
        {categories.map((name) => (
          <button
            key={name}
            className={`store-nav${category === name ? ' is-active' : ''}`}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
        <p className="store-side-note">Apps install inside Knits only.</p>
      </aside>

      <div className="store-main">
        <header className="store-head">
          <div>
            <h1>Knits Store</h1>
            <p>Apps made for Knits. Nothing is written to your real computer.</p>
          </div>
          <label className="store-search">
            <Glyph name="search" size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search apps"
              aria-label="Search apps"
            />
          </label>
        </header>

        {error && <p className="store-error">{error}</p>}

        <div className="store-grid">
          {items.map((item) => {
            const installed = installedIds.has(item.id);
            const working = busy === item.id;
            return (
              <article key={item.id} className="store-card">
                <AppletIcon kind={item.id === 'gallery' ? 'gallery' : item.id === 'weather' ? 'weather' : 'clock'} size={54} />
                <div className="store-card-text">
                  <h2>{item.name}</h2>
                  <span className="store-card-meta">
                    {item.category} · v{item.version} · .{item.format}
                  </span>
                  <p>{item.blurb}</p>
                </div>
                <div className="store-card-actions">
                  {installed ? (
                    <>
                      <button className="btn btn-small" onClick={() => onOpen(`app:${item.id}`)}>
                        Open
                      </button>
                      <button className="btn btn-small btn-ghost" onClick={() => uninstall(item.id)}>
                        Uninstall
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-small" onClick={() => void get(item)} disabled={working}>
                      {working ? 'Installing…' : 'Get'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {items.length === 0 && <p className="store-empty">No apps match “{query}”.</p>}
        </div>

        <p className="store-foot">Signed with Knits packages · installed apps appear in the Dock and Spotlight</p>
      </div>
    </div>
  );
}

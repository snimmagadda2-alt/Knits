import { useState } from 'react';
import { getNode, type FsNode } from '../vfs';
import { Glyph } from '../components/Icon';

const SIDEBAR: { label: string; path: string[]; icon: string }[] = [
  { label: 'Desktop', path: ['Desktop'], icon: 'folder' },
  { label: 'Documents', path: ['Documents'], icon: 'folder' },
  { label: 'Downloads', path: ['Downloads'], icon: 'folder' },
  { label: 'Pictures', path: ['Pictures'], icon: 'folder' },
  { label: 'Music', path: ['Music'], icon: 'folder' },
  { label: 'Applications', path: ['Applications'], icon: 'folder' },
];

function iconFor(node: FsNode) {
  if (node.kind === 'folder') return 'folder';
  if (node.name.endsWith('.deb')) return 'disk';
  return 'doc';
}

export function Finder() {
  const [stack, setStack] = useState<string[][]>([['Documents']]);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const path = stack[cursor];
  const node = getNode(path);
  const items = node?.children ?? [];
  const selectedNode = items.find((item) => item.name === selected) ?? null;

  const navigate = (next: string[]) => {
    setStack((prev) => [...prev.slice(0, cursor + 1), next]);
    setCursor(cursor + 1);
    setSelected(null);
  };

  const title = path.length ? path[path.length - 1] : 'Knits';
  const isCurrent = (item: string[]) => item.join('/') === path.join('/');

  return (
    <div className="finder">
      <aside className="finder-sidebar">
        <div className="fs-heading">Favourites</div>
        {SIDEBAR.map((item) => (
          <button
            key={item.label}
            className={`fs-item${isCurrent(item.path) ? ' is-active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Glyph name={item.icon} size={15} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="fs-heading">Location</div>
        <button className={`fs-item${path.length === 0 ? ' is-active' : ''}`} onClick={() => navigate([])}>
          <Glyph name="disk" size={15} />
          <span>Knits</span>
        </button>
      </aside>

      <section className="finder-main">
        <div className="finder-toolbar">
          <button
            className="ft-nav"
            onClick={() => {
              setCursor(Math.max(0, cursor - 1));
              setSelected(null);
            }}
            disabled={cursor === 0}
            aria-label="Back"
          >
            <Glyph name="chevron-left" size={16} />
          </button>
          <button
            className="ft-nav"
            onClick={() => {
              setCursor(Math.min(stack.length - 1, cursor + 1));
              setSelected(null);
            }}
            disabled={cursor >= stack.length - 1}
            aria-label="Forward"
          >
            <Glyph name="chevron-right" size={16} />
          </button>
          <span className="ft-title">{title}</span>
          <span className="ft-count">{items.length} items</span>
        </div>

        <div className="finder-grid">
          {items.map((item) => (
            <button
              key={item.name}
              className={`fg-item${selected === item.name ? ' is-selected' : ''}`}
              onClick={() => setSelected(item.name)}
              onDoubleClick={() => item.kind === 'folder' && navigate([...path, item.name])}
            >
              <span className={`fg-icon fg-${item.kind}`}>
                <Glyph name={iconFor(item)} size={34} />
              </span>
              <span className="fg-name">{item.name}</span>
            </button>
          ))}
          {items.length === 0 && <p className="fg-empty">This folder is empty.</p>}
        </div>

        {selectedNode && (
          <div className="finder-preview">
            <div className="fp-head">
              <strong>{selectedNode.name}</strong>
              <span>{selectedNode.kind === 'folder' ? `${selectedNode.children?.length ?? 0} items` : selectedNode.size}</span>
            </div>
            <pre className="fp-body">
              {selectedNode.kind === 'folder'
                ? (selectedNode.children ?? []).map((child) => child.name).join('   ') || 'Empty folder'
                : selectedNode.content}
            </pre>
          </div>
        )}

        <div className="finder-status">Knits — 128 GB available</div>
      </section>
    </div>
  );
}

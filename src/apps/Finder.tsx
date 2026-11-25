import { useState } from 'react';
import { getNode, type FsNode } from '../vfs';
import { useLibrary } from '../library';
import { Glyph } from '../components/Icon';

const SIDEBAR: { label: string; path: string[]; icon: string }[] = [
  { label: 'Desktop', path: ['Desktop'], icon: 'folder' },
  { label: 'Documents', path: ['Documents'], icon: 'folder' },
  { label: 'Downloads', path: ['Downloads'], icon: 'folder' },
  { label: 'Pictures', path: ['Pictures'], icon: 'folder' },
  { label: 'Music', path: ['Music'], icon: 'folder' },
  { label: 'Applications', path: ['Applications'], icon: 'folder' },
];

const PACKAGE = /\.(deb|pkg|dmg)$/i;

function iconFor(node: FsNode) {
  if (node.kind === 'folder') return 'folder';
  if (node.name.endsWith('.deb')) return 'disk';
  return 'doc';
}

interface MenuState {
  x: number;
  y: number;
  name: string;
}

export function Finder() {
  const { openPackage } = useLibrary();
  const [stack, setStack] = useState<string[][]>([['Downloads']]);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const path = stack[cursor];
  const node = getNode(path);
  const items = node?.children ?? [];
  const selectedNode = items.find((item) => item.name === selected) ?? null;

  const navigate = (next: string[]) => {
    setStack((prev) => [...prev.slice(0, cursor + 1), next]);
    setCursor(cursor + 1);
    setSelected(null);
    setNotice(null);
  };

  const install = (item: FsNode) => {
    const entry = openPackage(item.name, item.content ?? '');
    setMenu(null);
    setNotice(
      entry.app
        ? null
        : `${item.name} could not be opened: ${entry.error ?? 'not a Knits package.'}`,
    );
  };

  const openItem = (item: FsNode) => {
    if (item.kind === 'folder') {
      navigate([...path, item.name]);
      return;
    }
    if (PACKAGE.test(item.name)) {
      install(item);
      return;
    }
    setSelected(item.name);
  };

  const title = path.length ? path[path.length - 1] : 'Knits';
  const isCurrent = (item: string[]) => item.join('/') === path.join('/');
  const menuNode = menu ? items.find((item) => item.name === menu.name) ?? null : null;

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

        <div className="finder-grid" onContextMenu={(event) => event.preventDefault()}>
          {items.map((item) => (
            <button
              key={item.name}
              className={`fg-item${selected === item.name ? ' is-selected' : ''}`}
              onClick={() => {
                setSelected(item.name);
                setNotice(null);
              }}
              onDoubleClick={() => openItem(item)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSelected(item.name);
                setMenu({ x: event.clientX, y: event.clientY, name: item.name });
              }}
              title={PACKAGE.test(item.name) ? 'Double-click to install · right-click for more' : item.name}
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

        <div className="finder-status">
          {notice ?? 'Knits — 128 GB available'}
        </div>
      </section>

      {menu && menuNode && (
        <>
          <button className="menu-catch" onClick={() => setMenu(null)} aria-label="Close menu" />
          <div className="finder-menu" style={{ left: menu.x, top: menu.y }} role="menu">
            <button role="menuitem" onClick={() => openItem(menuNode)}>
              <span>{menuNode.kind === 'folder' ? 'Open' : PACKAGE.test(menuNode.name) ? 'Install' : 'Open'}</span>
              {PACKAGE.test(menuNode.name) && <span className="finder-menu-note">wizard</span>}
            </button>
            <span className="finder-menu-sep" />
            <button
              role="menuitem"
              onClick={() => {
                setSelected(menuNode.name);
                setMenu(null);
              }}
            >
              <span>Quick Look</span>
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setSelected(menuNode.name);
                setMenu(null);
              }}
            >
              <span>Get Info</span>
            </button>
            <span className="finder-menu-sep" />
            <button role="menuitem" onClick={() => setMenu(null)}>
              <span>Cancel</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

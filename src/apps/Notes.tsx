import { useEffect, useMemo, useState } from 'react';
import { Glyph } from '../components/Icon';

interface Note {
  id: string;
  body: string;
  updated: number;
}

const STORAGE_KEY = 'knits.notes';

const STARTER: Note[] = [
  {
    id: 'welcome',
    body: 'Welcome to Notes\n\nEverything here is stored in this browser only.\nTry the toolbar above: new note, delete note.\n',
    updated: Date.now(),
  },
  {
    id: 'stitches',
    body: 'Knit stitches\n\nKnit, purl, stockinette, garter, ribbing.\nCast on, bind off, repeat.\n',
    updated: Date.now() - 86_400_000,
  },
];

function load(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return STARTER;
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) && parsed.length ? parsed : STARTER;
  } catch {
    return STARTER;
  }
}

function titleOf(note: Note) {
  const first = note.body.split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find(Boolean);
  return first || 'New Note';
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>(load);
  const [selected, setSelected] = useState<string>(() => load()[0]?.id ?? 'welcome');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      /* storage unavailable — notes still work for this session */
    }
  }, [notes]);

  const active = useMemo(() => notes.find((n) => n.id === selected) ?? notes[0], [notes, selected]);

  const update = (body: string) => {
    if (!active) return;
    setNotes((prev) => prev.map((n) => (n.id === active.id ? { ...n, body, updated: Date.now() } : n)));
  };

  const addNote = () => {
    const note: Note = { id: `note-${Date.now()}`, body: '', updated: Date.now() };
    setNotes((prev) => [note, ...prev]);
    setSelected(note.id);
  };

  const removeNote = () => {
    if (!active) return;
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== active.id);
      setSelected(next[0]?.id ?? '');
      return next.length ? next : [];
    });
  };

  return (
    <div className="notes">
      <aside className="notes-list">
        <div className="notes-toolbar">
          <button className="notes-btn" onClick={addNote} aria-label="New note">
            <Glyph name="plus" size={16} />
          </button>
          <button className="notes-btn" onClick={removeNote} aria-label="Delete note">
            <Glyph name="trash" size={16} />
          </button>
        </div>
        {notes.map((note) => (
          <button
            key={note.id}
            className={`notes-row${active?.id === note.id ? ' is-active' : ''}`}
            onClick={() => setSelected(note.id)}
          >
            <span className="notes-row-title">{titleOf(note)}</span>
            <span className="notes-row-date">
              {new Date(note.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </button>
        ))}
        {notes.length === 0 && <p className="notes-empty">No notes</p>}
      </aside>
      <div className="notes-editor">
        {active ? (
          <>
            <div className="notes-editor-head">
              <span>{new Date(active.updated).toLocaleString()}</span>
            </div>
            <textarea
              value={active.body}
              onChange={(e) => update(e.target.value)}
              placeholder="Start writing…"
              spellCheck={false}
              aria-label="Note body"
            />
          </>
        ) : (
          <p className="notes-empty">Create a note to get started.</p>
        )}
      </div>
    </div>
  );
}

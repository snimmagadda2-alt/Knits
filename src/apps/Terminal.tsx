import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { runShell } from '../shell';
import { APPS, type AppId } from '../apps';
import { useLibrary } from '../library';

type Kind = 'cmd' | 'out' | 'err' | 'dim';

interface Line {
  id: number;
  text: string;
  kind: Kind;
}

let seq = 0;
const mk = (text: string, kind: Kind = 'out'): Line => {
  seq += 1;
  return { id: seq, text, kind };
};

export function Terminal({ onClose, onOpen }: { onClose: () => void; onOpen: (id: AppId) => void }) {
  const { apps, openPackage } = useLibrary();
  const [cwd, setCwd] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>(() => [
    mk(`Last login: ${new Date().toDateString()} on tty1`, 'dim'),
    mk('Knits shell (knsh) — Debian-style commands. Type "help" for the list.', 'dim'),
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const prompt = `knits@studio ${cwd.length ? `/${cwd.join('/')}` : '~'} %`;

  const launch = (name: string): boolean => {
    const needle = name.trim().toLowerCase();
    const builtin = APPS.find((app) => app.name.toLowerCase() === needle || app.id === needle);
    if (builtin) {
      onOpen(builtin.id);
      return true;
    }
    const installed = apps.find((app) => app.name.toLowerCase() === needle || app.id === needle);
    if (installed) {
      onOpen(`app:${installed.id}`);
      return true;
    }
    return false;
  };

  const submit = async () => {
    const command = input;
    const echo = mk(`${prompt} ${command}`, 'cmd');
    const trimmed = command.trim();
    const nextHistory = trimmed ? [...history, trimmed] : history;
    if (trimmed) setHistory(nextHistory);
    setHistoryIndex(-1);
    setInput('');
    if (!trimmed) {
      setLines((prev) => [...prev, echo]);
      return;
    }

    setBusy(true);
    const result = await runShell(command, cwd, {
      user: 'knits',
      history: nextHistory,
      apps: apps.map((app) => ({ id: app.id, name: app.name, version: app.version })),
      install: (fileName, source) => Boolean(openPackage(fileName, source).app),
      open: launch,
    });
    setBusy(false);

    if (result.clear) {
      setLines([]);
      return;
    }
    if (result.cwd) setCwd(result.cwd);
    if (result.close) {
      onClose();
      return;
    }
    setLines((prev) => [...prev, echo, ...result.lines.map((line) => mk(line.text, line.kind))]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < 0) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(next);
        setInput(history[next]);
      }
    }
  };

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="term-out" ref={scrollRef}>
        {lines.map((line) => (
          <div key={line.id} className={`term-line term-${line.kind}`}>
            {line.text || '\u00a0'}
          </div>
        ))}
        <div className="term-input-row">
          <span className="term-prompt">{prompt}</span>
          <input
            ref={inputRef}
            className="term-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            readOnly={busy}
            aria-label="Terminal input"
          />
        </div>
      </div>
    </div>
  );
}

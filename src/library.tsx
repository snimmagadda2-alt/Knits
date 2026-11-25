import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppletKind = 'clock' | 'weather' | 'gallery';

const KINDS: AppletKind[] = ['clock', 'weather', 'gallery'];

/** What a Knits package installs: a small, data-driven app that runs inside Knits. */
export interface AppletSpec {
  id: string;
  name: string;
  version: string;
  publisher: string;
  kind: AppletKind;
  payload: Record<string, unknown>;
}

export type PackageFormat = 'pkg' | 'dmg' | 'unknown';

export interface Download {
  id: string;
  fileName: string;
  url: string;
  size: number;
  format: PackageFormat;
  /** Disk images only. */
  volume?: string;
  app?: AppletSpec;
  receivedAt: number;
  error?: string;
}

export interface InstalledApp extends AppletSpec {
  source: string;
  installedAt: number;
}

interface LibraryValue {
  downloads: Download[];
  apps: InstalledApp[];
  /** The package whose installer or disk image is open. */
  active: Download | null;
  download: (url: string) => Promise<void>;
  install: (download: Download) => InstalledApp | null;
  open: (download: Download) => void;
  close: () => void;
  remove: (id: string) => void;
  clearDownloads: () => void;
  installed: (id: string) => InstalledApp | undefined;
}

const APPS_KEY = 'knits.apps';
const DOWNLOADS_KEY = 'knits.downloads';

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readApplet(value: unknown): AppletSpec | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const kind = data.kind;
  if (typeof kind !== 'string' || !KINDS.includes(kind as AppletKind)) return null;
  const id = text(data.id);
  const name = text(data.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    kind: kind as AppletKind,
    version: text(data.version) ?? '1.0',
    publisher: text(data.publisher) ?? 'Unknown developer',
    payload: data.payload && typeof data.payload === 'object' ? (data.payload as Record<string, unknown>) : {},
  };
}

function parsePackage(source: string, fileName: string, url: string, size: number): Download {
  const base: Download = {
    id: `${fileName}-${Date.now()}`,
    fileName,
    url,
    size,
    format: 'unknown',
    receivedAt: Date.now(),
  };

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(source) as Record<string, unknown>;
  } catch {
    return { ...base, error: 'This file is not a Knits package, so it was not installed.' };
  }

  if (raw.format === 'knits-pkg') {
    const app = readApplet(raw);
    return app ? { ...base, format: 'pkg', app } : { ...base, error: 'The package is damaged: its app could not be read.' };
  }

  if (raw.format === 'knits-dmg') {
    const app = readApplet(raw.app);
    return app
      ? { ...base, format: 'dmg', volume: text(raw.volume) ?? app.name, app }
      : { ...base, error: 'The disk image is damaged: its app could not be read.' };
  }

  return { ...base, error: 'Only Knits .pkg and .dmg files can be installed.' };
}

const LibraryContext = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<InstalledApp[]>(() => readStore<InstalledApp[]>(APPS_KEY, []));
  const [downloads, setDownloads] = useState<Download[]>(() => readStore<Download[]>(DOWNLOADS_KEY, []));
  const [active, setActive] = useState<Download | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(APPS_KEY, JSON.stringify(apps));
    } catch {
      /* storage unavailable: installs last for this session */
    }
  }, [apps]);

  useEffect(() => {
    try {
      localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
    } catch {
      /* storage unavailable */
    }
  }, [downloads]);

  const download = useCallback(async (url: string) => {
    let fileName = 'package.pkg';
    try {
      fileName = decodeURIComponent(new URL(url, window.location.href).pathname.split('/').pop() || fileName);
    } catch {
      /* keep the fallback name */
    }

    try {
      const response = await fetch(url, { cache: 'no-store' });
      const source = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const entry = parsePackage(source, fileName, url, new Blob([source]).size);
      setDownloads((prev) => [entry, ...prev.filter((item) => item.url !== url)].slice(0, 6));
    } catch {
      setDownloads((prev) =>
        [
          {
            id: `${fileName}-${Date.now()}`,
            fileName,
            url,
            size: 0,
            format: 'unknown' as PackageFormat,
            receivedAt: Date.now(),
            error: 'Download failed. Check Wi-Fi and try again.',
          },
          ...prev.filter((item) => item.url !== url),
        ].slice(0, 6),
      );
    }
  }, []);

  const install = useCallback((entry: Download) => {
    if (!entry.app) return null;
    const record: InstalledApp = { ...entry.app, source: entry.fileName, installedAt: Date.now() };
    setApps((prev) => [...prev.filter((app) => app.id !== record.id), record]);
    return record;
  }, []);

  const open = useCallback((entry: Download) => setActive(entry), []);
  const close = useCallback(() => setActive(null), []);
  const remove = useCallback((id: string) => setDownloads((prev) => prev.filter((item) => item.id !== id)), []);
  const clearDownloads = useCallback(() => setDownloads([]), []);

  const value = useMemo<LibraryValue>(
    () => ({
      downloads,
      apps,
      active,
      download,
      install,
      open,
      close,
      remove,
      clearDownloads,
      installed: (id: string) => apps.find((app) => app.id === id),
    }),
    [downloads, apps, active, download, install, open, close, remove, clearDownloads],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}

export function formatSize(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

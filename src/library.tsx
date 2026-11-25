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

export interface Volume {
  id: string;
  name: string;
  app: AppletSpec;
  download: Download;
}

interface LibraryValue {
  downloads: Download[];
  apps: InstalledApp[];
  /** The .pkg whose installer window is open. */
  active: Download | null;
  /** Mounted disk images, each showing on the desktop until ejected. */
  volumes: Volume[];
  openVolume: string | null;
  selectVolume: (id: string | null) => void;
  eject: (id: string) => void;
  download: (url: string) => Promise<void>;
  install: (download: Download) => InstalledApp | null;
  installFromUrl: (url: string) => Promise<InstalledApp | null>;
  uninstall: (id: string) => void;
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
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [openVolume, setOpenVolume] = useState<string | null>(null);

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

  const fetchPackage = useCallback(async (url: string): Promise<Download | null> => {
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
      return entry;
    } catch {
      return null;
    }
  }, []);

  const download = useCallback(async (url: string) => {
    let fileName = 'package.pkg';
    try {
      fileName = decodeURIComponent(new URL(url, window.location.href).pathname.split('/').pop() || fileName);
    } catch {
      /* keep the fallback name */
    }

    const entry = await fetchPackage(url);
    if (entry) return;

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
  }, [fetchPackage]);

  const install = useCallback((entry: Download) => {
    if (!entry.app) return null;
    const record: InstalledApp = { ...entry.app, source: entry.fileName, installedAt: Date.now() };
    setApps((prev) => [...prev.filter((app) => app.id !== record.id), record]);
    return record;
  }, []);

  const installFromUrl = useCallback(
    async (url: string) => {
      const entry = await fetchPackage(url);
      if (!entry?.app) return null;
      const record: InstalledApp = { ...entry.app, source: entry.fileName, installedAt: Date.now() };
      setApps((prev) => [...prev.filter((app) => app.id !== record.id), record]);
      return record;
    },
    [fetchPackage],
  );

  const uninstall = useCallback((id: string) => {
    setApps((prev) => prev.filter((app) => app.id !== id));
  }, []);

  const selectVolume = useCallback((id: string | null) => setOpenVolume(id), []);

  const open = useCallback((entry: Download) => {
    if (entry.format === 'dmg' && entry.app) {
      const id = entry.id;
      setVolumes((prev) =>
        prev.some((volume) => volume.id === id)
          ? prev
          : [...prev, { id, name: entry.volume ?? entry.app!.name, app: entry.app!, download: entry }],
      );
      setOpenVolume(id);
      setActive(null);
      return;
    }
    // One installer surface at a time, the way macOS behaves.
    setOpenVolume(null);
    setActive(entry);
  }, []);

  const close = useCallback(() => setActive(null), []);

  const eject = useCallback((id: string) => {
    setVolumes((prev) => prev.filter((volume) => volume.id !== id));
    setOpenVolume((current) => (current === id ? null : current));
  }, []);
  const remove = useCallback((id: string) => setDownloads((prev) => prev.filter((item) => item.id !== id)), []);
  const clearDownloads = useCallback(() => setDownloads([]), []);

  const value = useMemo<LibraryValue>(
    () => ({
      downloads,
      apps,
      active,
      volumes,
      openVolume,
      selectVolume,
      eject,
      download,
      install,
      installFromUrl,
      uninstall,
      open,
      close,
      remove,
      clearDownloads,
      installed: (id: string) => apps.find((app) => app.id === id),
    }),
    [
      downloads,
      apps,
      active,
      volumes,
      openVolume,
      selectVolume,
      eject,
      download,
      install,
      installFromUrl,
      uninstall,
      open,
      close,
      remove,
      clearDownloads,
    ],
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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Appearance = 'dark' | 'light';

export interface Wallpaper {
  id: string;
  label: string;
  background: string;
}

const BASE = import.meta.env.BASE_URL;

export const WALLPAPERS: Wallpaper[] = [
  { id: 'flow', label: 'Knits Flow', background: `#0b0b12 url("${BASE}wallpaper.svg") center / cover no-repeat` },
  {
    id: 'dusk',
    label: 'Dusk',
    background:
      'radial-gradient(120% 90% at 15% 10%, #3b2f7a 0%, transparent 55%), radial-gradient(100% 80% at 85% 20%, #8a3b6b 0%, transparent 50%), linear-gradient(160deg, #10102a 0%, #241a3d 45%, #0b0b12 100%)',
  },
  {
    id: 'mint',
    label: 'Mint',
    background:
      'radial-gradient(110% 80% at 20% 15%, #1d6f5f 0%, transparent 55%), radial-gradient(90% 70% at 85% 75%, #2f5f8a 0%, transparent 55%), linear-gradient(150deg, #06201d 0%, #0d2b2f 50%, #07151b 100%)',
  },
];

export const ACCENTS = ['#0a84ff', '#bf5af2', '#ff375f', '#ff9f0a', '#30d158', '#64d2ff'];

export interface Prefs {
  appearance: Appearance;
  wallpaper: string;
  accent: string;
  /** App builds only: Safari refuses to load pages while this is false. */
  wifi: boolean;
  network: string;
}

export const NETWORKS = ['Knits Studio', 'Knits Guest', 'Neighbour 5G'];

const DEFAULT_PREFS: Prefs = {
  appearance: 'dark',
  wallpaper: 'flow',
  accent: '#0a84ff',
  wifi: true,
  network: NETWORKS[0],
};
const STORAGE_KEY = 'knits.prefs';

interface PrefsValue {
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  wallpaper: Wallpaper;
}

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Prefs>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
    } catch {
      /* corrupt storage falls back to defaults */
    }
    return DEFAULT_PREFS;
  });

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = prefs.appearance;
    root.style.setProperty('--accent', prefs.accent);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* storage may be unavailable, preferences still apply */
    }
  }, [prefs]);

  const wallpaper = WALLPAPERS.find((w) => w.id === prefs.wallpaper) ?? WALLPAPERS[0];
  const value = useMemo(() => ({ prefs, setPrefs, wallpaper }), [prefs, setPrefs, wallpaper]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider');
  return ctx;
}

import { useCallback, useMemo, useRef, useState } from 'react';
import { APP_MAP, type AppId } from '../apps';

export interface Win {
  id: string;
  app: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

const MENU_BAR = 28;
const DOCK_SPACE = 96;

export function useWindows() {
  const [wins, setWins] = useState<Win[]>([]);
  const zCounter = useRef(10);
  const idCounter = useRef(0);

  const nextZ = () => {
    zCounter.current += 1;
    return zCounter.current;
  };

  const openApp = useCallback((app: AppId) => {
    setWins((prev) => {
      const existing = prev.find((win) => win.app === app);
      if (existing) {
        return prev.map((win) =>
          win.id === existing.id ? { ...win, minimized: false, z: nextZ() } : win,
        );
      }
      const def = APP_MAP[app];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(def.width, Math.max(300, vw - 80));
      const h = Math.min(def.height, Math.max(260, vh - MENU_BAR - DOCK_SPACE - 40));
      const cascade = prev.length * 26;
      idCounter.current += 1;
      return [
        ...prev,
        {
          id: `${app}-${idCounter.current}`,
          app,
          x: Math.max(16, Math.round((vw - w) / 2) + cascade - 40),
          y: Math.max(MENU_BAR + 12, Math.round(MENU_BAR + 26 + cascade * 0.6)),
          w,
          h,
          z: nextZ(),
          minimized: false,
          maximized: false,
        },
      ];
    });
  }, []);

  const close = useCallback((id: string) => {
    setWins((prev) => prev.filter((win) => win.id !== id));
  }, []);

  const focus = useCallback((id: string) => {
    setWins((prev) => prev.map((win) => (win.id === id ? { ...win, z: nextZ(), minimized: false } : win)));
  }, []);

  const minimize = useCallback((id: string) => {
    setWins((prev) => prev.map((win) => (win.id === id ? { ...win, minimized: true } : win)));
  }, []);

  const toggleMax = useCallback((id: string) => {
    setWins((prev) => prev.map((win) => (win.id === id ? { ...win, maximized: !win.maximized, z: nextZ() } : win)));
  }, []);

  const move = useCallback((id: string, x: number, y: number) => {
    setWins((prev) => prev.map((win) => (win.id === id ? { ...win, x, y } : win)));
  }, []);

  const resize = useCallback((id: string, w: number, h: number) => {
    setWins((prev) => prev.map((win) => (win.id === id ? { ...win, w, h } : win)));
  }, []);

  const closeAll = useCallback(() => setWins([]), []);

  const topWin = useMemo(
    () => wins.filter((win) => !win.minimized).sort((a, b) => b.z - a.z)[0] ?? null,
    [wins],
  );

  return {
    wins,
    openApp,
    close,
    focus,
    minimize,
    toggleMax,
    move,
    resize,
    closeAll,
    activeApp: topWin?.app ?? null,
  };
}

export type WindowManager = ReturnType<typeof useWindows>;

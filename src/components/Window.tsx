import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { APPS } from '../apps';
import { IS_APP } from '../environment';
import type { Win } from '../desktop/useWindows';

interface Props {
  win: Win;
  title: string;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMax: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  children: ReactNode;
}

const MENU_BAR = 28;
const DOCK_ITEM = 60;
const DOCK_ICON_Y = 46;

/** How far this window has to travel to reach its dock icon, so the jelly flight lands on it. */
function flightToDock(win: Win) {
  const index = APPS.findIndex((app) => app.id === win.app);
  const slot = index < 0 ? 0 : index - (APPS.length - 1) / 2;
  const targetX = window.innerWidth / 2 + slot * DOCK_ITEM;
  const targetY = window.innerHeight - DOCK_ICON_Y;
  const originX = win.maximized ? window.innerWidth / 2 : win.x + win.w / 2;
  const originY = win.maximized ? MENU_BAR + (window.innerHeight - MENU_BAR) / 2 : win.y + win.h / 2;
  return { x: Math.round(targetX - originX), y: Math.round(targetY - originY) };
}

export function Window({
  win,
  title,
  active,
  onFocus,
  onClose,
  onMinimize,
  onToggleMax,
  onMove,
  onResize,
  children,
}: Props) {
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const grow = useRef<{ px: number; py: number; w: number; h: number } | null>(null);

  const release = (target: EventTarget | null, pointerId: number) => {
    const el = target as HTMLElement | null;
    try {
      el?.releasePointerCapture(pointerId);
    } catch {
      /* capture may already be gone */
    }
  };

  const onTitleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    onFocus();
    if (win.maximized) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: win.x, y: win.y };
  };

  const onTitleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const x = Math.min(Math.max(start.x + e.clientX - start.px, 96 - win.w), window.innerWidth - 96);
    const y = Math.min(Math.max(start.y + e.clientY - start.py, MENU_BAR), window.innerHeight - 64);
    onMove(x, y);
  };

  const onTitleUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    release(e.currentTarget, e.pointerId);
  };

  const onGripDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onFocus();
    e.currentTarget.setPointerCapture(e.pointerId);
    grow.current = { px: e.clientX, py: e.clientY, w: win.w, h: win.h };
  };

  const onGripMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = grow.current;
    if (!start) return;
    const w = Math.max(300, Math.min(start.w + e.clientX - start.px, window.innerWidth - 20));
    const h = Math.max(220, Math.min(start.h + e.clientY - start.py, window.innerHeight - MENU_BAR - 20));
    onResize(w, h);
  };

  const onGripUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    grow.current = null;
    release(e.currentTarget, e.pointerId);
  };

  const style = win.maximized
    ? { left: 0, top: MENU_BAR, width: '100%', height: `calc(100% - ${MENU_BAR}px)`, zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  const fly = flightToDock(win);
  const vars = { '--fly-x': `${fly.x}px`, '--fly-y': `${fly.y}px` } as CSSProperties;
  const fx = IS_APP
    ? win.minimizing
      ? ' is-minimizing'
      : win.fx === 'restore'
        ? ' is-restoring'
        : win.fx === 'new'
          ? ' is-opening'
          : ''
    : '';

  return (
    <section
      className={`window${active ? ' is-active' : ''}${win.maximized ? ' is-maximized' : ''}${fx}`}
      style={{ ...style, ...vars }}
      onPointerDown={onFocus}
      aria-label={title}
    >
      <header
        className="window-titlebar"
        onPointerDown={onTitleDown}
        onPointerMove={onTitleMove}
        onPointerUp={onTitleUp}
        onPointerCancel={onTitleUp}
        onDoubleClick={onToggleMax}
      >
        <div className="traffic-lights" onPointerDown={(e) => e.stopPropagation()}>
          <button className="tl tl-close" onClick={onClose} aria-label="Close window" />
          <button className="tl tl-min" onClick={onMinimize} aria-label="Minimise window" />
          <button className="tl tl-max" onClick={onToggleMax} aria-label="Zoom window" />
        </div>
        <div className="window-title">{title}</div>
        <div className="window-titlebar-spacer" />
      </header>
      <div className="window-body">{children}</div>
      {!win.maximized && (
        <div
          className="window-grip"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
        />
      )}
    </section>
  );
}

export type AppId = 'finder' | 'terminal' | 'notes' | 'calculator' | 'settings' | 'about';

export interface AppDef {
  id: AppId;
  name: string;
  width: number;
  height: number;
}

export const APPS: AppDef[] = [
  { id: 'finder', name: 'Finder', width: 900, height: 560 },
  { id: 'terminal', name: 'Terminal', width: 720, height: 440 },
  { id: 'notes', name: 'Notes', width: 800, height: 520 },
  { id: 'calculator', name: 'Calculator', width: 316, height: 480 },
  { id: 'settings', name: 'System Settings', width: 820, height: 540 },
  { id: 'about', name: 'About Knits', width: 420, height: 540 },
];

export const APP_MAP: Record<AppId, AppDef> = APPS.reduce(
  (acc, app) => ({ ...acc, [app.id]: app }),
  {} as Record<AppId, AppDef>,
);

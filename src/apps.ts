import { IS_APP } from './environment';

export type AppId = 'finder' | 'safari' | 'terminal' | 'notes' | 'calculator' | 'settings' | 'about';

export interface AppDef {
  id: AppId;
  name: string;
  width: number;
  height: number;
  /** Only listed in the installed app, never on the website. */
  appOnly?: boolean;
}

const ALL_APPS: AppDef[] = [
  { id: 'finder', name: 'Finder', width: 900, height: 560 },
  { id: 'safari', name: 'Safari', width: 960, height: 620, appOnly: true },
  { id: 'terminal', name: 'Terminal', width: 720, height: 440 },
  { id: 'notes', name: 'Notes', width: 800, height: 520 },
  { id: 'calculator', name: 'Calculator', width: 316, height: 480 },
  { id: 'settings', name: 'System Settings', width: 820, height: 540 },
  { id: 'about', name: 'About Knits', width: 420, height: 540 },
];

/** What the dock and Spotlight offer in this build. */
export const APPS: AppDef[] = ALL_APPS.filter((app) => !app.appOnly || IS_APP);

/** Every app, including ones this build does not show, so window sizing never has holes. */
export const APP_MAP: Record<AppId, AppDef> = ALL_APPS.reduce(
  (acc, app) => ({ ...acc, [app.id]: app }),
  {} as Record<AppId, AppDef>,
);

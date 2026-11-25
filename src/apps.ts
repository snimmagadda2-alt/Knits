import { IS_APP } from './environment';

export type BuiltinAppId =
  | 'finder'
  | 'google'
  | 'safari'
  | 'store'
  | 'terminal'
  | 'notes'
  | 'calculator'
  | 'settings'
  | 'about';

/** Apps installed from a .pkg or .dmg get an `app:` prefix. */
export type AppId = BuiltinAppId | `app:${string}`;

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
  { id: 'google', name: 'Google', width: 900, height: 620 },
  { id: 'safari', name: 'Safari', width: 960, height: 620, appOnly: true },
  { id: 'store', name: 'Knits Store', width: 900, height: 600, appOnly: true },
  { id: 'terminal', name: 'Terminal', width: 720, height: 440 },
  { id: 'notes', name: 'Notes', width: 800, height: 520 },
  { id: 'calculator', name: 'Calculator', width: 316, height: 480 },
  { id: 'settings', name: 'System Settings', width: 820, height: 540 },
  { id: 'about', name: 'About Knits', width: 420, height: 540 },
];

/** What the dock and Spotlight offer in this build. */
export const APPS: AppDef[] = ALL_APPS.filter((app) => !app.appOnly || IS_APP);

/** Built-in apps, including ones this build does not show. */
export const APP_MAP: Record<BuiltinAppId, AppDef> = ALL_APPS.reduce(
  (acc, app) => ({ ...acc, [app.id as BuiltinAppId]: app }),
  {} as Record<BuiltinAppId, AppDef>,
);

export function isInstalledId(id: AppId): id is `app:${string}` {
  return id.startsWith('app:');
}

/** Window defaults for anything that can open, including apps that arrived in a package. */
export function defFor(id: AppId): AppDef {
  if (isInstalledId(id)) return { id, name: 'App', width: 700, height: 520 };
  return APP_MAP[id];
}

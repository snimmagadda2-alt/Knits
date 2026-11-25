import { IS_APP } from './environment';

export interface UpdateCheck {
  current: string;
  latest: string;
  available: boolean;
}

export interface UpdateResult {
  updated: boolean;
  version?: string;
  error?: string;
}

/** One automatic attempt per build per session, so a failing update cannot loop. */
const ATTEMPT_KEY = 'knits.updateAttempt';

export function updateAttempted(version: string): boolean {
  try {
    return sessionStorage.getItem(ATTEMPT_KEY) === version;
  } catch {
    return false;
  }
}

export function markUpdateAttempt(version: string): void {
  try {
    sessionStorage.setItem(ATTEMPT_KEY, version);
  } catch {
    /* storage unavailable: the attempt still runs, it just is not remembered */
  }
}

/** Asks the local server what version it is serving and what has been published. */
export async function checkForUpdate(): Promise<UpdateCheck | null> {
  if (!IS_APP) return null;
  try {
    const response = await fetch('api/update', { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as UpdateCheck;
  } catch {
    return null;
  }
}

/** Downloads the published bundle and unpacks it next to the installed one. */
export async function installUpdate(): Promise<UpdateResult> {
  if (!IS_APP) return { updated: false, error: 'Updates install in the app.' };
  try {
    const response = await fetch('api/update', { method: 'POST' });
    const body = (await response.json().catch(() => ({}))) as UpdateResult;
    if (!response.ok) {
      return { updated: false, error: body.error ?? 'The update could not be installed.' };
    }
    return { updated: Boolean(body.updated), version: body.version, error: body.error };
  } catch {
    return { updated: false, error: 'Knits could not reach the update service.' };
  }
}

/**
 * Knits runs in two places: the page on the web, and the installed desktop app, which
 * serves itself from 127.0.0.1. Features that belong to the app only are gated on this.
 * `?app=1` previews the app build in a browser, `?app=0` forces the web build.
 */
const APP_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function readMode(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get('app');
    if (flag === '1') return true;
    if (flag === '0') return false;
    return APP_HOSTS.has(window.location.hostname);
  } catch {
    return false;
  }
}

export const IS_APP = readMode();

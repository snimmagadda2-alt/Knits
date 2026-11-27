import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Desktop from './desktop/Desktop';
import { PrefsProvider } from './prefs';
import { LibraryProvider } from './library';

/** The unlisted path that opens the app build; nothing on the site links to it. */
const APP_PATH = /^\/appers\/?$/i;

function readRoute(): string {
  // /appers always opens the desktop, even though it carries no hash of its own.
  if (APP_PATH.test(window.location.pathname)) return 'desktop';
  return window.location.hash.replace(/^#\/?/, '').split('?')[0];
}

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  return (
    <PrefsProvider>
      <LibraryProvider>{route === 'desktop' ? <Desktop /> : <Landing />}</LibraryProvider>
    </PrefsProvider>
  );
}

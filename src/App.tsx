import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Desktop from './desktop/Desktop';
import { PrefsProvider } from './prefs';

function readRoute(): string {
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

  return <PrefsProvider>{route === 'desktop' ? <Desktop /> : <Landing />}</PrefsProvider>;
}

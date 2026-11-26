import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary, installGlobalErrorHandlers, reportFrom, showCrashOverlay } from './crash';
import './styles/global.css';

installGlobalErrorHandlers();

try {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('index.html has no <div id="root">, so Knits has nowhere to draw itself.');
  }
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  // React owns the page now: the boot watchdog in index.html can stand down.
  window.__knitsMounted = true;
  document.getElementById('knits-boot-error')?.remove();
} catch (error) {
  console.error('[knits] could not start', error);
  showCrashOverlay(reportFrom(error, 'while starting Knits', 'Knits could not start'));
}

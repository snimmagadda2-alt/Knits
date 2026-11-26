import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react';

/**
 * A failure the user can read.
 *
 * A blank page tells nobody anything, so when the desktop cannot start the browser's
 * own message, the stack and the build it came from are drawn on screen instead.
 */
export interface CrashReport {
  title: string;
  message: string;
  stack: string;
  where: string;
}

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const STACK_LIMIT = 4000;

function describe(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name || 'Error with no message', stack: error.stack ?? '' };
  }
  if (typeof error === 'string') return { message: error, stack: '' };
  try {
    return { message: JSON.stringify(error) ?? String(error), stack: '' };
  } catch {
    return { message: String(error), stack: '' };
  }
}

export function reportFrom(error: unknown, where: string, title = 'Knits hit an error'): CrashReport {
  const { message, stack } = describe(error);
  return { title, message, stack: stack.slice(0, STACK_LIMIT), where };
}

function context(): string {
  const version = typeof __VERSION__ === 'string' ? __VERSION__ : 'unknown';
  return `Knits ${version} · ${window.location.href}`;
}

function details(report: CrashReport): string {
  return [report.title, report.message, report.where && `Where: ${report.where}`, report.stack, '', context(), navigator.userAgent]
    .filter(Boolean)
    .join('\n');
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.style.cssText = style;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The screen itself, built with the DOM so it works even when React does not. */
export function buildCrashView(report: CrashReport): HTMLElement {
  const page = el(
    'div',
    'position:fixed;inset:0;z-index:2147483000;overflow:auto;display:flex;align-items:center;justify-content:center;padding:28px;background:#0b0b12;color:#f5f5f7;font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  );
  page.setAttribute('role', 'alert');
  page.setAttribute('data-knits-crash', '');

  const card = el(
    'div',
    'width:100%;max-width:720px;padding:26px 28px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:#15151b;box-shadow:0 30px 70px rgba(0,0,0,.55)',
  );
  card.appendChild(el('div', 'font-size:11px;letter-spacing:.14em;color:rgba(245,245,247,.45);margin-bottom:10px', 'KNITS'));
  card.appendChild(el('h1', 'margin:0 0 8px;font-size:20px;font-weight:600', report.title));
  card.appendChild(
    el('p', 'margin:0 0 14px;color:rgba(245,245,247,.65)', 'The desktop stopped here. This is the error the browser reported:'),
  );

  // textContent, never innerHTML: an error message is data, not markup.
  const message = el(
    'pre',
    `margin:0 0 12px;padding:14px 16px;border-radius:10px;background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.3);color:#ffb4b4;font:12.5px/1.6 ${MONO};white-space:pre-wrap;word-break:break-word`,
  );
  message.textContent = report.message;
  card.appendChild(message);

  if (report.where) {
    card.appendChild(el('div', 'margin:0 0 10px;color:rgba(245,245,247,.5);font-size:12.5px', report.where));
  }

  if (report.stack) {
    const stack = el(
      'pre',
      `margin:0 0 12px;padding:12px 14px;max-height:26vh;overflow:auto;border-radius:10px;background:rgba(255,255,255,.04);color:rgba(245,245,247,.6);font:11.5px/1.6 ${MONO};white-space:pre-wrap;word-break:break-word`,
    );
    stack.textContent = report.stack;
    card.appendChild(stack);
  }

  const row = el('div', 'display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:18px 0 0');
  const reload = el(
    'button',
    'padding:9px 16px;border:0;border-radius:9px;background:#0a84ff;color:#fff;font:inherit;font-weight:500;cursor:pointer',
    'Reload Knits',
  );
  reload.addEventListener('click', () => window.location.reload());

  const copy = el(
    'button',
    'padding:9px 16px;border:1px solid rgba(255,255,255,.16);border-radius:9px;background:transparent;color:inherit;font:inherit;cursor:pointer',
    'Copy details',
  );
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(details(report));
      copy.textContent = 'Copied';
    } catch {
      copy.textContent = 'Could not copy';
    }
  });

  const dismiss = el(
    'button',
    'padding:9px 16px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:transparent;color:rgba(245,245,247,.6);font:inherit;cursor:pointer',
    'Dismiss',
  );
  dismiss.addEventListener('click', () => page.remove());

  row.appendChild(reload);
  row.appendChild(copy);
  row.appendChild(dismiss);
  card.appendChild(row);

  card.appendChild(
    el(
      'div',
      'margin:16px 0 0;font-size:11.5px;color:rgba(245,245,247,.4)',
      `${context()} — the browser console has the full report.`,
    ),
  );

  page.appendChild(card);
  return page;
}

let overlay: HTMLElement | null = null;

/** Draw a report over whatever is on screen, reusing one host so reports do not stack up. */
export function showCrashOverlay(report: CrashReport): void {
  if (typeof document === 'undefined' || !document.body) return;
  if (!overlay || !overlay.isConnected) {
    overlay = document.createElement('div');
    document.body.appendChild(overlay);
  }
  overlay.replaceChildren(buildCrashView(report));
}

/**
 * Catch what React cannot: errors thrown in event handlers, timers, promises and
 * anything else outside a render.
 */
export function installGlobalErrorHandlers(): void {
  window.__knitsHandled = true;

  window.addEventListener('error', (event) => {
    const error = (event as ErrorEvent).error;
    // A missing image or script also lands here; only real exceptions are worth a screen.
    if (!error) return;
    console.error('[knits] uncaught error', error);
    showCrashOverlay(reportFrom(error, 'in a script'));
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[knits] unhandled promise rejection', event.reason);
    showCrashOverlay(reportFrom(event.reason, 'in a promise nothing caught'));
  });
}

function CrashMount({ report }: { report: CrashReport }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const view = buildCrashView(report);
    host.current?.replaceChildren(view);
    return () => view.remove();
  }, [report]);
  return <div ref={host} />;
}

interface BoundaryState {
  crash: CrashReport | null;
}

/** Catches a failure while the desktop is drawing, so the page never goes blank. */
export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { crash: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { crash: reportFrom(error, 'while drawing the desktop', 'Knits could not start') };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[knits] the desktop failed to draw', error, info.componentStack);
    const where = info.componentStack
      ?.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(' → ');
    if (!where) return;
    this.setState((state) =>
      state.crash ? { crash: { ...state.crash, where: `Failed inside: ${where}` } } : state,
    );
  }

  render() {
    return this.state.crash ? <CrashMount report={this.state.crash} /> : this.props.children;
  }
}

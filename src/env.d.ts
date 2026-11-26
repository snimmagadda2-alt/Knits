/// <reference types="vite/client" />

declare const __VERSION__: string;

interface Window {
  /** Set by src/main.tsx once React has taken over the page. */
  __knitsMounted?: boolean;
  /** Set once main.tsx reports errors itself, so the boot watchdog stays quiet. */
  __knitsHandled?: boolean;
}

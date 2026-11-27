import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

/**
 * Hostnames the dev server answers to, read from the environment so a forwarded
 * preview keeps working without editing a file:
 *
 *   KNITS_ALLOWED_HOSTS=".agent37.app,.freebuff.site" npm run dev
 *
 * A leading dot accepts every subdomain of that domain, which is what survives the
 * sandbox handing out a new hostname on each restart. Unset means Vite's default
 * (localhost only). The tunnel hostname is still checked: an unrelated host is refused.
 *
 * The environment is reached through globalThis because this project type-checks
 * vite.config.ts without Node's types installed.
 */
const shellEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const allowedHosts = (shellEnv.KNITS_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  server: allowedHosts.length ? { allowedHosts } : undefined,
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    assetsInlineLimit: 2048,
  },
});

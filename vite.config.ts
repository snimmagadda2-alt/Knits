import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    assetsInlineLimit: 2048,
  },
});

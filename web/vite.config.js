// Vite config for the mobile-first Slotto web app.
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..');

export default defineConfig({
  root: currentDir,
  plugins: [react()],
  server: {
    fs: {
      allow: [projectRoot]
    }
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(projectRoot, 'web-dist')
  }
});

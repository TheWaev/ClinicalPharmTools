/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The public base path.
//
// Default is '/' — the app is served from the domain root (Cloudflare Pages,
// custom domains, Docker/nginx). If you ever serve it from a sub-path (e.g.
// GitHub Pages at /ClinicalPharmTools/), set BASE_PATH at build time:
// `BASE_PATH=/ClinicalPharmTools/ npm run build` — no code change needed.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.test.mjs'],
  },
});

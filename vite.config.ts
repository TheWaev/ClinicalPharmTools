/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The public base path.
//
// GitHub Pages serves this project at https://<user>.github.io/ClinicalPharmTools/,
// so the default base is '/ClinicalPharmTools/'. When the suite later moves to a
// custom domain or a different host served from the root, set BASE_PATH=/ at build
// time (e.g. `BASE_PATH=/ npm run build`) — no code change needed.
const base = process.env.BASE_PATH ?? '/ClinicalPharmTools/';

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

import { defineConfig } from 'vite';

// The render server: `index.html` hosts the fidelity-kit session. three.js variants are prebuilt ES modules in
// public/variants/<id>/three.js (`pnpm build:variants`) and are imported at runtime, so one page can load any build.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  server: { fs: { allow: ['..'] } },
});

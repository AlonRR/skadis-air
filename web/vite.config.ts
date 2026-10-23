import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { devPagePlugin } from './dev-page.js';

export default defineConfig({
  // The page builds the library from its source, so an edit there shows at once.
  resolve: {
    alias: {
      'skadis-air': fileURLToPath(new URL('../packages/core/src/index.ts', import.meta.url)),
    },
  },
  // The development page's banner, only when the Pages workflow builds main (D328).
  plugins: [devPagePlugin()],
  // Relative asset URLs: the same build works under a GitHub Pages /<repo>/ path.
  base: './',
  // The build worker (D166) imports the library and the engine as modules.
  worker: { format: 'es' },
  build: {
    outDir: 'out/site', // every generated file lives under out/ (CLAUDE.md, output layout)
    emptyOutDir: true,
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // a test that builds several boards takes 4 to 6 s on a busy machine, past vitest's 5 s (C387)
    testTimeout: 20_000,
  },
});

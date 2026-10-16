// The browser test: the BUILT page, served by `vite preview`, opened in Chromium. After parametric-
// window-sealer's web/playwright.config.ts (C32).
import { defineConfig, devices } from '@playwright/test';

const port = 4173;
// `npx playwright install chromium` fetches the build this Playwright version expects. A machine that
// already has a Chromium-based browser can point at it instead.
// oxlint-disable-next-line typescript/prefer-nullish-coalescing -- an empty variable means unset
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'out/playwright',
  reporter: 'list',
  forbidOnly: !!process.env.CI,
  // A board is built in a worker, and on a busy machine a skeleton board took longer than the 5 s an assertion
  // waits by default, failing two tests that pass alone (C220, 16 Oct 2026). A failing check still fails, later.
  expect: { timeout: 15_000 },
  projects: [
    {
      name: 'chromium',
      testIgnore: /no-webgl/,
      use: {
        ...devices['Desktop Chrome'],
        // Headless Chromium has no graphics card; these let it draw WebGL in software (SwiftShader),
        // so the 3D preview can be tested.
        launchOptions: { executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
    {
      // The same browser with 3D switched off, for the page's fallback (preview-3d).
      name: 'no-webgl',
      testMatch: /no-webgl/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath, args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] },
      },
    },
  ],
  use: { baseURL: `http://127.0.0.1:${port}/` },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
  },
});

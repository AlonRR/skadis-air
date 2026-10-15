// The page in a real browser: the unit tests run Manifold in Node and cannot show that the
// WebAssembly file is found, fetched and started from the built page. Copied from
// parametric-window-sealer's web/e2e/page.spec.ts (C32).
import { expect, test } from '@playwright/test';

test('the built page starts the engine and builds the check part', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  const status = page.getByTestId('engine-status');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-volume-mm3', '7000');
  expect(errors).toEqual([]);
});

// The control for the test above: with the WebAssembly file blocked, the page must say so. If
// this passed while the engine was really loading, the "ready" check would mean nothing.
test('a page whose engine cannot load says so', async ({ page }) => {
  await page.route('**/*.wasm', (route) => route.abort());
  await page.goto('./');
  const status = page.getByTestId('engine-status');
  await expect(status).toHaveAttribute('data-state', 'error', { timeout: 30_000 });
  await expect(status).toContainText('could not start');
});

// The page names its icon (D137): without one the browser asks for /favicon.ico, and that 404 was
// the one console error on the published page, 15 Oct 2026. The test reads the link and fetches
// what it names. It cannot watch the browser's own request: no Playwright event shows it, any
// route stops Chromium asking at all, and its console error races the board's "ready"
// (measured 15 Oct 2026), so a console check passed while the icon was missing.
test('the icon the page names is served as an SVG', async ({ page }) => {
  await page.goto('./');
  const link = page.locator('link[rel="icon"]');
  await expect(link).toHaveCount(1);
  const href = (await link.getAttribute('href')) ?? '';
  expect(href).not.toBe('');
  const icon = await page.request.get(new URL(href, page.url()).href);
  expect(icon.status()).toBe(200);
  expect(icon.headers()['content-type']).toContain('image/svg+xml');
});

// D8: shown on the page itself, not only in the repository.
test("the page says the generated files are the user's", async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('output-statement')).toContainText(
    'are yours to use, change, share or sell for any purpose, with no conditions from this project.',
  );
});

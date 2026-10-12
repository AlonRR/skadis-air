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

// D8: shown on the page itself, not only in the repository.
test("the page says the generated files are the user's", async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('output-statement')).toContainText(
    'are yours to use, change, share or sell for any purpose, with no conditions from this project.',
  );
});

// Every build runs in the background (backlog item build-worker; D166): the page answers while a large board
// is made, and a change made during a build replaces it. Before, a 400 x 400 mm skeleton board held the page
// for about 5 s (measured 15 Oct 2026); the largest board the form takes is the test's load.
import { expect, test, type Page } from '@playwright/test';
import { choose } from './design-system.js';

async function startLargeSkeleton(page: Page) {
  await page.goto('./');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await choose(page, 'boardType', 'skeleton');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.locator('input[name="widthMm"]').fill('400');
  await page.locator('input[name="heightMm"]').fill('400');
  await page.waitForTimeout(400); // past the form's 150 ms pause after typing: the build has begun
}

/** How long the page takes to run a line of script and draw a frame, from here, and what it was doing then. */
async function answer(page: Page): Promise<{ ms: number; state: string }> {
  const started = Date.now();
  const state = await page.evaluate(
    () =>
      new Promise<string>((done) =>
        requestAnimationFrame(() =>
          done(document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state') ?? ''),
        ),
      ),
  );
  return { ms: Date.now() - started, state };
}

test('the page answers while a large board is made', async ({ page }) => {
  test.setTimeout(120_000);
  await startLargeSkeleton(page);
  const status = page.getByTestId('board-status');
  const answers = [];
  for (let k = 0; k < 3; k++) answers.push(await answer(page));
  // quick, and while the board was still being made: not answers that waited for the build to end
  expect(answers.map((a) => a.state)).toEqual(['building', 'building', 'building']);
  expect(Math.max(...answers.map((a) => a.ms))).toBeLessThan(500);
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  await expect(status).toHaveAttribute('data-file-name', 'skadis-skeleton-400x400.stl');
});

test('a change made during a build replaces it', async ({ page }) => {
  test.setTimeout(120_000);
  await startLargeSkeleton(page);
  await page.locator('input[name="widthMm"]').fill('80');
  await page.locator('input[name="heightMm"]').fill('80');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-skeleton-80x80.stl', { timeout: 90_000 });
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('board-size')).toHaveText('80 × 80 × 5 mm');
  // and stays: the 400 mm board, finished after, does not take its place
  await page.waitForTimeout(1_000);
  await expect(status).toHaveAttribute('data-file-name', 'skadis-skeleton-80x80.stl');
});

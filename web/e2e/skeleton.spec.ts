// The skeleton board on the page (backlog item board-skeleton; D146, D147, D161): chosen with the boards, the
// lightened board's settings and its core under Advanced, previewed and downloaded like a board.
import { expect, test } from '@playwright/test';
import { choose } from './design-system.js';

test('the skeleton board is chosen with the boards, warns about a thin core, and downloads', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await choose(page, 'boardType', 'skeleton');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-skeleton-160x160.stl');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('preview')).toHaveAttribute('data-state', 'ready');

  const advanced = page.getByTestId('advanced');
  await advanced.locator('summary').click();
  await advanced.locator('input[name="coreMm"]').fill('1');
  await expect(page.getByTestId('warning-coreMm')).not.toBeEmpty(); // D147: made, with a warning
  await expect(status).toHaveAttribute('data-file-name', 'skadis-skeleton-160x160-core-1mm.stl');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await advanced.locator('input[name="coreMm"]').fill('0.7');
  await expect(page.getByTestId('error-coreMm')).toContainText('from 0.8'); // D147: refused
  await expect(status).toHaveAttribute('data-state', 'invalid');

  await advanced.locator('input[name="coreMm"]').fill('1.2');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download STL' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('skadis-skeleton-160x160.stl');
});

// Found by QA (Q6, 23 Oct 2026): rim 6, web 6, core 5 said "This board cannot be made: A 2.5030015808114285 mm move is
// larger than the outline takes". A core wider than the 3 mm edge band is refused on its field, in plain words.
test('refuses a core wider than the edge band on its field, in plain words, before making anything', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('./');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await choose(page, 'boardType', 'skeleton');
  const advanced = page.getByTestId('advanced');
  await advanced.locator('summary').click();
  await advanced.locator('input[name="rimMm"]').fill('6');
  await advanced.locator('input[name="webMm"]').fill('6');
  for (const core of ['5', '6', '3.1']) {
    await advanced.locator('input[name="coreMm"]').fill(core);
    await expect(page.getByTestId('error-coreMm')).toHaveText('Core width must be from 0.8 to 3 mm');
    await expect(status).toHaveAttribute('data-state', 'invalid');
  }
  // the control: a core as wide as the band is made
  await advanced.locator('input[name="coreMm"]').fill('3');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-file-name', 'skadis-skeleton-160x160-rim-6mm-web-6mm-core-3mm.stl');
});

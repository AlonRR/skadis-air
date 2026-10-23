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

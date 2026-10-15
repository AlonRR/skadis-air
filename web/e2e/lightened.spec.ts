// The lightened board on the page (backlog item board-lightened; D141 to D145): chosen with the boards,
// the solid board's settings and its own rim and web under Advanced, previewed and downloaded like a board.
import { expect, test } from '@playwright/test';
import { choose } from './design-system.js';

test('the lightened board is chosen with the boards, warns about thin webs, and downloads', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await choose(page, 'boardType', 'lightened');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-lightened-160x160.stl');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('preview')).toHaveAttribute('data-state', 'ready');
  for (const name of ['widthMm', 'heightMm', 'thicknessMm']) {
    await expect(page.locator(`input[name="${name}"]`)).toBeVisible();
  }
  await expect(page.locator('[data-side="left"]')).toHaveCount(1);

  const advanced = page.getByTestId('advanced');
  await expect(advanced.locator('input[name="webMm"]')).toBeHidden();
  await advanced.locator('summary').click();
  await advanced.locator('input[name="webMm"]').fill('1.5');
  await expect(page.getByTestId('warning-webMm')).not.toBeEmpty(); // D145: made, with a warning
  await expect(status).toHaveAttribute('data-file-name', 'skadis-lightened-160x160-web-1.5mm.stl');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await advanced.locator('input[name="webMm"]').fill('1');
  await expect(page.getByTestId('error-webMm')).toContainText('from 1.2'); // D145: refused
  await expect(status).toHaveAttribute('data-state', 'invalid');

  await advanced.locator('input[name="webMm"]').fill('3');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download STL' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('skadis-lightened-160x160.stl');
});

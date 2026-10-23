// The fit coupon on the page (backlog item fit-coupon; D67): chosen under Advanced, Test prints (D357), with its own
// settings, previewed and downloaded like a board.
import { expect, test } from '@playwright/test';
import { choose } from './design-system.js';

test('the fit coupon is chosen under Test prints, shows its own settings, and downloads', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await choose(page, 'boardType', 'fit-coupon');
  for (const name of ['clearanceFromMm', 'clearanceStepMm', 'thicknessMm']) {
    await expect(page.locator(`input[name="${name}"]`)).toBeVisible();
  }
  await expect(page.locator('[data-side="left"]')).toHaveCount(0); // its sides are fixed (D68)
  await expect(page.getByTestId('board-status')).toHaveAttribute(
    'data-file-name',
    'skadis-fit-coupon-5mm-0-to-0.3.stl',
  );
  await expect(page.getByTestId('preview')).toHaveAttribute('data-state', 'ready');
  await page.locator('input[name="clearanceFromMm"]').fill('0.1');
  await expect(page.getByTestId('board-status')).toHaveAttribute(
    'data-file-name',
    'skadis-fit-coupon-5mm-0.1-to-0.4.stl',
  );
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download STL' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('skadis-fit-coupon-5mm-0.1-to-0.4.stl');
});

test('the seam-test pair is chosen beside the coupon, and downloads (D69)', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await choose(page, 'boardType', 'seam-test');
  for (const name of ['slotClearanceMm', 'thicknessMm'])
    await expect(page.locator(`input[name="${name}"]`)).toBeVisible();
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-seam-test-5mm-0.2.stl');
  await expect(status).toContainText('Board ready');
  await expect(page.getByTestId('board-size')).toHaveText('90 × 80 × 5 mm'); // two 40 x 80 tiles, 10 mm apart
  await page.locator('input[name="slotClearanceMm"]').fill('0.3');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-seam-test-5mm-0.3.stl');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download STL' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('skadis-seam-test-5mm-0.3.stl');
});

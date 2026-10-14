// The printer bed (backlog item printer-default): 200 x 200 mm unless set (D61), and a board larger
// than the bed is warned about but still offered for download (D62).
import { expect, test, type Page } from '@playwright/test';
import { choose, chosen } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

test('starts on the safe default bed, 200 x 200 mm, which the starting board fits', async ({ page }) => {
  await ready(page);
  await expect(chosen(page, 'printerBed')).toHaveValue('default');
  await expect(page.getByTestId('printer-bed').locator('input:checked + .ws-choice__face')).toContainText(
    '200 × 200 mm',
  );
  await expect(page.getByTestId('bed-warning')).toBeEmpty();
});

test('warns when the board does not fit the bed, and still offers the download (D62)', async ({ page }) => {
  await ready(page);
  await page.locator('input[name="widthMm"]').fill('240');
  await page.locator('input[name="heightMm"]').fill('200');
  await expect(page.getByTestId('bed-warning')).toContainText('does not fit the 200 × 200 mm bed');
  await expect(page.getByRole('button', { name: 'Download STL' })).toBeEnabled();
});

test('takes a custom bed, and the warning goes once the board fits it', async ({ page }) => {
  await ready(page);
  await page.locator('input[name="widthMm"]').fill('240');
  await page.locator('input[name="heightMm"]').fill('200');
  await expect(page.getByTestId('bed-warning')).not.toBeEmpty();
  await choose(page, 'printerBed', 'custom');
  await page.locator('input[name="bedXMm"]').fill('250');
  await page.locator('input[name="bedYMm"]').fill('210');
  await expect(page.getByTestId('bed-warning')).toBeEmpty();
});

test('says so when the custom bed is not a size it can use', async ({ page }) => {
  await ready(page);
  await choose(page, 'printerBed', 'custom');
  await page.locator('input[name="bedXMm"]').fill('20');
  await expect(page.getByTestId('bed-error')).toContainText('50');
});

// Run only by the "no-webgl" project, whose Chromium has 3D switched off: a visitor whose browser
// cannot draw in 3D is told so, and the rest of the page still works (after parametric-window-sealer).
import { expect, test } from '@playwright/test';

test('without WebGL the page says so, and the form still makes the board', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('preview')).toHaveAttribute('data-state', 'unavailable', { timeout: 30_000 });
  await expect(page.getByTestId('preview-message')).toContainText('needs WebGL');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.locator('input[name="widthMm"]').fill('240');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-file-name', 'skadis-solid-240x160.stl');
});

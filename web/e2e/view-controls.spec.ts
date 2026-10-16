// The 3D view without a pointer (the design system's D30 and D36, v0.4.0 and v0.5.0; D202): Reset view, Zoom in
// and Zoom out, and a Front · Back · Top choice in the view; the arrow keys turn the focused view and + and -
// zoom it; the zoom stops where a pinch stops; a view faces that side and a turn away clears it. On a phone,
// Zoom and the views wait in the View... menu.
import { expect, test, type Page } from '@playwright/test';
import { choose } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('preview')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}
const distance = async (page: Page) => Number(await page.getByTestId('preview').getAttribute('data-distance'));

test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('shows Reset view, Zoom in, Zoom out and the views, and names the drawing for assistive technology', async ({
    page,
  }) => {
    await ready(page);
    for (const id of ['preview-reset', 'zoom-in', 'zoom-out', 'views'])
      await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.getByTestId('view-more')).toBeHidden();
    const canvas = page.getByTestId('preview').locator('canvas');
    await expect(canvas).toHaveAttribute('tabindex', '0');
    await expect(canvas).toHaveAttribute('role', 'img');
    await expect(canvas).toHaveAttribute('aria-label', 'The board in 3D');
    await expect(canvas).toHaveAttribute('aria-describedby', 'plan-line');
  });

  test('zooms in and out by the buttons, stopping where a pinch stops', async ({ page }) => {
    await ready(page);
    const start = await distance(page);
    await page.getByTestId('zoom-in').click();
    await expect.poll(() => distance(page)).toBeLessThan(start);
    for (let i = 0; i < 30; i += 1) await page.getByTestId('zoom-out').click();
    const farthest = await distance(page);
    await page.getByTestId('zoom-out').click();
    expect(await distance(page)).toBe(farthest); // held at the limit a pinch has
    expect(farthest).toBeGreaterThan(start);
  });

  test('faces the board from the front, and a turn away by the arrow keys clears the choice', async ({ page }) => {
    await ready(page);
    await choose(page, 'view', 'front');
    await expect(page.getByTestId('preview')).toHaveAttribute('data-view', 'front');
    await expect(page.locator('input[name="view"][value="front"]')).toBeChecked();
    const before = await distance(page);
    await page.getByTestId('preview').locator('canvas').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('preview')).toHaveAttribute('data-view', '');
    await expect(page.locator('input[name="view"][value="front"]')).not.toBeChecked();
    expect(await distance(page)).toBe(before); // a turn keeps the distance
    await page.keyboard.press('+');
    await expect.poll(() => distance(page)).toBeLessThan(before);
    // Reset view brings back the first view, which is no named side
    await choose(page, 'view', 'back');
    await expect(page.getByTestId('preview')).toHaveAttribute('data-view', 'back');
    await page.getByTestId('preview-reset').click();
    await expect(page.getByTestId('preview')).toHaveAttribute('data-view', '');
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('keeps Zoom and the views in the View... menu, one press away', async ({ page }) => {
    await ready(page);
    await expect(page.getByTestId('preview-reset')).toBeVisible();
    await expect(page.getByTestId('view-more')).toBeVisible();
    await expect(page.getByTestId('zoom-in')).toBeHidden();
    await page.getByTestId('view-more').click();
    await expect(page.getByTestId('zoom-in')).toBeVisible();
    await expect(page.getByTestId('views')).toBeVisible();
  });
});

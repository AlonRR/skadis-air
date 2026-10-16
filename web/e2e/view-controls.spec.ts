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

  test('leaves the browser its own shortcuts: Ctrl with - is not a zoom of the drawing (the review)', async ({
    page,
  }) => {
    await ready(page);
    const before = await distance(page);
    await page.getByTestId('preview').locator('canvas').focus();
    // each on its own: one after the other, a zoom out and a zoom in would cancel and hide the fault
    await page.keyboard.press('Control+Minus');
    expect(await distance(page)).toBe(before);
    await page.keyboard.press('Control+Equal');
    expect(await distance(page)).toBe(before);
    // control: the same keys alone zoom it
    await page.keyboard.press('Minus');
    await expect.poll(() => distance(page)).toBeGreaterThan(before);
  });

  test('does not keep a view chosen while there is nothing to face (the review)', async ({ page }) => {
    await ready(page);
    await page.locator('input[name="widthMm"]').fill('250'); // off the 40 mm steps: no board
    await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
    // a click, not check(): check() insists the choice stays made, which is the fault this looks for
    const front = page.locator('input[name="view"][value="front"]');
    await front.click();
    await expect(front).not.toBeChecked();
    await expect(page.getByTestId('preview')).toHaveAttribute('data-view', '');
  });

  test('names the stage as its drawing is named: the board, the connector (the review)', async ({ page }) => {
    await ready(page);
    const stage = page.locator('.ws-stage');
    await expect(stage).toHaveAttribute('aria-label', 'The board in 3D');
    await choose(page, 'boardType', 'standoff');
    await expect(page.getByTestId('board-status')).toContainText('Connector ready');
    await expect(stage).toHaveAttribute('aria-label', 'The connector in 3D');
    await expect(page.getByTestId('preview').locator('canvas')).toHaveAttribute('aria-label', 'The connector in 3D');
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

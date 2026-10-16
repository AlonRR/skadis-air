// A wall on the page (backlog item tiling; D175 to D178): "Split into panels" on a board makes its size a wall's,
// cut into panels the chosen bed takes, as even as they can be; the preview shows the whole wall, and a print
// list gives each panel size with its count and its own download.
import { expect, test, type Page } from '@playwright/test';
import { choose } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

test('splits a board into panels for the bed, lists each size with its count, and downloads one', async ({ page }) => {
  test.setTimeout(90_000);
  await ready(page);
  const status = page.getByTestId('board-status');
  await expect(page.getByTestId('print-list')).toBeHidden();
  await choose(page, 'panels', 'split');
  await page.locator('input[name="widthMm"]').fill('440');
  await page.locator('input[name="heightMm"]').fill('280');
  await expect(status).toContainText('Wall ready: 6 panels', { timeout: 30_000 });
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('preview')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('board-size')).toHaveText('440 × 280 × 5 mm');
  const list = page.getByTestId('print-list');
  await expect(list).toBeVisible();
  const rows = list.getByTestId('print-row');
  await expect(rows).toHaveCount(6);
  await expect(rows.first()).toContainText('1 × 160 × 160 mm');
  await expect(page.getByRole('button', { name: 'Download STL' })).toBeHidden(); // each size has its own (D178)
  await expect(page.getByTestId('bed-warning')).toBeEmpty(); // every panel fits the bed
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    rows.first().getByRole('button', { name: 'Download' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('skadis-solid-160x160-closed-left-bottom.stl');
});

test("closes the wall's sides when split, and they open again (D37)", async ({ page }) => {
  await ready(page);
  const pressed = () =>
    page.locator('[data-side]').evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-pressed')));
  expect(await pressed()).toEqual(['false', 'false', 'false', 'false']); // one board: open all round
  await choose(page, 'panels', 'split');
  expect(await pressed()).toEqual(['true', 'true', 'true', 'true']); // a wall: closed round its outer edge
  await page.locator('[data-side="right"]').click();
  await choose(page, 'panels', 'one');
  await choose(page, 'panels', 'split');
  // closed again only where it was open: the user's choice for the right side is kept as closed now
  expect(await pressed()).toEqual(['true', 'true', 'true', 'true']);
});

test('refuses one board larger than 400 mm, pointing to the panels (C51)', async ({ page }) => {
  await ready(page);
  await page.locator('input[name="widthMm"]').fill('440');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-state', 'problem');
  await expect(status).toContainText('Split into panels');
});

test("makes the panels as large as the chosen printer's bed takes", async ({ page }) => {
  test.setTimeout(90_000);
  await ready(page);
  await choose(page, 'printerBed', 'prusa'); // the MK4S, 250 x 210 mm: 6 x 5 tiles
  await choose(page, 'panels', 'split');
  await page.locator('input[name="widthMm"]').fill('440');
  await page.locator('input[name="heightMm"]').fill('280');
  await expect(page.getByTestId('board-status')).toContainText('Wall ready: 4 panels', { timeout: 30_000 });
});

test('makes the largest wall, 1600 x 1600 mm, and draws it, each kind of panel sent once', async ({ page }) => {
  test.setTimeout(120_000);
  await ready(page);
  await choose(page, 'panels', 'split');
  await page.locator('input[name="widthMm"]').fill('1600');
  await page.locator('input[name="heightMm"]').fill('1600');
  const status = page.getByTestId('board-status');
  await expect(status).toContainText('Wall ready: 64 panels', { timeout: 90_000 });
  await expect(page.getByTestId('preview')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('board-size')).toHaveText('1600 × 1600 × 5 mm');
  // nine kinds: four corners, four sides and the middle, closed round the wall (D37)
  await expect(page.getByTestId('print-list').getByTestId('print-row')).toHaveCount(9);
});

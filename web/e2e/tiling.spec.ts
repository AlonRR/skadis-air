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

test('makes a wall 1600 x 1600 mm and draws it, each kind of panel sent once', async ({ page }) => {
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
  // the print list scrolls in its own share of the stage, so the 3D view keeps most of it (C205)
  const view = await page.getByTestId('preview').boundingBox();
  const stage = await page.locator('.ws-stage').boundingBox();
  expect(view?.height ?? 0).toBeGreaterThan((stage?.height ?? 0) * 0.3);
});

// A wall of any size (D196), drawn in full only where the view needs it (D197, C203, C204): far panels stand in as
// flat plates with the slots painted on, and zooming in draws the panels in view in full.
test('makes a wall 20 m wide and draws it, only the panels the view needs in full', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await ready(page);
  await choose(page, 'panels', 'split');
  await page.locator('input[name="widthMm"]').fill('20000');
  await page.locator('input[name="heightMm"]').fill('2400');
  const status = page.getByTestId('board-status');
  await expect(status).toContainText('Wall ready', { timeout: 90_000 });
  const preview = page.getByTestId('preview');
  await expect(preview).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('board-size')).toHaveText('20000 × 2400 × 5 mm');
  const number = async (name: string) => Number(await preview.getAttribute(name));
  // seen whole, the slots are too small to draw: every panel stands in, in a few triangles
  const panels = await number('data-panels');
  expect(panels).toBeGreaterThan(400);
  expect(await number('data-detailed')).toBeLessThan(panels);
  expect(await number('data-triangles')).toBeLessThan(5_000_000);
  // a turn that leaves the same panels in full does not build the stand-ins again (the review)
  const builds = await number('data-stand-in-builds');
  expect(builds).toBeGreaterThan(0);
  await preview.locator('canvas').focus();
  await page.keyboard.press('ArrowLeft');
  expect(await number('data-detailed')).toBe(0);
  expect(await number('data-stand-in-builds')).toBe(builds);
  await expect(page.locator('.ws-stage')).toHaveAttribute('aria-label', 'The wall in 3D');
  // zoomed in, the panels near the middle are drawn in full, still within the budget
  const canvas = await preview.locator('canvas').boundingBox();
  if (canvas === null) throw new Error('no canvas');
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  for (let i = 0; i < 40; i += 1) await page.mouse.wheel(0, -400);
  await expect.poll(() => number('data-detailed'), { timeout: 10_000 }).toBeGreaterThan(0);
  expect(await number('data-detailed')).toBeLessThan(panels);
  expect(await number('data-triangles')).toBeLessThanOrEqual(5_000_000 + 10_000);
  // control: a zoom that draws panels in full builds the stand-ins round them again
  expect(await number('data-stand-in-builds')).toBeGreaterThan(builds);
  expect(errors).toEqual([]);
});

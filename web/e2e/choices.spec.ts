// The page's choices (D250): boards or connectors is a toggle at the top, showing that group's types (h); each type's
// choices are kept when switching between types, and after a reload (g); and a number field steps by arrows and by
// the arrow keys, within its limits (c).
import { expect, test, type Page } from '@playwright/test';
import { choose, chosen } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}
const option = (page: Page, id: string) =>
  page.locator('.ws-choice__opt', { has: page.locator(`input[name="boardType"][value="${id}"]`) });

test("chooses boards or connectors with a toggle at the top, showing only that group's types (D250 h)", async ({
  page,
}) => {
  await ready(page);
  const status = page.getByTestId('board-status');
  await expect(chosen(page, 'typeGroup')).toHaveValue('board');
  await expect(option(page, 'solid')).toBeVisible();
  await expect(option(page, 'standoff')).toBeHidden();
  await choose(page, 'typeGroup', 'connector');
  await expect(option(page, 'standoff')).toBeVisible();
  await expect(option(page, 'solid')).toBeHidden();
  // the group's first type is shown at once
  await expect(chosen(page, 'boardType')).toHaveValue('standoff');
  await expect(status).toContainText('Connector ready');
  await choose(page, 'typeGroup', 'board');
  await expect(chosen(page, 'boardType')).toHaveValue('solid');
  await expect(status).toContainText('Board ready');
});

test("keeps each type's choices when switching between types, and after a reload (D250 g)", async ({ page }) => {
  await ready(page);
  const status = page.getByTestId('board-status');
  const width = page.locator('input[name="widthMm"]');
  await width.fill('240');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-solid-240x160.stl');
  // a board's size is the next board's too
  await choose(page, 'boardType', 'lightened');
  await expect(width).toHaveValue('240');
  // a connector keeps its own
  await choose(page, 'boardType', 'slot-clip');
  await choose(page, 'fixing', 'none');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-2-boards-15mm.stl');
  await choose(page, 'boardType', 'standoff');
  await choose(page, 'boardType', 'slot-clip');
  await expect(chosen(page, 'fixing')).toHaveValue('none');
  // and the boards theirs, after the connectors
  await choose(page, 'typeGroup', 'board');
  await expect(chosen(page, 'boardType')).toHaveValue('lightened');
  await expect(width).toHaveValue('240');
  // kept in this browser
  await page.reload();
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(chosen(page, 'boardType')).toHaveValue('lightened');
  await expect(width).toHaveValue('240');
});

test('steps a number field by its arrows and the arrow keys, within its limits (D250 c)', async ({ page }) => {
  await ready(page);
  const width = page.locator('input[name="widthMm"]');
  const larger = page.getByRole('button', { name: 'Larger width', exact: true });
  const smaller = page.getByRole('button', { name: 'Smaller width', exact: true });
  await expect(width).toHaveValue('160');
  await larger.click();
  await expect(width).toHaveValue('200'); // by its 40 mm step
  await smaller.click();
  await smaller.click();
  await expect(width).toHaveValue('120');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-file-name', 'skadis-solid-120x160.stl');
  await width.focus();
  await page.keyboard.press('ArrowUp');
  await expect(width).toHaveValue('160');
  // it stops at its least
  await width.fill('40');
  await smaller.click();
  await expect(width).toHaveValue('40');
  // a fine step: the slot clearance, by 0.05 mm, under Advanced
  await page.getByTestId('advanced').locator('summary').click();
  await page.getByRole('button', { name: 'Larger slot clearance', exact: true }).click();
  await expect(page.locator('input[name="slotClearanceMm"]')).toHaveValue('0.25');
});

test('sets the theme from its own file, with no script written into the page (D250)', async ({ page }) => {
  await ready(page);
  await expect(page.locator('script:not([src])')).toHaveCount(0);
  await expect(page.locator('head script[src$="theme-init.js"]')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
});

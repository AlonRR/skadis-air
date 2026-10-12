// The page's form, generated from the board types (backlog item registry): the owner's choices for
// the form, D45 to D48, and that a change to any control rebuilds the board.
import { expect, test, type Page } from '@playwright/test';
import { BOARD_TYPES } from '../../packages/core/src/board-types/index.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

// The list on the page is the registry's, read from it here rather than written out: a test that
// named the types failed the trial addition of a second type for no fault of the page (12 Oct 2026).
test('lists the board types that are built, in the order of the registry, opening on the first (D47)', async ({
  page,
}) => {
  await ready(page);
  const options = page.getByTestId('board-type').locator('option');
  await expect(options).toHaveText(BOARD_TYPES.map((t) => t.name));
  await expect(page.getByTestId('board-type')).toHaveValue(BOARD_TYPES[0]?.id ?? '');
});

test('shows size, thickness and sides on the form, and folds the fine settings under Advanced (D48)', async ({
  page,
}) => {
  await ready(page);
  for (const name of ['widthMm', 'heightMm', 'thicknessMm'])
    await expect(page.locator(`input[name="${name}"]`)).toBeVisible();
  const advanced = page.getByTestId('advanced');
  await expect(advanced).not.toHaveAttribute('open', /.*/);
  for (const name of ['slotClearanceMm', 'slotChamferMm', 'cornerRadiusMm']) {
    await expect(advanced.locator(`input[name="${name}"]`)).toBeHidden();
  }
  await advanced.locator('summary').click();
  await expect(advanced.locator('input[name="slotClearanceMm"]')).toBeVisible();
});

test('takes the size in mm, in 40 mm steps, and shows it in tiles (D45)', async ({ page }) => {
  await ready(page);
  const width = page.locator('input[name="widthMm"]');
  await expect(width).toHaveAttribute('step', '40');
  await expect(page.getByTestId('count-widthMm')).toHaveText('= 4 tiles');
  await width.fill('240');
  await page.locator('input[name="heightMm"]').fill('200');
  await expect(page.getByTestId('count-widthMm')).toHaveText('= 6 tiles');
  await expect(page.getByTestId('count-heightMm')).toHaveText('= 5 tiles');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-file-name', 'skadis-solid-240x200.stl');
});

test('refuses a size off the 40 mm steps, and builds nothing from it', async ({ page }) => {
  await ready(page);
  await page.locator('input[name="widthMm"]').fill('250');
  await expect(page.getByTestId('error-widthMm')).toContainText('40 mm steps');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
});

test('warns about a thickness outside 4 to 5.5 mm, and still builds it (C43)', async ({ page }) => {
  await ready(page);
  const thickness = page.locator('input[name="thicknessMm"]');
  await thickness.fill('6');
  await expect(page.getByTestId('warning-thicknessMm')).toContainText('4 to 5.5');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready');
  await thickness.fill('5');
  await expect(page.getByTestId('warning-thicknessMm')).toBeEmpty();
});

test('opens or closes each side with a toggle placed at that side (D46)', async ({ page }) => {
  await ready(page);
  const left = page.locator('[data-side="left"]');
  await expect(left).toHaveAttribute('aria-pressed', 'false'); // open by default (D37)
  await left.click();
  await expect(left).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-side="bottom"]').click();
  await expect(page.getByTestId('board-status')).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-closed-left-bottom.stl',
  );
});

test('says so when a combination cannot be made, instead of building it', async ({ page }) => {
  await ready(page);
  await page.getByTestId('advanced').locator('summary').click();
  await page.locator('input[name="thicknessMm"]').fill('2.5');
  await page.locator('input[name="slotChamferMm"]').fill('1.5');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'problem');
  await expect(page.getByTestId('board-status')).toContainText('thicker');
});

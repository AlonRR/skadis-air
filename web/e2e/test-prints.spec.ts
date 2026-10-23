// The test prints under Advanced (D357; the owner, 23 Oct 2026: "fit test coupon and seam test pair should be an
// advanced option"): the Board list holds the boards alone, and the fit coupon and the seam-test pair are a "Test
// prints" choice at the top of every board's Advanced fold. They are one choice of type with the Board list, so
// one of them chosen leaves the list with nothing ticked, and a board chosen there leaves nothing ticked under Test
// prints. The lists are read from the registry, as form.spec.ts reads them (C380).
import { expect, test, type Page } from '@playwright/test';
import { BOARD_TYPES, groupOf } from '../../packages/core/src/board-types/index.js';

const BOARDS = BOARD_TYPES.filter((t) => groupOf(t) === 'board' && t.testPrint !== true);
const TEST_PRINTS = BOARD_TYPES.filter((t) => t.testPrint === true);
const CONNECTORS = BOARD_TYPES.filter((t) => groupOf(t) === 'connector');

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

const boardList = (page: Page) => page.getByTestId('board-type').getByRole('radiogroup', { name: 'Boards' });
const advanced = (page: Page) => page.getByTestId('advanced');
const testPrints = (page: Page) => advanced(page).getByRole('radiogroup', { name: 'Test prints', includeHidden: true });
/** The values of a group's options, and of those ticked. */
const values = (group: ReturnType<typeof boardList>, ticked = false) =>
  group
    .locator(`input[name="boardType"]${ticked ? ':checked' : ''}`)
    .evaluateAll((inputs) => inputs.map((i) => (i instanceof HTMLInputElement ? i.value : '')));
const status = (page: Page) => page.getByTestId('board-status');

test('the Board list holds the boards alone, not the test prints (D357)', async ({ page }) => {
  await ready(page);
  expect(BOARDS.map((t) => t.id)).toEqual(['solid', 'lightened', 'skeleton']);
  expect(await values(boardList(page))).toEqual(BOARDS.map((t) => t.id));
  await expect(page.getByTestId('board-type').getByRole('radio', { name: 'Fit test coupon' })).toHaveCount(0);
});

test('every board\'s Advanced fold starts with a "Test prints" choice of the two, folded at first (D357)', async ({
  page,
}) => {
  await ready(page);
  expect(TEST_PRINTS.map((t) => t.id)).toEqual(['fit-coupon', 'seam-test']);
  for (const board of BOARDS) {
    await boardList(page).getByRole('radio', { name: board.name }).check();
    await expect(status(page)).toHaveAttribute('data-file-name', new RegExp(`^skadis-${board.id}-`));
    await expect(advanced(page)).not.toHaveAttribute('open', /.*/);
    await expect(testPrints(page)).toBeHidden();
    expect(await values(testPrints(page)), board.id).toEqual(TEST_PRINTS.map((t) => t.id));
    expect(await values(testPrints(page), true), board.id).toEqual([]);
    await advanced(page).locator('summary').click();
    await expect(testPrints(page)).toBeVisible();
    // the first field in the fold, under its summary, labelled in words as the form's other choices are
    const first = advanced(page).locator('.field').first();
    await expect(first.getByRole('radiogroup', { name: 'Test prints' })).toBeVisible();
    await expect(first.locator('.ws-label')).toHaveText('Test prints');
    for (const t of TEST_PRINTS) await expect(testPrints(page).getByRole('radio', { name: t.name })).toBeVisible();
  }
});

test('choosing the fit coupon shows its form, its Advanced open on it, and unticks the Board list (D357)', async ({
  page,
}) => {
  await ready(page);
  await advanced(page).locator('summary').click();
  await testPrints(page).getByRole('radio', { name: 'Fit test coupon' }).check();
  await expect(status(page)).toHaveAttribute('data-file-name', /^skadis-fit-coupon-/);
  await expect(page.locator('input[name="clearanceFromMm"]')).toBeVisible();
  await expect(advanced(page)).toHaveAttribute('open', '');
  await expect(testPrints(page)).toBeVisible();
  expect(await values(testPrints(page), true)).toEqual(['fit-coupon']);
  expect(await values(boardList(page), true)).toEqual([]);
  await expect(page.locator('input[name="boardType"]:checked')).toHaveCount(1);
  // the pair from the coupon's own fold, the same way
  await testPrints(page).getByRole('radio', { name: 'Seam test pair' }).check();
  await expect(status(page)).toHaveAttribute('data-file-name', /^skadis-seam-test-/);
  await expect(advanced(page)).toHaveAttribute('open', '');
  expect(await values(testPrints(page), true)).toEqual(['seam-test']);
  await expect(page.locator('input[name="boardType"]:checked')).toHaveCount(1);
});

test('choosing a board in the Board list goes back, with nothing ticked under Test prints (D357)', async ({ page }) => {
  await ready(page);
  await advanced(page).locator('summary').click();
  await testPrints(page).getByRole('radio', { name: 'Fit test coupon' }).check();
  await expect(status(page)).toHaveAttribute('data-file-name', /^skadis-fit-coupon-/);
  await boardList(page).getByRole('radio', { name: 'Solid' }).check();
  await expect(status(page)).toHaveAttribute('data-file-name', /^skadis-solid-/);
  expect(await values(boardList(page), true)).toEqual(['solid']);
  expect(await values(testPrints(page), true)).toEqual([]);
  await expect(page.locator('input[name="boardType"]:checked')).toHaveCount(1);
  await expect(advanced(page)).not.toHaveAttribute('open', /.*/); // a board's form starts folded, as before
});

test('a reload keeps the fit coupon, its Advanced fold open to show it (D357, D250 g)', async ({ page }) => {
  await ready(page);
  await advanced(page).locator('summary').click();
  await testPrints(page).getByRole('radio', { name: 'Fit test coupon' }).check();
  await expect(status(page)).toHaveAttribute('data-file-name', /^skadis-fit-coupon-/);
  await page.reload();
  await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(status(page)).toHaveAttribute('data-file-name', /^skadis-fit-coupon-/);
  await expect(advanced(page)).toHaveAttribute('open', '');
  await expect(testPrints(page)).toBeVisible();
  expect(await values(testPrints(page), true)).toEqual(['fit-coupon']);
  expect(await values(boardList(page), true)).toEqual([]);
  await expect(page.locator('input[name="typeGroup"]:checked')).toHaveValue('board');
});

test('the arrow keys move between the test prints, the focus kept on the one chosen (D357)', async ({ page }) => {
  await ready(page);
  await advanced(page).locator('summary').click();
  await testPrints(page).getByRole('radio', { name: 'Fit test coupon' }).check();
  await expect(status(page)).toHaveAttribute('data-file-name', /^skadis-fit-coupon-/);
  await testPrints(page).getByRole('radio', { name: 'Fit test coupon' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(status(page)).toHaveAttribute('data-file-name', /^skadis-seam-test-/);
  // the form was made again for the pair: its own radio has the focus, so the next key goes on from it
  await expect(testPrints(page).getByRole('radio', { name: 'Seam test pair' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(status(page)).toHaveAttribute('data-file-name', /^skadis-fit-coupon-/);
  await expect(testPrints(page).getByRole('radio', { name: 'Fit test coupon' })).toBeFocused();
});

// A guard, not a change: it passes on the page before D357 too.
test('the connectors are untouched: their list, and no test prints in their forms (D357)', async ({ page }) => {
  await ready(page);
  await page.locator('label', { has: page.locator('input[name="typeGroup"][value="connector"]') }).click();
  const connectors = page.getByTestId('board-type').getByRole('radiogroup', { name: 'Connectors' });
  expect(await values(connectors)).toEqual(CONNECTORS.map((t) => t.id));
  for (const connector of CONNECTORS) {
    await connectors.getByRole('radio', { name: connector.name }).check();
    await expect(status(page)).toHaveAttribute('data-file-name', new RegExp(`^skadis-${connector.id}-`));
    await expect(status(page)).toContainText('Connector ready');
    await expect(page.getByTestId('board-form').getByRole('radiogroup', { name: 'Test prints' })).toHaveCount(0);
    for (const t of TEST_PRINTS) {
      await expect(page.getByTestId('board-form').locator(`input[value="${t.id}"]`)).toHaveCount(0);
    }
  }
});

// The page's form, generated from the board types (backlog item registry): the owner's choices for
// the form, D45 to D48, and that a change to any control rebuilds the board.
import { expect, test, type Page } from '@playwright/test';
import { BOARD_TYPES } from '../../packages/core/src/board-types/index.js';
import { choose, chosen } from './design-system.js';

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
  const options = page.getByTestId('board-type').locator('.ws-choice__face');
  await expect(options).toHaveText(BOARD_TYPES.map((t) => t.name));
  await expect(chosen(page, 'boardType')).toHaveValue(BOARD_TYPES[0]?.id ?? '');
});

test('shows size, thickness and sides on the form, and folds the fine settings under Advanced (D48)', async ({
  page,
}) => {
  await ready(page);
  for (const name of ['widthMm', 'heightMm', 'thicknessMm'])
    await expect(page.locator(`input[name="${name}"]`)).toBeVisible();
  const advanced = page.getByTestId('advanced');
  await expect(advanced).not.toHaveAttribute('open', /.*/);
  for (const name of ['screwHead', 'standoffs']) await expect(chosen(page, name)).toBeVisible();
  for (const name of ['slotClearanceMm', 'slotChamferMm', 'cornerRadiusMm', 'screwMm', 'standoffHeightMm']) {
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

test('offers screw holes and standoffs, and names the file for what differs from the start (D73 to D75)', async ({
  page,
}) => {
  await ready(page);
  await expect(chosen(page, 'screwHead')).toHaveValue('countersunk'); // D74
  await expect(chosen(page, 'standoffs')).toHaveValue('none'); // D75: an option
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-file-name', 'skadis-solid-160x160.stl');
  await choose(page, 'screwHead', 'round');
  await choose(page, 'standoffs', 'back');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-solid-160x160-round-head-standoffs-20mm.stl');
  await expect(page.getByTestId('board-size')).toHaveText('160 × 160 × 25 mm'); // 5 mm of board, 20 mm of standoff
});

test('offers keyholes, which bring their standoffs, with lock screws under Advanced (D155 to D157, D190)', async ({
  page,
}) => {
  await ready(page);
  const status = page.getByTestId('board-status');
  await choose(page, 'screwHead', 'keyhole');
  // choosing keyholes turns the standoffs on, so a hook has room behind the board (D190)
  await expect(chosen(page, 'standoffs')).toHaveValue('back');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-solid-160x160-keyholes-standoffs-20mm.stl');
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('board-size')).toHaveText('160 × 160 × 25 mm');
  await page.getByTestId('advanced').locator('summary').click();
  await choose(page, 'lockScrews', 'bottom');
  await expect(status).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-keyholes-lock-screws-standoffs-20mm.stl',
  );
  // taking the standoffs off again would hang the board flat: a problem, saying why
  await choose(page, 'standoffs', 'none');
  await expect(status).toHaveAttribute('data-state', 'problem');
  await expect(status).toContainText('standoffs at least 8 mm');
});

test('says a countersink too deep for a thin board cannot be made, and makes it with a round head', async ({
  page,
}) => {
  await ready(page);
  await page.locator('input[name="thicknessMm"]').fill('3');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'problem');
  await expect(page.getByTestId('board-status')).toContainText('round head');
  await choose(page, 'screwHead', 'round');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready');
});

test('lists the boards, then the connectors under their own heading, as buttons (D91, D112)', async ({ page }) => {
  await ready(page);
  const types = page.getByTestId('board-type');
  await expect(types.locator('.ws-caps')).toHaveText(['Boards', 'Connectors']);
  const groups = types.getByRole('radiogroup');
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0)).toHaveAttribute('aria-label', 'Boards');
  await expect(groups.nth(1)).toHaveAttribute('aria-label', 'Connectors');
  await expect(groups.nth(1).getByRole('radio', { name: 'Standoff' })).toHaveValue('standoff');
});

test('makes a standoff from the same form, preview and download as a board (D91 to D94)', async ({ page }) => {
  await ready(page);
  await choose(page, 'boardType', 'standoff');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-standoff-1-board-20mm.stl');
  await expect(status).toContainText('Connector ready');
  await expect(page.getByTestId('board-size')).toHaveText('10 × 10 × 20 mm');
  await expect(page.locator('[data-side="left"]')).toHaveCount(0); // a spacer has no sides
  await page.locator('input[name="heightMm"]').fill('25');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-standoff-1-board-25mm.stl');
  await expect(page.getByRole('button', { name: 'Download STL' })).toBeEnabled();
});

test('makes the standoff for 2 or 4 boards, and says when it is too short for its tunnel (D92, D97)', async ({
  page,
}) => {
  await ready(page);
  await choose(page, 'boardType', 'standoff');
  const status = page.getByTestId('board-status');
  await choose(page, 'boards', '4');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-standoff-4-boards-20mm.stl');
  await expect(page.getByTestId('board-size')).toHaveText('30 × 30 × 20 mm');
  await choose(page, 'boards', '2');
  await page.locator('input[name="heightMm"]').fill('10');
  await expect(status).toHaveAttribute('data-state', 'problem');
  await expect(status).toContainText('12 mm');
});

test('makes the slot clip for 2 boards either way or for 4, with a fixing and a grip (D187 to D189, D194, D195)', async ({
  page,
}) => {
  await ready(page);
  await choose(page, 'boardType', 'slot-clip');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-2-boards-20mm.stl');
  await expect(status).toContainText('Connector ready');
  await expect(page.getByTestId('board-size')).toHaveText('60 × 20 × 22.5 mm');
  await choose(page, 'boards', '2-stacked');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-2-boards-stacked-20mm.stl');
  await expect(page.getByTestId('board-size')).toHaveText('20 × 60 × 22.5 mm');
  await choose(page, 'boards', '4');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-4-boards-20mm.stl');
  await expect(page.getByTestId('board-size')).toHaveText('60 × 60 × 22.5 mm');
  // a screw through its free half, and a lip under Advanced (D194, D195)
  await choose(page, 'fixing', 'screw');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-4-boards-20mm-screw.stl');
  await page.getByTestId('advanced').locator('summary').click();
  await choose(page, 'grip', 'lip');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-4-boards-20mm-lip-screw.stl');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  // the form refuses a depth under 12 mm before anything is built (D187: the hooks' 8 mm and a 4 mm bar)
  await page.locator('input[name="depthMm"]').fill('10');
  await expect(page.getByTestId('error-depthMm')).toContainText('from 12');
  await expect(status).toHaveAttribute('data-state', 'invalid');
});

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
  // every type, boards then connectors as the registry lists them, under the toggle between the two (D250 h); the
  // test prints are under Advanced instead (D357, test-prints.spec.ts)
  const ids = await page
    .getByTestId('board-type')
    .locator('input[name="boardType"]')
    .evaluateAll((inputs) => inputs.map((i) => (i instanceof HTMLInputElement ? i.value : '')));
  expect(ids).toEqual(BOARD_TYPES.filter((t) => t.testPrint !== true).map((t) => t.id));
  await expect(chosen(page, 'boardType')).toHaveValue(BOARD_TYPES[0]?.id ?? '');
});

test('shows size, thickness and sides on the form, and folds the fine settings under Advanced (D48)', async ({
  page,
}) => {
  await ready(page);
  // the screw size on the main form too, the screw for every hole (D479)
  for (const name of ['widthMm', 'heightMm', 'thicknessMm', 'screwMm'])
    await expect(page.locator(`input[name="${name}"]`)).toBeVisible();
  const advanced = page.getByTestId('advanced');
  await expect(advanced).not.toHaveAttribute('open', /.*/);
  for (const name of ['screwHead', 'standoffs']) await expect(chosen(page, name)).toBeVisible();
  for (const name of ['slotClearanceMm', 'slotChamferMm', 'cornerRadiusMm', 'standoffHeightMm', 'lockScrewMm']) {
    await expect(advanced.locator(`input[name="${name}"]`)).toBeHidden();
  }
  await advanced.locator('summary').click();
  await expect(advanced.locator('input[name="slotClearanceMm"]')).toBeVisible();
});

test('takes the size in mm, in 40 mm steps, and shows it in tiles (D45)', async ({ page }) => {
  await ready(page);
  const width = page.locator('input[name="widthMm"]');
  // the decimal keypad's field has no step of its own: the reader holds the value to its steps, as the test of a
  // size off them shows (D202)
  await expect(width).toHaveAttribute('inputmode', 'decimal');
  await expect(page.getByTestId('count-widthMm')).toHaveText('= 4 tiles');
  await width.fill('240');
  await page.locator('input[name="heightMm"]').fill('200');
  await expect(page.getByTestId('count-widthMm')).toHaveText('= 6 tiles');
  await expect(page.getByTestId('count-heightMm')).toHaveText('= 5 tiles');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-file-name', 'skadis-solid-240x200.stl');
  // one tile is a tile (A263)
  await width.fill('40');
  await expect(page.getByTestId('count-widthMm')).toHaveText('= 1 tile');
});

test('refuses a size off the 40 mm steps, and builds nothing from it', async ({ page }) => {
  await ready(page);
  await page.locator('input[name="widthMm"]').fill('250');
  await expect(page.getByTestId('error-widthMm')).toContainText('40 mm steps');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
});

// Found by QA (Q1, 23 Oct 2026): Width 240, Tab, and at once Lightened: Lightened was ticked, but the status read
// "Board ready: skadis-solid-240x160.stl", and that was the download. The solid form's build, still waiting out the
// 150 ms after the typing, fired after the new form had built. Both changes are made here in one script, no pause.
test('builds the type ticked when it is chosen just after a size is typed', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const width = document.querySelector<HTMLInputElement>('input[name="widthMm"]');
    const lightened = document.querySelector<HTMLInputElement>('input[name="boardType"][value="lightened"]');
    if (width === null || lightened === null) throw new Error('no width field or no Lightened');
    width.value = '240';
    width.dispatchEvent(new Event('input', { bubbles: true }));
    lightened.click();
  });
  await page.waitForTimeout(500); // past the 150 ms the solid form's build waited
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(chosen(page, 'boardType')).toHaveValue('lightened');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-lightened-240x160.stl');
  await expect(status).toHaveText('Board ready: skadis-lightened-240x160.stl');
});

// Found by QA (Q5, 23 Oct 2026): a field cleared was built at its starting value, the field still empty.
test('refuses a number field left empty, saying so beside it, and builds nothing', async ({ page }) => {
  await ready(page);
  for (const name of ['widthMm', 'heightMm', 'thicknessMm']) {
    const field = page.locator(`input[name="${name}"]`);
    const before = await field.inputValue();
    await field.fill('');
    await field.press('Tab');
    await expect(page.getByTestId(`error-${name}`)).toContainText('must be a number');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
    await expect(page.getByRole('button', { name: 'Download STL' })).toBeDisabled();
    await field.fill(before);
    await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready');
  }
});

// Found by QA (Q7, 23 Oct 2026): a standoff 60 mm tall was "Correct the settings marked above to make the board."
test('says a connector it refuses is a connector, not a board', async ({ page }) => {
  await ready(page);
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'standoff');
  await page.locator('input[name="heightMm"]').fill('60');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-state', 'invalid');
  await expect(status).toHaveText('Correct the settings marked above to make the connector.');
});

// Found by QA (Q12, 23 Oct 2026): a thickness of 5.25 mm was shown as 5.3 mm; the file was right.
test('shows the size with the decimals it has, up to two', async ({ page }) => {
  await ready(page);
  const size = page.getByTestId('board-size');
  await page.locator('input[name="thicknessMm"]').fill('5.25');
  await expect(size).toHaveText('160 × 160 × 5.25 mm');
  await page.locator('input[name="thicknessMm"]').fill('4.5');
  await expect(size).toHaveText('160 × 160 × 4.5 mm');
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

test('lays the open sides between the slots when asked, the board 10 mm larger where only one side moves (D282)', async ({
  page,
}) => {
  await ready(page);
  const between = page.locator('input[name="seams"][value="between"]');
  await expect(page.locator('input[name="seams"][value="through"]')).toBeChecked(); // through the slots to start
  await between.check();
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-solid-160x160-between-slots.stl');
  await expect(page.getByTestId('board-size')).toHaveText('160 × 160 × 5 mm'); // both sides of each pair moved
  await page.locator('[data-side="left"]').click();
  await expect(status).toHaveAttribute('data-file-name', 'skadis-solid-160x160-closed-left-between-slots.stl');
  await expect(page.getByTestId('board-size')).toHaveText('170 × 160 × 5 mm'); // its right side 10 mm out
});

test('says so when a combination cannot be made, instead of building it', async ({ page }) => {
  await ready(page);
  await page.getByTestId('advanced').locator('summary').click();
  await page.locator('input[name="thicknessMm"]').fill('2.5');
  await page.locator('input[name="slotChamferMm"]').fill('1.5');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'problem');
  await expect(page.getByTestId('board-status')).toContainText('thicker');
});

// Found by QA (Q13, 23 Oct 2026): a problem that belongs to one setting showed only on the status line, no field
// marked. The field is marked as the form marks a value it refuses, and the status line keeps the message.
test('marks the setting a combination it cannot make belongs to, and keeps the message on the status line', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await ready(page);
  const status = page.getByTestId('board-status');
  const field = (name: string) => page.locator(`input[name="${name}"]`);
  await page.getByTestId('advanced').locator('summary').click();
  /** Sets the fields given, and checks that the problem is on the status line and beside each field it names. */
  const refused = async (given: Record<string, string>, marked: string[], words: string) => {
    for (const [name, value] of Object.entries(given)) await field(name).fill(value);
    await expect(status).toHaveAttribute('data-state', 'problem');
    await expect(status).toContainText(words);
    for (const name of marked) {
      await expect(page.getByTestId(`error-${name}`)).toContainText(words);
      await expect(field(name)).toHaveAttribute('aria-invalid', 'true');
    }
  };
  const made = async (given: Record<string, string>, cleared: string[]) => {
    for (const [name, value] of Object.entries(given)) await field(name).fill(value);
    await expect(status).toHaveAttribute('data-state', 'ready');
    for (const name of cleared) {
      await expect(page.getByTestId(`error-${name}`)).toBeEmpty();
      await expect(field(name)).not.toHaveAttribute('aria-invalid', /.*/);
    }
  };
  await refused({ thicknessMm: '3' }, ['thicknessMm'], 'A countersunk 4 mm screw needs a board at least 3.25 mm thick');
  await made({ thicknessMm: '5' }, ['thicknessMm']);
  await refused({ widthMm: '440', heightMm: '480' }, ['widthMm', 'heightMm'], 'One board is at most 400 mm a side');
  await made({ widthMm: '160', heightMm: '160' }, ['widthMm', 'heightMm']);
  await refused({ thicknessMm: '2.5', slotChamferMm: '1.5' }, ['slotChamferMm'], 'thicker than its two slot chamfers');
  await made({ thicknessMm: '5', slotChamferMm: '1' }, ['slotChamferMm']);
  await choose(page, 'screwHead', 'keyhole');
  await refused({ standoffHeightMm: '10' }, ['standoffHeightMm'], 'choose standoffs at least 13.23 mm tall');
  await made({ standoffHeightMm: '15' }, ['standoffHeightMm']);
  await choose(page, 'boardType', 'skeleton');
  await page.getByTestId('advanced').locator('summary').click();
  await refused({ rimMm: '2', coreMm: '2.5' }, ['coreMm'], 'The core cannot be wider than the rim');
  await made({ coreMm: '1.2' }, ['coreMm']);
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
  await expect(status).toHaveAttribute('data-file-name', 'skadis-solid-160x160-round-head-standoffs-15mm.stl');
  await expect(page.getByTestId('board-size')).toHaveText('160 × 160 × 20 mm'); // 5 mm of board, 15 mm of standoff (D238)
});

test('offers keyholes, which bring their standoffs, with lock screws under Advanced (D155 to D157, D190)', async ({
  page,
}) => {
  await ready(page);
  const status = page.getByTestId('board-status');
  await choose(page, 'screwHead', 'keyhole');
  // choosing keyholes turns the standoffs on, so a hook has room behind the board (D190)
  await expect(chosen(page, 'standoffs')).toHaveValue('back');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-solid-160x160-keyholes-standoffs-15mm.stl');
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('board-size')).toHaveText('160 × 160 × 20 mm');
  await page.getByTestId('advanced').locator('summary').click();
  await choose(page, 'lockScrews', 'bottom');
  await expect(status).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-keyholes-lock-screws-standoffs-15mm.stl',
  );
  // taking the standoffs off again would hang the board flat: a problem, saying why; at least 13.5 mm, for the lock
  // screws' 4 mm heads, the screw size's (D479)
  await choose(page, 'standoffs', 'none');
  await expect(status).toHaveAttribute('data-state', 'problem');
  await expect(status).toContainText('standoffs at least 13.5 mm');
});

test('offers lock screws alone, which bring their standoffs as keyholes do (D289)', async ({ page }) => {
  await ready(page);
  const status = page.getByTestId('board-status');
  await choose(page, 'screwHead', 'lock');
  await expect(chosen(page, 'standoffs')).toHaveValue('back');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-solid-160x160-lock-screws-standoffs-15mm.stl');
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('board-size')).toHaveText('160 × 160 × 20 mm');
});

// Found by QA (Q9, 23 Oct 2026): "Each lock screw passes -9.3 mm of standoff under its head".
test('says nothing under the screws while the standoffs are too short for the lock screws', async ({ page }) => {
  await ready(page);
  const [status, note] = [page.getByTestId('board-status'), page.getByTestId('screw-note')];
  await page.getByTestId('advanced').locator('summary').click();
  for (const pick of [
    async () => choose(page, 'screwHead', 'lock'),
    async () => {
      await choose(page, 'screwHead', 'keyhole');
      await choose(page, 'lockScrews', 'bottom');
    },
  ]) {
    await pick();
    await choose(page, 'lockScrewSize', 'own'); // their own size (D479)
    await page.locator('input[name="lockScrewMm"]').fill('5');
    await page.locator('input[name="standoffHeightMm"]').fill('3');
    await expect(status).toHaveAttribute('data-state', 'problem');
    await expect(status).toContainText('standoffs at least 14.3 mm');
    await expect(note).toHaveText('');
    // the control: tall enough, the note says what each lock screw passes
    await page.locator('input[name="standoffHeightMm"]').fill('15');
    await expect(note).toContainText('Each lock screw passes 2.7 mm of standoff under its head');
  }
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

test('puts boards or connectors in a field of its own, the types of the one chosen in the next (D256; D250 h)', async ({
  page,
}) => {
  await ready(page);
  const make = page.getByTestId('what-to-make');
  const types = page.getByTestId('board-type');
  await expect(make.locator('legend')).toHaveText('What to make');
  const toggle = make.getByRole('radiogroup', { name: 'What to make' });
  await expect(toggle.locator('.ws-choice__face')).toHaveText(['Boards', 'Connectors']);
  // a choice apart from the type's: the toggle is not in the type's field
  await expect(types.locator('input[name="typeGroup"]')).toHaveCount(0);
  await expect(types.locator('legend')).toHaveText('Board');
  await expect(types.getByRole('radiogroup', { name: 'Boards', exact: true })).toBeVisible();
  const connectors = types.getByRole('radiogroup', { name: 'Connectors', exact: true, includeHidden: true });
  await expect(connectors).toBeHidden();
  // hidden itself, in the field with no box round it, as the design system's v0.6.0 hides it (D259; C179)
  await expect(connectors).toHaveAttribute('hidden', '');
  await expect(connectors.locator('xpath=..')).toHaveAttribute('data-testid', 'board-type');
  await expect(connectors.getByRole('radio', { name: 'Standoff', includeHidden: true })).toHaveValue('standoff');
  // the type's field is titled for the group chosen
  await choose(page, 'typeGroup', 'connector');
  await expect(types.locator('legend')).toHaveText('Connector');
  await expect(connectors).toBeVisible();
});

test('says beside the screw size what each screw passes, from the part (D264)', async ({ page }) => {
  await ready(page);
  await page.getByTestId('advanced').locator('summary').click();
  // in the screw size's own field
  const field = page.locator('.field').filter({ has: page.locator('input[name="screwMm"]') });
  const note = field.getByTestId('screw-note');
  await expect(note).toHaveText(
    "Each corner screw passes the board's 5 mm, plus any standoff behind it and your wall plug.",
  );
  await choose(page, 'standoffs', 'back');
  await expect(note).toHaveText('Each corner screw passes 20 mm of board and standoff, plus your wall plug.');
  await page.locator('input[name="standoffHeightMm"]').fill('25');
  await expect(note).toContainText('30 mm of board and standoff');
});

test('makes a standoff from the same form, preview and download as a board (D91 to D94)', async ({ page }) => {
  await ready(page);
  await choose(page, 'boardType', 'standoff');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-standoff-1-board-15mm.stl');
  await expect(status).toContainText('Connector ready');
  await expect(page.getByTestId('board-size')).toHaveText('10 × 10 × 15 mm');
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
  await expect(status).toHaveAttribute('data-file-name', 'skadis-standoff-4-boards-15mm.stl');
  await expect(page.getByTestId('board-size')).toHaveText('30 × 30 × 15 mm');
  await choose(page, 'boards', '2');
  await page.locator('input[name="heightMm"]').fill('10');
  await expect(status).toHaveAttribute('data-state', 'problem');
  await expect(status).toContainText('12 mm');
});

test('makes the slot clip for 2 boards either way or for 4, with a fixing, its pegs ribbed (D187 to D189, D195, D261)', async ({
  page,
}) => {
  await ready(page);
  await choose(page, 'boardType', 'slot-clip');
  const status = page.getByTestId('board-status');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-2-boards-15mm-screw.stl');
  await expect(status).toContainText('Connector ready');
  await expect(page.getByTestId('board-size')).toHaveText('60 × 20 × 20 mm');
  await choose(page, 'boards', '2-stacked');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-2-boards-stacked-15mm-screw.stl');
  await expect(page.getByTestId('board-size')).toHaveText('20 × 60 × 20 mm');
  await choose(page, 'boards', '4');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-4-boards-15mm-screw.stl');
  await expect(page.getByTestId('board-size')).toHaveText('60 × 60 × 20 mm');
  // a keyhole in place of the screw (D195); no grip to choose under Advanced, the lip taken out (D261)
  await choose(page, 'fixing', 'keyhole');
  await expect(status).toHaveAttribute('data-file-name', 'skadis-slot-clip-4-boards-15mm-keyhole.stl');
  await page.getByTestId('advanced').locator('summary').click();
  await expect(page.locator('input[name="pegClearanceMm"]')).toBeVisible();
  await expect(page.locator('input[name="grip"]')).toHaveCount(0);
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  // the form refuses a depth under 12 mm before anything is built (D187: the hooks' 8 mm and a 4 mm bar)
  await page.locator('input[name="depthMm"]').fill('10');
  await expect(page.getByTestId('error-depthMm')).toContainText('from 12');
  await expect(status).toHaveAttribute('data-state', 'invalid');
});

// The design system's fields (v0.4.0, D202): the decimal keypad for a value that cannot go below zero, a number
// field for one that can; each error announced, and linked with the field's notes from the field.
test('gives each field the keyboard its values need, and links its notes and its error to it (D202)', async ({
  page,
}) => {
  await ready(page);
  const thickness = page.locator('input[name="thicknessMm"]');
  await expect(thickness).toHaveAttribute('inputmode', 'decimal');
  await expect(thickness).not.toHaveAttribute('type', 'number');
  const clearance = page.locator('input[name="slotClearanceMm"]'); // from -0.5 mm
  await expect(clearance).toHaveAttribute('type', 'number');
  await expect(clearance).not.toHaveAttribute('inputmode', 'decimal');
  // the error is a live region, and the field names it and its notes
  const error = page.getByTestId('error-widthMm');
  await expect(error).toHaveAttribute('aria-live', 'polite');
  const width = page.locator('input[name="widthMm"]');
  const described = (await width.getAttribute('aria-describedby'))?.split(' ') ?? [];
  expect(described).toContain(await error.getAttribute('id'));
  expect(described).toContain(await page.getByTestId('count-widthMm').getAttribute('id'));
  // a comma reads as a decimal point
  await thickness.fill('4,5');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('board-size')).toHaveText('160 × 160 × 4.5 mm');
});

// What a number field cannot read is an error, not the starting value in its place (D222): the browser hands an
// unreadable number field over empty, which had read as the default.
test('says a number field the browser cannot read is not a number, and refuses an unclear comma (D222)', async ({
  page,
}) => {
  await ready(page);
  await page.getByTestId('advanced').locator('summary').click();
  const clearance = page.locator('input[name="slotClearanceMm"]'); // a number field: it can go below zero
  await clearance.click();
  await clearance.press('Control+a');
  await page.keyboard.type('1e');
  await expect(page.getByTestId('error-slotClearanceMm')).toContainText('must be a number');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
  await clearance.fill('0.2');
  await page.locator('input[name="widthMm"]').fill('40,000');
  await expect(page.getByTestId('error-widthMm')).toContainText('unclear');
  await expect(page.getByTestId('count-widthMm')).toHaveText('');
});

// A build still running when the form turns invalid must not land: it would show "ready" and offer a download for
// values the form no longer holds (found 22 Oct 2026: 30 s after a 400 mm skeleton build had started, a width of
// 250 mm left "Board ready" and the download on). The worker's answers are counted, so the test waits for the
// stale one itself rather than for a time.
test('drops a build that is still running when the form turns invalid', async ({ page }) => {
  await page.addInitScript(() => {
    const Base = window.Worker;
    const seen = window as unknown as { builtReplies: number };
    seen.builtReplies = 0;
    window.Worker = class extends Base {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        // registered before the page's own listener, so the count rises before the page handles the answer
        this.addEventListener('message', (event: MessageEvent<{ kind?: string }>) => {
          if (event.data.kind === 'built') seen.builtReplies += 1;
        });
      }
    };
  });
  await ready(page);
  await choose(page, 'boardType', 'skeleton');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await page.locator('input[name="heightMm"]').fill('400');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  const replies = () => page.evaluate(() => (window as unknown as { builtReplies: number }).builtReplies);
  const before = await replies();
  await page.locator('input[name="widthMm"]').fill('400');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'building');
  await page.locator('input[name="widthMm"]').fill('250');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
  // the 400 mm board's answer arrives, and is dropped
  await expect.poll(replies, { timeout: 60_000 }).toBeGreaterThan(before);
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
  await expect(page.getByTestId('download-stl')).toBeDisabled();
});

// The screw settings on the page (D479; Q359, D370): one "Screw size" on the main form, the screw for every hole, and
// under Advanced a size for each kind of place a screw goes, the screw size unless "Own" is chosen, its own size greyed
// out until then (D372). And a page's choices kept in the browser before D479 still build.
import { expect, test, type Page } from '@playwright/test';
import { choose, chosen } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

const form = (page: Page) => page.getByTestId('board-form');
const main = (page: Page) => form(page).locator('.main-settings');
const advanced = (page: Page) => page.getByTestId('advanced');
const fieldOf = (page: Page, key: string) =>
  form(page)
    .locator('.field')
    .filter({ has: page.locator(`[name="${key}"]`) });
const status = (page: Page) => page.getByTestId('board-status');

/** Whether a setting's field applies: its mark, and every control in it enabled to match. */
async function applies(page: Page, key: string): Promise<boolean> {
  const field = fieldOf(page, key);
  const on = (await field.getAttribute('data-applies')) === 'true';
  const disabled = await field
    .locator('input, button.ws-stepper__btn')
    .evaluateAll((all) => all.map((c) => (c as HTMLInputElement).disabled));
  expect(disabled.length, key).toBeGreaterThan(0);
  expect(
    disabled.every((d) => d === !on),
    key,
  ).toBe(true);
  return on;
}

test('shows the screw size on the main form, the screw for every hole, its head countersunk at twice its size', async ({
  page,
}) => {
  await ready(page);
  await expect(advanced(page)).not.toHaveAttribute('open', /.*/);
  const size = main(page).locator('input[name="screwMm"]');
  await expect(size).toBeVisible();
  await expect(size).toHaveValue('4');
  await expect(fieldOf(page, 'screwMm').locator('label')).toHaveText('Screw size (mm)');
  await form(page).locator('button[aria-controls="field-screwMm-note"]').click();
  await expect(page.locator('#field-screwMm-note')).toContainText('The screw for every hole');
  await expect(page.locator('#field-screwMm-note')).toContainText('twice the screw across, 8 mm for a 4 mm screw');
  // what each screw passes, beside it on the main form (D264)
  await expect(fieldOf(page, 'screwMm').getByTestId('screw-note')).toBeVisible();
  // none under Advanced
  await expect(advanced(page).locator('input[name="screwMm"]')).toHaveCount(0);
});

test('puts a size for the keyholes and the lock screws under Advanced, the screw size until "Own" (D479)', async ({
  page,
}) => {
  await ready(page);
  await advanced(page).locator('summary').click();
  const keys = ['keyholeScrewSize', 'keyholeScrewMm', 'lockScrewSize', 'lockScrewMm'];
  for (const key of keys) {
    await expect(advanced(page).locator(`[name="${key}"]`).first()).toBeAttached(); // shown while it applies (D620 a)
    await expect(main(page).locator(`[name="${key}"]`)).toHaveCount(0);
  }
  await expect(fieldOf(page, 'keyholeScrewSize').locator('.ws-choice__face')).toHaveText([
    'Same as the screw size',
    'Own',
  ]);
  await expect(chosen(page, 'keyholeScrewSize')).toHaveValue('same');
  // countersunk corners: neither kind of place is on the board, so all four are hidden (D620 a)
  for (const key of keys) expect(await applies(page, key), key).toBe(false);
  // keyholes: their choice applies, their own size greyed out until "Own"
  await choose(page, 'screwHead', 'keyhole');
  expect(await applies(page, 'keyholeScrewSize')).toBe(true);
  expect(await applies(page, 'keyholeScrewMm')).toBe(false);
  expect(await applies(page, 'lockScrewSize')).toBe(false);
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-solid-160x160-keyholes-standoffs-15mm.stl');
  // the screw size is the keyholes' screw
  await main(page).locator('input[name="screwMm"]').fill('5');
  await expect(status(page)).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-keyholes-screw-5mm-standoffs-15mm.stl',
  );
  await expect(fieldOf(page, 'screwMm').getByTestId('screw-note')).toContainText('on a 5 mm countersunk screw');
  // "Own": its size applies, and is the keyholes' screw, whatever the screw size
  await choose(page, 'keyholeScrewSize', 'own');
  expect(await applies(page, 'keyholeScrewMm')).toBe(true);
  await expect(page.locator('input[name="keyholeScrewMm"]')).toHaveValue('4');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-solid-160x160-keyholes-standoffs-15mm.stl');
  await page.locator('input[name="keyholeScrewMm"]').fill('3.5');
  await expect(status(page)).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-keyholes-screw-3.5mm-standoffs-15mm.stl',
  );
  // lock screws at the bottom: the screw size's, 5 mm, until their own
  await choose(page, 'lockScrews', 'bottom');
  expect(await applies(page, 'lockScrewSize')).toBe(true);
  expect(await applies(page, 'lockScrewMm')).toBe(false);
  await expect(status(page)).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-keyholes-lock-screws-5mm-screw-3.5mm-standoffs-15mm.stl',
  );
  await choose(page, 'lockScrewSize', 'own');
  expect(await applies(page, 'lockScrewMm')).toBe(true);
  await expect(status(page)).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-keyholes-lock-screws-screw-3.5mm-standoffs-15mm.stl',
  );
  // back to the screw size for both: the one size names them both
  await choose(page, 'keyholeScrewSize', 'same');
  await choose(page, 'lockScrewSize', 'same');
  expect(await applies(page, 'keyholeScrewMm')).toBe(false);
  expect(await applies(page, 'lockScrewMm')).toBe(false);
  await expect(status(page)).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-keyholes-lock-screws-5mm-screw-5mm-standoffs-15mm.stl',
  );
});

test('gives the slot clip the screw size on its main form, and its own under Advanced (D479)', async ({ page }) => {
  await ready(page);
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'slot-clip');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-slot-clip-2-boards-15mm-screw.stl');
  await expect(main(page).locator('input[name="screwMm"]')).toBeVisible();
  await advanced(page).locator('summary').click();
  expect(await applies(page, 'clipScrewSize')).toBe(true);
  expect(await applies(page, 'clipScrewMm')).toBe(false);
  await choose(page, 'clipScrewSize', 'own');
  await page.locator('input[name="clipScrewMm"]').fill('3');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-slot-clip-2-boards-15mm-screw-3mm.stl');
  // no fixing, no screw: both greyed out
  await choose(page, 'fixing', 'none');
  expect(await applies(page, 'clipScrewSize')).toBe(false);
  expect(await applies(page, 'clipScrewMm')).toBe(false);
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-slot-clip-2-boards-15mm.stl');
});

test('builds a board from the choices a page before D479 kept in the browser, the lock screws at the screw size', async ({
  page,
}) => {
  // v0.8.0's choices as it kept them: the solid board on lock screws alone, the lock screw size at its start then,
  // 2.5 mm, and no choice of the screw size or its own
  const v080 = {
    group: 'board',
    types: { board: 'solid' },
    values: {
      solid: {
        widthMm: '160',
        heightMm: '160',
        thicknessMm: '5',
        sides: { left: 'open', right: 'open', bottom: 'open', top: 'open' },
        seams: 'through',
        panels: 'one',
        slotClearanceMm: '0.2',
        slotChamferMm: '1',
        cornerRadiusMm: '10',
        panelWidthMm: '400',
        panelHeightMm: '400',
        screwHead: 'lock',
        standoffs: 'back',
        screwMm: '4',
        lockScrews: 'none',
        lockScrewMm: '2.5',
        standoffHeightMm: '15',
      },
    },
  };
  await page.addInitScript((kept) => {
    if (sessionStorage.getItem('seeded') === null) {
      localStorage.setItem('skadis-air-choices', JSON.stringify(kept));
      sessionStorage.setItem('seeded', 'yes');
    }
  }, v080);
  await ready(page);
  await expect(chosen(page, 'screwHead')).toHaveValue('lock');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-solid-160x160-lock-screws-standoffs-15mm.stl');
  await expect(fieldOf(page, 'screwMm').getByTestId('screw-note')).toHaveText(
    'Each lock screw passes 4.47 mm of standoff under its head, plus your wall plug.',
  );
  // the 2.5 mm kept, greyed out, where "Own" takes it
  await advanced(page).locator('summary').click();
  await expect(chosen(page, 'lockScrewSize')).toHaveValue('same');
  await expect(page.locator('input[name="lockScrewMm"]')).toHaveValue('2.5');
  expect(await applies(page, 'lockScrewMm')).toBe(false);
  await choose(page, 'lockScrewSize', 'own');
  await expect(status(page)).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-lock-screws-2.5mm-standoffs-15mm.stl',
  );
});

test('carries the screw size across the boards and the connectors, and back (Q511)', async ({ page }) => {
  await ready(page);
  const size = main(page).locator('input[name="screwMm"]');
  await size.fill('3.5');
  await expect(status(page)).toHaveAttribute('data-state', 'ready');
  // to the slot clip, then the standoff: the same screw size, not their 4 mm start
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'slot-clip');
  await expect(main(page).locator('input[name="screwMm"]')).toHaveValue('3.5');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-slot-clip-2-boards-15mm-screw-3.5mm.stl');
  await choose(page, 'boardType', 'standoff');
  await expect(main(page).locator('input[name="screwMm"]')).toHaveValue('3.5');
  // set on a connector, it goes back to the boards
  await main(page).locator('input[name="screwMm"]').fill('5');
  await choose(page, 'typeGroup', 'board');
  await expect(main(page).locator('input[name="screwMm"]')).toHaveValue('5');
  // and what else a board held is its own: only the screw size crossed
  await expect(main(page).locator('input[name="widthMm"]')).toHaveValue('160');
});

test("keeps each kind of place's own size within its group, as built (Q511)", async ({ page }) => {
  await ready(page);
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'slot-clip');
  await advanced(page).locator('summary').click();
  await choose(page, 'clipScrewSize', 'own');
  await page.locator('input[name="clipScrewMm"]').fill('3');
  await choose(page, 'typeGroup', 'board');
  await choose(page, 'typeGroup', 'connector');
  await expect(chosen(page, 'clipScrewSize')).toHaveValue('own');
  await expect(page.locator('input[name="clipScrewMm"]')).toHaveValue('3');
});

test('a screw size kept in the browser by an older page still loads on each type (Q511)', async ({ page }) => {
  // an older page kept the boards' screw size 5 and the slot clip's 3 apart; the shown type's is the one kept
  const kept = {
    group: 'connector',
    types: { board: 'solid', connector: 'slot-clip' },
    values: { solid: { screwMm: '5' }, 'slot-clip': { screwMm: '3' } },
  };
  await page.addInitScript((k) => {
    if (sessionStorage.getItem('seeded') === null) {
      localStorage.setItem('skadis-air-choices', JSON.stringify(k));
      sessionStorage.setItem('seeded', 'yes');
    }
  }, kept);
  await ready(page);
  await expect(main(page).locator('input[name="screwMm"]')).toHaveValue('3');
  await choose(page, 'typeGroup', 'board');
  await expect(main(page).locator('input[name="screwMm"]')).toHaveValue('3');
  await expect(status(page)).toHaveAttribute('data-state', 'ready');
});

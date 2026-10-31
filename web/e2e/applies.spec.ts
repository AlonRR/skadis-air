// Settings that apply only with another choice (D372; QA Q15): hidden, their controls disabled, while they do not
// apply (D620 a, 31 Oct 2026: "Tape sizes should only appear when tape is clicked, the same if a screw option isn't
// clicked"; greyed out before), and not checked then, so a value left in one blocks nothing; shown, and checked, while
// they do. The rule is the registry's (`appliesWhen`); the form names no setting, and this test reads the four it is
// about, the lock screw's own size applying only with "Own" chosen for it too (D479), and the screw size and the tape's.
import { expect, test, type Page } from '@playwright/test';
import { choose } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

const form = (page: Page) => page.getByTestId('board-form');
const fieldOf = (page: Page, key: string) =>
  form(page)
    .locator('.field')
    .filter({ has: page.locator(`[name="${key}"]`) });
const openAdvanced = (page: Page) => page.getByTestId('advanced').locator('summary').click();

/** Whether each of the four is on: its field marked so and shown, and every control in it enabled. */
async function states(page: Page): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  for (const key of ['lockScrews', 'lockScrewSize', 'lockScrewMm', 'standoffHeightMm']) {
    const field = fieldOf(page, key);
    const applies = (await field.getAttribute('data-applies')) === 'true';
    expect(await field.isVisible(), key).toBe(applies); // shown only while it applies (D620 a)
    const controls = field.locator('input, button.ws-stepper__btn');
    const disabled = await controls.evaluateAll((all) => all.map((c) => (c as HTMLInputElement).disabled));
    expect(disabled.length, key).toBeGreaterThan(0);
    // the field's mark and its controls agree
    expect(
      disabled.every((d) => d === !applies),
      key,
    ).toBe(true);
    out[key] = applies;
  }
  return out;
}

test('hides each setting while what it applies to is not chosen, and shows it when it is (D372, D620 a)', async ({
  page,
}) => {
  await ready(page);
  await openAdvanced(page);
  const all = (lockScrews: boolean, lockScrewSize: boolean, lockScrewMm: boolean, standoffHeightMm: boolean) => ({
    lockScrews,
    lockScrewSize,
    lockScrewMm,
    standoffHeightMm,
  });
  // countersunk, no standoffs: none of the four applies
  expect(await states(page)).toEqual(all(false, false, false, false));
  await choose(page, 'standoffs', 'corners');
  expect(await states(page)).toEqual(all(false, false, false, true));
  // keyholes turn the standoffs on (D190), and lock screws at the bottom apply
  await choose(page, 'standoffs', 'none');
  await choose(page, 'screwHead', 'keyhole');
  expect(await states(page)).toEqual(all(true, false, false, true));
  await choose(page, 'lockScrews', 'bottom');
  // their size the screw size's, their own greyed out until "Own" (D479)
  expect(await states(page)).toEqual(all(true, true, false, true));
  await choose(page, 'lockScrewSize', 'own');
  expect(await states(page)).toEqual(all(true, true, true, true));
  // the help of each says when it applies
  await form(page).locator('button[aria-controls="field-lockScrewMm-note"]').click();
  await expect(page.locator('#field-lockScrewMm-note')).toContainText(
    'With lock screws, at the bottom with keyholes or as the mounting, and "Own" chosen above',
  );
  // lock screws alone: their size and the standoffs apply, lock screws at the bottom do not
  await choose(page, 'screwHead', 'lock');
  expect(await states(page)).toEqual(all(false, true, true, true));
  await choose(page, 'screwHead', 'round');
  await choose(page, 'standoffs', 'none');
  expect(await states(page)).toEqual(all(false, false, false, false));
});

test('shows the screw size only with a screw, and the tape only with tape (D620 a)', async ({ page }) => {
  await ready(page);
  const shown = async () => ({
    screwMm: await fieldOf(page, 'screwMm').isVisible(),
    tapeWidthMm: await fieldOf(page, 'tapeWidthMm').isVisible(),
    tapeLengthMm: await fieldOf(page, 'tapeLengthMm').isVisible(),
  });
  for (const [head, screw, tape] of [
    ['countersunk', true, false],
    ['round', true, false],
    ['keyhole', true, false],
    ['lock', true, false],
    ['tape', false, true],
    ['none', false, false],
  ] as const) {
    await choose(page, 'screwHead', head);
    expect(await shown(), head).toEqual({ screwMm: screw, tapeWidthMm: tape, tapeLengthMm: tape });
  }
  // the first field is "Mounting" (D617 c), and the standoffs None, At the corners, Behind slots (D618 a)
  await expect(fieldOf(page, 'screwHead').locator('.ws-label')).toHaveText('Mounting');
  for (const [where, label] of [
    ['none', 'None'],
    ['corners', 'At the corners'],
    ['slots', 'Behind slots'],
  ] as const)
    await expect(page.locator(`label:has(input[name="standoffs"][value="${where}"])`)).toContainText(label);
});

test('a value refused while its setting applies blocks nothing once it does not, and is checked again after', async ({
  page,
}) => {
  await ready(page);
  await openAdvanced(page);
  await choose(page, 'screwHead', 'lock');
  await choose(page, 'lockScrewSize', 'own'); // their own size (D479)
  const size = page.locator('input[name="lockScrewMm"]');
  await size.fill('9');
  await expect(page.getByTestId('error-lockScrewMm')).toHaveText("Lock screw's own size must be from 2 to 5 mm");
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
  // countersunk: the size does not apply, so the 9 left in it is not checked, and the board is made
  await choose(page, 'screwHead', 'countersunk');
  await expect(size).toBeHidden();
  await expect(size).toBeDisabled();
  await expect(size).toHaveValue('9');
  await expect(page.getByTestId('error-lockScrewMm')).toHaveText('');
  await expect(size).not.toHaveAttribute('aria-invalid', /.*/);
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  // off the standoffs behind the slots that lock screws stood on (D289), which a corner screw cannot (D619)
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-file-name', 'skadis-solid-160x160.stl');
  // the control: lock screws again, and the 9 is refused again
  await choose(page, 'screwHead', 'lock');
  await expect(page.getByTestId('error-lockScrewMm')).toHaveText("Lock screw's own size must be from 2 to 5 mm");
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
});

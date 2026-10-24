// Settings that apply only with another choice (D372; QA Q15): greyed out, their controls disabled, while they do
// not apply, and not checked then, so a value left in one blocks nothing; on, and checked, while they do. The rule is
// the registry's (`appliesWhen`); the form names no setting, and this test reads the four it is about, the lock screw's
// own size applying only with "Own" chosen for it too (D479).
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

/** Whether each of the three is on: its field marked so, and every control in it enabled. */
async function states(page: Page): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  for (const key of ['lockScrews', 'lockScrewSize', 'lockScrewMm', 'standoffHeightMm']) {
    const field = fieldOf(page, key);
    const applies = (await field.getAttribute('data-applies')) === 'true';
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

test('greys out each setting while what it applies to is not chosen, and turns it on when it is (D372)', async ({
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
  await choose(page, 'standoffs', 'back');
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
  // lock screws alone: their size and the standoffs apply, lock screws at the bottom do not
  await choose(page, 'screwHead', 'lock');
  expect(await states(page)).toEqual(all(false, true, true, true));
  await choose(page, 'screwHead', 'round');
  await choose(page, 'standoffs', 'none');
  expect(await states(page)).toEqual(all(false, false, false, false));
  // the help of each says when it applies, and its "i" button stays usable to read it
  const info = form(page).locator('button[aria-controls="field-lockScrewMm-note"]');
  await expect(info).toBeEnabled();
  await info.click();
  await expect(page.locator('#field-lockScrewMm-note')).toContainText(
    'With lock screws, at the bottom with keyholes or as the screw holes, and "Own" chosen above',
  );
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
  await expect(size).toBeDisabled();
  await expect(size).toHaveValue('9');
  await expect(page.getByTestId('error-lockScrewMm')).toHaveText('');
  await expect(size).not.toHaveAttribute('aria-invalid', /.*/);
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  // on the standoffs lock screws turned on (D289), which stay
  await expect(page.getByTestId('board-status')).toHaveAttribute(
    'data-file-name',
    'skadis-solid-160x160-standoffs-15mm.stl',
  );
  // the control: lock screws again, and the 9 is refused again
  await choose(page, 'screwHead', 'lock');
  await expect(page.getByTestId('error-lockScrewMm')).toHaveText("Lock screw's own size must be from 2 to 5 mm");
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'invalid');
});

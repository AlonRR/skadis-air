// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// What to make: a board, a wall or a connector (D590, 30 Oct 2026: "merge "panels" into "what to make""), the board's
// fields in the order the owner set (Q588: the size right above the screw size), and the standoffs keyholes and lock
// screws need, None greyed out with why (D589 a).
import { expect, test, type Page } from '@playwright/test';
import { choose, chosen } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

const status = (page: Page) => page.getByTestId('board-status');

test('makes a wall from Wall in What to make, with no Panels field on any board form', async ({ page }) => {
  test.setTimeout(90_000);
  await ready(page);
  await expect(page.locator('input[name="panels"]')).toHaveCount(0);
  await expect(page.getByTestId('board-form').getByText('Panels', { exact: true })).toHaveCount(0);
  await expect(status(page)).toContainText('Board ready');
  await choose(page, 'typeGroup', 'wall');
  await expect(status(page)).toContainText('Wall ready', { timeout: 60_000 });
  await expect(page.locator('input[name="panels"]')).toHaveCount(0);
  // the wall's boards are the boards' list, its legend the board's
  await expect(page.getByTestId('board-type').locator('legend')).toHaveText('Board');
  await choose(page, 'boardType', 'lightened');
  await expect(chosen(page, 'typeGroup')).toHaveValue('wall');
  await expect(status(page)).toContainText('Wall ready', { timeout: 60_000 });
  await choose(page, 'typeGroup', 'board');
  await expect(status(page)).toContainText('Board ready', { timeout: 60_000 });
});

test("closes a wall's outer edges when Wall is chosen, which can be opened again (D37)", async ({ page }) => {
  await ready(page);
  const pressed = () => page.locator('[data-side]').evaluateAll((b) => b.map((x) => x.getAttribute('aria-pressed')));
  await expect.poll(pressed).toEqual(['false', 'false', 'false', 'false']);
  await choose(page, 'typeGroup', 'wall');
  await expect.poll(pressed).toEqual(['true', 'true', 'true', 'true']);
  await page.locator('[data-side="top"]').click();
  await expect(page.locator('[data-side="top"]')).toHaveAttribute('aria-pressed', 'false');
});

test("lists a board's fields in the owner's order, the size right above the screw size (Q588)", async ({ page }) => {
  await ready(page);
  await choose(page, 'boardType', 'lightened');
  const labels = await page
    .getByTestId('board-form')
    .locator('.main-settings > .field, .main-settings > fieldset')
    .evaluateAll((fields) =>
      fields.map((f) => (f.querySelector('.ws-label, legend')?.textContent ?? '').replace(/\s*\(.*$/, '').trim()),
    );
  expect(labels).toEqual([
    'Look',
    'Open sides',
    'Sides',
    'Mounting', // D617 c
    'Standoffs',
    'Tape width', // hidden unless the mounting is Tape (D593, D620 a)
    'Tape length', // the piece cut from the roll (C601)
    'Width',
    'Height',
    'Thickness',
    'Screw size',
  ]);
});

test("shows a slot clip's For only through the slots, where there is more than one clip (D620 a)", async ({ page }) => {
  await ready(page);
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'slot-clip');
  const forField = page.locator('.field').filter({ has: page.locator('input[name="boards"]') });
  await expect(forField).toBeVisible();
  await choose(page, 'boards', '4');
  await choose(page, 'seams', 'between');
  await expect(forField).toBeHidden();
  await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(status(page)).toHaveAttribute(
    'data-file-name',
    'skadis-slot-clip-2-boards-between-slots-15mm-screw.stl',
  );
  await choose(page, 'seams', 'through');
  await expect(forField).toBeVisible();
});

test('greys out no standoffs with keyholes or lock screws, saying why, and frees it again (D589 a)', async ({
  page,
}) => {
  await ready(page);
  const none = page.locator('input[name="standoffs"][value="none"]');
  const why = page.getByTestId('ruled-standoffs');
  await expect(none).toBeEnabled();
  // a corner screw: behind the slots greyed out, saying why (D619)
  await expect(why).toContainText('A corner screw needs its standoff round it');
  for (const [head, words] of [
    ['keyhole', 'Keyholes stand the board on standoffs behind its corner slots'],
    ['lock', 'Lock screws stand the board on standoffs behind its corner slots'],
  ] as const) {
    await choose(page, 'screwHead', head);
    await expect(none).toBeDisabled();
    await expect(chosen(page, 'standoffs')).toHaveValue('slots');
    await expect(why).toBeVisible();
    await expect(why).toContainText(words);
    await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  }
  await choose(page, 'screwHead', 'countersunk');
  await expect(none).toBeEnabled();
  await expect(why).not.toContainText('Keyholes');
  await expect(why).toContainText('A corner screw needs its standoff round it');
  // with no screws, every place is open, and nothing is said (D619)
  await choose(page, 'screwHead', 'none');
  await expect(why).toBeHidden();
  await choose(page, 'standoffs', 'none');
  await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
});

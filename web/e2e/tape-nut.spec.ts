// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Tape standoffs on a board (D593, 30 Oct 2026: "Add a standoffs on boards and connectors that is ment for double sided
// sticky tape"), the tape's width a setting (Q594: "set a standard with a size option"), and the standoff connector
// held by a nut and taped to the wall (D592 a).
import { expect, test, type Page } from '@playwright/test';
import { choose, chosen } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

const status = (page: Page) => page.getByTestId('board-status');

test('makes a board on tape standoffs, its screw holes greyed out with why, its tape as wide as set', async ({
  page,
}) => {
  await ready(page);
  const tape = page.locator('input[name="tapeWidthMm"]');
  await expect(tape).toBeDisabled(); // only with tape standoffs (D372)
  await choose(page, 'standoffs', 'tape');
  await expect(chosen(page, 'screwHead')).toHaveValue('none');
  for (const head of ['countersunk', 'round', 'keyhole', 'lock'])
    await expect(page.locator(`input[name="screwHead"][value="${head}"]`)).toBeDisabled();
  await expect(page.getByTestId('ruled-screwHead')).toContainText('no screw holes');
  await expect(tape).toBeEnabled();
  await expect(tape).toHaveValue('12');
  // a piece of a roll: its length too (the owner, 30 Oct 2026: "tape comes on a roll and is cut to rectangular pieces")
  await expect(page.locator('input[name="tapeLengthMm"]')).toHaveValue('18');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-solid-160x160-tape-12x18mm-standoffs-15mm.stl', {
    timeout: 30_000,
  });
  // a wider piece on standoffs too short for its flare: refused, saying how tall, the fields marked
  await tape.fill('20');
  await expect(status(page)).toHaveAttribute('data-state', 'problem', { timeout: 30_000 });
  await expect(status(page)).toContainText('at least 17.45 mm');
  // and back: screw holes free again
  await choose(page, 'standoffs', 'back');
  await expect(page.locator('input[name="screwHead"][value="countersunk"]')).toBeEnabled();
});

test('makes a standoff held by a nut and taped, named for both, and says which screw it takes', async ({ page }) => {
  await ready(page);
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'standoff');
  await expect(page.locator('input[name="tapeWidthMm"]')).toBeDisabled();
  await choose(page, 'standoffFixing', 'nut');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-standoff-1-board-15mm-nut-tape-12x18mm.stl', {
    timeout: 30_000,
  });
  await expect(page.getByTestId('screw-note')).toContainText('countersunk M4 machine screw');
  // a screw size with no ISO nut is refused on its field
  await page.locator('input[name="screwMm"]').fill('3.5');
  await expect(status(page)).toHaveAttribute('data-state', 'problem', { timeout: 30_000 });
  await expect(page.locator('input[name="screwMm"]')).toHaveAttribute('aria-invalid', 'true');
});

test('makes a nut standoff screwed to the wall, no tape, and says both screws (D600)', async ({ page }) => {
  await ready(page);
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'standoff');
  await choose(page, 'standoffFixing', 'nut-screwed');
  await expect(page.locator('input[name="tapeWidthMm"]')).toBeDisabled(); // no tape on this one
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-standoff-1-board-15mm-nut-screwed.stl', {
    timeout: 30_000,
  });
  const note = page.getByTestId('screw-note');
  await expect(note).toContainText('First screw the foot to the wall');
  await expect(note).toContainText('countersunk M4 machine screw');
  // too short for its foot behind the hooks' room: refused on the height, saying how tall
  await page.locator('input[name="heightMm"]').fill('11');
  await expect(status(page)).toHaveAttribute('data-state', 'problem', { timeout: 30_000 });
  await expect(status(page)).toContainText('at least 12 mm');
});

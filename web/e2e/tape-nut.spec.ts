// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Tape standoffs on a board (D593, 30 Oct 2026: "Add a standoffs on boards and connectors that is ment for double sided
// sticky tape"), the tape's width a setting (Q594: "set a standard with a size option"), and the standoff connector
// held by a nut and taped to the wall (D592 a). Since 31 Oct 2026 tape is a mounting (D617 c), its posts behind the
// corner slots (D619 a), its sizes shown only with it (D620 a).
import { expect, test, type Page } from '@playwright/test';
import { choose, chosen } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

const status = (page: Page) => page.getByTestId('board-status');

test('makes a board on tape, on standoffs behind its corner slots, its tape as set and shown only with it', async ({
  page,
}) => {
  await ready(page);
  const tape = page.locator('input[name="tapeWidthMm"]');
  const length = page.locator('input[name="tapeLengthMm"]');
  const screw = page.locator('input[name="screwMm"]');
  await expect(tape).toBeHidden(); // only on tape (D620 a)
  await expect(screw).toBeVisible();
  await choose(page, 'screwHead', 'tape');
  // its standoffs behind the slots, the other two greyed out with why (D619 a)
  await expect(chosen(page, 'standoffs')).toHaveValue('slots');
  for (const where of ['none', 'corners'])
    await expect(page.locator(`input[name="standoffs"][value="${where}"]`)).toBeDisabled();
  await expect(page.getByTestId('ruled-standoffs')).toContainText('behind its corner slots');
  await expect(screw).toBeHidden(); // no screw on tape (D620 a)
  await expect(tape).toBeVisible();
  await expect(tape).toHaveValue('19'); // D603 b
  // a piece of a roll: its length too (the owner, 30 Oct 2026: "tape comes on a roll and is cut to rectangular pieces")
  await expect(length).toHaveValue('19');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-solid-160x160-tape-19x19mm-standoffs-18mm.stl', {
    timeout: 30_000,
  });
  // a piece larger than the 18 mm standoffs leave room to flare to: refused, saying how tall
  await tape.fill('30');
  await length.fill('36');
  await expect(status(page)).toHaveAttribute('data-state', 'problem', { timeout: 30_000 });
  // the post's round ends drawn as polygons, a hair inside the circle: 22.35 mm, not the 22.34 of the circle
  await expect(status(page)).toContainText('at least 22.35 mm');
  // and back: a corner screw, its size shown again, the tape hidden, the standoffs off the slots
  await choose(page, 'screwHead', 'countersunk');
  await expect(screw).toBeVisible();
  await expect(tape).toBeHidden();
  await expect(chosen(page, 'standoffs')).toHaveValue('none');
  await expect(page.locator('input[name="standoffs"][value="slots"]')).toBeDisabled();
});

test('makes a standoff held by a nut and taped, named for both, and says which screw it takes', async ({ page }) => {
  await ready(page);
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'standoff');
  await expect(page.locator('input[name="tapeWidthMm"]')).toBeDisabled();
  await expect(page.locator('input[name="nutFitMm"]')).toBeDisabled(); // only with a nut (D607 a)
  await choose(page, 'standoffFixing', 'nut');
  await expect(page.locator('input[name="nutFitMm"]')).toBeEnabled();
  await expect(page.locator('input[name="nutFitMm"]')).toHaveValue('0.2');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-standoff-1-board-18mm-nut-tape-19x19mm.stl', {
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
  await expect(note).toContainText('pull each nut into its seat'); // D607 a
  await expect(note).toContainText('Then screw the foot to the wall');
  await expect(note).toContainText('countersunk M4 machine screw');
  // too short for its nut's seat behind the hooks' room: refused on the height, saying how tall
  await page.locator('input[name="heightMm"]').fill('14');
  await expect(status(page)).toHaveAttribute('data-state', 'problem', { timeout: 30_000 });
  await expect(status(page)).toContainText('at least 14.9 mm');
});

test('starts the standoffs at 18 mm with tape, and back at 15 without, unless set (D603 b)', async ({ page }) => {
  await ready(page);
  const height = page.locator('input[name="standoffHeightMm"]');
  await expect(height).toHaveValue('15');
  await choose(page, 'screwHead', 'tape');
  await expect(height).toHaveValue('18');
  await choose(page, 'screwHead', 'countersunk');
  await choose(page, 'standoffs', 'corners');
  await expect(height).toHaveValue('15');
  // a height set by hand stays where it was set
  await page.getByTestId('advanced').locator('summary').click();
  await height.fill('20');
  await choose(page, 'screwHead', 'tape');
  await expect(height).toHaveValue('20');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-solid-160x160-tape-19x19mm-standoffs-20mm.stl', {
    timeout: 30_000,
  });
});

test('starts a taped standoff at 18 mm, as tape boards stand (C604)', async ({ page }) => {
  await ready(page);
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'standoff');
  const height = page.locator('input[name="heightMm"]');
  await expect(height).toHaveValue('15');
  await choose(page, 'standoffFixing', 'nut');
  await expect(height).toHaveValue('18');
  await choose(page, 'standoffFixing', 'nut-screwed');
  await expect(height).toHaveValue('15');
});

test('makes a standoff for wood or PT screws, taped, its pilot hole following the screw size (D611)', async ({
  page,
}) => {
  await ready(page);
  await choose(page, 'typeGroup', 'connector');
  await choose(page, 'boardType', 'standoff');
  const pilot = page.locator('input[name="pilotHoleMm"]');
  await expect(pilot).toBeDisabled(); // only with a wood or PT screw
  await choose(page, 'standoffFixing', 'self-tap');
  await expect(page.locator('input[name="tapeWidthMm"]')).toBeEnabled();
  await expect(page.locator('input[name="heightMm"]')).toHaveValue('18');
  await expect(pilot).toBeEnabled();
  await expect(pilot).toHaveValue('3.4');
  await expect(status(page)).toHaveAttribute(
    'data-file-name',
    'skadis-standoff-1-board-18mm-self-tap-tape-19x19mm.stl',
    {
      timeout: 30_000,
    },
  );
  await expect(page.getByTestId('screw-note')).toContainText('wood or PT screw');
  // the pilot starts from the screw size: 0.85 times it
  await page.locator('input[name="screwMm"]').fill('3');
  await expect(pilot).toHaveValue('2.55');
  await expect(status(page)).toHaveAttribute(
    'data-file-name',
    'skadis-standoff-1-board-18mm-self-tap-tape-19x19mm-screw-3mm.stl',
    {
      timeout: 30_000,
    },
  );
});

test('says beside the tape what it holds, and nothing off tape (D609 a)', async ({ page }) => {
  await ready(page);
  const note = page.getByTestId('tape-note');
  await expect(note).toHaveText('');
  await choose(page, 'screwHead', 'tape');
  await expect(note).toContainText('4 pieces of 19 x 19 mm tape, 14.44 cm²');
  await expect(note).toContainText('about 250 g');
  await page.locator('input[name="tapeLengthMm"]').fill('12');
  await expect(note).toContainText('9.12 cm²');
  await choose(page, 'screwHead', 'countersunk');
  await expect(note).toHaveText('');
});

// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Pictures of the 3D view for the Printables model page (D211): each board kind at 240 x 200 mm, a wall split into
// panels, the slot clip and the standoff for 4 boards, and the whole page, in the light theme, from a built page
// being served. They are renders, not photos of prints, which the owner adds.
//
//   node scripts/printables/write-images.mjs <page address> <folder>
//
// PW_CHROMIUM_PATH picks the Chromium, as for the browser test.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(root, 'web', 'package.json'))('@playwright/test');
const [base, out] = process.argv.slice(2);
if (!base || !out) {
  console.error('usage: node scripts/printables/write-images.mjs <page address> <folder>');
  process.exit(2);
}

const shots = [
  { name: 'board-solid', type: 'solid', fields: { widthMm: '240', heightMm: '200' } },
  { name: 'board-lightened', type: 'lightened', fields: { widthMm: '240', heightMm: '200' } },
  { name: 'board-skeleton', type: 'skeleton', fields: { widthMm: '240', heightMm: '200' } },
  // a taller window, as a wall's print list takes its share of the stage and the slots must be wide enough to draw
  { name: 'wall', type: 'solid', panels: 'split', fields: { widthMm: '1200', heightMm: '800' }, height: 1300 },
  { name: 'slot-clip', type: 'slot-clip', choices: { boards: '4' } },
  { name: 'standoff', type: 'standoff', choices: { boards: '4' } },
  { name: 'page', type: 'skeleton', fields: { widthMm: '240', heightMm: '200' }, whole: true },
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const status = (page) => page.getByTestId('board-status');
const ready = async (page) => {
  await page.waitForFunction(
    () => document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state') === 'ready',
    null,
    { timeout: 90_000 },
  );
  await page.waitForFunction(
    () => document.querySelector('[data-testid="preview"]')?.getAttribute('data-state') === 'ready',
    null,
    { timeout: 30_000 },
  );
};
const choose = async (page, name, value) => {
  const input = page.locator(`input[name="${name}"][value="${value}"]`);
  // a type's button is shown once its group is chosen under "What to make" (D256)
  const group = name === 'boardType' ? await input.getAttribute('data-group') : null;
  if (group !== null) await page.locator(`input[name="typeGroup"][value="${group}"]`).check({ force: true });
  await input.check({ force: true });
};

// One after another, as the design system's screenshots are taken; each in steps, in order.
const inTurn = (items, step) => items.reduce((done, item) => done.then(() => step(item)), Promise.resolve());

async function shoot(shot) {
  // a fresh page each time, as the design system's screenshots take them
  const context = await browser.newContext({
    viewport: { width: 1280, height: shot.height ?? 800 },
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await page.goto(base);
  await ready(page);
  await choose(page, 'boardType', shot.type);
  if (shot.panels) await choose(page, 'panels', shot.panels);
  await inTurn(Object.entries(shot.choices ?? {}), ([name, value]) => choose(page, name, value));
  await inTurn(Object.entries(shot.fields ?? {}), ([name, value]) => page.locator(`input[name="${name}"]`).fill(value));
  await page.waitForTimeout(300); // the form builds again after a burst of typing
  await ready(page);
  await page.waitForTimeout(500); // the last frame drawn
  const file = join(out, `${shot.name}.png`);
  if (shot.whole) await page.screenshot({ path: file });
  else {
    // the part alone: the view's own buttons hidden
    await page.addStyleTag({ content: '.ws-stage__tools, .ws-stage__views { visibility: hidden; }' });
    await page.waitForTimeout(300);
    await page.getByTestId('preview').screenshot({ path: file });
  }
  const drawn = await page.getByTestId('preview').evaluate((e) => ({ ...e.dataset }));
  console.log(`${shot.name}: ${(await status(page).innerText()).trim()}; drawn ${JSON.stringify(drawn)}`);
  await context.close();
}
await inTurn(shots, shoot);
await browser.close();

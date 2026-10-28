// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Screenshots of the built page in the states a new version of the design system can change, for a
// before-and-after comparison with compare-screenshots.py (D153): wide in both themes, each kind of
// warning shown, a phone upright and sideways, a short wide screen, a 320 px screen, the stage with no WebGL, and a
// change being built, wide in both themes and on a phone (C316). Each line it prints gives the page's width, so a page
// wider than its screen shows at once. Every shot is taken with animations stopped, so a turning ring is drawn the
// same each time.
//
//   npm run build -w skadis-air-web && npm run preview -w skadis-air-web -- --port 4199
//   node scripts/design-system/screenshots.mjs http://127.0.0.1:4199/ .check/screenshots/before
//
// PW_CHROMIUM_PATH picks the Chromium, as for the browser test.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium, devices } = createRequire(join(root, 'web', 'package.json'))('@playwright/test');
const [base, out] = process.argv.slice(2);
if (!base || !out) {
  console.error('usage: node scripts/design-system/screenshots.mjs <page address> <folder>');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const wide = { width: 1280, height: 800 };
const states = [
  { name: 'wide-light', viewport: wide },
  { name: 'wide-dark', viewport: wide, scheme: 'dark' },
  { name: 'wide-warnings', viewport: wide, warnings: true },
  { name: 'wide-warnings-dark', viewport: wide, warnings: true, scheme: 'dark' },
  { name: 'wide-warning-thickness', viewport: wide, warnings: true, show: 'warning-thicknessMm' },
  { name: 'wide-warning-bed', viewport: wide, warnings: true, show: 'bed-warning' },
  { name: 'wide-warning-bed-dark', viewport: wide, warnings: true, show: 'bed-warning', scheme: 'dark' },
  { name: 'phone', device: 'iPhone 13' },
  { name: 'phone-sideways', device: 'iPhone 13 landscape' }, // side by side from v0.7.0 (D287)
  { name: 'short-wide', viewport: { width: 1280, height: 360 } }, // the plan bar beside the sidebar, short
  { name: 'sideways-844', viewport: { width: 844, height: 390 } }, // a large phone's size, held sideways
  { name: 'sideways-740', viewport: { width: 740, height: 360 } }, // a phone held sideways, side by side from v0.9.0 (breakpoint 640 px)
  { name: 'narrow-320', viewport: { width: 320, height: 700 } },
  { name: 'no-webgl', viewport: wide, args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] },
  { name: 'wide-building', viewport: wide, building: true }, // the old part while the next is made (C316)
  { name: 'wide-building-dark', viewport: wide, building: true, scheme: 'dark' },
  { name: 'phone-building', device: 'iPhone 13', building: true },
];
const stateOf = (page, id) =>
  page.evaluate((t) => document.querySelector(`[data-testid="${t}"]`)?.getAttribute('data-state'), id);

/** One state, in a browser of its own, so no emulation carries over from one shot to the next. */
async function shoot(s) {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: s.args ?? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const { defaultBrowserType: _, ...device } = s.device ? devices[s.device] : { viewport: s.viewport };
  const context = await browser.newContext({ ...device, colorScheme: s.scheme ?? 'light' });
  const page = await context.newPage();
  await page.goto(base);
  // the board is built and the preview has drawn it, or said why it cannot
  await page.waitForFunction(
    () => {
      const status = document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state');
      const preview = document.querySelector('[data-testid="preview"]')?.getAttribute('data-state');
      return status === 'ready' && ['ready', 'unavailable', 'error'].includes(preview ?? '');
    },
    null,
    { timeout: 60_000 },
  );
  if (s.warnings) {
    await page.locator('input[name="thicknessMm"]').fill('6'); // outside 4 to 5.5 mm
    await page.locator('input[name="widthMm"]').fill('240'); // larger than the 200 mm bed
    await page.waitForFunction(
      () => document.querySelector('[data-testid="board-status"]')?.getAttribute('data-file-name')?.includes('240x160'),
      null,
      { timeout: 30_000 },
    );
    await page.waitForFunction(
      () => document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state') === 'ready',
    );
  }
  if (s.building) {
    // the largest skeleton board, seconds of building (C316), from the skeleton at its starting size, drawn
    await page.locator('input[name="typeGroup"][value="board"]').check();
    await page.locator('input[name="boardType"][value="skeleton"]').check();
    await page.waitForFunction(
      () => {
        const status = document.querySelector('[data-testid="board-status"]');
        return (
          status?.getAttribute('data-state') === 'ready' &&
          status.getAttribute('data-file-name') === 'skadis-skeleton-160x160.stl'
        );
      },
      null,
      { timeout: 60_000 },
    );
    await page.locator('input[name="widthMm"]').fill('400');
    await page.locator('input[name="heightMm"]').fill('400');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state') === 'building',
    );
  }
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  if (s.show) await page.getByTestId(s.show).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${s.name}.png`), fullPage: true, animations: 'disabled' });
  if (s.building) {
    // still the old part: a shot taken after the build would show the new one, at rest
    const status = await stateOf(page, 'board-status');
    if (status !== 'building') throw new Error(`${s.name}: shot after the build, the status ${status}`);
  }
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`${s.name}: page ${width} px wide, preview ${await stateOf(page, 'preview')}`);
  await browser.close();
}

// One at a time: browsers shooting side by side compete for the machine, and the shots differ.
await states.reduce((done, s) => done.then(() => shoot(s)), Promise.resolve());

// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Screenshots of the help toggle folded and unfolded and of the busy ring showing (the design system's
// v0.8.1, D94 and D95), wide in both themes and on a 375 px phone, for a before-and-after comparison with
// compare-screenshots.py. Besides each full shot it saves the first toggle alone, to measure how far its
// icon sits from its box's centre. Nothing here names the page's classes: a toggle is a button with
// `aria-controls` and `aria-expanded` in the form, so the same script shoots the page before and after.
//
//   npm run build -w skadis-air-web && npm run preview -w skadis-air-web -- --host 127.0.0.1 --port 4199 --strictPort
//   node scripts/design-system/help-busy-shots.mjs http://127.0.0.1:4199/ .check/design-system-v081/before
//
// Keep --strictPort and check the page served is the build meant (its index.html against web/out/site's): without
// it vite takes another address or port when that one is busy, and these shots read whatever holds it (24 Oct 2026,
// when the first set came from an older server's build).
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
  console.error('usage: node scripts/design-system/help-busy-shots.mjs <page address> <folder>');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const screens = [
  { name: 'wide-light', context: { viewport: { width: 1280, height: 800 } } },
  { name: 'wide-dark', context: { viewport: { width: 1280, height: 800 }, colorScheme: 'dark' } },
  {
    name: 'phone-375',
    context: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  },
];

async function shoot(s) {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({ colorScheme: 'light', ...s.context });
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForFunction(
    () => {
      const status = document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state');
      const preview = document.querySelector('[data-testid="preview"]')?.getAttribute('data-state');
      return status === 'ready' && ['ready', 'unavailable', 'error'].includes(preview ?? '');
    },
    null,
    { timeout: 60_000 },
  );
  const settle = async () => {
    await page.evaluate(async () => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
      await document.fonts.ready;
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    await page.waitForTimeout(400);
  };
  const toggles = page.locator('form button[aria-controls][aria-expanded]:visible');
  const first = toggles.first();
  const save = async (state) => {
    await settle();
    await page.screenshot({ path: join(out, `${s.name}-${state}.png`), fullPage: true, animations: 'disabled' });
    await first.screenshot({ path: join(out, `${s.name}-${state}-toggle.png`), animations: 'disabled' });
    console.log(`${s.name}-${state}: page ${await page.evaluate(() => document.documentElement.scrollWidth)} px wide`);
  };
  console.log(`${s.name}: ${await toggles.count()} toggles`);
  // each in turn: a help opened moves what is below it
  const pressAll = async () => (await toggles.all()).reduce((done, t) => done.then(() => t.click()), Promise.resolve());
  await save('folded');
  await pressAll();
  await save('unfolded');
  await pressAll(); // folded again
  // the ring, once its delay has passed: the view marked busy as preview.ts marks it while a part is made
  await page.evaluate(() => document.querySelector('[data-testid="preview"]')?.setAttribute('aria-busy', 'true'));
  await page.waitForTimeout(800);
  await save('busy');
  await browser.close();
}

// One at a time: browsers shooting side by side compete for the machine, and the shots differ.
await screens.reduce((done, s) => done.then(() => shoot(s)), Promise.resolve());

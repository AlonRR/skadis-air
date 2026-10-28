// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The screw settings on the page, as the owner sees them (D479, Q511): the form in six states, on a wide screen and on
// a phone. The main form's screw size; Advanced with countersunk corners, where no kind of place applies and all are
// greyed out; with keyholes, theirs the screw size; with lock screws at their own 3 mm; and the slot clip's screw size,
// on its main form and its own under Advanced.
//
//   npm run build -w skadis-air-web
//   npm run preview -w skadis-air-web -- --host 127.0.0.1 --port 4199 --strictPort
//   node scripts/figures/screw-form.mjs http://127.0.0.1:4199/ .check/figures/screw-form
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
  console.error('usage: node scripts/figures/screw-form.mjs <page address> <folder>');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const screens = [
  { name: 'desktop-1280', viewport: { width: 1280, height: 800 } },
  { name: 'phone-375', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

const statusIs = (page, state, timeout) =>
  page.waitForFunction(
    (s) => document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state') === s,
    state,
    { timeout },
  );

/** Waits until the board is built from the form as it stands: the build a change starts, if it starts one. */
async function built(page) {
  await statusIs(page, 'building', 3_000).catch(() => {}); // a change that builds nothing new starts no build
  await statusIs(page, 'ready', 60_000);
}

/** Picks an option, as the browser test's `choose` does: a Select, or a Choice's radio, its fold opened first. */
async function choose(page, name, value) {
  const select = page.locator(`select[name="${name}"]`);
  if ((await select.count()) > 0) await select.selectOption(value);
  else {
    const input = page.locator(`input[name="${name}"][value="${value}"]`);
    const fold = input.locator('xpath=ancestor::details[1]');
    if ((await fold.count()) > 0 && (await fold.getAttribute('open')) === null) {
      await fold.locator('xpath=./summary').click();
    }
    await input.check();
  }
  await built(page);
}

async function openAdvanced(page) {
  const fold = page.getByTestId('advanced');
  if ((await fold.getAttribute('open')) === null) await fold.locator('summary').click();
}

/** The states in order, each building on the one before; `at` is the setting the shot is centred on. */
const states = [
  { name: '1-main-form-screw-size', at: 'screwMm', step: async () => {} },
  { name: '2-advanced-countersunk-all-greyed', at: 'keyholeScrewSize', step: openAdvanced },
  {
    name: '3-advanced-keyholes-same',
    at: 'keyholeScrewSize',
    step: async (page) => choose(page, 'screwHead', 'keyhole'),
  },
  {
    name: '4-advanced-lock-screws-own-3mm',
    at: 'lockScrewMm',
    step: async (page) => {
      await choose(page, 'lockScrews', 'bottom');
      await choose(page, 'lockScrewSize', 'own');
      await page.locator('input[name="lockScrewMm"]').fill('3');
      await built(page);
    },
  },
  {
    name: '5-slot-clip-main-screw-size',
    at: 'screwMm',
    step: async (page) => {
      await page.locator('input[name="typeGroup"][value="connector"]').check();
      await choose(page, 'boardType', 'slot-clip');
    },
  },
  {
    name: '6-slot-clip-advanced-own',
    at: 'clipScrewMm',
    step: async (page) => {
      await openAdvanced(page);
      await choose(page, 'clipScrewSize', 'own');
      await page.locator('input[name="clipScrewMm"]').fill('3');
      await built(page);
    },
  },
];

/** One screen's six shots, in a browser of its own. */
async function shootScreen(screen) {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const { name: _, ...options } = screen;
  const page = await (await browser.newContext({ ...options, colorScheme: 'light' })).newPage();
  await page.goto(base);
  await built(page);
  const shots = states.reduce(
    (done, s) =>
      done.then(async () => {
        await s.step(page);
        await page.evaluate(() =>
          document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null,
        );
        await page
          .locator(`[name="${s.at}"]`)
          .first()
          .evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await page.evaluate(() => new Promise((drawn) => requestAnimationFrame(() => requestAnimationFrame(drawn))));
        await page.waitForTimeout(400);
        const file = join(out, `${screen.name}-${s.name}.png`);
        await page.screenshot({ path: file, animations: 'disabled' });
        console.log(file);
      }),
    Promise.resolve(),
  );
  await shots;
  await browser.close();
}

await screens.reduce((done, screen) => done.then(() => shootScreen(screen)), Promise.resolve());

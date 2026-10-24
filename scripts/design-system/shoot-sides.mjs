// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Shoots the Sides control's fieldset, and the whole screen, at the widths given (default 320, 360 and 375 px), into
// .check/sides-narrow/<label>-<width>-fieldset.png and <label>-<width>-screen.png (D419).
//
//   node scripts/design-system/shoot-sides.mjs http://127.0.0.1:4199/ before [width ...]
//
// Serve the build with `--host 127.0.0.1 --port <free port> --strictPort`, and check the served index.html is your
// build (curl it): an older server holding the port gave a whole set of shots from the wrong build once.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(root, 'web', 'package.json'))('@playwright/test');
const [base, label, ...widths] = process.argv.slice(2);
if (!base || !label) throw new Error('usage: shoot-sides.mjs <url> <label> [width ...]');
const out = join(root, '.check', 'sides-narrow');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
async function shoot(width) {
  const context = await browser.newContext({ viewport: { width, height: 812 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(base);
  const sides = page.locator('.ws-sides').first();
  await sides.waitFor();
  const fieldset = sides.locator('xpath=ancestor::fieldset[1]');
  await fieldset.scrollIntoViewIfNeeded();
  await fieldset.screenshot({ path: join(out, `${label}-${width}-fieldset.png`) });
  await page.screenshot({ path: join(out, `${label}-${width}-screen.png`) });
  await context.close();
}
// One at a time, so each is shot alone
const list = (widths.length > 0 ? widths : ['320', '360', '375']).map(Number);
await list.reduce((done, width) => done.then(() => shoot(width)), Promise.resolve());
await browser.close();

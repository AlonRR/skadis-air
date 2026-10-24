// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Measures the Sides control against the fieldset that holds it, at the widths given (default 375 and 320 px),
// as the design system's v0.8.1 preview found it overflowing a 375 px phone (309 px inside its fieldset).
//
//   node scripts/design-system/measure-sides.mjs http://127.0.0.1:4199/ [width ...]
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(root, 'web', 'package.json'))('@playwright/test');
const [base, ...widths] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
async function measure(width) {
  const context = await browser.newContext({ viewport: { width, height: 812 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(base);
  await page.locator('.ws-sides').first().waitFor();
  const m = await page.evaluate(() => {
    const sides = document.querySelector('.ws-sides');
    const fieldset = sides?.closest('fieldset');
    const cs = fieldset ? getComputedStyle(fieldset) : null;
    const s = sides?.getBoundingClientRect();
    const f = fieldset?.getBoundingClientRect();
    const inner =
      f && cs
        ? f.width -
          parseFloat(cs.paddingLeft) -
          parseFloat(cs.paddingRight) -
          parseFloat(cs.borderLeftWidth) -
          parseFloat(cs.borderRightWidth)
        : null;
    return {
      sides: s?.width,
      fieldsetInner: inner,
      sidesLeft: s?.left,
      sidesRight: s?.right,
      fieldsetRight: f?.right,
      buttonsRight: Math.max(
        ...[...document.querySelectorAll('.ws-sides__btn')].map((b) => b.getBoundingClientRect().right),
      ),
      pageScroll: document.documentElement.scrollWidth,
      sidesScroll: sides ? [sides.scrollWidth, sides.clientWidth] : null,
    };
  });
  console.log(width, JSON.stringify(m));
  await context.close();
}
// One at a time, so each is measured alone
const list = (widths.length > 0 ? widths : ['375', '320']).map(Number);
await list.reduce((done, width) => done.then(() => measure(width)), Promise.resolve());
await browser.close();

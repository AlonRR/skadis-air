// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The Sides control on a narrow phone (D419 a, 24 Oct 2026). The design system's `.ws-sides` is as wide as its parts
// laid in a row (about 300 px), so in a fieldset 253 px wide at 320 px it ended 30 px past the fieldset and 14 px past
// the screen, where the page clipped it; at 360 px it ran 7 px into the fieldset's padding (C490, C458). It now
// shrinks to its fieldset's content box. Since D528 a (30 Oct 2026) its buttons sit inside the board's drawing, as wide
// as the fieldset allows up to 18 rem; `sides-drawing.spec.ts` holds that, so the design system's own width is no
// longer checked here.
import { expect, test, type Page } from '@playwright/test';
import { sidewaysScroll } from './design-system.js';

interface Measure {
  fieldsetLeft: number;
  fieldsetRight: number;
  sidesLeft: number;
  sidesRight: number;
  sidesWidth: number;
  sidesScroll: [number, number];
  fieldsetScroll: [number, number];
  buttons: { side: string; left: number; right: number; width: number; height: number }[];
  tap: number;
}

/** The control against the content box of the fieldset that holds it, with every button's box. */
const measure = (page: Page): Promise<Measure> =>
  page.evaluate(() => {
    const sides = document.querySelector('.ws-sides');
    const fieldset = sides?.closest('fieldset');
    if (!sides || !fieldset) throw new Error('no Sides control in a fieldset');
    const cs = getComputedStyle(fieldset);
    const f = fieldset.getBoundingClientRect();
    const s = sides.getBoundingClientRect();
    return {
      fieldsetLeft: f.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
      fieldsetRight: f.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight),
      sidesLeft: s.left,
      sidesRight: s.right,
      sidesWidth: s.width,
      sidesScroll: [sides.scrollWidth, sides.clientWidth],
      fieldsetScroll: [fieldset.scrollWidth, fieldset.clientWidth],
      buttons: [...sides.querySelectorAll<HTMLElement>('.ws-sides__btn')].map((b) => {
        const r = b.getBoundingClientRect();
        return { side: b.dataset['side'] ?? '', left: r.left, right: r.right, width: r.width, height: r.height };
      }),
      tap: parseFloat(getComputedStyle(document.documentElement).fontSize) * 2.75,
    };
  });

for (const width of [320, 360, 375]) {
  test.describe(`on a phone ${width} px wide`, () => {
    test.use({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true });

    test('the Sides control lies within its fieldset and nothing scrolls sideways', async ({ page }) => {
      await page.goto('./');
      await expect(page.locator('.ws-sides')).toBeVisible();
      const m = await measure(page);
      expect(m.sidesRight).toBeLessThanOrEqual(m.fieldsetRight + 0.01);
      expect(m.sidesLeft).toBeGreaterThanOrEqual(m.fieldsetLeft - 0.01);
      for (const b of m.buttons) {
        expect(b.right, `${b.side} button's right edge`).toBeLessThanOrEqual(m.fieldsetRight + 0.01);
        expect(b.left, `${b.side} button's left edge`).toBeGreaterThanOrEqual(m.fieldsetLeft - 0.01);
      }
      expect(m.buttons.map((b) => b.side).sort()).toEqual(['bottom', 'left', 'right', 'top']);
      expect(m.sidesScroll[0]).toBeLessThanOrEqual(m.sidesScroll[1]);
      expect(m.fieldsetScroll[0]).toBeLessThanOrEqual(m.fieldsetScroll[1]);
      expect(await sidewaysScroll(page)).toBe(0);
    });

    test('every button keeps the touch size, and every checkbox and Sides button can be clicked', async ({ page }) => {
      await page.goto('./');
      await expect(page.locator('.ws-sides')).toBeVisible();
      const m = await measure(page);
      for (const b of m.buttons) expect(b.height, `${b.side} button's height`).toBeGreaterThanOrEqual(m.tap - 0.01);
      const buttons = page.locator('.ws-sides__btn');
      expect(await buttons.count()).toBe(4);
      for (const side of ['top', 'right', 'bottom', 'left']) {
        const button = page.locator(`.ws-sides__btn[data-side="${side}"]`);
        const before = await button.getAttribute('aria-pressed');
        await button.click(); // a real click: fails if another element covers the button
        await expect(button).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', before ?? 'false');
      }
      for (const box of await page.locator('form input[type="checkbox"]:visible').all())
        await box.click({ trial: true });
    });
  });
}

// The control of the checks: a wider-than-the-fieldset control must fail the test above.
test('the check sees an overflow (the control: the control forced to 400 px)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('./');
  await expect(page.locator('.ws-sides')).toBeVisible();
  await page.addStyleTag({ content: '.ws-sides { width: 400px !important; max-width: none !important; }' });
  const m = await measure(page);
  expect(m.sidesRight).toBeGreaterThan(m.fieldsetRight);
});

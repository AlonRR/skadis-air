// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The Sides control scrolled under the pinned 3D view on a phone (the owner, 31 Oct 2026: "In picture a bug that the
// sides show above the viewer"): its buttons' z-index (D528 a) put them in the page's stacking order beside the view's
// own, later in it, so they were drawn over the view. The control now keeps its layers to itself.
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

test('the Sides buttons go under the pinned view as the form scrolls', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.ws-sides')).toBeVisible();
  // scroll the page so the control's middle is under the pinned view's middle
  const hidden = await page.evaluate(() => {
    const view = document.querySelector<HTMLElement>('[data-testid="preview"]');
    const sides = document.querySelector<HTMLElement>('.ws-sides');
    if (!view || !sides) throw new Error('no view or no Sides control');
    const v = view.getBoundingClientRect();
    const s = sides.getBoundingClientRect();
    window.scrollBy(0, s.top + s.height / 2 - (v.top + v.height / 2));
    const under = view.getBoundingClientRect();
    return [...sides.querySelectorAll<HTMLElement>('.ws-sides__btn')].map((b) => {
      const r = b.getBoundingClientRect();
      const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
      const inView = y > under.top && y < under.bottom;
      const top = document.elementFromPoint(x, y);
      return { side: b.dataset['side'] ?? '', inView, drawnOver: top !== null && b.contains(top) };
    });
  });
  expect(hidden.filter((b) => b.inView).length).toBeGreaterThan(0); // the scroll put some under the view
  for (const b of hidden.filter((q) => q.inView)) expect(b, b.side).toMatchObject({ drawnOver: false });
});

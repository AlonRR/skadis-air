// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The Sides control draws the board as set (D528 a, 30 Oct 2026): the four buttons inside the board's drawing, a
// closed side a solid edge in the action blue and an open one dashed, and a corner round only where both its sides are
// closed, as the board is built (`boardOutline`).
import { expect, test, type Page } from '@playwright/test';

interface Drawing {
  board: { left: number; right: number; top: number; bottom: number };
  buttons: { side: string; left: number; right: number; top: number; bottom: number }[];
  edges: Record<string, { style: string; colour: string }>;
  corners: Record<string, number>;
  action: string;
}

const drawing = (page: Page): Promise<Drawing> =>
  page.evaluate(() => {
    const board = document.querySelector<HTMLElement>('.ws-sides__board');
    if (!board) throw new Error('no board drawing');
    const cs = getComputedStyle(board);
    const r = board.getBoundingClientRect();
    const probe = document.createElement('span');
    probe.style.color = 'var(--action)';
    document.body.append(probe);
    const action = getComputedStyle(probe).color;
    probe.remove();
    const edge = (s: string) => ({
      style: cs.getPropertyValue(`border-${s}-style`),
      colour: cs.getPropertyValue(`border-${s}-color`),
    });
    return {
      board: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
      buttons: [...document.querySelectorAll<HTMLElement>('.ws-sides__btn')].map((b) => {
        const q = b.getBoundingClientRect();
        return { side: b.dataset['side'] ?? '', left: q.left, right: q.right, top: q.top, bottom: q.bottom };
      }),
      edges: { top: edge('top'), right: edge('right'), bottom: edge('bottom'), left: edge('left') },
      corners: {
        topLeft: parseFloat(cs.borderTopLeftRadius),
        topRight: parseFloat(cs.borderTopRightRadius),
        bottomRight: parseFloat(cs.borderBottomRightRadius),
        bottomLeft: parseFloat(cs.borderBottomLeftRadius),
      },
      action,
    };
  });

const press = async (page: Page, side: string) => {
  await page.locator(`.ws-sides__btn[data-side="${side}"]`).click();
};

for (const width of [320, 375, 1280])
  test(`at ${width} px the buttons lie inside the board's drawing`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await expect(page.locator('.ws-sides')).toBeVisible();
    const d = await drawing(page);
    expect(d.buttons).toHaveLength(4);
    for (const b of d.buttons) {
      expect(b.left, `${b.side} left`).toBeGreaterThan(d.board.left);
      expect(b.right, `${b.side} right`).toBeLessThan(d.board.right);
      expect(b.top, `${b.side} top`).toBeGreaterThan(d.board.top);
      expect(b.bottom, `${b.side} bottom`).toBeLessThan(d.board.bottom);
    }
  });

test('a closed side is solid and blue, an open one dashed, and a corner round where both its sides are closed', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('.ws-sides')).toBeVisible();
  let d = await drawing(page);
  // all open to start: dashed all round, every corner sharp
  for (const s of ['top', 'right', 'bottom', 'left']) {
    expect(d.edges[s]?.style, s).toBe('dashed');
    expect(d.edges[s]?.colour, s).not.toBe(d.action);
  }
  expect(Object.values(d.corners)).toEqual([0, 0, 0, 0]);
  await press(page, 'top');
  await press(page, 'left');
  d = await drawing(page);
  for (const s of ['top', 'left']) expect(d.edges[s], s).toEqual({ style: 'solid', colour: d.action });
  for (const s of ['right', 'bottom']) expect(d.edges[s]?.style, s).toBe('dashed');
  expect(d.corners.topLeft).toBeGreaterThan(0);
  expect([d.corners.topRight, d.corners.bottomRight, d.corners.bottomLeft]).toEqual([0, 0, 0]);
  await press(page, 'right');
  await press(page, 'bottom');
  d = await drawing(page);
  for (const c of Object.values(d.corners)) expect(c).toBeGreaterThan(0);
});

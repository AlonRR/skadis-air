// The page as the design system's workbench (backlog item workbench; D111, D113, D114, D123): a header
// with the theme toggle, the stage beside the sidebar on a wide screen and pinned above it on a phone,
// and the board always fitting the stage. The pixel checks read what was drawn, not what the preview's
// code believes it framed, and each has a control that must fail them.
import { expect, test, type Page } from '@playwright/test';
import { drawnBox } from './design-system.js';

const ready = async (page: Page) => {
  await page.goto('./');
  await expect(page.getByTestId('preview')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready');
};

type Box = Awaited<ReturnType<typeof drawnBox>>;
const inside = (b: Box) => b.found && b.minX > 0 && b.minY > 0 && b.maxX < b.W - 1 && b.maxY < b.H - 1;
const touchesEdge = (b: Box) => b.found && (b.minX === 0 || b.minY === 0 || b.maxX === b.W - 1 || b.maxY === b.H - 1);
/** The share of the stage's limiting side the part spans: the larger of its width and height shares. */
const fill = (b: Box) => Math.max((b.maxX - b.minX + 1) / b.W, (b.maxY - b.minY + 1) / b.H);
/** The part's larger side over the stage's shorter side, which zooming out may not take below min-fill. */
const spanOfShorter = (b: Box) => Math.max(b.maxX - b.minX + 1, b.maxY - b.minY + 1) / Math.min(b.W, b.H);

async function wheel(page: Page, deltaY: number, times: number) {
  const canvas = await page.getByTestId('preview').locator('canvas').boundingBox();
  if (canvas === null) throw new Error('no canvas');
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  for (let i = 0; i < times; i += 1) await page.mouse.wheel(0, deltaY);
}

for (const [device, use] of [
  ['a desktop', { viewport: { width: 1280, height: 720 } }],
  ['a phone', { viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true }],
] as const) {
  test.describe(`the board always fits the stage (D123), on ${device}`, () => {
    test.use(use);

    test('framed to fill --stage-fit of the stage, inside it', async ({ page }) => {
      await ready(page);
      const stageFit = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--stage-fit').trim(),
      );
      expect(stageFit).toBe('0.85'); // read from the tokens, so a missing token cannot pass by a fallback
      const box = await drawnBox(page);
      expect(inside(box)).toBe(true);
      expect(fill(box)).toBeGreaterThan(0.75);
      expect(fill(box)).toBeLessThan(0.88);
    });

    // Zoomed in, the board runs off the stage: the control that shows the edge check sees overflow. A
    // change of the stage's size then pulls the view back until the whole board fits again.
    test('zoomed in past the stage it overflows; a resize pulls it back inside', async ({ page }) => {
      await ready(page);
      await wheel(page, -200, 30);
      await expect.poll(async () => touchesEdge(await drawnBox(page))).toBe(true);
      const size = page.viewportSize() ?? { width: 0, height: 0 };
      await page.setViewportSize({ width: size.width - 40, height: size.height - 60 });
      await expect.poll(async () => inside(await drawnBox(page))).toBe(true);
    });

    // Zoomed out as far as it goes, the board ends near --stage-min-fill (0.25) of the shorter side: not
    // below it, and not far above it either, which shows the wheel did zoom out (a wheel that missed the
    // stage left this passing on the old page).
    test('zooming out stops before the board shrinks below --stage-min-fill', async ({ page }) => {
      await ready(page);
      const first = spanOfShorter(await drawnBox(page));
      await wheel(page, 200, 60);
      await page.waitForTimeout(300);
      const box = await drawnBox(page);
      expect(inside(box)).toBe(true);
      expect(spanOfShorter(box)).toBeLessThan(Math.min(0.35, first * 0.6));
      expect(spanOfShorter(box)).toBeGreaterThan(0.2);
    });

    test('"Reset view" frames it again after zooming', async ({ page }) => {
      await ready(page);
      const first = fill(await drawnBox(page));
      await wheel(page, -200, 30);
      await expect.poll(async () => touchesEdge(await drawnBox(page))).toBe(true);
      await page.getByRole('button', { name: 'Reset view' }).click();
      await expect.poll(async () => Math.abs(fill(await drawnBox(page)) - first)).toBeLessThan(0.01);
      expect(inside(await drawnBox(page))).toBe(true);
    });
  });
}

test.describe('the layout', () => {
  test('on a wide screen the stage sits beside the sidebar, and the page itself does not scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await ready(page);
    const stage = await page.locator('.ws-stage').boundingBox();
    const side = await page.locator('.ws-side').boundingBox();
    if (stage === null || side === null) throw new Error('no stage or sidebar');
    expect(stage.x + stage.width).toBeLessThanOrEqual(side.x + 1);
    expect(side.x + side.width).toBeLessThanOrEqual(1281);
    expect(stage.height).toBeGreaterThan(500);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId('board-size')).toHaveText('160 × 160 × 5 mm'); // in the status bar
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });

    // The design system's phone stage (D25, v0.4.0; D202): the 3D view alone pinned at 45 % of the height, the
    // plan bar pinned under it; the stage itself lays its parts out in the page, so it has no box of its own.
    test('the 3D view is 45 % of the height, stays on top as the form scrolls, with the download in reach', async ({
      page,
    }) => {
      await ready(page);
      const view = page.getByTestId('preview');
      expect(Math.abs(((await view.boundingBox())?.height ?? 0) - 0.45 * 800)).toBeLessThan(4);
      await page.evaluate(() => window.scrollTo(0, 900));
      await expect.poll(async () => (await view.boundingBox())?.y ?? -1).toBe(0);
      await expect(page.getByRole('button', { name: 'Download STL' })).toBeInViewport();
    });
  });
});

// A wall's print list takes its share of the stage as the wall is drawn, so the wall is framed to the 3D view as
// that leaves it, not as it was a moment before: on a tall screen it had been framed for the taller view and left at
// half the size (C217).
test.describe('a wall on a tall screen', () => {
  test.use({ viewport: { width: 1280, height: 1300 } });

  test('is framed to fill --stage-fit of the 3D view its print list leaves', async ({ page }) => {
    await ready(page);
    await page.locator('input[name="panels"][value="split"]').check({ force: true });
    await page.locator('input[name="widthMm"]').fill('1200');
    await page.locator('input[name="heightMm"]').fill('800');
    await expect(page.getByTestId('board-status')).toContainText('Wall ready', { timeout: 60_000 });
    await expect(page.getByTestId('print-list')).toBeVisible();
    await expect.poll(async () => fill(await drawnBox(page)), { timeout: 10_000 }).toBeGreaterThan(0.75);
    expect(fill(await drawnBox(page))).toBeLessThan(0.88);
  });
});

test.describe('the theme toggle (D113)', () => {
  test('switches the theme, and the page remembers it over the system setting', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await ready(page);
    const html = page.locator('html');
    const toggle = page.getByRole('button', { name: 'Dark theme' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark'); // remembered
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html).toHaveAttribute('data-theme', 'dark'); // the choice wins over the system
    await page.getByRole('button', { name: 'Dark theme' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  // The control: with nothing chosen, the system setting still decides (D113), so the test above
  // cannot pass on a page that is simply dark.
  test('with nothing chosen, it follows the system setting', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true');
  });
});

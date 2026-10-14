// The page in the shared design system's look (backlog item design-system-base; D111, D113): its
// tokens and fonts loaded, the theme the system asks for, and a page that fits a phone. Each check has
// a control that must fail it, as the design system's own scripts/check-previews.py has.
import { expect, test, type Page } from '@playwright/test';
import { fontFallbacks, previewBackground, rgb, settle, sidewaysScroll, token } from './design-system.js';

const near = (got: number[], want: number[]) =>
  got.length === 3 && want.length === 3 && got.every((v, i) => Math.abs(v - (want[i] ?? -99)) <= 2);
const mean = (c: number[]) => c.reduce((a, b) => a + b, 0) / c.length;

const ready = async (page: Page) => {
  await expect(page.getByTestId('preview')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready');
};

test.describe('the theme follows the system setting (D113)', () => {
  // Light and dark both run, so each is the other's control: a page that never turned dark, or turned
  // dark without the dark colours, fails one of them.
  for (const scheme of ['light', 'dark'] as const) {
    test(`a ${scheme} system setting gives the ${scheme} theme, the page and the preview alike`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('./');
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      await ready(page);
      const surface = await token(page, '--surface');
      expect(surface).toHaveLength(3); // the design system's tokens loaded
      if (scheme === 'dark') expect(mean(surface)).toBeLessThan(64);
      else expect(mean(surface)).toBeGreaterThan(192);
      expect(rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor))).toEqual(surface);
      expect(near(await previewBackground(page), surface)).toBe(true);
    });
  }

  test('turns dark while the page is open, the preview with it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('./');
    await ready(page);
    const light = await token(page, '--surface');
    expect(near(await previewBackground(page), light)).toBe(true);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const dark = await token(page, '--surface');
    expect(near(dark, light)).toBe(false);
    await expect.poll(async () => near(await previewBackground(page), dark)).toBe(true);
  });
});

test.describe('the fonts', () => {
  test('every glyph on the page is drawn in the design system font', async ({ page }) => {
    await page.goto('./');
    await ready(page);
    expect(await settle(page)).toEqual([]); // every declared face loaded
    expect(await fontFallbacks(page)).toEqual([]);
  });

  // The control: a line in another family must be reported, or an empty list would mean nothing.
  test('a line in another font is caught (the control for the font check)', async ({ page }) => {
    await page.goto('./');
    await ready(page);
    await page.evaluate(() => {
      const line = document.createElement('p');
      line.style.fontFamily = 'serif';
      line.textContent = 'Not the design system font';
      document.body.append(line);
    });
    await settle(page);
    expect((await fontFallbacks(page)).some((f) => f.startsWith('<p> in '))).toBe(true);
  });
});

test.describe('on a phone, 375 px wide, with a touch screen', () => {
  test.use({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });

  test('the page does not scroll sideways', async ({ page }) => {
    await page.goto('./');
    await ready(page);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true); // the emulation holds
    await settle(page);
    expect(await sidewaysScroll(page)).toBe(0);
  });

  test('a block wider than the screen makes it scroll (the control for the width check)', async ({ page }) => {
    await page.goto('./');
    await ready(page);
    await page.evaluate(() => {
      const wide = document.createElement('div');
      wide.style.width = '600px';
      wide.style.height = '1px';
      document.body.append(wide);
    });
    expect(await sidewaysScroll(page)).toBeGreaterThan(0);
  });
});

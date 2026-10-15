// The page in the shared design system's look (backlog item design-system-base; D111, D113): its
// tokens and fonts loaded, the theme the system asks for, and a page that fits a phone. Each check has
// a control that must fail it, as the design system's own scripts/check-previews.py has.
import { expect, test, type Page } from '@playwright/test';
import { choose, fontFallbacks, previewBackground, rgb, settle, sidewaysScroll, token } from './design-system.js';

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

  // Every control a finger presses, measured on what is drawn: a choice by its button face, since its
  // radio input is invisible on top of it. Advanced is opened, so its fields are measured too.
  const shortControls = (page: Page) =>
    page.evaluate(() => {
      document.querySelector<HTMLDetailsElement>('[data-testid="advanced"]')?.setAttribute('open', '');
      const all = [
        ...document.querySelectorAll<HTMLElement>(
          'input:not([type="radio"]), select, button, summary, .ws-choice__face',
        ),
      ].filter((e) => e.getClientRects().length > 0);
      const short = all
        .filter((e) => e.getBoundingClientRect().height < 43.5)
        .map(
          (e) =>
            `${e.localName} "${(e.textContent ?? '').trim() || e.getAttribute('name')}" ${e.getBoundingClientRect().height.toFixed(1)} px`,
        );
      return { measured: all.length, short };
    });

  test('every control is at least 44 px tall', async ({ page }) => {
    await page.goto('./');
    await ready(page);
    await settle(page);
    const { measured, short } = await shortControls(page);
    expect(measured).toBeGreaterThan(15);
    expect(short).toEqual([]);
  });

  test('a button 30 px tall is caught (the control for the touch check)', async ({ page }) => {
    await page.goto('./');
    await ready(page);
    await page.evaluate(() => {
      const small = document.createElement('button');
      small.textContent = 'Small';
      small.style.cssText = 'height: 30px; min-height: 0';
      document.body.append(small);
    });
    expect((await shortControls(page)).short.some((s) => s.startsWith('button "Small"'))).toBe(true);
  });

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

// The narrowest phones in use are 320 px wide. Before the design system's v0.3.0 the buttons under the 3D view
// stayed on one line there and pushed the page 7 px wider than the screen (measured 15 Oct 2026, D153).
test.describe('on a phone 320 px wide', () => {
  test.use({ viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true });

  test('the page does not scroll sideways, the buttons under the 3D view wrapping instead', async ({ page }) => {
    await page.goto('./');
    await ready(page);
    await settle(page);
    expect(await sidewaysScroll(page)).toBe(0);
    const download = await page.getByRole('button', { name: 'Download STL' }).boundingBox();
    expect(download !== null && download.x + download.width).toBeLessThanOrEqual(320);
  });
});

// A warning is the design system's warning Notice (D153): outlined and headed in the warning colour, in either
// theme. Before v0.3.0 only its headline took the colour.
test.describe('a warning', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`is outlined and headed in the warning colour, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('./');
      await ready(page);
      await page.locator('input[name="thicknessMm"]').fill('6');
      const notice = page.getByTestId('warning-thicknessMm');
      await expect(notice).not.toBeEmpty();
      const warning = await token(page, '--warning');
      const drawn = await notice.evaluate((el) => ({
        border: getComputedStyle(el).borderTopColor,
        headline: getComputedStyle(el.querySelector('strong') ?? el).color,
      }));
      expect(near(rgb(drawn.headline), warning)).toBe(true);
      expect(near(rgb(drawn.border), warning)).toBe(true);
    });
  }

  test('an empty notice takes no room (the control: a filled one does)', async ({ page }) => {
    await page.goto('./');
    await ready(page);
    const notice = page.getByTestId('warning-thicknessMm');
    expect(await notice.evaluate((el) => el.getBoundingClientRect().height)).toBe(0);
    await page.locator('input[name="thicknessMm"]').fill('6');
    await expect(notice).not.toBeEmpty();
    expect(await notice.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(20);
  });
});

// The chosen option of a choice, and a closed side, are filled with the action colour; the rest are not.
test('the chosen option and a closed side are filled, the others are not', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  const action = await token(page, '--action');
  expect(action).toHaveLength(3);
  const fill = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(rgb(await fill('input[name="boardType"]:checked + .ws-choice__face'))).toEqual(action);
  expect(rgb(await fill('input[name="boardType"]:not(:checked) + .ws-choice__face'))).not.toEqual(action);
  await choose(page, 'screwHead', 'round');
  expect(rgb(await fill('input[name="screwHead"]:checked + .ws-choice__face'))).toEqual(action);
  expect(rgb(await fill('[data-side="left"]'))).not.toEqual(action); // open
  await page.locator('[data-side="left"]').click();
  await expect(page.locator('[data-side="left"]')).toHaveAttribute('aria-pressed', 'true');
  expect(rgb(await fill('[data-side="left"]'))).toEqual(action); // closed
});

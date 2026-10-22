// The 3D view while a change is being built (C316): the part on show is the old one, so after a moment it dims and
// a ring turns over it, until the new part is drawn or the form says it cannot be made. The moment keeps a quick
// rebuild from flickering; nothing turns on a page at rest, and with reduced motion the ring does not turn at all.
// The status line under the stage stays the announcement: the view is only marked busy, the ring hidden from
// assistive technology, and a drag goes through it to the drawing. The load is the largest skeleton board, which
// takes seconds to build (responsive.spec.ts).
import { expect, test, type Page } from '@playwright/test';
import { choose, rgb, token } from './design-system.js';

const preview = (page: Page) => page.getByTestId('preview');
const status = (page: Page) => page.getByTestId('board-status');
const indicator = (page: Page) => page.getByTestId('preview-busy');
const ring = (page: Page) => indicator(page).locator('.stage-busy__ring');
const canvasOpacity = (page: Page) =>
  preview(page)
    .locator('canvas')
    .evaluate((c) => getComputedStyle(c).opacity);

async function ready(page: Page) {
  await page.goto('./');
  await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(preview(page)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

/** The skeleton board at its starting size, drawn: the part on show while the next one is built. */
async function readySkeleton(page: Page) {
  await ready(page);
  await choose(page, 'boardType', 'skeleton');
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-skeleton-160x160.stl', { timeout: 30_000 });
  await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

/** Starts the largest skeleton board, seconds of building. */
async function startLongBuild(page: Page) {
  await page.locator('input[name="widthMm"]').fill('400');
  await page.locator('input[name="heightMm"]').fill('400');
  await expect(status(page)).toHaveAttribute('data-state', 'building');
}

/** The canvas as drawn, which changes when the view turns. */
const signature = (page: Page) =>
  page.evaluate(() => document.querySelector<HTMLCanvasElement>('[data-testid="preview"] canvas')?.toDataURL() ?? '');

test('a rebuild dims the old part under a turning ring, and the new part, drawn, takes both away', async ({ page }) => {
  test.setTimeout(120_000);
  await readySkeleton(page);
  await expect(indicator(page)).toBeHidden();
  await startLongBuild(page);
  await expect(preview(page)).toHaveAttribute('aria-busy', 'true');
  await expect(status(page)).toHaveText('Making the board…'); // the words stay the announcement
  await expect(indicator(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(indicator(page)).toBeVisible();
  await expect.poll(() => indicator(page).evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  // the old part is still drawn, dimmed to the design system's opacity for what cannot be used
  await expect(preview(page)).toHaveAttribute('data-state', 'ready');
  const dimmed = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--opacity-disabled').trim(),
  );
  expect(dimmed).not.toBe('');
  await expect.poll(() => canvasOpacity(page)).toBe(dimmed);
  // it turns: the control for the reduced-motion test below
  expect(await ring(page).evaluate((r) => r.getAnimations().length)).toBeGreaterThan(0);
  // in steps, never smoothly: in this Chromium, which draws in software, eight pages at once took 42 to 138 s to open
  // and make six boards each with the ring turning smoothly, 15 to 34 s in steps and 15 to 32 s with no ring, and
  // this browser test failed 28 of its 105 tests (C316)
  expect(await ring(page).evaluate((r) => getComputedStyle(r).animationTimingFunction)).toMatch(/^steps\(/);
  // the new part drawn, the ring and the dimming are gone
  await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  await expect(status(page)).toHaveAttribute('data-file-name', 'skadis-skeleton-400x400.stl');
  await expect(preview(page)).not.toHaveAttribute('aria-busy', 'true');
  await expect(indicator(page)).toBeHidden();
  expect(await canvasOpacity(page)).toBe('1');
});

test('waits a moment before it shows, so a quick rebuild does not flicker', async ({ page }) => {
  test.setTimeout(120_000);
  await readySkeleton(page);
  // read in the page, from the moment the view is marked busy until the ring is on show
  const shown = page.evaluate(
    () =>
      new Promise<{ atStart: string; afterMs: number }>((done) => {
        const view = document.querySelector('[data-testid="preview"]');
        const busy = document.querySelector('[data-testid="preview-busy"]');
        if (view === null || busy === null) {
          done({ atStart: 'missing', afterMs: -1 });
          return;
        }
        new MutationObserver((_, observer) => {
          if (view.getAttribute('aria-busy') !== 'true') return;
          observer.disconnect();
          const atStart = getComputedStyle(busy).visibility;
          const t0 = performance.now();
          const look = () => {
            if (getComputedStyle(busy).visibility === 'visible') done({ atStart, afterMs: performance.now() - t0 });
            else requestAnimationFrame(look);
          };
          look();
        }).observe(view, { attributes: true, attributeFilter: ['aria-busy'] });
      }),
  );
  await startLongBuild(page);
  const { atStart, afterMs } = await shown;
  expect(atStart).toBe('hidden');
  expect(afterMs).toBeGreaterThanOrEqual(350);
  expect(afterMs).toBeLessThan(2_000);
});

test('the first board is made under it too, from the opening of the page until it is drawn', async ({ page }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { busySeen: string[] }).busySeen = seen;
    // each change of the view's aria-busy, as it is after the script that made it; the first build marks it busy
    // again, which is no change
    new MutationObserver((records) => {
      for (const r of records) {
        if (!(r.target instanceof Element) || !r.target.matches('[data-testid="preview"]')) continue;
        const now = r.target.getAttribute('aria-busy') ?? 'none';
        if (seen.at(-1) !== now) seen.push(now);
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['aria-busy'] });
  });
  await ready(page);
  expect(await page.evaluate(() => (window as unknown as { busySeen: string[] }).busySeen)).toEqual(['true', 'none']);
  await expect(indicator(page)).toBeHidden();
});

test('a page at rest never shows it: the part drawn, a setting refused, a part that cannot be made', async ({
  page,
}) => {
  await ready(page);
  const atRest = async () => {
    await expect(preview(page)).not.toHaveAttribute('aria-busy', 'true');
    await expect(indicator(page)).toHaveCount(1); // in the page, so its being hidden means something
    await expect(indicator(page)).toBeHidden();
    expect(await canvasOpacity(page)).toBe('1');
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0); // nothing runs at rest
  };
  await atRest();
  await page.locator('input[name="widthMm"]').fill('250'); // off the 40 mm steps: refused, nothing built
  await expect(status(page)).toHaveAttribute('data-state', 'invalid');
  await atRest();
  await page.locator('input[name="widthMm"]').fill('160');
  await expect(status(page)).toHaveAttribute('data-state', 'ready');
  await atRest();
  await page.getByTestId('advanced').locator('summary').click();
  await page.locator('input[name="thicknessMm"]').fill('2.5');
  await page.locator('input[name="slotChamferMm"]').fill('1.5');
  await expect(status(page)).toHaveAttribute('data-state', 'problem');
  await atRest();
});

test('a drag on the ring turns the view, as a drag anywhere on the drawing does', async ({ page }) => {
  test.setTimeout(120_000);
  await readySkeleton(page);
  await preview(page).locator('canvas').scrollIntoViewIfNeeded(); // the mouse acts on what is on screen
  await startLongBuild(page);
  await expect(indicator(page)).toBeVisible();
  const box = await ring(page).boundingBox();
  if (box === null) throw new Error('no ring');
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  // what a pointer there meets is the drawing
  const met = await page.evaluate((at) => document.elementFromPoint(at.x, at.y)?.localName, { x, y });
  expect(met).toBe('canvas');
  const before = await signature(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y + 40, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => signature(page)).not.toBe(before);
  await expect(preview(page)).toHaveAttribute('aria-busy', 'true'); // still the old part: the drag turned it
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the ring shows, and does not turn', async ({ page }) => {
    test.setTimeout(120_000);
    await readySkeleton(page);
    await startLongBuild(page);
    await expect(indicator(page)).toBeVisible();
    expect(await ring(page).evaluate((r) => r.getAnimations().length)).toBe(0);
    expect(await ring(page).evaluate((r) => getComputedStyle(r).animationName)).toBe('none');
  });
});

// Each theme the other's control: the ring in one theme's colours fails the other.
for (const scheme of ['light', 'dark'] as const) {
  test(`its colours are the ${scheme} theme's tokens`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await ready(page);
    const style = (selector: string) =>
      page.evaluate((s) => {
        const element = document.querySelector(s);
        const computed = element === null ? null : getComputedStyle(element);
        return { image: computed?.backgroundImage ?? '', colour: computed?.backgroundColor ?? '' };
      }, selector);
    const css = async (name: string) => `rgb(${(await token(page, name)).join(', ')})`;
    // the dashes run from the border colour to the action colour; the inside and the gaps are the chip's colour
    const dashes = (await style('.stage-busy__ring')).image;
    for (const name of ['--action', '--border', '--surface-raised']) expect(dashes).toContain(await css(name));
    expect(rgb((await style('.stage-busy__chip')).colour)).toEqual(await token(page, '--surface-raised'));
  });
}

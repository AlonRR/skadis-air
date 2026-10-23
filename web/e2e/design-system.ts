// What the browser tests read to hold the page to the shared design system (D111), after its own
// scripts/check-previews.py: the fonts Chromium really drew with, the page's width on a phone, and
// the theme's colours. Not a test file itself: the specs import it.
import type { Locator, Page } from '@playwright/test';

/** The one family the design system draws every glyph in. */
export const UI_FONT = 'FiraCode Nerd Font';

/**
 * Loads every declared font face, then waits for a layout, before anything is read; returns the
 * faces that failed to load. `document.fonts.ready` alone can resolve before a face is even asked
 * for, and a face that has just loaded is drawn only after the next layout (the design system's
 * finding: it raced once in CI).
 */
export const settle = (page: Page): Promise<string[]> =>
  page.evaluate(async () => {
    const failed = await Promise.all(
      [...document.fonts].map((f) =>
        f.load().then(
          () => '',
          () => `${f.family} ${f.weight} ${f.style}`,
        ),
      ),
    );
    await document.fonts.ready;
    document.body.getBoundingClientRect(); // a layout
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    return failed.filter((f) => f !== '');
  });

/** Every element drawn, in part, in a family other than the UI font, as Chromium reports it. */
export async function fontFallbacks(page: Page): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const found = new Set<string>();
  const stack = [root];
  for (let node = stack.pop(); node !== undefined; node = stack.pop()) {
    if (node.nodeType === 1) {
      const name = node.localName !== '' ? node.localName : (node.pseudoType ?? '?');
      try {
        const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
        for (const f of fonts) if (f.familyName !== UI_FONT) found.add(`<${name}> in ${f.familyName}`);
      } catch {
        // not drawn at all, such as a hidden element
      }
      stack.push(...(node.pseudoElements ?? []));
    }
    stack.push(...(node.children ?? []));
  }
  await cdp.detach();
  return [...found].sort();
}

/** How far the page scrolls sideways, in pixels; 0 when it fits the screen. */
export const sidewaysScroll = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** A design-system colour token as red, green and blue; empty when the token is not defined. */
export const token = (page: Page, name: string): Promise<number[]> =>
  page.evaluate((property) => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    return match === null ? [] : match.slice(1).map((h) => parseInt(h, 16));
  }, name);

/** A colour such as `rgb(15, 22, 28)` as red, green and blue. */
export const rgb = (css: string): number[] => (css.match(/\d+/g) ?? []).slice(0, 3).map(Number);

/** The colour the preview drew in its top left corner, where no board reaches: its background. */
export const previewBackground = (page: Page): Promise<number[]> =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="preview"] canvas');
    const copy = document.createElement('canvas');
    copy.width = 4;
    copy.height = 4;
    const ctx = copy.getContext('2d');
    if (canvas === null || ctx === null) return [];
    ctx.drawImage(canvas, 0, 0);
    return Array.from(ctx.getImageData(2, 2, 1, 1).data.subarray(0, 3));
  });

/** Chooses an option of a Choice by its value, as a click on its button does; a type, in its group first (D250 h),
 * and a closed fold round the option opened first, as a person opens Advanced to reach a test print (D357); or of a
 * Select, as picking it from the list does (D260). */
export async function choose(page: Page, name: string, value: string): Promise<void> {
  const select = page.locator(`select[name="${name}"]`);
  if ((await select.count()) > 0) {
    await select.selectOption(value);
    return;
  }
  const input = page.locator(`input[name="${name}"][value="${value}"]`);
  if (name === 'boardType' && (await input.count()) === 0) {
    // a type only in a form of its group, as a test print is under the boards' Advanced: each group shown in turn
    // until its option is on the page
    for (const group of await page.locator('input[name="typeGroup"]').all()) {
      await group.check();
      if ((await input.count()) > 0) break;
    }
  }
  const group = name === 'boardType' ? await input.getAttribute('data-group') : null;
  if (group !== null) await page.locator(`input[name="typeGroup"][value="${group}"]`).check();
  const fold = input.locator('xpath=ancestor::details[1]');
  if ((await fold.count()) > 0 && (await fold.getAttribute('open')) === null) {
    await fold.locator('xpath=./summary').click();
  }
  await input.check();
}

/** The option chosen in a Choice, or a Select itself, to read its value. */
export const chosen = (page: Page, name: string): Locator =>
  page.locator(`select[name="${name}"], input[name="${name}"]:checked`);

/**
 * Where the preview drew the part, in the canvas's own pixels: the box round every pixel that is not
 * the stage's background (--surface), with the canvas's size. `found` is false when nothing is drawn.
 */
export const drawnBox = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="preview"] canvas');
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
    const surface = /^#(..)(..)(..)$/.exec(hex);
    const empty = { found: false, minX: 0, minY: 0, maxX: 0, maxY: 0, W: 0, H: 0 };
    if (canvas === null || surface === null) return empty;
    const [r, g, b] = surface.slice(1).map((h) => parseInt(h, 16)) as [number, number, number];
    const copy = document.createElement('canvas');
    [copy.width, copy.height] = [canvas.width, canvas.height];
    const ctx = copy.getContext('2d');
    if (ctx === null) return empty;
    ctx.drawImage(canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, copy.width, copy.height);
    let [minX, minY, maxX, maxY] = [copy.width, copy.height, -1, -1];
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i]! - r) + Math.abs(data[i + 1]! - g) + Math.abs(data[i + 2]! - b) <= 24) continue;
      const p = i / 4;
      const [x, y] = [p % copy.width, Math.floor(p / copy.width)];
      [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)];
    }
    return { found: maxX >= 0, minX, minY, maxX, maxY, W: copy.width, H: copy.height };
  });

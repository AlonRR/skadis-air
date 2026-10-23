// Each setting's help, folded behind an "i" button beside its label (C317): hidden to start, shown and hidden by
// its button, which says which in aria-expanded, and still the control's description for a screen reader while
// hidden. Only the help folds: a warning, an error, a count and what the screws pass are always shown.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { BOARD_TYPES } from '../../packages/core/src/board-types/index.js';
import { choose } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('engine-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

const form = (page: Page) => page.getByTestId('board-form');
const helpOf = (page: Page, key: string) => page.locator(`#field-${key}-note`);
const infoOf = (page: Page, key: string) => form(page).locator(`button[aria-controls="field-${key}-note"]`);
const openAdvanced = async (page: Page) => {
  const advanced = page.getByTestId('advanced');
  if ((await advanced.count()) > 0) await advanced.locator('summary').click();
};

// Read from the registry, as form.spec.ts reads the types: every setting of every type that has help.
test('every setting with help has an i button beside its label, and its help starts hidden (C317)', async ({
  page,
}) => {
  await ready(page);
  let checked = 0;
  for (const type of BOARD_TYPES) {
    await choose(page, 'boardType', type.id);
    await openAdvanced(page);
    const helped = type.settings.filter((s) => s.help !== undefined);
    // one button for each setting with help, and none for a setting without
    await expect(form(page).locator('button[aria-expanded]')).toHaveCount(helped.length);
    for (const s of helped) {
      const info = infoOf(page, s.key);
      await expect(info, `${type.id} ${s.key}`).toBeVisible();
      await expect(info).toHaveAttribute('aria-expanded', 'false');
      await expect(info).toHaveAccessibleName(`About ${s.label.toLowerCase()}`);
      await expect(info.locator('xpath=..')).toContainText(s.label); // beside its label, in its row
      await expect(helpOf(page, s.key)).toBeHidden();
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThan(20);
});

test('the i button shows and hides its help, aria-expanded in step, by mouse and by keyboard (C317)', async ({
  page,
}) => {
  await ready(page);
  const info = infoOf(page, 'thicknessMm');
  const help = helpOf(page, 'thicknessMm');
  await info.click();
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  await expect(help).toBeVisible();
  await expect(help).toHaveText('IKEA hooks fit boards about 4 to 5.5 mm thick.');
  // one help opened leaves the others folded
  await expect(helpOf(page, 'sides')).toBeHidden();
  await expect(infoOf(page, 'sides')).toHaveAttribute('aria-expanded', 'false');
  await info.click();
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  await expect(help).toBeHidden();
  // the keyboard: Enter and Space, as on any button
  await info.focus();
  await page.keyboard.press('Enter');
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  await expect(help).toBeVisible();
  await page.keyboard.press('Space');
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  await expect(help).toBeHidden();
});

test('a folded help is still the description of its control for a screen reader, and stays out of its name (C317)', async ({
  page,
}) => {
  await ready(page);
  await expect(helpOf(page, 'thicknessMm')).toBeHidden();
  const thickness = page.locator('input[name="thicknessMm"]');
  await expect(thickness).toHaveAccessibleDescription(/IKEA hooks fit boards about 4 to 5\.5 mm thick\./);
  await expect(thickness).toHaveAccessibleName('Thickness (mm)');
  const screws = form(page).locator('[role="radiogroup"][aria-label="Screw holes"]');
  await expect(screws).toHaveAccessibleDescription(/One in each corner/);
  const sides = form(page).locator('[role="group"][aria-label="Closed sides"]');
  await expect(sides).toHaveAccessibleDescription(/An open side has half slots/);
  // the Sides fieldset is named by its legend's words, not the i button's name inside the legend too
  await expect(
    form(page)
      .locator('fieldset')
      .filter({ has: page.locator('[data-side]') }),
  ).toHaveAccessibleName('Sides (ticked = closed)');
  // control: a field with no help has no help in its description
  await expect(page.locator('input[name="widthMm"]')).toHaveAccessibleDescription('= 4 tiles');
});

test('a warning, an error, a count and what the screws pass are never folded (C317)', async ({ page }) => {
  await ready(page);
  await page.locator('input[name="thicknessMm"]').fill('6');
  await expect(page.getByTestId('warning-thicknessMm')).toBeVisible();
  await expect(page.getByTestId('warning-thicknessMm')).toContainText('4 to 5.5');
  await expect(helpOf(page, 'thicknessMm')).toBeHidden(); // shown while the help beside it is folded
  await page.locator('input[name="widthMm"]').fill('250');
  await expect(page.getByTestId('error-widthMm')).toBeVisible();
  await expect(page.getByTestId('error-widthMm')).toContainText('40 mm steps');
  await page.locator('input[name="widthMm"]').fill('240');
  await expect(page.getByTestId('count-widthMm')).toBeVisible();
  await expect(page.getByTestId('count-widthMm')).toHaveText('= 6 tiles');
  await openAdvanced(page);
  await expect(page.getByTestId('screw-note')).toBeVisible();
  await expect(page.getByTestId('screw-note')).toContainText('Each corner screw passes');
  await expect(helpOf(page, 'screwMm')).toBeHidden();
});

test('a help opened is folded again on another type and after a reload: nothing is kept (C317)', async ({ page }) => {
  await ready(page);
  await infoOf(page, 'thicknessMm').click();
  await expect(helpOf(page, 'thicknessMm')).toBeVisible();
  await choose(page, 'boardType', 'lightened');
  await expect(infoOf(page, 'thicknessMm')).toHaveAttribute('aria-expanded', 'false');
  await expect(helpOf(page, 'thicknessMm')).toBeHidden();
  await infoOf(page, 'thicknessMm').click();
  await page.reload();
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(helpOf(page, 'thicknessMm')).toBeHidden();
});

/** Each i button's row, measured: its height against one line of its label, and what a press at the button's
 * middle lands on, the button scrolled into view first, as nothing off the screen can be pressed. */
const rows = (info: Locator) =>
  info.evaluateAll((buttons) =>
    buttons.map((b) => {
      b.scrollIntoView({ block: 'center' });
      const row = b.parentElement;
      const box = b.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      const line = row === null ? 0 : parseFloat(getComputedStyle(row).lineHeight);
      return {
        key: b.getAttribute('aria-controls') ?? '',
        row: row?.getBoundingClientRect().height ?? 0,
        line,
        button: box.height,
        hit: hit !== null && b.contains(hit),
      };
    }),
  );

/** Each help opened by its button and measured against its field (D318): whether it shows under its label row and
 * above its control, how far opening it moves the control and what follows the field (each measured from the
 * field's top, so a scroll changes nothing), and whether a press at the control's middle still reaches the
 * control. Each help is folded again after. */
const opened = (info: Locator) =>
  info.evaluateAll((buttons: HTMLElement[]) =>
    buttons.map((b) => {
      const id = b.getAttribute('aria-controls') ?? '';
      const help = document.getElementById(id);
      const control = document.querySelector(`[aria-describedby~="${id}"]`);
      const field = help?.parentElement;
      if (help === null || control === null || field === null || field === undefined) {
        return { key: id, found: false, under: false, above: false, pushed: false, nextPushed: false, reached: false };
      }
      const next = field.nextElementSibling;
      // something not drawn has no place to be pushed from
      const from = (e: Element | null) =>
        e === null || e.getClientRects().length === 0
          ? Number.NaN
          : e.getBoundingClientRect().top - field.getBoundingClientRect().top;
      const before = { control: from(control), next: from(next) };
      b.click();
      const shown = help.getBoundingClientRect();
      const label = b.parentElement?.getBoundingClientRect();
      const moved = { control: from(control) - before.control, next: from(next) - before.next };
      const above = shown.bottom <= control.getBoundingClientRect().top + 0.5; // before the scroll below
      control.scrollIntoView({ block: 'center' });
      const box = control.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      const result = {
        key: id,
        found: true,
        under: label !== undefined && shown.top >= label.bottom - 0.5,
        above,
        pushed: moved.control >= shown.height - 0.5,
        nextPushed: Number.isNaN(moved.next) || moved.next >= shown.height - 0.5,
        reached: hit !== null && control.contains(hit),
      };
      b.click();
      return result;
    }),
  );

for (const [name, use] of [
  ['with a mouse', { viewport: { width: 1280, height: 800 } }],
  ['on a phone, with a touch screen', { viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true }],
] as const) {
  test.describe(name, () => {
    test.use(use);
    // The owner, 23 Oct 2026: "the description should be above the options, under the header. make sure the items
    // under get pushed down and not hidden by the description."
    test('a help opened shows under its label and above its control, and pushes what is below it down (D318)', async ({
      page,
    }) => {
      await ready(page);
      let checked = 0;
      for (const type of BOARD_TYPES) {
        await choose(page, 'boardType', type.id);
        await openAdvanced(page);
        const measured = await opened(form(page).locator('button[aria-expanded]'));
        expect(measured.length, type.id).toBeGreaterThan(0);
        const wrong = measured.flatMap((m) =>
          Object.entries(m)
            .filter(([k, v]) => k !== 'key' && v === false)
            .map(([k]) => `${type.id} ${m.key} not ${k}`),
        );
        expect(wrong).toEqual([]);
        checked += measured.length;
      }
      expect(checked).toBeGreaterThan(20);
      // control: a help laid over its field as a pop-over, out of the form's flow and taller than a control's
      // middle, pushes nothing down and covers its control
      await choose(page, 'boardType', 'solid');
      await page.addStyleTag({
        content:
          '.field { position: relative; } .ws-note[id$="-note"] { position: absolute; z-index: 9; min-height: 4em; }',
      });
      const [over] = await opened(infoOf(page, 'thicknessMm'));
      expect(over?.found).toBe(true);
      expect(over?.pushed).toBe(false);
      expect(over?.reached).toBe(false);
    });
    // The button is a control's height, 36 px or 44 px on a touch screen, but its row stays one line of its label,
    // or the buttons would give back much of the room the folded help saves.
    test('each i button sits in its label row without making it taller, and a press at its middle reaches it (C317)', async ({
      page,
    }) => {
      await ready(page);
      await openAdvanced(page);
      const measured = await rows(form(page).locator('button[aria-expanded]'));
      expect(measured.length).toBeGreaterThan(10);
      const tall = measured.filter((m) => m.row > m.line + 0.5).map((m) => `${m.key} ${m.row} > ${m.line}`);
      expect(tall).toEqual([]);
      expect(measured.filter((m) => !m.hit).map((m) => m.key)).toEqual([]);
      expect(Math.min(...measured.map((m) => m.button))).toBeGreaterThanOrEqual(name === 'with a mouse' ? 35.5 : 43.5);
      // controls: a button left its full height in the row, and one with something drawn over its middle, are caught
      const last = form(page).locator('button[aria-expanded]').last();
      await last.evaluate((b) => b.style.setProperty('margin-block', '0'));
      const [kept] = await rows(last);
      expect(kept?.row).toBeGreaterThan((kept?.line ?? 0) + 0.5);
      const first = form(page).locator('button[aria-expanded]').first();
      await first.evaluate((b) => {
        b.scrollIntoView({ block: 'center' }); // where the measure scrolls it, so the cover stays over it
        const box = b.getBoundingClientRect();
        const cover = document.createElement('div');
        cover.style.cssText = `position:fixed;z-index:9;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px`;
        document.body.append(cover);
      });
      expect((await rows(first))[0]?.hit).toBe(false);
    });
  });
}

// The printer bed (backlog item printer-default): 200 x 200 mm unless set (D61), and a board larger
// than the bed is warned about but still offered for download (D62).
import { expect, test, type Page } from '@playwright/test';
import { choose, chosen } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

test('starts on the safe default bed, 200 x 200 mm, which the starting board fits', async ({ page }) => {
  await ready(page);
  await expect(chosen(page, 'printerBed')).toHaveValue('default');
  await expect(page.getByTestId('printer-bed').locator('input:checked + .ws-choice__face')).toContainText(
    '200 × 200 mm',
  );
  await expect(page.getByTestId('bed-warning')).toBeEmpty();
});

test('warns when the board does not fit the bed, and still offers the download (D62)', async ({ page }) => {
  await ready(page);
  await page.locator('input[name="widthMm"]').fill('240');
  await page.locator('input[name="heightMm"]').fill('200');
  await expect(page.getByTestId('bed-warning')).toContainText('does not fit the 200 × 200 mm bed');
  await expect(page.getByRole('button', { name: 'Download STL' })).toBeEnabled();
});

test('takes a custom bed, and the warning goes once the board fits it', async ({ page }) => {
  await ready(page);
  await page.locator('input[name="widthMm"]').fill('240');
  await page.locator('input[name="heightMm"]').fill('200');
  await expect(page.getByTestId('bed-warning')).not.toBeEmpty();
  await choose(page, 'printerBed', 'custom');
  await page.locator('input[name="bedXMm"]').fill('250');
  await page.locator('input[name="bedYMm"]').fill('210');
  await expect(page.getByTestId('bed-warning')).toBeEmpty();
});

test('says so when the custom bed is not a size it can use', async ({ page }) => {
  await ready(page);
  await choose(page, 'printerBed', 'custom');
  await page.locator('input[name="bedXMm"]').fill('20');
  await expect(page.getByTestId('bed-error')).toContainText('50');
});

// printer-presets (D170 to D172): a button for each maker after the default and "Custom"; a maker shows its
// models, as buttons, each with its bed from the maker's site (docs/printer-beds.md).
test('lists the makers after the default and custom, and a maker its models (D170)', async ({ page }) => {
  await ready(page);
  const beds = page.getByTestId('printer-bed').locator('input[name="printerBed"]');
  await expect(beds).toHaveCount(9);
  expect(await beds.evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value))).toEqual([
    'default',
    'custom',
    'prusa',
    'bambu-lab',
    'creality',
    'anycubic',
    'elegoo',
    'sovol',
    'flashforge',
  ]);
  const models = page.getByTestId('printer-model');
  await expect(models).toBeHidden();
  await page.locator('input[name="widthMm"]').fill('240');
  await page.locator('input[name="heightMm"]').fill('200');
  await expect(page.getByTestId('bed-warning')).toContainText('200 × 200 mm');
  await choose(page, 'printerBed', 'prusa');
  await expect(models).toBeVisible();
  await expect(models.locator('input[name="printerModel"]')).toHaveCount(6);
  await expect(chosen(page, 'printerModel')).toHaveValue('original-prusa-mk4s'); // the first, until one is chosen
  await expect(page.getByTestId('bed-note')).toContainText('250 × 210 mm');
  await expect(page.getByTestId('bed-warning')).toBeEmpty(); // 240 x 200 fits 250 x 210
  await choose(page, 'printerModel', 'original-prusa-mini-plus');
  await expect(page.getByTestId('bed-warning')).toContainText('does not fit the 180 × 180 mm bed');
  await choose(page, 'printerBed', 'default');
  await expect(models).toBeHidden();
});

test("offers the owner's Prusa MK3S+, 250 x 210 mm (D172)", async ({ page }) => {
  await ready(page);
  await choose(page, 'printerBed', 'prusa');
  await choose(page, 'printerModel', 'original-prusa-i3-mk3s-plus');
  await expect(page.getByTestId('printer-model').locator('input:checked + .ws-choice__face')).toHaveText('i3 MK3S+');
  await expect(page.getByTestId('bed-note')).toContainText('250 × 210 mm');
});

test('remembers the printer, or a custom bed, in this browser (D171)', async ({ page, browser }) => {
  await ready(page);
  await choose(page, 'printerBed', 'prusa');
  await choose(page, 'printerModel', 'original-prusa-i3-mk3s-plus');
  await ready(page); // the page again, as on a return
  await expect(chosen(page, 'printerBed')).toHaveValue('prusa');
  await expect(chosen(page, 'printerModel')).toHaveValue('original-prusa-i3-mk3s-plus');
  await choose(page, 'printerBed', 'custom');
  await page.locator('input[name="bedXMm"]').fill('300');
  await page.locator('input[name="bedYMm"]').fill('280');
  await ready(page);
  await expect(chosen(page, 'printerBed')).toHaveValue('custom');
  await expect(page.locator('input[name="bedXMm"]')).toHaveValue('300');
  await expect(page.locator('input[name="bedYMm"]')).toHaveValue('280');
  // control: another browser, its storage empty, starts on the default
  const fresh = await browser.newPage();
  await ready(fresh);
  await expect(chosen(fresh, 'printerBed')).toHaveValue('default');
  await fresh.close();
});

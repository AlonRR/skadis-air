// The files (backlog item download-3mf-zip; D181 to D183): "File: STL / 3MF" beside the download; a wall's print
// list downloads each kind in that format, and "Download all" gives a zip of every kind's STL with the print list,
// or one 3MF holding every kind, each named with how many to print. Every file is read back here.
import { readFileSync } from 'node:fs';
import { expect, test, type Download, type Page } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { choose } from './design-system.js';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

async function saved(download: Download, path: string) {
  await download.saveAs(path);
  return readFileSync(path);
}

/** A 3MF's objects, by name. */
const objectNames = (bytes: Uint8Array) =>
  [...strFromU8(unzipSync(bytes)['3D/3dModel.model'] ?? new Uint8Array()).matchAll(/<object [^>]*name="([^"]*)"/g)].map(
    (m) => m[1],
  );

/** A binary STL's box, across and deep as it lies on the bed, and where it starts, read from the file itself. */
function stlBox(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const [min, max] = [
    [Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity],
  ];
  for (let t = 0; t < view.getUint32(80, true); t++) {
    for (let corner = 0; corner < 9; corner++) {
      const v = view.getFloat32(84 + t * 50 + 12 + corner * 4, true);
      const k = corner % 3;
      min[k] = Math.min(min[k] ?? Infinity, v);
      max[k] = Math.max(max[k] ?? -Infinity, v);
    }
  }
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return {
    from: min.map(round),
    across: round((max[0] ?? 0) - (min[0] ?? 0)),
    deep: round((max[1] ?? 0) - (min[1] ?? 0)),
  };
}

async function wall(page: Page) {
  await ready(page);
  await choose(page, 'typeGroup', 'wall');
  await page.locator('input[name="widthMm"]').fill('440');
  await page.locator('input[name="heightMm"]').fill('280');
  await expect(page.getByTestId('board-status')).toContainText('Wall ready: 6 panels', { timeout: 30_000 });
}

// Found by QA (Q10, 23 Oct 2026): with 3MF chosen the status still read "Board ready: skadis-solid-160x160.stl".
test('names the file in the status as it will download, in the format chosen', async ({ page }) => {
  await ready(page);
  const status = page.getByTestId('board-status');
  await expect(status).toHaveText('Board ready: skadis-solid-160x160.stl');
  await choose(page, 'fileFormat', '3mf'); // after the build
  await expect(status).toHaveText('Board ready: skadis-solid-160x160.3mf');
  await page.locator('input[name="widthMm"]').fill('200'); // and a build made with 3MF chosen
  await expect(status).toHaveText('Board ready: skadis-solid-200x160.3mf');
  await choose(page, 'fileFormat', 'stl');
  await expect(status).toHaveText('Board ready: skadis-solid-200x160.stl');
});

test('downloads one board as 3MF when 3MF is chosen (D181)', async ({ page }, info) => {
  await ready(page);
  await choose(page, 'fileFormat', '3mf');
  const button = page.getByRole('button', { name: 'Download 3MF' });
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  expect(download.suggestedFilename()).toBe('skadis-solid-160x160.3mf');
  const bytes = await saved(download, info.outputPath('board.3mf'));
  expect(objectNames(bytes)).toEqual(['skadis-solid-160x160']);
});

test('downloads all of a wall as a zip of its STLs and its print list (D181, D183)', async ({ page }, info) => {
  test.setTimeout(90_000);
  await wall(page);
  const list = page.getByTestId('print-list');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    list.getByRole('button', { name: 'Download all' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('skadis-solid-440x280-wall.zip');
  const files = unzipSync(await saved(download, info.outputPath('wall.zip')));
  const names = Object.keys(files).sort();
  expect(names.filter((n) => n.endsWith('.stl'))).toHaveLength(6);
  expect(names).toContain('skadis-solid-160x160-closed-left-bottom.stl');
  const printList = strFromU8(files['print-list.txt'] ?? new Uint8Array());
  const rows = await list.getByTestId('print-row').locator('.ws-plan__line').allTextContents();
  for (const row of rows) expect(printList).toContain(row);
});

test('downloads all of a wall as one 3MF, an object for each kind named with its count (D182)', async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  await wall(page);
  await choose(page, 'fileFormat', '3mf');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('print-list').getByRole('button', { name: 'Download all' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('skadis-solid-440x280-wall.3mf');
  const names = objectNames(await saved(download, info.outputPath('wall.3mf')));
  expect(names).toHaveLength(6);
  expect(names).toContain('160 × 160 mm, closed left and bottom, × 1');
});

test('downloads a line of the print list in the format chosen', async ({ page }) => {
  test.setTimeout(90_000);
  await wall(page);
  await choose(page, 'fileFormat', '3mf');
  await page.getByRole('button', { name: 'Show files' }).click(); // folded away (D250 d)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('print-row').first().getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('skadis-solid-160x160-closed-left-bottom.3mf');
});

// Found by QA (Q3, 23 Oct 2026): on an MK4S, 250 x 210 mm, a wall 1000 x 640 mm was cut into panels 200 x 240 mm,
// which fit the bed turned, and each STL came 200 x 240 x 5, which did not fit it as downloaded.
test('gives every panel of a wall in a file that fits the chosen bed as it comes, turned where it must be', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await ready(page);
  await choose(page, 'printerBed', 'prusa'); // its first printer, the MK4S
  await expect(page.getByTestId('bed-note')).toContainText('250 × 210 mm');
  await choose(page, 'typeGroup', 'wall');
  await page.locator('input[name="widthMm"]').fill('1000');
  await page.locator('input[name="heightMm"]').fill('640');
  await expect(page.getByTestId('board-status')).toContainText('Wall ready: 15 panels', { timeout: 90_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('print-list').getByRole('button', { name: 'Download all' }).click(),
  ]);
  const files = unzipSync(await saved(download, info.outputPath('wall.zip')));
  const boxes = Object.entries(files)
    .filter(([name]) => name.endsWith('.stl'))
    .map(([name, bytes]) => ({ name, ...stlBox(bytes) }));
  expect(boxes).toHaveLength(9);
  for (const box of boxes) {
    expect(box.from, box.name).toEqual([0, 0, 0]);
    expect(box.across <= 250 && box.deep <= 210, `${box.name}: ${box.across} x ${box.deep}`).toBe(true);
  }
  // the bottom row's three kinds, 200 mm across and 240 mm up as they hang, are turned to lie 240 x 200
  expect(boxes.filter((b) => b.across === 240 && b.deep === 200)).toHaveLength(3);
});

// The same for one board (Q3): 200 x 240 mm fits the MK4S only turned, so the page warns of nothing, and its file
// now comes turned too.
test('gives one board that fits the bed only turned in a file turned to fit it', async ({ page }, info) => {
  await ready(page);
  await choose(page, 'printerBed', 'prusa');
  await page.locator('input[name="widthMm"]').fill('200');
  await page.locator('input[name="heightMm"]').fill('240');
  await expect(page.getByTestId('board-status')).toHaveText('Board ready: skadis-solid-200x240.stl');
  await expect(page.getByTestId('bed-warning')).toBeEmpty();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download STL' }).click(),
  ]);
  const box = stlBox(await saved(download, info.outputPath('board.stl')));
  expect([box.from, box.across, box.deep]).toEqual([[0, 0, 0], 240, 200]);
});

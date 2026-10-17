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

async function wall(page: Page) {
  await ready(page);
  await choose(page, 'panels', 'split');
  await page.locator('input[name="widthMm"]').fill('440');
  await page.locator('input[name="heightMm"]').fill('280');
  await expect(page.getByTestId('board-status')).toContainText('Wall ready: 6 panels', { timeout: 30_000 });
}

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

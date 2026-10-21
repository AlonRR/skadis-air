// The download (backlog item download-stl; D60): one button under the preview gives the board as a
// binary STL, named as C52 says, lying as it prints. The file is read back and measured here.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
}

/** A binary STL's triangle count and the box round its corners, read from the file itself. */
function readStl(path: string) {
  const bytes = readFileSync(path);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangles = view.getUint32(80, true);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < triangles; t++) {
    for (let corner = 0; corner < 3; corner++) {
      for (let k = 0; k < 3; k++) {
        const v = view.getFloat32(84 + t * 50 + 12 + corner * 12 + k * 4, true);
        min[k] = Math.min(min[k]!, v);
        max[k] = Math.max(max[k]!, v);
      }
    }
  }
  return { size: bytes.length, triangles, header: bytes.subarray(0, 5).toString('latin1'), min, max, view };
}

test('downloads the board as an STL named for its type, size and closed sides', async ({ page }, info) => {
  // The heaviest test here: a 240 x 200 mm board built, written and read back. It takes about 5 s alone;
  // in a full run on a busy machine it once passed Playwright's 30 s limit (12 Oct 2026).
  test.setTimeout(90_000);
  await ready(page);
  await page.locator('input[name="widthMm"]').fill('240');
  await page.locator('input[name="heightMm"]').fill('200');
  await page.locator('[data-side="left"]').click();
  await expect(page.getByTestId('board-status')).toHaveAttribute(
    'data-file-name',
    'skadis-solid-240x200-closed-left.stl',
  );
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download STL' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('skadis-solid-240x200-closed-left.stl');
  const path = info.outputPath('board.stl');
  await download.saveAs(path);
  const stl = readStl(path);
  expect(stl.header).not.toBe('solid'); // a binary STL that some readers would take for text
  expect(stl.size).toBe(84 + 50 * stl.triangles);
  expect(stl.triangles).toBeGreaterThan(1000);
  // lying as it prints: 240 across, 200 up, 5 thick, from the origin
  expect(stl.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 0]);
  expect(stl.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([240, 200, 5]);
  // Face down (D66): the side closed on the left as it hangs is at the far x, seen from above the bed,
  // so no corner of the file lies just inside it; the open right's half slots are at x = 0.
  const near = (from: number, to: number) => {
    let count = 0;
    for (let t = 0; t < stl.triangles; t++) {
      for (let corner = 0; corner < 3; corner++) {
        const x = stl.view.getFloat32(84 + t * 50 + 12 + corner * 12, true);
        if (x > from && x < to) count++;
      }
    }
    return count;
  };
  expect(near(0.01, 3.7)).toBeGreaterThan(0); // the open side's notches, chamfers included
  // the closed side: a plain edge but for its 1 mm chamfers, front and back (D276), whose corners lie 1 mm in
  expect(near(240 - 3.7, 240 - 1.01)).toBe(0);
  expect(near(240 - 1.01, 240 - 0.99)).toBeGreaterThan(0);
});

test('offers no download while the settings cannot make a board (the control)', async ({ page }) => {
  await ready(page);
  const button = page.getByRole('button', { name: 'Download STL' });
  await expect(button).toBeEnabled();
  await page.locator('input[name="widthMm"]').fill('250');
  await expect(button).toBeDisabled();
  await page.locator('input[name="widthMm"]').fill('160');
  await expect(button).toBeEnabled();
});

// The 3D preview in a real browser (backlog item preview-3d; D55 to D57), after parametric-window-
// sealer's web/e2e/preview.spec.ts (C32). Pixels are counted on the drawn canvas: a preview that only
// claims to be ready while drawing nothing must fail, and the "bad value" test is the control that
// shows an empty preview counts as empty.
import { expect, test, type Page } from '@playwright/test';

const preview = (page: Page) => page.getByTestId('preview');

// The share of the canvas that is not background (#f4f4f4), and the box round what is drawn.
const drawn = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="preview"] canvas');
    if (!canvas) return { share: -1, width: 0, height: 0 };
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d');
    if (!ctx) return { share: -1, width: 0, height: 0 };
    ctx.drawImage(canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, copy.width, copy.height);
    let count = 0;
    let [minX, minY, maxX, maxY] = [copy.width, copy.height, -1, -1];
    for (let i = 0; i < data.length; i += 4) {
      const off = Math.abs(data[i]! - 244) + Math.abs(data[i + 1]! - 244) + Math.abs(data[i + 2]! - 244);
      if (off <= 24) continue;
      count += 1;
      const p = i / 4;
      const [x, y] = [p % copy.width, Math.floor(p / copy.width)];
      [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)];
    }
    return { share: count / (data.length / 4), width: maxX - minX + 1, height: maxY - minY + 1 };
  });

const signature = (page: Page) =>
  page.evaluate(() => document.querySelector<HTMLCanvasElement>('[data-testid="preview"] canvas')?.toDataURL() ?? '');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(preview(page)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
});

test('draws the board', async ({ page }) => {
  expect(Number(await preview(page).getAttribute('data-triangles'))).toBeGreaterThan(100);
  expect((await drawn(page)).share).toBeGreaterThan(0.05);
});

// Face on, the drawn shape has the board's own proportions (measured 12 Oct 2026: 4.55 for 400 x 80,
// 0.214 for 80 x 400); lying flat, seen edge on, either board would be a thin horizontal sliver, so
// each is bounded on both sides. Its control: the board drawn lying flat fails this test.
test('shows the board as it hangs, upright and face on (D55): drawn in its own proportions', async ({ page }) => {
  for (const [width, height, low, high] of [
    ['400', '80', 3.5, 6],
    ['80', '400', 0.16, 0.28],
  ] as const) {
    await page.locator('input[name="widthMm"]').fill(width);
    await page.locator('input[name="heightMm"]').fill(height);
    await expect(page.getByTestId('board-status')).toHaveAttribute(
      'data-file-name',
      `skadis-solid-${width}x${height}.stl`,
    );
    await expect(preview(page)).toHaveAttribute('data-state', 'ready');
    const box = await drawn(page);
    expect(box.width / box.height).toBeGreaterThan(low);
    expect(box.width / box.height).toBeLessThan(high);
  }
});

test('follows the form: a larger board has more triangles', async ({ page }) => {
  const before = Number(await preview(page).getAttribute('data-triangles'));
  await page.locator('input[name="widthMm"]').fill('320');
  await expect(page.getByTestId('board-status')).toHaveAttribute('data-file-name', 'skadis-solid-320x160.stl');
  await expect.poll(async () => Number(await preview(page).getAttribute('data-triangles'))).toBeGreaterThan(before);
});

test('a bad value empties the preview and says why (the control for the pixel count)', async ({ page }) => {
  await page.locator('input[name="widthMm"]').fill('250');
  await expect(preview(page)).toHaveAttribute('data-state', 'waiting');
  await expect(page.getByTestId('preview-message')).toContainText('see the preview');
  expect((await drawn(page)).share).toBeLessThan(0.001);
  await page.locator('input[name="widthMm"]').fill('160');
  await expect(preview(page)).toHaveAttribute('data-state', 'ready');
  expect((await drawn(page)).share).toBeGreaterThan(0.05);
});

test('redrawing frees the old board: graphics memory holds only the current one', async ({ page }) => {
  const width = page.locator('input[name="widthMm"]');
  for (const value of ['200', '240', '120', '160']) {
    await width.fill(value);
    await expect(page.getByTestId('board-status')).toHaveAttribute('data-file-name', `skadis-solid-${value}x160.stl`);
    await expect(preview(page)).toHaveAttribute('data-state', 'ready');
  }
  await expect(preview(page)).toHaveAttribute('data-geometries', '2'); // the board and its outline
});

test('turns when dragged, and "Reset view" brings back the first view (D57)', async ({ page }) => {
  const canvas = preview(page).locator('canvas');
  await canvas.scrollIntoViewIfNeeded(); // the mouse acts on what is on screen
  const before = await signature(page);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => signature(page)).not.toBe(before);
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect.poll(() => signature(page)).toBe(before);
});

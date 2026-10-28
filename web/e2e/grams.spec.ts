// D313: the page gives a board's plastic in printed grams, for the 200 x 200 mm sample, from docs/board-grams.json, and
// never as a share of the solid board's.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { choose } from './design-system.js';

const grams = JSON.parse(readFileSync(new URL('../../docs/board-grams.json', import.meta.url), 'utf8')) as {
  gramsByBoard: Record<string, number>;
};
const g = (key: string) => `${Math.round(grams.gramsByBoard[key] ?? 0)} g`;

test('the page gives the sample board in grams for the board and look chosen, and no percentage', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('./');
  const status = page.getByTestId('board-status');
  const line = page.getByTestId('board-grams');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(line).toContainText(g('solid'));
  await expect(line).toContainText('200 × 200 mm');
  await choose(page, 'boardType', 'lightened');
  await expect(line).toContainText(g('lightened-curved'));
  await choose(page, 'look', 'straight');
  await expect(line).toContainText(g('lightened-straight'));
  await choose(page, 'boardType', 'skeleton');
  await expect(line).toContainText(g('skeleton-straight'));
  expect(await line.textContent()).not.toContain('%');
  await choose(page, 'typeGroup', 'connector');
  await expect(line).toBeHidden();
});

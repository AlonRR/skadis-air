// D313: a board's plastic is given in printed grams, from docs/board-grams.json (made by
// scripts/checks/write-board-grams.mjs), never as a share of the solid board's volume. The page's line is built from
// that file, and the README and the Printables text carry its figures, so this fails when one is typed or left stale.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import grams from '../../docs/board-grams.json';
import { gramsFor, gramsLine } from '../src/grams.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\s+/g, ' ');
const whole = (n: number) => `${Math.round(n)} g`;

describe('the printed grams file', () => {
  it('names its sample and its filament, and holds a figure for every board and look', () => {
    expect(grams.sample).toContain('200 x 200 mm');
    expect(grams.filament).toContain('PETG');
    expect(Object.keys(grams.gramsByBoard).sort()).toEqual([
      'lightened-curved',
      'lightened-straight',
      'skeleton-curved',
      'skeleton-straight',
      'solid',
    ]);
    for (const g of Object.values(grams.gramsByBoard)) expect(g).toBeGreaterThan(10);
  });
});

describe('the page line', () => {
  it('gives the grams of the sample, for the look chosen, and names the sample', () => {
    expect(gramsFor('lightened', { look: 'straight' })).toBe(grams.gramsByBoard['lightened-straight']);
    expect(gramsFor('skeleton', { look: 'curved' })).toBe(grams.gramsByBoard['skeleton-curved']);
    expect(gramsFor('solid', {})).toBe(grams.gramsByBoard.solid);
    const line = gramsLine('lightened', { look: 'curved' });
    expect(line).toContain(whole(grams.gramsByBoard['lightened-curved']));
    expect(line).toContain('200 × 200 mm');
    expect(line).toContain('PETG');
    expect(line).not.toContain('%');
  });

  it('says nothing for a connector or a test print', () => {
    expect(gramsLine('standoff', {})).toBe('');
    expect(gramsLine('fit-coupon', {})).toBe('');
  });
});

describe('the README and the Printables text', () => {
  it.each(['../../README.md', '../../docs/printables.md'])('%s gives each board in grams and no share', (path) => {
    const text = read(path);
    for (const key of ['solid', 'lightened-curved', 'skeleton-curved'] as const) {
      expect(text, key).toContain(whole(grams.gramsByBoard[key]));
    }
    expect(text).not.toMatch(/about (40|32) %/);
    expect(text).not.toMatch(/of the (solid board's )?plastic/);
  });
});

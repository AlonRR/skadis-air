// The printer bed a board must fit (backlog item printer-default; D61, D62).
import { describe, expect, it } from 'vitest';
import { DEFAULT_BED, fitsBed } from '../src/printer.js';

describe('the default bed', () => {
  it('is 200 x 200 mm (D61)', () => {
    expect(DEFAULT_BED).toEqual({ xMm: 200, yMm: 200 });
  });
});

describe('fitsBed', () => {
  it('takes a board that fits, edge to edge included', () => {
    expect(fitsBed(160, 160, DEFAULT_BED)).toBe(true);
    expect(fitsBed(200, 200, DEFAULT_BED)).toBe(true);
  });

  it('turns the board on the bed when that is what makes it fit', () => {
    const bed = { xMm: 250, yMm: 210 };
    expect(fitsBed(200, 240, bed)).toBe(true); // 240 along the bed's 250, 200 along its 210
    expect(fitsBed(240, 200, bed)).toBe(true);
  });

  it('discriminates: a board larger than the bed either way round does not fit', () => {
    expect(fitsBed(240, 200, DEFAULT_BED)).toBe(false);
    expect(fitsBed(400, 40, { xMm: 250, yMm: 210 })).toBe(false);
  });

  it('refuses a bed that is not a size', () => {
    expect(() => fitsBed(40, 40, { xMm: 0, yMm: 200 })).toThrow(RangeError);
    expect(() => fitsBed(40, 40, { xMm: Number.NaN, yMm: 200 })).toThrow(RangeError);
  });
});

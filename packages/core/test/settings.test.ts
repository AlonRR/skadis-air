// The settings a board type declares, read from what the page or a caller hands in (backlog item
// registry). The settings here are declared in this file alone: the reader must not know any board.
import { describe, expect, it } from 'vitest';
import { defineSettings, defaultValues, readValues } from '../src/settings.js';

const SETTINGS = defineSettings([
  {
    kind: 'number',
    key: 'widthMm',
    label: 'Width',
    unit: 'mm',
    default: 80,
    min: 40,
    max: 400,
    step: 40,
    onStep: true,
  },
  {
    kind: 'number',
    key: 'thicknessMm',
    label: 'Thickness',
    unit: 'mm',
    default: 5,
    min: 2.5,
    max: 10,
    step: 0.1,
    warnOutside: [4, 5.5],
  },
  {
    kind: 'sides',
    key: 'sides',
    label: 'Sides',
    default: { left: 'open', right: 'open', bottom: 'open', top: 'open' },
  },
  {
    kind: 'choice',
    key: 'head',
    label: 'Screw head',
    options: [
      { value: 'countersunk', label: 'Countersunk' },
      { value: 'round', label: 'Round head' },
    ],
    default: 'countersunk',
  },
]);

describe('defaultValues', () => {
  it('is every setting at its starting value', () => {
    expect(defaultValues(SETTINGS)).toEqual({
      widthMm: 80,
      thicknessMm: 5,
      sides: { left: 'open', right: 'open', bottom: 'open', top: 'open' },
      head: 'countersunk',
    });
  });
});

describe('readValues', () => {
  it('reads numbers given as text, as a form hands them over', () => {
    const read = readValues(SETTINGS, { widthMm: '240', thicknessMm: '4.5', sides: { left: 'closed' } });
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.values).toEqual({
        widthMm: 240,
        thicknessMm: 4.5,
        sides: { left: 'closed', right: 'open', bottom: 'open', top: 'open' },
        head: 'countersunk',
      });
    }
  });

  it('fills what is not given with the starting value', () => {
    const read = readValues(SETTINGS, {});
    expect(read.ok && read.values).toEqual(defaultValues(SETTINGS));
  });

  it('refuses a number outside its range, or off its steps where it must be on them, saying which', () => {
    const read = readValues(SETTINGS, { widthMm: '50', thicknessMm: '12' });
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.errors.map((e) => e.key).sort()).toEqual(['thicknessMm', 'widthMm']);
      expect(read.errors.find((e) => e.key === 'widthMm')?.message).toContain('40 mm steps');
      expect(read.errors.find((e) => e.key === 'thicknessMm')?.message).toContain('10');
    }
  });

  it('takes a number as large as given where its setting has no upper limit, and says so when too small (D196)', () => {
    const open = defineSettings([
      { kind: 'number', key: 'lengthMm', label: 'Length', unit: 'mm', default: 40, min: 40, step: 40, onStep: true },
    ]);
    const long = readValues(open, { lengthMm: '400000' });
    expect(long.ok && long.values.lengthMm).toBe(400_000);
    const short = readValues(open, { lengthMm: '0' });
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.errors[0]?.message).toBe('Length must be at least 40 mm');
  });

  it('refuses text that is not a number', () => {
    const read = readValues(SETTINGS, { widthMm: 'wide' });
    expect(read.ok).toBe(false);
  });

  it('warns, without refusing, outside the range a setting warns about', () => {
    const read = readValues(SETTINGS, { thicknessMm: '6' });
    expect(read.ok).toBe(true);
    expect(read.warnings.map((w) => w.key)).toEqual(['thicknessMm']);
    expect(readValues(SETTINGS, { thicknessMm: '5' }).warnings).toEqual([]);
  });

  it('refuses a side that is neither open nor closed', () => {
    const read = readValues(SETTINGS, { sides: { left: 'ajar' } });
    expect(read.ok).toBe(false);
  });

  it('reads a choice by its value, and an empty one as the starting value', () => {
    const read = readValues(SETTINGS, { head: 'round' });
    expect(read.ok && read.values.head).toBe('round');
    // typed from the declaration: only the values it lists
    const head: 'countersunk' | 'round' | undefined = read.ok ? read.values.head : undefined;
    expect(head).toBe('round');
    expect(readValues(SETTINGS, { head: '' }).ok && readValues(SETTINGS, { head: '' })).toMatchObject({
      values: { head: 'countersunk' },
    });
  });

  it('refuses a choice it does not list, saying which setting', () => {
    const read = readValues(SETTINGS, { head: 'hex' });
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.errors.map((e) => e.key)).toEqual(['head']);
      expect(read.errors[0]?.message).toContain('Countersunk');
    }
  });
});

// The settings a board type declares, read from what the page or a caller hands in (backlog item
// registry). The settings here are declared in this file alone: the reader must not know any board.
import { describe, expect, it } from 'vitest';
import {
  defineSettings,
  defaultValues,
  optionsOff,
  readTypedNumber,
  readValues,
  settingsNotApplying,
} from '../src/settings.js';

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

  it('reads a comma as a decimal point, as some keyboards write one (the design system, v0.4.0)', () => {
    const read = readValues(SETTINGS, { thicknessMm: '4,5' });
    expect(read.ok && read.values.thicknessMm).toBe(4.5);
  });

  it('refuses a comma before three digits, which could be a thousands separator, saying so (D222)', () => {
    // "40,000" had been read as 40: a 40 m wall quietly made a 40 mm board
    const read = readValues(SETTINGS, { widthMm: '40,000' });
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.errors[0]?.message).toContain('unclear');
    expect(readTypedNumber('1,500')).toEqual({ ok: false, why: 'unclear' });
    // a comma that cannot be a thousands separator is a decimal point
    expect(readTypedNumber('0,300')).toEqual({ ok: true, value: 0.3 });
    expect(readTypedNumber(' 2,5 ')).toEqual({ ok: true, value: 2.5 });
    expect(readTypedNumber('12345,678')).toEqual({ ok: true, value: 12345.678 });
    expect(readTypedNumber('-1,5')).toEqual({ ok: true, value: -1.5 });
    // and what is no number is not one
    for (const text of ['1,000,000', '1,5,5', 'wide', '', '1e', '4,5mm']) {
      expect(readTypedNumber(text)).toEqual({ ok: false, why: 'not a number' });
    }
  });

  it('refuses text that is not a number', () => {
    const read = readValues(SETTINGS, { widthMm: 'wide' });
    expect(read.ok).toBe(false);
  });

  // Found by QA (Q5, 23 Oct 2026): a Width field cleared was read as its starting value, so a 160 mm board was made
  // while the field stood empty and nothing said so. Only a setting not given at all takes its starting value.
  it('refuses a number field left empty, as it refuses text that is not a number, saying which', () => {
    for (const empty of ['', '   ']) {
      const read = readValues(SETTINGS, { widthMm: empty });
      expect(read.ok).toBe(false);
      if (!read.ok) expect(read.errors).toEqual([{ key: 'widthMm', message: 'Width must be a number' }]);
    }
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

// A setting that applies only with another choice (D372): greyed out on the page and not checked while it does not
// apply, so a value left in it blocks nothing, and the build is handed its starting value. Declared here alone.
describe('a setting that applies only with another choice (D372)', () => {
  const GATED = defineSettings([
    {
      kind: 'choice',
      key: 'head',
      label: 'Screw head',
      options: [
        { value: 'countersunk', label: 'Countersunk' },
        { value: 'lock', label: 'Lock screws' },
      ],
      default: 'countersunk',
    },
    {
      kind: 'choice',
      key: 'extra',
      label: 'Extra',
      options: [
        { value: 'none', label: 'None' },
        { value: 'more', label: 'More' },
      ],
      default: 'none',
      appliesWhen: (v) => v['head'] === 'lock',
    },
    {
      kind: 'number',
      key: 'sizeMm',
      label: 'Size',
      unit: 'mm',
      default: 2.5,
      min: 2,
      max: 5,
      step: 0.5,
      warnOutside: [2, 3],
      appliesWhen: (v) => v['head'] === 'lock' && v['extra'] === 'more',
    },
  ]);

  it('is not checked while it does not apply, nor warned about, and reads as its starting value', () => {
    expect(readValues(GATED, { head: 'countersunk', sizeMm: '99' })).toEqual({
      ok: true,
      values: { head: 'countersunk', extra: 'none', sizeMm: 2.5 },
      warnings: [],
    });
    expect(readValues(GATED, { head: 'countersunk', sizeMm: '4' })).toEqual({
      ok: true,
      values: { head: 'countersunk', extra: 'none', sizeMm: 2.5 },
      warnings: [],
    });
    expect(readValues(GATED, { head: 'lock', sizeMm: 'not a number' }).ok).toBe(true);
  });

  it('is checked while it applies, and read as given', () => {
    const refused = readValues(GATED, { head: 'lock', extra: 'more', sizeMm: '99' });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.errors.map((e) => e.key)).toEqual(['sizeMm']);
    const warned = readValues(GATED, { head: 'lock', extra: 'more', sizeMm: '4' });
    expect(warned).toMatchObject({ ok: true, values: { sizeMm: 4 } });
    expect(warned.warnings.map((w) => w.key)).toEqual(['sizeMm']);
  });

  it('follows a chain: one that does not apply is read at its starting value, which those that hang on it see', () => {
    expect(readValues(GATED, { head: 'countersunk', extra: 'more', sizeMm: '99' })).toEqual({
      ok: true,
      values: { head: 'countersunk', extra: 'none', sizeMm: 2.5 },
      warnings: [],
    });
  });

  it('says which settings do not apply to what is given, for the form, whatever else is refused', () => {
    expect(settingsNotApplying(GATED, { head: 'countersunk' })).toEqual(['extra', 'sizeMm']);
    expect(settingsNotApplying(GATED, { head: 'lock' })).toEqual(['sizeMm']);
    expect(settingsNotApplying(GATED, { head: 'lock', extra: 'more', sizeMm: 'abc' })).toEqual([]);
    expect(settingsNotApplying(SETTINGS, { widthMm: 'abc' })).toEqual([]);
  });
});

describe('an option that another choice rules out (D589)', () => {
  const RULED = defineSettings([
    {
      kind: 'choice',
      key: 'head',
      label: 'Screw head',
      options: [
        { value: 'countersunk', label: 'Countersunk' },
        { value: 'keyhole', label: 'Keyholes' },
      ],
      default: 'countersunk',
    },
    {
      kind: 'choice',
      key: 'feet',
      label: 'Feet',
      options: [
        { value: 'none', label: 'None', offWhen: (v) => (v['head'] === 'keyhole' ? 'Keyholes need feet.' : undefined) },
        { value: 'back', label: 'On the back' },
      ],
      default: 'none',
    },
  ]);

  it('reads an option ruled out as the first one left, with no error', () => {
    const read = readValues(RULED, { head: 'keyhole', feet: 'none' });
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.values.feet).toBe('back');
  });

  it('keeps the option where nothing rules it out', () => {
    const read = readValues(RULED, { head: 'countersunk', feet: 'none' });
    expect(read.ok && read.values.feet).toBe('none');
  });

  it('says which options are ruled out and why, for the page to grey them out', () => {
    expect(optionsOff(RULED, { head: 'keyhole' })).toEqual({ feet: { none: 'Keyholes need feet.' } });
    expect(optionsOff(RULED, { head: 'countersunk' })).toEqual({});
  });
});

describe('a starting value that hangs on another choice (D603 b)', () => {
  const STARTS = defineSettings([
    {
      kind: 'choice',
      key: 'feet',
      label: 'Feet',
      options: [
        { value: 'back', label: 'On the back' },
        { value: 'tape', label: 'For tape' },
      ],
      default: 'back',
    },
    {
      kind: 'number',
      key: 'tallMm',
      label: 'Feet height',
      unit: 'mm',
      default: 15,
      startsAt: (v) => (v['feet'] === 'tape' ? 18 : 15),
      min: 3,
      step: 0.5,
    },
  ]);

  it('reads a value not given as what the others start it at', () => {
    const tall = (given: Record<string, unknown>) => {
      const read = readValues(STARTS, given);
      return read.ok && read.values.tallMm;
    };
    expect(tall({ feet: 'tape' })).toBe(18);
    expect(tall({ feet: 'back' })).toBe(15);
    expect(tall({})).toBe(15);
  });

  it('keeps a value given, whatever the others start it at', () => {
    const read = readValues(STARTS, { feet: 'tape', tallMm: '16' });
    expect(read.ok && read.values.tallMm).toBe(16);
  });
});

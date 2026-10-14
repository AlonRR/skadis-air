// The board types (backlog item registry; D11): every listed type is held to the same contract,
// and a type declared in this file alone goes through the same generic calls, which proves the
// generic code names no board (the extension-registry practice).
import type { Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import {
  BOARD_TYPES,
  boardFileName,
  boardType,
  buildBoard,
  defineBoardType,
  type AnyBoardType,
} from '../src/board-types/index.js';
import { loadEngine } from '../src/engine.js';
import { defaultValues, defineSettings, readValues } from '../src/settings.js';

const engine = await loadEngine();
const made: Manifold[] = [];
afterAll(() => {
  for (const m of made) m.delete();
});

// A board type that exists only here: a plain plate, its width its one setting.
const TEST_PLATE = defineBoardType({
  id: 'test-plate',
  name: 'Test plate',
  settings: defineSettings([
    {
      kind: 'number',
      key: 'widthMm',
      label: 'Width',
      unit: 'mm',
      default: 40,
      min: 40,
      max: 80,
      step: 40,
      onStep: true,
    },
  ]),
  build: (e, v) => e.Manifold.cube([v.widthMm, 40, 2]),
  label: (v) => `${v.widthMm}x40`,
});

function contract(type: AnyBoardType) {
  it('has an id of lower-case words and a name', () => {
    expect(type.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    expect(type.name.length).toBeGreaterThan(0);
  });

  it('declares each setting once, every starting value inside its own range', () => {
    const keys = type.settings.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of type.settings) {
      if (s.kind === 'number') {
        expect(s.default).toBeGreaterThanOrEqual(s.min);
        expect(s.default).toBeLessThanOrEqual(s.max);
      } else if (s.kind === 'choice') {
        const values = s.options.map((o) => o.value);
        expect(new Set(values).size).toBe(values.length);
        expect(values).toContain(s.default);
      }
    }
  });

  it('accepts its own starting values', () => {
    const read = readValues(type.settings, {});
    expect(read.ok).toBe(true);
    expect(read.ok && read.values).toEqual(defaultValues(type.settings));
  });

  it('builds a solid from its starting values', () => {
    const built = buildBoard(engine, type, defaultValues(type.settings));
    expect(built.ok).toBe(true);
    if (built.ok) {
      made.push(built.solid);
      expect(built.solid.isEmpty()).toBe(false);
      expect(built.solid.volume()).toBeGreaterThan(0);
    }
  });

  it('names its file after its id and its starting values', () => {
    const name = boardFileName(type, defaultValues(type.settings), 'stl');
    expect(name).toMatch(new RegExp(`^skadis-${type.id}-.+\\.stl$`));
  });
}

describe('every listed board type', () => {
  it('has a unique id', () => {
    const ids = BOARD_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  for (const type of BOARD_TYPES) {
    describe(`board type ${type.id}`, () => {
      contract(type);
    });
  }
});

describe('a board type declared only in this test', () => {
  contract(TEST_PLATE);

  it('is not in the list, and still builds through the generic calls', () => {
    expect(BOARD_TYPES.map((t) => t.id)).not.toContain('test-plate');
    const built = buildBoard(engine, TEST_PLATE, { widthMm: 80 });
    expect(built.ok && built.solid.boundingBox().max[0]).toBe(80);
    if (built.ok) made.push(built.solid);
  });
});

describe('the solid board type', () => {
  const solid = boardType('solid');

  it('is the first in the list, so the page opens on it', () => {
    expect(BOARD_TYPES[0]?.id).toBe('solid');
  });

  it('takes its size in mm, in 40 mm steps (D45, D15)', () => {
    const read = readValues(solid.settings, { widthMm: '240', heightMm: '200' });
    expect(read.ok).toBe(true);
    const off = readValues(solid.settings, { widthMm: '250' });
    expect(off.ok).toBe(false);
  });

  it('builds the board its values describe', () => {
    const read = readValues(solid.settings, { widthMm: '120', heightMm: '80', thicknessMm: '4.5' });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const built = buildBoard(engine, solid, read.values);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    made.push(built.solid);
    const box = built.solid.boundingBox();
    expect(box.max[0]).toBeCloseTo(120, 9);
    expect(box.max[1]).toBeCloseTo(80, 9);
    expect(box.max[2]).toBeCloseTo(4.5, 9);
    expect(built.solid.genus()).toBe(3 * 2 + 2 * 1 + 4); // its whole slots, and a screw hole at each corner (D73)
  });

  it('takes the mounting: countersunk holes unless set, a round head or none, and standoffs as an option (D73 to D75)', () => {
    const v = defaultValues(solid.settings);
    expect([v.screwHead, v.screwMm, v.standoffs, v.standoffHeightMm]).toEqual(['countersunk', 4, 'none', 20]);
    const genus = (values: typeof v) => {
      const built = buildBoard(engine, solid, values);
      if (!built.ok) throw new Error(built.problem);
      made.push(built.solid);
      return built.solid.genus();
    };
    const slots = genus({ ...v, screwHead: 'none' });
    expect(genus(v)).toBe(slots + 4);
    expect(genus({ ...v, screwHead: 'round' })).toBe(slots + 4);
    const built = buildBoard(engine, solid, { ...v, standoffs: 'back' });
    expect(built.ok && built.solid.boundingBox().min[2]).toBeCloseTo(-20, 9);
    if (built.ok) made.push(built.solid);
  });

  it('says a countersink too deep for a thin board is a problem, and suggests a round head', () => {
    const v = defaultValues(solid.settings);
    const built = buildBoard(engine, solid, { ...v, thicknessMm: 3 });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.problem).toContain('round head');
    const round = buildBoard(engine, solid, { ...v, thicknessMm: 3, screwHead: 'round' });
    expect(round.ok).toBe(true);
    if (round.ok) made.push(round.solid);
  });

  it('puts the fine settings under Advanced, and the size, thickness and sides on the main form (D48)', () => {
    const advanced = solid.settings.filter((s) => s.advanced).map((s) => s.key);
    expect(advanced.sort()).toEqual([
      'cornerRadiusMm',
      'screwMm',
      'slotChamferMm',
      'slotClearanceMm',
      'standoffHeightMm',
    ]);
  });

  it('warns about a thickness outside 4 to 5.5 mm, the range IKEA hooks accept (C43)', () => {
    expect(readValues(solid.settings, { thicknessMm: '6' }).warnings.map((w) => w.key)).toEqual(['thicknessMm']);
  });

  it('reports a combination it cannot make as a problem, not a crash', () => {
    const read = readValues(solid.settings, { thicknessMm: '2.5', slotChamferMm: '1.5' });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const built = buildBoard(engine, solid, read.values);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.problem).toContain('thicker');
  });

  it('names its file with its size, and the sides that are closed', () => {
    const v = defaultValues(solid.settings);
    expect(boardFileName(solid, { ...v, widthMm: 240, heightMm: 200 }, 'stl')).toBe('skadis-solid-240x200.stl');
    const closed = { ...v, sides: { left: 'closed', right: 'open', bottom: 'closed', top: 'open' } as const };
    expect(boardFileName(solid, closed, 'stl')).toBe('skadis-solid-160x160-closed-left-bottom.stl');
  });

  it('adds to the name only the mounting that differs from the starting one (C85)', () => {
    const v = defaultValues(solid.settings);
    const name = (given: Record<string, string | number>) => boardFileName(solid, { ...v, ...given }, 'stl');
    expect(name({ screwHead: 'round', standoffs: 'back' })).toBe('skadis-solid-160x160-round-head-standoffs-20mm.stl');
    expect(name({ screwHead: 'none', screwMm: 3.5 })).toBe('skadis-solid-160x160-no-holes.stl');
    expect(name({ screwMm: 3.5, standoffHeightMm: 25 })).toBe('skadis-solid-160x160-screw-3.5mm.stl');
  });
});

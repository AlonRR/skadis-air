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
  groupOf,
  LIGHTENED,
  SKELETON,
  printedPart,
  SOLID,
  type AnyBoardType,
} from '../src/board-types/index.js';
import { loadEngine } from '../src/engine.js';
import { defaultValues, defineSettings, readValues, type Setting, settingsNotApplying } from '../src/settings.js';
import { skeletonParams } from '../src/skeleton.js';

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
        if (s.max !== undefined) expect(s.default).toBeLessThanOrEqual(s.max);
      } else if (s.kind === 'choice') {
        const values = s.options.map((o) => o.value);
        expect(new Set(values).size).toBe(values.length);
        expect(values).toContain(s.default);
      }
    }
  });

  it('says of a setting that applies only with another choice whether it does, at its starting values (D372)', () => {
    for (const s of type.settings) {
      if (s.appliesWhen !== undefined) expect(typeof s.appliesWhen(defaultValues(type.settings))).toBe('boolean');
    }
    expect(settingsNotApplying(type.settings, {}).every((key) => type.settings.some((s) => s.key === key))).toBe(true);
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

  it('makes as many separate parts as it declares, one unless it says more (C107)', () => {
    const built = buildBoard(engine, type, defaultValues(type.settings));
    if (!built.ok) throw new Error(built.problem);
    const parts = built.solid.decompose();
    made.push(built.solid, ...parts);
    expect(parts).toHaveLength(type.parts ?? 1);
  });

  it('goes to the printer on the bed, from the origin', () => {
    const built = buildBoard(engine, type, defaultValues(type.settings));
    if (!built.ok) throw new Error(built.problem);
    const printed = printedPart(type, built.solid);
    made.push(built.solid, printed);
    expect(printed.boundingBox().min.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, 0]);
  });

  it('is in the group of boards or of connectors (D91)', () => {
    expect(['board', 'connector']).toContain(groupOf(type));
  });

  it("is a test print only in the group of boards, under whose forms' Advanced the page offers it (D357)", () => {
    // a test print is a board; any other type may be in either group
    expect(type.testPrint === true ? groupOf(type) : 'board').toBe('board');
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

  it('keeps each group together, the boards before the connectors, so the page lists them in order (D91)', () => {
    const groups = BOARD_TYPES.map(groupOf);
    expect(groups).toEqual([...groups].sort((a, b) => (a === b ? 0 : a === 'board' ? -1 : 1)));
    expect(groups).toContain('connector');
  });

  it('marks as test prints the fit coupon and the seam-test pair, and nothing else, both boards (D357)', () => {
    const tests = BOARD_TYPES.filter((t) => t.testPrint === true);
    expect(tests.map((t) => t.id)).toEqual(['fit-coupon', 'seam-test']);
    expect(tests.map(groupOf)).toEqual(['board', 'board']);
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

  it('takes a wall up to a kilometre each way, refusing a size past it as a slip of the keys (D196, D223)', () => {
    const size = solid.settings.filter((s) => s.key === 'widthMm' || s.key === 'heightMm');
    expect(size.map((s) => s.kind === 'number' && s.max)).toEqual([1_000_000, 1_000_000]);
    const read = readValues(solid.settings, { widthMm: '1000000', heightMm: '3000', panels: 'split' });
    expect(read.ok).toBe(true);
    const past = readValues(solid.settings, { widthMm: '1000040', heightMm: '3000', panels: 'split' });
    expect(past.ok).toBe(false);
    // one board is still at most 400 mm a side (C51): the panel size keeps its limit
    const panel = solid.settings.find((s) => s.key === 'panelWidthMm');
    expect(panel?.kind === 'number' && panel.max).toBe(400);
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
    expect([v.screwHead, v.screwMm, v.standoffs, v.standoffHeightMm]).toEqual(['countersunk', 4, 'none', 15]); // D238
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
    expect(built.ok && built.solid.boundingBox().min[2]).toBeCloseTo(-15, 9); // the starting standoff height (D238)
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

  it('puts the fine settings under Advanced, and the size, thickness, sides and screw size on the main form (D48, D479)', () => {
    const advanced = solid.settings.filter((s) => s.advanced).map((s) => s.key);
    expect(advanced.sort()).toEqual([
      'cornerRadiusMm',
      'keyholeScrewMm', // D479
      'keyholeScrewSize',
      'lockScrewMm', // A248
      'lockScrewSize', // D479
      'lockScrews',
      'panelHeightMm',
      'panelWidthMm',
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

  // Found by QA (Q13, 23 Oct 2026): a problem that belongs to one setting showed only on the status line, no field
  // marked. Each such problem names its settings by key, so the page marks them as it marks a value it refuses.
  it('names the settings to change for a combination it cannot make', () => {
    const problem = (type: AnyBoardType, given: Record<string, string>) => {
      const read = readValues(type.settings, given);
      if (!read.ok) throw new Error(read.errors.map((e) => e.message).join('; '));
      const built = buildBoard(engine, type, read.values);
      if (built.ok) made.push(built.solid);
      return built.ok ? 'built' : { problem: built.problem, keys: built.keys };
    };
    const cases: [AnyBoardType, Record<string, string>, string, string[]][] = [
      [SKELETON, { rimMm: '2', coreMm: '2.5' }, 'The core cannot be wider than the rim', ['coreMm']],
      [SOLID, { thicknessMm: '3' }, 'A countersunk 4 mm screw needs a board at least 3.25 mm thick', ['thicknessMm']],
      [SOLID, { widthMm: '440' }, 'One board is at most 400 mm a side', ['widthMm']],
      [SOLID, { widthMm: '440', heightMm: '480' }, 'One board is at most 400 mm a side', ['widthMm', 'heightMm']],
      [SOLID, { heightMm: '440' }, 'One board is at most 400 mm a side', ['heightMm']],
      [
        SOLID,
        { screwHead: 'keyhole', standoffs: 'back', standoffHeightMm: '10' },
        'choose standoffs at least 13.23 mm tall',
        ['standoffHeightMm'],
      ],
      [
        LIGHTENED,
        { screwHead: 'lock', standoffs: 'back', standoffHeightMm: '10' },
        'choose standoffs at least',
        ['standoffHeightMm'],
      ],
      [
        SOLID,
        { thicknessMm: '2.5', slotChamferMm: '1.5', screwHead: 'round' },
        'The board must be thicker than its two slot chamfers together',
        ['slotChamferMm'],
      ],
    ];
    for (const [type, given, words, keys] of cases) {
      expect(problem(type, given)).toEqual({ problem: expect.stringContaining(words), keys });
    }
    // the control: a problem of no one setting names none
    const meet = problem(SOLID, { screwHead: 'keyhole', standoffs: 'back', widthMm: '40' });
    expect(meet).toEqual({ problem: expect.stringContaining('need a board at least 80 x 80 mm'), keys: [] });
  });

  it('names its file with its size, and the sides that are closed', () => {
    const v = defaultValues(solid.settings);
    expect(boardFileName(solid, { ...v, widthMm: 240, heightMm: 200 }, 'stl')).toBe('skadis-solid-240x200.stl');
    const closed = { ...v, sides: { left: 'closed', right: 'open', bottom: 'closed', top: 'open' } as const };
    expect(boardFileName(solid, closed, 'stl')).toBe('skadis-solid-160x160-closed-left-bottom.stl');
  });

  it('offers open sides through the slots or between them, through unless set (D282)', () => {
    const seams = solid.settings.find((x) => x.key === 'seams');
    expect(seams?.kind).toBe('choice');
    if (seams?.kind !== 'choice') return;
    expect(seams.options.map((o) => [o.value, o.label])).toEqual([
      ['through', 'Through the slots'],
      ['between', 'Between the slots'],
    ]);
    expect(seams.default).toBe('through');
    // first, then the sides it moves (D529 a, 30 Oct 2026: right under the Look, where a board has one); then the
    // screw holes and standoffs, and the size right above the screw size (Q588, 30 Oct 2026)
    const main = (t: { settings: readonly Setting[] }) =>
      t.settings.filter((x) => x.advanced !== true).map((x) => x.key);
    const order = [
      'seams',
      'sides',
      'screwHead',
      'standoffs',
      'tapeWidthMm', // with tape standoffs (D593, Q594)
      'widthMm',
      'heightMm',
      'thicknessMm',
      'screwMm',
      'panels',
    ];
    expect(main(solid)).toEqual(order);
    for (const t of [boardType('lightened'), boardType('skeleton')]) expect(main(t)).toEqual(['look', ...order]);
  });

  it('builds a board between the slots with its open sides moved, and names it so when a side is open (D288)', () => {
    const v = defaultValues(solid.settings);
    const built = buildBoard(engine, solid, { ...v, seams: 'between', screwHead: 'none' });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    made.push(built.solid);
    const box = built.solid.boundingBox();
    expect([box.min[0], box.min[1], box.max[0], box.max[1]].map((n) => Math.round(n * 1e6) / 1e6)).toEqual([
      10, 10, 170, 170,
    ]);
    expect(boardFileName(solid, { ...v, seams: 'between' }, 'stl')).toBe('skadis-solid-160x160-between-slots.stl');
    const some = {
      ...v,
      seams: 'between',
      sides: { left: 'closed', right: 'open', bottom: 'closed', top: 'open' },
    } as const;
    expect(boardFileName(solid, some, 'stl')).toBe('skadis-solid-160x160-closed-left-bottom-between-slots.stl');
    // closed all round, no side moves: the board and its name are the one through the slots
    const all = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' } as const;
    expect(boardFileName(solid, { ...v, seams: 'between', sides: all }, 'stl')).toBe(
      'skadis-solid-160x160-closed-left-right-bottom-top.stl',
    );
  });

  it('adds to the name only the mounting that differs from the starting one (C85)', () => {
    const v = defaultValues(solid.settings);
    const name = (given: Record<string, string | number>) => boardFileName(solid, { ...v, ...given }, 'stl');
    expect(name({ screwHead: 'round', standoffs: 'back' })).toBe('skadis-solid-160x160-round-head-standoffs-15mm.stl');
    expect(name({ screwHead: 'none', screwMm: 3.5 })).toBe('skadis-solid-160x160-no-holes.stl');
    expect(name({ screwMm: 3.5, standoffHeightMm: 25 })).toBe('skadis-solid-160x160-screw-3.5mm.stl');
    expect(name({ screwHead: 'keyhole' })).toBe('skadis-solid-160x160-keyholes.stl');
    expect(name({ screwHead: 'keyhole', lockScrews: 'bottom' })).toBe('skadis-solid-160x160-keyholes-lock-screws.stl');
    // lock screws of their own size other than the start, 4 mm (D479)
    expect(name({ screwHead: 'keyhole', lockScrews: 'bottom', lockScrewSize: 'own', lockScrewMm: 2.5 })).toBe(
      'skadis-solid-160x160-keyholes-lock-screws-2.5mm.stl',
    );
    // a size left in the field while "Same" is chosen is not the lock screws' (D479)
    expect(name({ screwHead: 'keyhole', lockScrews: 'bottom', lockScrewMm: 2.5 })).toBe(
      'skadis-solid-160x160-keyholes-lock-screws.stl',
    );
    // the screw size names the keyholes' and the lock screws' alike, each where it differs from the start (D479)
    expect(name({ screwHead: 'keyhole', lockScrews: 'bottom', screwMm: 3.5 })).toBe(
      'skadis-solid-160x160-keyholes-lock-screws-3.5mm-screw-3.5mm.stl',
    );
    expect(name({ screwHead: 'keyhole', keyholeScrewSize: 'own', keyholeScrewMm: 5 })).toBe(
      'skadis-solid-160x160-keyholes-screw-5mm.stl',
    );
    expect(name({ screwHead: 'keyhole', lockScrewMm: 4 })).toBe('skadis-solid-160x160-keyholes.stl'); // no lock screws
    expect(name({ lockScrews: 'bottom' })).toBe('skadis-solid-160x160.stl'); // lock screws go only with keyholes
    // lock screws alone (D289), their size where it is not the starting one: the screw size's unless their own
    expect(name({ screwHead: 'lock', standoffs: 'back' })).toBe('skadis-solid-160x160-lock-screws-standoffs-15mm.stl');
    expect(name({ screwHead: 'lock', screwMm: 3.5, standoffs: 'back' })).toBe(
      'skadis-solid-160x160-lock-screws-3.5mm-standoffs-15mm.stl',
    );
    expect(name({ screwHead: 'lock', lockScrewSize: 'own', lockScrewMm: 4, screwMm: 3.5, standoffs: 'back' })).toBe(
      'skadis-solid-160x160-lock-screws-standoffs-15mm.stl',
    );
  });

  it('offers keyholes, which stand on standoffs, and says keyholes without them are a problem (D156, D190)', () => {
    const v = defaultValues(solid.settings);
    const head = solid.settings.find((s) => s.key === 'screwHead');
    expect(head?.kind === 'choice' && head.options.map((o) => o.label)).toEqual([
      'Countersunk',
      'Round head',
      'Keyholes',
      'Lock screws',
      'None',
    ]);
    const keyholes = buildBoard(engine, solid, { ...v, screwHead: 'keyhole', standoffs: 'back' });
    expect(keyholes.ok).toBe(true);
    if (keyholes.ok) made.push(keyholes.solid);
    const flat = buildBoard(engine, solid, { ...v, screwHead: 'keyhole' });
    expect(flat.ok).toBe(false);
    if (!flat.ok) expect(flat.problem).toContain('standoffs at least 13.23 mm');
  });
});

// The mounting's settings that apply only with another choice (D372; QA Q15): lock screws at the bottom only with
// keyholes; the standoff height only with standoffs, on the back or under keyholes and lock screws; the keyholes' and
// the lock screws' choice of the screw size or their own only with keyholes and lock screws, and their own size only
// with "Own" too (D479). While one does not apply it is not checked, and the build is handed its starting value.
describe("the mounting's settings that apply only with another choice (D372)", () => {
  const solid = SOLID;
  const KEYS = ['keyholeScrewSize', 'keyholeScrewMm', 'lockScrews', 'lockScrewSize', 'lockScrewMm', 'standoffHeightMm'];
  const notApplying = (id: string, given: Record<string, unknown>) =>
    settingsNotApplying(boardType(id).settings, given).filter((k) => KEYS.includes(k));

  it('greys out each where it does not apply, for every board, and nothing else of theirs', () => {
    for (const id of ['solid', 'lightened', 'skeleton']) {
      expect(notApplying(id, {})).toEqual(KEYS);
      expect(notApplying(id, { standoffs: 'back' })).toEqual(KEYS.filter((k) => k !== 'standoffHeightMm'));
      expect(notApplying(id, { screwHead: 'keyhole' })).toEqual(['keyholeScrewMm', 'lockScrewSize', 'lockScrewMm']);
      expect(notApplying(id, { screwHead: 'keyhole', keyholeScrewSize: 'own' })).toEqual([
        'lockScrewSize',
        'lockScrewMm',
      ]);
      expect(notApplying(id, { screwHead: 'keyhole', lockScrews: 'bottom' })).toEqual([
        'keyholeScrewMm',
        'lockScrewMm',
      ]);
      expect(notApplying(id, { screwHead: 'keyhole', lockScrews: 'bottom', lockScrewSize: 'own' })).toEqual([
        'keyholeScrewMm',
      ]);
      expect(notApplying(id, { screwHead: 'lock' })).toEqual([
        'keyholeScrewSize',
        'keyholeScrewMm',
        'lockScrews',
        'lockScrewMm',
      ]);
      expect(notApplying(id, { screwHead: 'round', lockScrews: 'bottom', lockScrewSize: 'own' })).toEqual(KEYS);
      // the tape's width only with tape standoffs, which stand as tall as set (D593, Q594)
      const all = (given: Record<string, unknown>) => settingsNotApplying(boardType(id).settings, given);
      expect(all({ standoffs: 'tape', screwHead: 'none' })).not.toContain('tapeWidthMm');
      expect(all({ standoffs: 'tape', screwHead: 'none' })).not.toContain('standoffHeightMm');
      // every other setting of a board applies always
      expect(all({})).toEqual(['tapeWidthMm', ...notApplying(id, {})]);
    }
  });

  it('checks none of them while it does not apply, so a value left there blocks nothing', () => {
    const bad = {
      lockScrews: 'sideways',
      lockScrewSize: 'neither',
      lockScrewMm: '9',
      keyholeScrewSize: 'neither',
      keyholeScrewMm: '9',
      standoffHeightMm: '1',
    };
    const read = readValues(solid.settings, { ...bad, screwHead: 'countersunk' });
    expect(read.ok).toBe(true);
    if (read.ok) {
      const { lockScrews, lockScrewSize, lockScrewMm, keyholeScrewSize, keyholeScrewMm, standoffHeightMm } =
        read.values;
      expect([lockScrews, lockScrewSize, lockScrewMm, keyholeScrewSize, keyholeScrewMm, standoffHeightMm]).toEqual([
        'none',
        'same',
        4, // the screw size's start (D479)
        'same',
        4,
        15,
      ]);
    }
    // with lock screws but the screw size chosen for them, their own size is not checked either (D479)
    expect(readValues(solid.settings, { screwHead: 'lock', lockScrewMm: '9' }).ok).toBe(true);
  });

  it('checks each while it applies (the control)', () => {
    const keys = (given: Record<string, unknown>) => {
      const read = readValues(solid.settings, given);
      return read.ok ? [] : read.errors.map((e) => e.key);
    };
    expect(keys({ screwHead: 'keyhole', lockScrews: 'sideways' })).toEqual(['lockScrews']);
    expect(keys({ standoffs: 'back', standoffHeightMm: '1' })).toEqual(['standoffHeightMm']);
    expect(keys({ screwHead: 'keyhole', standoffHeightMm: '1' })).toEqual(['standoffHeightMm']);
    expect(keys({ screwHead: 'lock', standoffHeightMm: '1' })).toEqual(['standoffHeightMm']);
    const own = { lockScrewSize: 'own', lockScrewMm: '9' };
    expect(keys({ screwHead: 'lock', ...own })).toEqual(['lockScrewMm']);
    expect(keys({ screwHead: 'keyhole', lockScrews: 'bottom', ...own })).toEqual(['lockScrewMm']);
    expect(keys({ screwHead: 'keyhole', ...own })).toEqual([]);
    expect(keys({ screwHead: 'lock', lockScrewSize: 'neither' })).toEqual(['lockScrewSize']);
    expect(keys({ screwHead: 'keyhole', keyholeScrewSize: 'own', keyholeScrewMm: '9' })).toEqual(['keyholeScrewMm']);
    expect(keys({ screwHead: 'keyhole', keyholeScrewSize: 'own', keyholeScrewMm: '2.5' })).toEqual(['keyholeScrewMm']);
  });

  it('builds and names a board the same whatever a setting that does not apply holds', () => {
    const v = defaultValues(solid.settings);
    const plain = buildBoard(engine, solid, v);
    expect(plain.ok).toBe(true);
    if (!plain.ok) return;
    made.push(plain.solid);
    for (const off of [
      { lockScrews: 'bottom' },
      { lockScrewMm: 3 },
      { lockScrewSize: 'own', lockScrewMm: 3 },
      { keyholeScrewSize: 'own', keyholeScrewMm: 3 },
      { standoffHeightMm: 30 },
    ] as const) {
      // handed straight to the build, as a caller may: it ignores the value
      const given = { ...v, ...off };
      const built = buildBoard(engine, solid, given);
      expect(built.ok).toBe(true);
      if (!built.ok) continue;
      made.push(built.solid);
      expect(built.solid.volume()).toBeCloseTo(plain.solid.volume(), 6);
      expect(boardFileName(solid, given, 'stl')).toBe(boardFileName(solid, v, 'stl'));
      expect(solid.screws?.(given)).toBe(solid.screws?.(v));
      // and read from the form, it is its starting value
      const read = readValues(solid.settings, given);
      expect(read.ok && read.values).toEqual(v);
    }
  });

  it('says in its help when each applies', () => {
    const help = (key: string) => (solid.settings as readonly Setting[]).find((s) => s.key === key)?.help ?? '';
    expect(help('lockScrews')).toMatch(/^With keyholes: /);
    expect(help('keyholeScrewSize')).toMatch(/^With keyholes: /);
    expect(help('keyholeScrewMm')).toMatch(/^With keyholes, and "Own" chosen above: /);
    expect(help('lockScrewSize')).toMatch(/^With lock screws, at the bottom with keyholes or as the screw holes: /);
    expect(help('lockScrewMm')).toMatch(
      /^With lock screws, at the bottom with keyholes or as the screw holes, and "Own" chosen above: /,
    );
    expect(help('standoffHeightMm')).toMatch(
      /^With standoffs on the back, or keyholes or lock screws, which stand on them: /,
    );
  });
});

describe('the lightened board type (D141 to D145)', () => {
  const [lightened, solid] = [LIGHTENED, SOLID];

  it('is listed with the boards, right after the solid board', () => {
    const ids = BOARD_TYPES.map((t) => t.id);
    expect(ids.indexOf('lightened')).toBe(ids.indexOf('solid') + 1);
    expect(groupOf(lightened)).toBe('board');
  });

  it("takes every one of the solid board's settings, at the same starting values, and its own look, rim and web", () => {
    const own = lightened.settings.map((s) => s.key);
    const shared = own.filter((k) => k !== 'look' && k !== 'rimMm' && k !== 'webMm');
    expect(shared).toEqual(solid.settings.map((s) => s.key));
    const { look, rimMm, webMm, ...rest } = defaultValues(lightened.settings);
    expect([rimMm, webMm]).toEqual([3, 3]); // D143
    expect(look).toBe('curved'); // Q510: today's board unless Straight is chosen
    expect(rest).toEqual(defaultValues(solid.settings));
  });

  it('puts the rim and the web under Advanced, refused under 1.2 mm and warned under 2 mm (D145)', () => {
    const advanced = boardType('lightened')
      .settings.filter((s) => s.advanced)
      .map((s) => s.key);
    expect(advanced).toEqual(expect.arrayContaining(['rimMm', 'webMm']));
    expect(readValues(lightened.settings, { rimMm: '1.1' }).ok).toBe(false);
    expect(readValues(lightened.settings, { webMm: '1.1' }).ok).toBe(false);
    const thin = readValues(lightened.settings, { rimMm: '1.5', webMm: '1.9' });
    expect(thin.ok).toBe(true);
    expect(thin.warnings.map((w) => w.key).sort()).toEqual(['rimMm', 'webMm']);
    expect(readValues(lightened.settings, { rimMm: '2', webMm: '2' }).warnings).toEqual([]);
  });

  it('builds a board of the size asked for, with less plastic than the solid board of the same values', () => {
    const v = { ...defaultValues(lightened.settings), widthMm: 120, heightMm: 80 };
    const light = buildBoard(engine, lightened, v);
    const { rimMm: _rim, webMm: _web, ...solidValues } = v;
    const full = buildBoard(engine, solid, solidValues);
    if (!light.ok || !full.ok) throw new Error('both should build');
    made.push(light.solid, full.solid);
    const box = light.solid.boundingBox();
    expect([box.max[0], box.max[1], box.max[2]].map((n) => Math.round(n * 1e6) / 1e6)).toEqual([120, 80, 5]);
    expect(light.solid.volume() / full.solid.volume()).toBeLessThan(0.5);
  });

  it('names its file as the solid board does, adding the rim and the web only when they differ from the start', () => {
    const v = defaultValues(lightened.settings);
    const name = (given: Record<string, string | number>) => boardFileName(lightened, { ...v, ...given }, 'stl');
    expect(name({})).toBe('skadis-lightened-160x160.stl');
    expect(name({ rimMm: 2.5, webMm: 4 })).toBe('skadis-lightened-160x160-rim-2.5mm-web-4mm.stl');
    expect(name({ widthMm: 240, webMm: 2, screwHead: 'round' })).toBe(
      'skadis-lightened-240x160-web-2mm-round-head.stl',
    );
  });
});

describe('the skeleton board type (D146, D147, D161)', () => {
  const [skeleton, lightened] = [SKELETON, LIGHTENED];

  it('is listed with the boards, right after the lightened board', () => {
    const ids = BOARD_TYPES.map((t) => t.id);
    expect(ids.indexOf('skeleton')).toBe(ids.indexOf('lightened') + 1);
    expect(groupOf(skeleton)).toBe('board');
  });

  it("takes the lightened board's settings, at the same starting values, and a 1.2 mm core after the web", () => {
    const keys = skeleton.settings.map((s) => s.key);
    expect(keys.filter((k) => k !== 'coreMm')).toEqual(lightened.settings.map((s) => s.key));
    expect(keys.indexOf('coreMm')).toBe(keys.indexOf('webMm') + 1);
    const { coreMm, ...rest } = defaultValues(skeleton.settings);
    expect(coreMm).toBe(1.2);
    expect(rest).toEqual(defaultValues(lightened.settings));
  });

  it('puts the core under Advanced, refused under 0.8 mm and warned under 1.2 mm (D147)', () => {
    expect(boardType('skeleton').settings.find((s) => s.key === 'coreMm')?.advanced).toBe(true);
    expect(readValues(skeleton.settings, { coreMm: '0.7' }).ok).toBe(false);
    expect(readValues(skeleton.settings, { coreMm: '1' }).warnings.map((w) => w.key)).toEqual(['coreMm']);
    expect(readValues(skeleton.settings, { coreMm: '1.2' }).warnings).toEqual([]);
    const wide = buildBoard(engine, skeleton, { ...defaultValues(skeleton.settings), coreMm: 3.5 });
    expect(wide.ok).toBe(false);
    if (!wide.ok) expect(wide.problem).toContain('core');
  });

  // Found by QA (Q6, 23 Oct 2026): rim 6, web 6, core 5 said "This board cannot be made: A 2.5030015808114285 mm move is
  // larger than the outline takes". A core wider than the 3 mm edge band asked the band to narrow to more than it is,
  // which shrank the pockets beside it instead (22 of the 23 combinations a sweep of rims, webs and cores could not
  // build, 23 Oct 2026); the 23rd, a 1.2 mm rim with 6 mm webs, leaves pockets too small to taper.
  it('says in plain words what to change for a core it cannot make, before any geometry for a core wider than the band', () => {
    const values = (rimMm: number, webMm: number, coreMm: number, size = 160) => ({
      ...defaultValues(skeleton.settings),
      widthMm: size,
      heightMm: size,
      rimMm,
      webMm,
      coreMm,
    });
    for (const [rim, web, core] of [
      [6, 6, 5],
      [6, 6, 6],
      [4, 4, 4],
      [5, 5, 3.1],
    ] as const) {
      const built = buildBoard(engine, skeleton, values(rim, web, core));
      expect(built.ok ? 'built' : built.problem).toBe(
        'The core cannot be wider than the rim, the webs or the 3 mm edge band',
      );
    }
    // refused before the geometry: on the page's field, and by the library's reader alone
    const field = readValues(skeleton.settings, { rimMm: '6', webMm: '6', coreMm: '5' });
    expect(field.ok ? [] : field.errors).toEqual([{ key: 'coreMm', message: 'Core width must be from 0.8 to 3 mm' }]);
    expect(readValues(skeleton.settings, { rimMm: '6', webMm: '6', coreMm: '3' }).ok).toBe(true);
    expect(() => skeletonParams({ rimMm: 6, webMm: 6, coreMm: 5 })).toThrow('3 mm edge band');
    // the control: a core as wide as the band, the rims and webs wider, is made
    const band = buildBoard(engine, skeleton, values(6, 6, 3, 80));
    expect(band.ok).toBe(true);
    if (band.ok) made.push(band.solid);
    // and pockets too small to taper are said in plain words too, with what to change
    const small = buildBoard(engine, skeleton, values(1.2, 6, 0.8, 80));
    expect(small.ok ? 'built' : small.problem).toBe(
      'The pockets these rims and webs leave are too small to narrow to a 0.8 mm core: choose a wider core, or ' +
        'narrower webs',
    );
  });

  it('builds a board of the size asked for, with less plastic than the lightened board of the same values', () => {
    const v = { ...defaultValues(skeleton.settings), widthMm: 120, heightMm: 80 };
    const bones = buildBoard(engine, skeleton, v);
    const { coreMm: _core, ...lightValues } = v;
    const light = buildBoard(engine, lightened, lightValues);
    if (!bones.ok || !light.ok) throw new Error('both should build');
    made.push(bones.solid, light.solid);
    const box = bones.solid.boundingBox();
    expect([box.max[0], box.max[1], box.max[2]].map((n) => Math.round(n * 1e6) / 1e6)).toEqual([120, 80, 5]);
    expect(bones.solid.volume()).toBeLessThan(0.9 * light.solid.volume());
  });

  it('names its file as the lightened board does, adding the core only when it differs from 1.2 mm', () => {
    const v = defaultValues(skeleton.settings);
    const name = (given: Record<string, string | number>) => boardFileName(skeleton, { ...v, ...given }, 'stl');
    expect(name({})).toBe('skadis-skeleton-160x160.stl');
    expect(name({ coreMm: 1.5, webMm: 4, screwHead: 'keyhole' })).toBe(
      'skadis-skeleton-160x160-web-4mm-core-1.5mm-keyholes.stl',
    );
  });
});

describe('the standoff connector type (D91 to D94)', () => {
  const standoff = boardType('standoff');

  it('is a connector, 15 mm tall for a 4 mm screw unless set (D238)', () => {
    expect(groupOf(standoff)).toBe('connector');
    expect(defaultValues(standoff.settings)).toEqual({
      boards: '1',
      standoffFixing: 'screw', // a nut, taped, as an option (D592 a)
      heightMm: 15,
      tapeWidthMm: 19,
      screwMm: 4,
    });
  });

  it('builds the spacer its values describe', () => {
    const built = buildBoard(engine, standoff, { boards: '1', heightMm: 25, screwMm: 4 });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    made.push(built.solid);
    expect(built.solid.boundingBox().max[2]).toBeCloseTo(25, 9);
    expect(built.solid.genus()).toBe(1);
  });

  it('shares its screw size setting with the board, so the two cannot drift apart', () => {
    const screw = (type: AnyBoardType) => type.settings.find((s) => s.key === 'screwMm');
    expect(screw(standoff)).toBe(screw(boardType('solid')));
  });

  it('comes for 2 boards either way and 4 (D92, D281), and prints as built, wall face down, the posts on top', () => {
    const choice = standoff.settings.find((s) => s.key === 'boards');
    expect(choice?.kind === 'choice' ? choice.options.map((o) => o.value) : []).toEqual(['1', '2', '2-stacked', '4']);
    for (const [boards, genus] of [
      ['2', 2],
      ['2-stacked', 2],
      ['4', 5],
    ] as const) {
      const built = buildBoard(engine, standoff, { boards, heightMm: 20, screwMm: 4 });
      if (!built.ok) throw new Error(built.problem);
      const printed = printedPart(standoff, built.solid);
      made.push(built.solid, printed);
      expect(built.solid.genus()).toBe(genus);
      // the tunnel is in the top 8 mm as it prints: less plastic there than at the bed
      const [low, high] = [printed.slice(1), printed.slice(19)];
      expect(high.area()).toBeLessThan(low.area() - 50);
      low.delete();
      high.delete();
    }
  });

  it('says a shared standoff too short for its tunnel is a problem', () => {
    const built = buildBoard(engine, standoff, { boards: '2', heightMm: 10, screwMm: 4 });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.problem).toContain('12 mm');
  });

  it('names its file with the boards it serves, its height, and a screw other than 4 mm', () => {
    const name = (given: Record<string, number | string>) =>
      boardFileName(standoff, { ...defaultValues(standoff.settings), ...given }, 'stl');
    expect(name({})).toBe('skadis-standoff-1-board-15mm.stl');
    expect(name({ heightMm: 25, screwMm: 3.5 })).toBe('skadis-standoff-1-board-25mm-screw-3.5mm.stl');
    expect(name({ boards: '4' })).toBe('skadis-standoff-4-boards-15mm.stl');
    expect(name({ boards: '2-stacked' })).toBe('skadis-standoff-2-boards-stacked-15mm.stl');
  });
});

describe('the slot clip connector type (D187 to D189, D194, D195, D261, C191, C199)', () => {
  const slotClip = boardType('slot-clip');

  it('is a connector, listed after the standoff, for 2 boards side by side, 15 mm deep, ribs and a screw unless set (D238, D250 b)', () => {
    expect(groupOf(slotClip)).toBe('connector');
    const ids = BOARD_TYPES.map((t) => t.id);
    expect(ids.indexOf('slot-clip')).toBe(ids.indexOf('standoff') + 1);
    expect(defaultValues(slotClip.settings)).toEqual({
      boards: '2',
      seams: 'through',
      fixing: 'screw',
      depthMm: 15,
      pegClearanceMm: 0.4,
      screwMm: 4,
      screwHead: 'countersunk',
      clipScrewSize: 'same', // D479
      clipScrewMm: 4,
    });
  });

  it('offers 2 boards side by side or one above the other, or 4; no fixing, a screw or a keyhole; ribs alone (D261)', () => {
    const options = (key: string) => {
      const s = slotClip.settings.find((setting) => setting.key === key);
      return s?.kind === 'choice' && s.options.map((o) => o.value);
    };
    expect(options('boards')).toEqual(['2', '2-stacked', '4']);
    // for seams through the slots or between them, right after the boards (D290)
    expect(options('seams')).toEqual(['through', 'between']);
    expect(slotClip.settings.map((s) => s.key).indexOf('seams')).toBe(1);
    expect(options('fixing')).toEqual(['none', 'screw', 'keyhole']);
    // no choice of grip: the lip snapped in but did not hold (T193, D261)
    expect(slotClip.settings.map((s) => s.key)).not.toContain('grip');
    // a screw countersunk, or a round head in a counterbore (D265)
    expect(options('screwHead')).toEqual(['countersunk', 'round']);
    // the peg clearance, the screw's head and the clip's own screw size under Advanced; the fixing and the screw size
    // on the main form (D479)
    const advanced = slotClip.settings.filter((s) => 'advanced' in s && s.advanced === true).map((s) => s.key);
    expect(advanced).toEqual(['pegClearanceMm', 'screwHead', 'clipScrewSize', 'clipScrewMm']);
  });

  it('shares its screw size setting with the board, so the two cannot drift apart', () => {
    const screw = (type: AnyBoardType) => type.settings.find((s) => s.key === 'screwMm');
    expect(screw(slotClip)).toBe(screw(boardType('solid')));
  });

  it('builds the clip its values describe, and prints as built, wall face down, the pegs on top', () => {
    const v = defaultValues(slotClip.settings);
    const built = buildBoard(engine, slotClip, { ...v, boards: '4', depthMm: 25 });
    if (!built.ok) throw new Error(built.problem);
    const printed = printedPart(slotClip, built.solid);
    made.push(built.solid, printed);
    expect(built.solid.genus()).toBe(2); // the ring, and the screw's hole (D250 b)
    expect(printed.boundingBox().max[2]).toBeCloseTo(30, 6); // 25 mm and the 5 mm pegs (D250 a)
    // the bar is at the bed, only the pegs at the top
    const [low, high] = [printed.slice(1), printed.slice(27)];
    expect(high.area()).toBeLessThan(low.area() / 4);
    low.delete();
    high.delete();
  });

  it('says a clip for 4 boards between the slots is a problem, which clips for 2 along the seams solve (D290)', () => {
    const built = buildBoard(engine, slotClip, { ...defaultValues(slotClip.settings), seams: 'between', boards: '4' });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.problem).toContain('clips for 2 boards along');
    const two = buildBoard(engine, slotClip, { ...defaultValues(slotClip.settings), seams: 'between' });
    expect(two.ok).toBe(true);
    if (two.ok) made.push(two.solid);
  });

  it('says a clip too shallow for the hooks room and its bar is a problem', () => {
    const built = buildBoard(engine, slotClip, { ...defaultValues(slotClip.settings), depthMm: 10 });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.problem).toContain('12 mm');
    // a keyhole needs room for its lips, the head and a roof behind the hooks' room (C199)
    const keyhole = buildBoard(engine, slotClip, {
      ...defaultValues(slotClip.settings),
      fixing: 'keyhole',
      depthMm: 13,
    });
    expect(keyhole.ok).toBe(false);
    if (!keyhole.ok) expect(keyhole.problem).toContain('13.23 mm');
  });

  it('names its file with the boards it joins, its depth, a fixing, and what differs from the start', () => {
    const name = (given: Record<string, number | string>) =>
      boardFileName(slotClip, { ...defaultValues(slotClip.settings), ...given }, 'stl');
    expect(name({})).toBe('skadis-slot-clip-2-boards-15mm-screw.stl'); // a screw unless set (D250 b)
    expect(name({ boards: '2-stacked' })).toBe('skadis-slot-clip-2-boards-stacked-15mm-screw.stl');
    expect(name({ boards: '4', depthMm: 25, pegClearanceMm: 0.3 })).toBe(
      'skadis-slot-clip-4-boards-25mm-screw-clearance-0.3mm.stl',
    );
    expect(name({ fixing: 'none' })).toBe('skadis-slot-clip-2-boards-15mm.stl');
    expect(name({ seams: 'between' })).toBe('skadis-slot-clip-2-boards-between-slots-15mm-screw.stl'); // D290
    expect(name({ fixing: 'keyhole', screwMm: 3.5 })).toBe('skadis-slot-clip-2-boards-15mm-keyhole-screw-3.5mm.stl');
    // the clip's own screw size names its screw, the screw size then nothing (D479)
    expect(name({ fixing: 'keyhole', screwMm: 3.5, clipScrewSize: 'own', clipScrewMm: 4 })).toBe(
      'skadis-slot-clip-2-boards-15mm-keyhole.stl',
    );
    expect(name({ clipScrewSize: 'own', clipScrewMm: 3 })).toBe('skadis-slot-clip-2-boards-15mm-screw-3mm.stl');
    expect(name({ grip: 'lip' })).toBe('skadis-slot-clip-2-boards-15mm-screw.stl'); // a lip kept from before: no part of it
    // a round head after the screw, before its size; nothing of a head for a keyhole (D265)
    expect(name({ screwHead: 'round' })).toBe('skadis-slot-clip-2-boards-15mm-screw-round-head.stl');
    expect(name({ screwHead: 'round', screwMm: 3.5 })).toBe(
      'skadis-slot-clip-2-boards-15mm-screw-round-head-3.5mm.stl',
    );
    expect(name({ screwHead: 'round', fixing: 'keyhole' })).toBe('skadis-slot-clip-2-boards-15mm-keyhole.stl');
    expect(name({ screwMm: 3.5 })).toBe('skadis-slot-clip-2-boards-15mm-screw-3.5mm.stl'); // not -screw-screw-
    expect(name({ fixing: 'none', screwMm: 3.5 })).toBe('skadis-slot-clip-2-boards-15mm.stl'); // no screw, no size
  });
});

describe('the seam-test pair type (D69)', () => {
  const seam = boardType('seam-test');

  it('is listed with the boards, right after the fit coupon it is printed with', () => {
    const ids = BOARD_TYPES.map((t) => t.id);
    expect(ids.indexOf('seam-test')).toBe(ids.indexOf('fit-coupon') + 1);
    expect(groupOf(seam)).toBe('board');
  });

  it('builds two tiles, at the clearance asked for', () => {
    const built = buildBoard(engine, seam, { ...defaultValues(seam.settings), slotClearanceMm: 0.3 });
    if (!built.ok) throw new Error(built.problem);
    made.push(built.solid);
    const parts = built.solid.decompose();
    made.push(...parts);
    expect(parts).toHaveLength(2);
  });

  it('names its file with its thickness and its clearance', () => {
    const name = (given: Record<string, number>) =>
      boardFileName(seam, { ...defaultValues(seam.settings), ...given }, 'stl');
    expect(name({})).toBe('skadis-seam-test-5mm-0.2.stl');
    expect(name({ slotClearanceMm: 0.15, thicknessMm: 4.5 })).toBe('skadis-seam-test-4.5mm-0.15.stl');
  });
});

describe('what each screw passes, from the part itself (D264)', () => {
  const screws = (id: string, given: Record<string, number | string> = {}) => {
    const type = boardType(id);
    return type.screws?.({ ...defaultValues(type.settings), ...given });
  };

  it("says a board's corner screw passes the board, and its standoffs when it has them", () => {
    expect(screws('solid')).toBe(
      "Each corner screw passes the board's 5 mm, plus any standoff behind it and your wall plug.",
    );
    expect(screws('lightened', { standoffs: 'back' })).toBe(
      'Each corner screw passes 20 mm of board and standoff, plus your wall plug.',
    );
    expect(screws('skeleton', { standoffs: 'back', standoffHeightMm: 25 })).toBe(
      'Each corner screw passes 30 mm of board and standoff, plus your wall plug.',
    );
    expect(screws('solid', { screwHead: 'none' })).toBeUndefined();
  });

  it('says a round head sunk in its counterbore leaves the screw less board to pass (D279)', () => {
    expect(screws('skeleton', { standoffs: 'back', standoffHeightMm: 25, screwHead: 'round' })).toBe(
      'Each corner screw passes 26.6 mm of board and standoff under its head, plus your wall plug.',
    );
    expect(screws('solid', { screwHead: 'round' })).toBe(
      'Each corner screw passes 1.6 mm of board under its head, plus any standoff behind it and your wall plug.',
    );
    // a board too thin to sink the head: it stands on the front, and the screw passes the whole board
    expect(screws('solid', { screwHead: 'round', thicknessMm: 4 })).toBe(
      "Each corner screw passes the board's 4 mm, plus any standoff behind it and your wall plug.",
    );
  });

  it('says between the slots what each corner screw passes, as through them: every corner has one (D371)', () => {
    const some = { left: 'closed', right: 'open', bottom: 'closed', top: 'closed' };
    for (const id of ['solid', 'lightened', 'skeleton']) {
      expect(screws(id, { seams: 'between', sides: some as never })).toBe(screws(id));
      expect(screws(id, { seams: 'between' })).toBe(screws(id));
      expect(screws(id, { seams: 'between', standoffs: 'back' })).toBe(screws(id, { standoffs: 'back' }));
    }
    expect(screws('lightened', { seams: 'between' })).toBe(
      "Each corner screw passes the board's 5 mm, plus any standoff behind it and your wall plug.",
    );
  });

  it("says where a keyhole's screw stands, and what a lock screw passes", () => {
    const keyholes = { screwHead: 'keyhole', standoffs: 'back' };
    expect(screws('solid', keyholes)).toBe(
      'Each keyhole hangs on a 4 mm countersunk screw (a 90 degree head) left standing out of the wall, the top of ' +
        'its head 3.73 to 4.03 mm out.',
    );
    expect(screws('solid', { ...keyholes, lockScrews: 'bottom' })).toBe(
      'Each keyhole hangs on a 4 mm countersunk screw (a 90 degree head) left standing out of the wall, the top of ' +
        'its head 3.73 to 4.03 mm out. Each lock screw passes 4.47 mm of standoff under its head, plus your ' +
        'wall plug.',
    );
    // the keyholes' own size names their screw; the lock screws keep the screw size's (D479)
    expect(screws('solid', { ...keyholes, lockScrews: 'bottom', keyholeScrewSize: 'own', keyholeScrewMm: 5 })).toBe(
      'Each keyhole hangs on a 5 mm countersunk screw (a 90 degree head) left standing out of the wall, the top of ' +
        'its head 4.35 to 4.65 mm out. Each lock screw passes 4.47 mm of standoff under its head, plus your ' +
        'wall plug.',
    );
  });

  it('says what each lock screw passes, with lock screws alone (D289), at the screw size unless their own (D479)', () => {
    // a 4 mm countersunk head on its 45 degree seat: 2.48 mm tall, 0.25 mm of it in the hole, its top 0.3 mm short of
    // the hook's 8 mm of room, so it bears 2.53 mm behind the room and the screw passes 15 - 10.53 mm (D479, D370 a)
    expect(screws('solid', { screwHead: 'lock', standoffs: 'back' })).toBe(
      'Each lock screw passes 4.47 mm of standoff under its head, plus your wall plug.',
    );
    expect(screws('skeleton', { screwHead: 'lock', standoffs: 'back', seams: 'between' })).toBe(
      'Each lock screw passes 4.47 mm of standoff under its head, plus your wall plug.',
    );
    // a 2.5 mm lock screw of its own, as the start was before D479: its 2.3 mm head in a recess 2.3 mm deep
    expect(screws('solid', { screwHead: 'lock', standoffs: 'back', lockScrewSize: 'own', lockScrewMm: 2.5 })).toBe(
      'Each lock screw passes 4.7 mm of standoff under its head, plus your wall plug.',
    );
  });

  // Found by QA (Q9, 23 Oct 2026): a 5 mm lock screw on standoffs 3 mm tall said "Each lock screw passes -9.3 mm of
  // standoff under its head", under a status that rightly said the board cannot be made.
  it('gives no length under a lock screw on standoffs too short for it, and says what is short, as the build does', () => {
    // a 5 mm lock screw of its own, countersunk on its seat, 3.15 mm behind the hook's 8 mm of room, and 2 mm under it:
    // 13.15 mm, more than 3 mm keyholes take (D479, D370 a)
    for (const given of [{ screwHead: 'lock' }, { screwHead: 'keyhole', lockScrews: 'bottom', screwMm: '3' }]) {
      const values = (standoffHeightMm: string) => {
        const read = readValues(SOLID.settings, {
          standoffs: 'back',
          lockScrewSize: 'own',
          lockScrewMm: '5',
          standoffHeightMm,
          ...given,
        });
        if (!read.ok) throw new Error(read.errors.map((e) => e.message).join('; '));
        return read.values;
      };
      expect(() => SOLID.screws?.(values('3'))).toThrow('choose standoffs at least 13.15 mm tall');
      const built = buildBoard(engine, SOLID, values('3'));
      expect(built.ok ? '' : built.problem).toContain('choose standoffs at least 13.15 mm tall');
      // the control: on the least standoff that is made, the 2 mm left under the head
      expect(SOLID.screws?.(values('13.15'))).toContain('Each lock screw passes 2 mm of standoff under its head');
    }
  });

  it('says what the standoff and the slot clip put under a screw', () => {
    expect(screws('standoff')).toBe(
      'Each screw passes 20 mm of board and standoff, a 5 mm board on this 15 mm standoff, plus your wall plug.',
    );
    expect(screws('slot-clip')).toBe("The screw passes the clip's 7 mm bar, plus your wall plug.");
    expect(screws('slot-clip', { screwHead: 'round' })).toBe(
      "The screw passes 3.6 mm of the clip's bar under its head, plus your wall plug.",
    );
    expect(screws('slot-clip', { fixing: 'keyhole' })).toBe(
      'The keyhole hangs on a 4 mm countersunk screw (a 90 degree head) left standing out of the wall, the top of ' +
        'its head 3.73 to 4.03 mm out.',
    );
    expect(screws('slot-clip', { fixing: 'none' })).toBeUndefined();
  });

  it('says nothing for a part with no screw', () => {
    expect(screws('fit-coupon')).toBeUndefined();
    expect(screws('seam-test')).toBeUndefined();
  });
});

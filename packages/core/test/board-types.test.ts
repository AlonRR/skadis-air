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
        if (s.max !== undefined) expect(s.default).toBeLessThanOrEqual(s.max);
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

  it('puts the fine settings under Advanced, and the size, thickness and sides on the main form (D48)', () => {
    const advanced = solid.settings.filter((s) => s.advanced).map((s) => s.key);
    expect(advanced.sort()).toEqual([
      'cornerRadiusMm',
      'lockScrewMm', // A248
      'lockScrews',
      'panelHeightMm',
      'panelWidthMm',
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

  it('offers open sides through the slots or between them, through unless set (D282)', () => {
    const seams = solid.settings.find((x) => x.key === 'seams');
    expect(seams?.kind).toBe('choice');
    if (seams?.kind !== 'choice') return;
    expect(seams.options.map((o) => [o.value, o.label])).toEqual([
      ['through', 'Through the slots'],
      ['between', 'Between the slots'],
    ]);
    expect(seams.default).toBe('through');
    // right after the sides it moves
    const keys = solid.settings.map((x) => x.key);
    expect(keys.indexOf('seams')).toBe(keys.indexOf('sides') + 1);
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
    expect(name({ screwHead: 'keyhole', lockScrews: 'bottom', lockScrewMm: 4 })).toBe(
      'skadis-solid-160x160-keyholes-lock-screws-4mm.stl',
    );
    expect(name({ screwHead: 'keyhole', lockScrewMm: 4 })).toBe('skadis-solid-160x160-keyholes.stl'); // no lock screws
    expect(name({ lockScrews: 'bottom' })).toBe('skadis-solid-160x160.stl'); // lock screws go only with keyholes
    // lock screws alone (D289), their size where it is not the starting one
    expect(name({ screwHead: 'lock', standoffs: 'back' })).toBe('skadis-solid-160x160-lock-screws-standoffs-15mm.stl');
    expect(name({ screwHead: 'lock', lockScrewMm: 4, screwMm: 3.5, standoffs: 'back' })).toBe(
      'skadis-solid-160x160-lock-screws-4mm-standoffs-15mm.stl',
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
    if (!flat.ok) expect(flat.problem).toContain('standoffs at least 14.2 mm');
  });
});

describe('the lightened board type (D141 to D145)', () => {
  const [lightened, solid] = [LIGHTENED, SOLID];

  it('is listed with the boards, right after the solid board', () => {
    const ids = BOARD_TYPES.map((t) => t.id);
    expect(ids.indexOf('lightened')).toBe(ids.indexOf('solid') + 1);
    expect(groupOf(lightened)).toBe('board');
  });

  it("takes every one of the solid board's settings, at the same starting values, and its own rim and web", () => {
    const own = lightened.settings.map((s) => s.key);
    const shared = own.filter((k) => k !== 'rimMm' && k !== 'webMm');
    expect(shared).toEqual(solid.settings.map((s) => s.key));
    const { rimMm, webMm, ...rest } = defaultValues(lightened.settings);
    expect([rimMm, webMm]).toEqual([3, 3]); // D143
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
    expect(defaultValues(standoff.settings)).toEqual({ boards: '1', heightMm: 15, screwMm: 4 });
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
    // the peg clearance, the screw size and its head under Advanced; the fixing on the main form
    const advanced = slotClip.settings.filter((s) => 'advanced' in s && s.advanced === true).map((s) => s.key);
    expect(advanced).toEqual(['pegClearanceMm', 'screwMm', 'screwHead']);
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
      depthMm: 14,
    });
    expect(keyhole.ok).toBe(false);
    if (!keyhole.ok) expect(keyhole.problem).toContain('14.2 mm');
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

  it('says between the slots which corners keep their screw, and when none does (D289)', () => {
    const some = { left: 'closed', right: 'open', bottom: 'closed', top: 'closed' };
    expect(screws('solid', { seams: 'between', sides: some as never })).toBe(
      "Only the 2 corners whose sides are both closed have a screw. Each corner screw passes the board's 5 mm, plus " +
        'any standoff behind it and your wall plug.',
    );
    expect(screws('lightened', { seams: 'between' })).toBe(
      'No corner has a screw: each is on a side between the slots, where a screw would land on a slot. Keyholes ' +
        'hold such a board.',
    );
    // closed all round, every corner keeps its screw
    const closed = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
    expect(screws('solid', { seams: 'between', sides: closed as never })).toBe(screws('solid'));
  });

  it("says where a keyhole's screw stands, and what a lock screw passes", () => {
    const keyholes = { screwHead: 'keyhole', standoffs: 'back' };
    expect(screws('solid', keyholes)).toBe(
      "Each keyhole hangs on a pan-head screw left standing out of the wall, its head's underside 1.5 to 1.8 mm " +
        'off it, the head 4.7 to 5 mm out.',
    );
    expect(screws('solid', { ...keyholes, lockScrews: 'bottom' })).toBe(
      "Each keyhole hangs on a pan-head screw left standing out of the wall, its head's underside 1.5 to 1.8 mm " +
        'off it, the head 4.7 to 5 mm out. Each lock screw passes 4.7 mm of standoff under its head, plus your ' +
        'wall plug.',
    );
  });

  it('says what each lock screw passes, with lock screws alone (D289)', () => {
    expect(screws('solid', { screwHead: 'lock', standoffs: 'back' })).toBe(
      'Each lock screw passes 4.7 mm of standoff under its head, plus your wall plug.',
    );
    expect(screws('skeleton', { screwHead: 'lock', standoffs: 'back', seams: 'between' })).toBe(
      'Each lock screw passes 4.7 mm of standoff under its head, plus your wall plug.',
    );
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
      "The keyhole hangs on a pan-head screw left standing out of the wall, its head's underside 1.5 to 1.8 mm off " +
        'it, the head 4.7 to 5 mm out.',
    );
    expect(screws('slot-clip', { fixing: 'none' })).toBeUndefined();
  });

  it('says nothing for a part with no screw', () => {
    expect(screws('fit-coupon')).toBeUndefined();
    expect(screws('seam-test')).toBeUndefined();
  });
});

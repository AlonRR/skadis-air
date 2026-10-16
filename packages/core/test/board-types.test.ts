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

  it('adds to the name only the mounting that differs from the starting one (C85)', () => {
    const v = defaultValues(solid.settings);
    const name = (given: Record<string, string | number>) => boardFileName(solid, { ...v, ...given }, 'stl');
    expect(name({ screwHead: 'round', standoffs: 'back' })).toBe('skadis-solid-160x160-round-head-standoffs-20mm.stl');
    expect(name({ screwHead: 'none', screwMm: 3.5 })).toBe('skadis-solid-160x160-no-holes.stl');
    expect(name({ screwMm: 3.5, standoffHeightMm: 25 })).toBe('skadis-solid-160x160-screw-3.5mm.stl');
    expect(name({ screwHead: 'keyhole' })).toBe('skadis-solid-160x160-keyholes.stl');
    expect(name({ screwHead: 'keyhole', lockScrews: 'bottom' })).toBe('skadis-solid-160x160-keyholes-lock-screws.stl');
    expect(name({ lockScrews: 'bottom' })).toBe('skadis-solid-160x160.stl'); // lock screws go only with keyholes
  });

  it('offers keyholes, which stand on standoffs, and says keyholes without them are a problem (D156, D190)', () => {
    const v = defaultValues(solid.settings);
    const head = solid.settings.find((s) => s.key === 'screwHead');
    expect(head?.kind === 'choice' && head.options.map((o) => o.label)).toEqual([
      'Countersunk',
      'Round head',
      'Keyholes',
      'None',
    ]);
    const keyholes = buildBoard(engine, solid, { ...v, screwHead: 'keyhole', standoffs: 'back' });
    expect(keyholes.ok).toBe(true);
    if (keyholes.ok) made.push(keyholes.solid);
    const flat = buildBoard(engine, solid, { ...v, screwHead: 'keyhole' });
    expect(flat.ok).toBe(false);
    if (!flat.ok) expect(flat.problem).toContain('standoffs at least 8 mm');
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

  it('is a connector, 20 mm tall for a 4 mm screw unless set', () => {
    expect(groupOf(standoff)).toBe('connector');
    expect(defaultValues(standoff.settings)).toEqual({ boards: '1', heightMm: 20, screwMm: 4 });
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

  it('comes for 2 and 4 boards (D92), and prints as built, wall face down, so its tunnel needs no bridging', () => {
    for (const [boards, genus] of [
      ['2', 2],
      ['4', 4],
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
    expect(name({})).toBe('skadis-standoff-1-board-20mm.stl');
    expect(name({ heightMm: 25, screwMm: 3.5 })).toBe('skadis-standoff-1-board-25mm-screw-3.5mm.stl');
    expect(name({ boards: '4' })).toBe('skadis-standoff-4-boards-20mm.stl');
  });
});

describe('the slot clip connector type (D187 to D189, D194, D195, C191, C199)', () => {
  const slotClip = boardType('slot-clip');

  it('is a connector, listed after the standoff, for 2 boards side by side, 20 mm deep, ribs and no fixing unless set', () => {
    expect(groupOf(slotClip)).toBe('connector');
    const ids = BOARD_TYPES.map((t) => t.id);
    expect(ids.indexOf('slot-clip')).toBe(ids.indexOf('standoff') + 1);
    expect(defaultValues(slotClip.settings)).toEqual({
      boards: '2',
      fixing: 'none',
      depthMm: 20,
      grip: 'ribs',
      pegClearanceMm: 0.4,
      screwMm: 4,
    });
  });

  it('offers 2 boards side by side or one above the other, or 4; no fixing, a screw or a keyhole; ribs or a lip', () => {
    const options = (key: string) => {
      const s = slotClip.settings.find((setting) => setting.key === key);
      return s?.kind === 'choice' && s.options.map((o) => o.value);
    };
    expect(options('boards')).toEqual(['2', '2-stacked', '4']);
    expect(options('fixing')).toEqual(['none', 'screw', 'keyhole']);
    expect(options('grip')).toEqual(['ribs', 'lip']);
    // the grip, the peg clearance and the screw size under Advanced; the fixing on the main form
    const advanced = slotClip.settings.filter((s) => 'advanced' in s && s.advanced === true).map((s) => s.key);
    expect(advanced).toEqual(['grip', 'pegClearanceMm', 'screwMm']);
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
    expect(built.solid.genus()).toBe(1);
    expect(printed.boundingBox().max[2]).toBeCloseTo(27.5, 6);
    // the bar is at the bed, only the pegs at the top
    const [low, high] = [printed.slice(1), printed.slice(27)];
    expect(high.area()).toBeLessThan(low.area() / 4);
    low.delete();
    high.delete();
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

  it('names its file with the boards it joins, its depth, a lip, a fixing, and what differs from the start', () => {
    const name = (given: Record<string, number | string>) =>
      boardFileName(slotClip, { ...defaultValues(slotClip.settings), ...given }, 'stl');
    expect(name({})).toBe('skadis-slot-clip-2-boards-20mm.stl');
    expect(name({ boards: '2-stacked' })).toBe('skadis-slot-clip-2-boards-stacked-20mm.stl');
    expect(name({ boards: '4', depthMm: 25, pegClearanceMm: 0.3 })).toBe(
      'skadis-slot-clip-4-boards-25mm-clearance-0.3mm.stl',
    );
    expect(name({ fixing: 'screw' })).toBe('skadis-slot-clip-2-boards-20mm-screw.stl');
    expect(name({ grip: 'lip', fixing: 'keyhole', screwMm: 3.5 })).toBe(
      'skadis-slot-clip-2-boards-20mm-lip-keyhole-screw-3.5mm.stl',
    );
    expect(name({ screwMm: 3.5 })).toBe('skadis-slot-clip-2-boards-20mm.stl'); // no screw, so no screw size
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

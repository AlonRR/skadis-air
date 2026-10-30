// Standoffs for double-sided tape (D593, 30 Oct 2026: "Add a standoffs on boards and connectors that is ment for double
// sided sticky tape"), the tape's width a setting of its own (Q594: "set a standard with a size option"), and the
// standoff connector held by a nut under the boards' screws (D592 a: "Make a standoffs connector version that uses M
// nuts"). Each claim is measured on the solid.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams } from '../src/board-solid.js';
import { boardFileName, boardType, buildBoard } from '../src/board-types/index.js';
import { loadEngine } from '../src/engine.js';
import { mountingCuts, mountingParams, type MountingParams } from '../src/mounting.js';
import { printPose } from '../src/print-pose.js';
import { defaultValues, optionsOff, readValues, settingsNotApplying } from '../src/settings.js';
import { ALL_OPEN } from '../src/slots.js';
import { ISO_4032_NUTS, makeStandoff, standoffParams, type StandoffParams } from '../src/standoff.js';
import { meshOf } from '../src/stl.js';
import { TAPE_LENGTH_SETTING, TAPE_WIDTH_SETTING } from '../src/tape.js';
import { degenerateFacets } from './facets.js';
import { hookRoomZone, slotClearZone } from './slot-zone.js';

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

const HOOK_ROOM = 8; // a hook's 6 mm behind the board and C99's 2 mm
const taped = (given: Partial<MountingParams> = {}, columns = 2, rows = 2) => {
  const p = solidBoardParams({ columns, rows });
  const m = mountingParams({ screwHead: 'none', standoffHeightMm: 15, tapeMm: 12, tapeLengthMm: 18, ...given });
  return keep(makeSolidBoard(engine, p, mountingCuts(m, p)));
};

/** The area of the faces that face down more steeply than 45 degrees as the part prints, their middles between z0
 * and z1: a 45 degree face is read as one, its normal off by up to 1e-4 in the mesh's 32-bit points. */
function facingDown(solid: Manifold, z0: number, z1: number): number {
  const mesh = meshOf(solid);
  const corner = (t: number, k: number): [number, number, number] => {
    const v = (mesh.triangles[t * 3 + k] ?? 0) * 3;
    return [mesh.positions[v] ?? 0, mesh.positions[v + 1] ?? 0, mesh.positions[v + 2] ?? 0];
  };
  let area = 0;
  for (let t = 0; t < mesh.triangles.length / 3; t++) {
    const [a, b, c] = [corner(t, 0), corner(t, 1), corner(t, 2)];
    const [ux, uy, uz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const [wx, wy, wz] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
    const length = Math.hypot(...normal);
    const middle = (a[2] + b[2] + c[2]) / 3;
    if (length > 1e-9 && middle > z0 && middle < z1 && (normal[2] ?? 0) / length < -Math.SQRT1_2 - 1e-4) {
      area += length / 2;
    }
  }
  return area;
}

describe('the tape (Q594; the owner, 30 Oct 2026: "rectangular as tape comes on a roll")', () => {
  it('is a piece of a roll: 19 mm tape cut 19 mm long unless set (D603 b)', () => {
    const of = (t: typeof TAPE_WIDTH_SETTING | typeof TAPE_LENGTH_SETTING) => [t.key, t.default, t.min, t.max];
    expect(of(TAPE_WIDTH_SETTING)).toEqual(['tapeWidthMm', 19, 10, 40]);
    expect(of(TAPE_LENGTH_SETTING)).toEqual(['tapeLengthMm', 19, 10, 60]);
    for (const type of [boardType('solid'), boardType('lightened'), boardType('skeleton'), boardType('standoff')]) {
      for (const key of ['tapeWidthMm', 'tapeLengthMm'])
        expect(
          type.settings.filter((s) => s.key === key),
          `${type.id} ${key}`,
        ).toHaveLength(1);
    }
  });
});

describe('tape standoffs on a board (D593)', () => {
  it('end at the wall in a flat rectangular pad the piece of tape, on each corner post, with no hole', () => {
    const board = taped();
    expect(board.boundingBox().min[2]).toBeCloseTo(-15, 9);
    // 0.75 mm off the wall, past the pad's 0.5 mm chamfer: four rectangles 18 mm along the board's width and 12 mm up
    const pads = keep(board.slice(-15 + 0.75));
    expect(Math.abs(pads.area() - 4 * 18 * 12) / (4 * 18 * 12)).toBeLessThan(1e-6);
    const polygons = pads.toPolygons();
    expect(polygons).toHaveLength(4); // four rectangles, no hole in any
    for (const polygon of polygons) {
      const xs = polygon.map(([x]) => x);
      const ys = polygon.map(([, y]) => y);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(18, 6);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(12, 6);
    }
    const plain = keep(makeSolidBoard(engine, solidBoardParams({ columns: 2, rows: 2 })));
    expect(board.genus()).toBe(plain.genus()); // nothing passes through a post or a pad
  });

  it("stay out of the hooks' room and the slots' 8 mm behind the board, and only past it grow to their pads", () => {
    const zoneBoard = { columns: 2, rows: 2, sides: ALL_OPEN };
    const board = taped({ tapeMm: 14, tapeLengthMm: 20, standoffHeightMm: 17 }, 2, 2);
    expect(keep(board.intersect(slotClearZone(engine, zoneBoard, 2, HOOK_ROOM - 0.05, keep))).volume()).toBe(0);
    expect(keep(board.intersect(hookRoomZone(engine, zoneBoard, 2, HOOK_ROOM - 0.05, keep))).volume()).toBe(0);
    // the control: deeper, the pads reach behind the hooks' room
    expect(keep(board.intersect(hookRoomZone(engine, zoneBoard, 2, 14.5, keep))).volume()).toBeGreaterThan(0);
  });

  it('print with nothing facing down past 45 degrees, the pad flaring out from its post', () => {
    const board = taped({ tapeMm: 16, tapeLengthMm: 20, standoffHeightMm: 20 }, 3, 3);
    // as it prints, face down: the posts and pads from 5 mm up, past the plate, to 25 mm
    expect(facingDown(keep(printPose(board)), 5.05, 25.1)).toBe(0);
  });

  it('refuses standoffs too short for the pad to flare to its corners behind the hooks, saying how tall', () => {
    // the default piece fits the default 15 mm standoffs; its corners 10.82 mm from the post's middle
    const cut = () => taped({ standoffHeightMm: 14.5 });
    expect(cut).toThrow(/at least 14.82 mm/);
    expect(taped({ standoffHeightMm: 14.82 }).volume()).toBeGreaterThan(0);
    expect(() => taped({ tapeMm: 19, tapeLengthMm: 19 })).toThrow(/at least 17.44 mm/);
  });

  it('refuses a pad wider than its corner leaves on the board, and screw holes with tape', () => {
    expect(() => taped({ tapeLengthMm: 22, standoffHeightMm: 25 })).toThrow(/at most 20 mm/);
    expect(() => taped({ tapeMm: 21, standoffHeightMm: 25 })).toThrow(/at most 20 mm/);
    expect(() => mountingParams({ screwHead: 'countersunk', standoffHeightMm: 15, tapeMm: 12 })).toThrow(RangeError);
    expect(() => mountingParams({ screwHead: 'none', standoffHeightMm: 0, tapeMm: 12 })).toThrow(RangeError);
  });

  it('exports with no degenerate facet, on the lattice boards too', () => {
    expect(degenerateFacets(meshOf(taped()))).toBe(0);
    for (const id of ['lightened', 'skeleton']) {
      const type = boardType(id);
      const read = readValues(type.settings, { standoffs: 'tape' });
      if (!read.ok) throw new Error(`${id}: ${read.errors.map((e) => e.message).join('; ')}`);
      const built = buildBoard(engine, type, read.values);
      expect(built.ok, id).toBe(true);
      if (!built.ok) continue;
      made.push(built.solid);
      expect(degenerateFacets(meshOf(built.solid)), id).toBe(0);
    }
  });
});

describe('the board form with tape standoffs (D593, the D589 mechanism)', () => {
  const solid = boardType('solid');

  it('rules out every screw hole but None with tape, saying why, and reads them as None', () => {
    const out = optionsOff(solid.settings, { standoffs: 'tape' })['screwHead'] ?? {};
    expect(Object.keys(out).sort()).toEqual(['countersunk', 'keyhole', 'lock', 'round']);
    expect(Object.values(out)[0]).toMatch(/tape/);
    const read = readValues(solid.settings, { standoffs: 'tape', screwHead: 'keyhole' });
    expect(read.ok && [read.values.screwHead, read.values.standoffs]).toEqual(['none', 'tape']);
  });

  it('names the file by its tape and standoffs, not its holes', () => {
    const read = readValues(solid.settings, { standoffs: 'tape' });
    expect(read.ok && boardFileName(solid, read.values, 'stl')).toBe(
      'skadis-solid-160x160-tape-19x19mm-standoffs-18mm.stl',
    );
  });

  it('starts the standoffs at 18 mm with tape, which a 19 x 19 mm piece needs, unless set (D603 b)', () => {
    for (const id of ['solid', 'lightened', 'skeleton']) {
      const type = boardType(id);
      const height = (given: Record<string, unknown>) => {
        const read = readValues(type.settings, given);
        return read.ok ? read.values['standoffHeightMm'] : read.errors;
      };
      expect(height({ standoffs: 'tape' }), id).toBe(18);
      expect(height({ standoffs: 'back' }), id).toBe(15);
      expect(height({ standoffs: 'tape', standoffHeightMm: '20' }), id).toBe(20);
      // every screw size leaves the default piece room on 18 mm: the least is 17.94 mm, for M3
      for (const screwMm of [3, 3.5, 4, 4.5, 5]) {
        const read = readValues(type.settings, { standoffs: 'tape', screwMm });
        expect(read.ok && buildBoard(engine, type, read.values).ok, `${id} M${screwMm}`).toBe(true);
      }
    }
  }, 120_000); // 15 boards, the skeletons slow: about 8 s, past vitest's 5 s
});

/** The pull nut's seat (D607 a, 30 Oct 2026: "607 a"): on the screw's axis, open at the wall face, from 3 mm up, the nut
 * plus 0.2 mm across its flats and 0.1 mm over its height, a way in 0.1 mm looser below it. */
const LIFT = 3;
const seatOf = (screwMm: number, fitMm = 0.2) => {
  const nut = ISO_4032_NUTS[screwMm] ?? { acrossMm: 0, tallMm: 0 };
  return { nut, across: nut.acrossMm + fitMm, bottom: LIFT, top: LIFT + nut.tallMm + 0.1 };
};
/** A hexagonal prism `across` its flats, its corners along x, from z0 to z1 at (x, y). */
const hexPrism = (across: number, z0: number, z1: number, x = 0, y = 0) =>
  keep(keep(keep(engine.CrossSection.circle(across / Math.sqrt(3), 6)).extrude(z1 - z0)).translate([x, y, z0]));
const hexArea = (across: number) => (Math.sqrt(3) / 2) * across * across;
const POSTS = { '1': 1, '2': 2, '2-stacked': 2, '4': 4 } as const;

describe('the nut standoff connector (D592 a), its nut pulled into a seat from the wall (D607 a)', () => {
  const nutted = (given: Partial<StandoffParams> = {}) =>
    keep(makeStandoff(engine, standoffParams({ fixing: 'nut', ...given })));

  it('takes ISO 4032 nuts for M3 to M5, and refuses a screw size with no such nut', () => {
    expect(ISO_4032_NUTS).toEqual({
      3: { acrossMm: 5.5, tallMm: 2.4 },
      4: { acrossMm: 7, tallMm: 3.2 },
      5: { acrossMm: 8, tallMm: 4.7 },
    });
    expect(() => standoffParams({ fixing: 'nut', screwMm: 3.5 })).toThrow(/3, 4 or 5 mm/);
    expect([standoffParams({ fixing: 'nut' }).tapeMm, standoffParams({ fixing: 'nut' }).tapeLengthMm]).toEqual([
      19, 19,
    ]);
  });

  it("stands on a flat rectangular pad the piece of tape, the nut's way in its only hole", () => {
    const part = nutted();
    const box = part.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-9.5, -9.5, 0]);
    expect(box.max[2]).toBeCloseTo(15, 9);
    const foot = keep(part.slice(1));
    expect(foot.toPolygons()).toHaveLength(2); // the pad's outline and the way in
    const left = 19 * 19 - hexArea(7.3);
    expect(Math.abs(foot.area() - left) / left).toBeLessThan(0.01);
  });

  for (const fixing of ['nut', 'nut-screwed'] as const) {
    it(`${fixing}: holds the nut in a seat on the screw's axis, the nut + 0.2 mm, the way in 0.1 mm looser`, () => {
      for (const screwMm of [3, 4, 5] as const) {
        const part = keep(makeStandoff(engine, standoffParams({ fixing, screwMm, heightMm: 18 })));
        const { nut, bottom, top } = seatOf(screwMm);
        const at = `${fixing} M${screwMm}`;
        const solidIn = (m: Manifold) => keep(part.intersect(m)).volume();
        // the seat: the nut + 0.15 fits, the nut + 0.25 does not; the way in below it passes the nut + 0.25
        expect(solidIn(hexPrism(nut.acrossMm + 0.15, bottom + 0.02, top - 0.02)), at).toBeLessThan(1e-6);
        expect(solidIn(hexPrism(nut.acrossMm + 0.25, bottom + 0.02, top - 0.02)), at).toBeGreaterThan(0);
        expect(solidIn(hexPrism(nut.acrossMm + 0.25, -1, bottom - 0.12)), at).toBeLessThan(1e-6);
        // a ceiling over the seat: just above it, the post is whole but for the screw's hole and the bridges' steps
        expect(solidIn(hexPrism(nut.acrossMm + 0.15, top + 0.05, top + 0.25)), at).toBeGreaterThan(0);
        // no way in from the side any more: a box the nut's size from the post's side outward is solid in part
        const way = keep(
          engine.Manifold.cube([20, nut.acrossMm, nut.tallMm]).translate([4, -nut.acrossMm / 2, bottom]),
        );
        expect(solidIn(way), at).toBeGreaterThan(1);
      }
    });

    it(`${fixing}: keeps at least 2.4 mm of post round the nut's seat, for 1 board and 4`, () => {
      for (const screwMm of [3, 4, 5] as const) {
        for (const boards of ['1', '4'] as const) {
          const part = keep(makeStandoff(engine, standoffParams({ fixing, screwMm, boards, heightMm: 18 })));
          const { across, bottom, top } = seatOf(screwMm);
          const [x, y] = boards === '1' ? [0, 0] : [10, 10];
          const corner = across / Math.sqrt(3);
          const band = keep(
            keep(engine.CrossSection.circle(corner + 2.4, 64)).subtract(keep(engine.CrossSection.circle(corner, 6))),
          );
          const ring = keep(keep(band.extrude(0.5)).translate([x, y, (bottom + top) / 2 - 0.25]));
          const share = keep(part.intersect(ring)).volume() / ring.volume();
          expect(share, `${fixing} M${screwMm} ${boards}`).toBeGreaterThan(0.999);
        }
      }
    });

    it(`${fixing}: builds for every board count, nothing over air but the seats' bridged ceilings`, () => {
      for (const boards of ['1', '2', '2-stacked', '4'] as const) {
        const part = keep(makeStandoff(engine, standoffParams({ fixing, boards, heightMm: 18 })));
        expect(part.volume(), boards).toBeGreaterThan(0);
        expect(degenerateFacets(meshOf(part)), boards).toBe(0);
        const down = facingDown(part, 0.05, 18.1);
        expect(down, boards).toBeGreaterThan(0); // the control: the ceilings are seen
        expect(down, boards).toBeLessThan(POSTS[boards] * hexArea(7.3));
      }
    });
  }

  it('leaves the hooks their room at a seam, its pad and the nuts behind it', () => {
    const board = { columns: 4, rows: 2, sides: ALL_OPEN };
    for (const fixing of ['nut', 'nut-screwed'] as const) {
      const part = keep(makeStandoff(engine, standoffParams({ fixing, boards: '2', heightMm: 18 })));
      const placed = keep(part.translate([80, 10, -18 - 0.005]));
      const hooks = hookRoomZone(engine, board, 2, HOOK_ROOM - 0.05, keep);
      const slots = slotClearZone(engine, board, 2, HOOK_ROOM - 0.05, keep);
      expect(keep(placed.intersect(hooks)).volume(), fixing).toBeLessThan(1e-6);
      expect(keep(placed.intersect(slots)).volume(), fixing).toBeLessThan(1e-6);
    }
  });

  it("refuses one too short for the nut's seat behind the hooks' room, saying how tall", () => {
    // the seat from 3 mm up, the nut and 0.1 mm, two 0.3 mm bridging steps, then the hooks' 8 mm
    expect(() => standoffParams({ fixing: 'nut', heightMm: 14.5 })).toThrow(/at least 14\.9 mm/);
    expect(() => standoffParams({ fixing: 'nut', heightMm: 14.9 })).not.toThrow();
    expect(() => standoffParams({ fixing: 'nut-screwed', heightMm: 14.5 })).toThrow(/at least 14\.9 mm/);
    expect(() => standoffParams({ fixing: 'nut-screwed', heightMm: 15 })).not.toThrow();
    expect(() => standoffParams({ fixing: 'nut', screwMm: 5, heightMm: 16 })).toThrow(/at least 16\.4 mm/);
  });

  it('takes a nut fit, the nut + 0.2 mm unless set, under Advanced, only with a nut, and names the file by it', () => {
    const loose = keep(makeStandoff(engine, standoffParams({ fixing: 'nut', nutFitMm: 0.4 })));
    const { nut, bottom, top } = seatOf(4, 0.4);
    const seat = hexPrism(nut.acrossMm + 0.35, bottom + 0.02, top - 0.02);
    expect(keep(loose.intersect(seat)).volume()).toBeLessThan(1e-6);
    const type = boardType('standoff');
    const fit = type.settings.find((s) => s.key === 'nutFitMm');
    expect(fit?.kind).toBe('number');
    expect(fit?.kind === 'number' && fit.default).toBe(0.2);
    expect(fit?.kind === 'number' && fit.advanced).toBe(true);
    expect(settingsNotApplying(type.settings, defaultValues(type.settings))).toContain('nutFitMm');
    const read = readValues(type.settings, { standoffFixing: 'nut', nutFitMm: '0.3' });
    if (!read.ok) throw new Error(read.errors.map((e) => e.message).join('; '));
    expect(boardFileName(type, read.values, 'stl')).toBe(
      'skadis-standoff-1-board-18mm-nut-tape-19x19mm-nut-fit-0.3mm.stl',
    );
  });

  it('is named by its nut and tape, says what screw it takes, to pull each nut in first and to tighten snug', () => {
    const type = boardType('standoff');
    const read = readValues(type.settings, { standoffFixing: 'nut' });
    if (!read.ok) throw new Error(read.errors.map((e) => e.message).join('; '));
    const v = read.values;
    // taped, it starts at the tape boards' 18 mm, so the parts of a taped wall match (C604)
    expect(boardFileName(type, v, 'stl')).toBe('skadis-standoff-1-board-18mm-nut-tape-19x19mm.stl');
    const note = type.screws?.(v) ?? '';
    // from the board face through the nut, to 0.5 mm short of the wall: 5 + 18 - 3.1 and 5 + 18 - 0.5
    expect(note).toMatch(/countersunk M4 machine screw, 19\.9 to 22\.5 mm long/);
    expect(note).toMatch(/pull each nut/i);
    expect(note).toMatch(/snug/);
    // the help names the boards it holds: a board on tape standoffs has no screw holes for it
    expect(type.settings.find((s) => s.key === 'standoffFixing')?.help ?? '').toMatch(/no standoffs of their own/);
    expect(type.settings.find((s) => s.key === 'heightMm')?.help ?? '').not.toMatch(/as tape boards stand/);
  });
});

describe('the nut standoff screwed to the wall (D600 y, 30 Oct 2026)', () => {
  const screwed = (given: Partial<StandoffParams> = {}) =>
    keep(makeStandoff(engine, standoffParams({ fixing: 'nut-screwed', ...given })));
  const BOARDS = ['1', '2', '2-stacked', '4'] as const;

  it('stands on a foot with no tape pad, the foot screws through it, countersunk from the board side', () => {
    for (const boards of BOARDS) {
      const part = screwed({ boards });
      expect(part.volume(), boards).toBeGreaterThan(0);
      expect(degenerateFacets(meshOf(part)), boards).toBe(0);
      const holes = footScrews(boards);
      expect(holes.length, boards).toBe(2);
      for (const [x, y] of holes) {
        // a 4.5 mm hole through the foot, from the wall face up
        const shaft = keep(keep(keep(engine.CrossSection.circle(2.2, 24)).extrude(20)).translate([x, y, -1]));
        expect(keep(part.intersect(shaft)).volume(), `${boards} ${x},${y}`).toBeLessThan(1e-6);
        // the foot round it: a ring 2 mm wider than the countersink, at the wall
        const ring = keep(
          keep(keep(engine.CrossSection.circle(6.5, 24)).subtract(keep(engine.CrossSection.circle(5, 24)))).extrude(
            0.5,
          ),
        ).translate([x, y, 0.2]);
        expect(keep(part.intersect(keep(ring))).volume(), `${boards} ${x},${y}`).toBeGreaterThan(0);
        // a countersink for the head at the foot's top, 9 mm across: a disc 8 mm across just under its top is empty
        const top = footTop(part, x, y);
        const head = keep(keep(keep(engine.CrossSection.circle(3.9, 24)).extrude(0.3)).translate([x, y, top - 0.4]));
        expect(keep(part.intersect(head)).volume(), `${boards} ${x},${y}`).toBeLessThan(1e-6);
      }
      // nothing of the foot reaches into the hooks' room next to the boards: the foot's top is behind it
      expect(Math.max(...holes.map(([x, y]) => footTop(part, x, y))), boards).toBeLessThanOrEqual(15 - 8 + 1e-6);
    }
  });

  it('is named by its nut and screws, with no tape, and says both screws', () => {
    const type = boardType('standoff');
    const v = { ...defaultValues(type.settings), standoffFixing: 'nut-screwed' };
    expect(boardFileName(type, v, 'stl')).toBe('skadis-standoff-1-board-15mm-nut-screwed.stl');
    const note = type.screws?.(v) ?? '';
    expect(note).toMatch(/countersunk M4 machine screw/);
    expect(note).toMatch(/foot/);
  });
});

describe('the standoff for wood or PT screws (D611, 30 Oct 2026)', () => {
  const tapped = (given: Partial<StandoffParams> = {}) =>
    keep(makeStandoff(engine, standoffParams({ fixing: 'self-tap', ...given })));
  const pilotOf = (screwMm: number) => Math.round((0.85 * screwMm) / 0.05) * 0.05;

  it('starts its pilot hole at 0.85 times the screw, as the standoff trial does (D267)', () => {
    expect(standoffParams({ fixing: 'self-tap' }).pilotHoleMm).toBeCloseTo(3.4, 9);
    expect(standoffParams({ fixing: 'self-tap', screwMm: 3 }).pilotHoleMm).toBeCloseTo(2.55, 9);
    expect(() => standoffParams({ fixing: 'self-tap', pilotHoleMm: 4.5 })).toThrow(/pilot/);
  });

  for (const fixing of ['self-tap', 'self-tap-screwed'] as const) {
    it(`${fixing}: builds for every screw size and board count, nothing over air, no degenerate facet`, () => {
      for (const screwMm of [3, 3.5, 4, 5]) {
        for (const boards of ['1', '2', '2-stacked', '4'] as const) {
          const part = keep(makeStandoff(engine, standoffParams({ fixing, screwMm, boards, heightMm: 18 })));
          const at = `${fixing} M${screwMm} ${boards}`;
          expect(part.decompose().length, at).toBe(1);
          expect(degenerateFacets(meshOf(part)), at).toBe(0);
          expect(facingDown(part, 0.05, 18.1), at).toBeLessThan(0.01);
        }
      }
    });

    it(`${fixing}: each post a pilot hole the screw cuts its thread in, from the board face down`, () => {
      for (const screwMm of [3, 4, 5]) {
        const pilot = pilotOf(screwMm);
        const part = keep(makeStandoff(engine, standoffParams({ fixing, screwMm, heightMm: 18 })));
        const bottom = fixing === 'self-tap' ? 3 : 0;
        const rod = (d: number, z0: number, z1: number) =>
          keep(keep(keep(engine.CrossSection.circle(d / 2, 48)).extrude(z1 - z0)).translate([0, 0, z0]));
        const at = `${fixing} M${screwMm}`;
        expect(keep(part.intersect(rod(pilot - 0.05, bottom + 0.05, 17.4))).volume(), at).toBeLessThan(1e-6);
        expect(keep(part.intersect(rod(pilot + 0.2, bottom + 0.5, 17))).volume(), at).toBeGreaterThan(0);
      }
    });
  }

  it('taped: stands on a whole pad the piece of tape, the pilot ending 3 mm above the wall', () => {
    const part = tapped();
    const foot = keep(part.slice(1));
    expect(foot.toPolygons()).toHaveLength(1);
    expect(Math.abs(foot.area() - 19 * 19) / (19 * 19)).toBeLessThan(0.01);
    expect(keep(part.slice(2.9)).toPolygons()).toHaveLength(1);
  });

  it('screwed: its foot screws as the nut one has them, its pilots through to the wall', () => {
    for (const boards of ['1', '2', '2-stacked', '4'] as const) {
      const part = keep(makeStandoff(engine, standoffParams({ fixing: 'self-tap-screwed', boards })));
      // the foot's outline, two foot screws' holes and each post's pilot
      expect(keep(part.slice(0.5)).toPolygons().length, boards).toBe(1 + 2 + POSTS[boards]);
    }
  });

  it('leaves the hooks their room at a seam', () => {
    const board = { columns: 4, rows: 2, sides: ALL_OPEN };
    for (const fixing of ['self-tap', 'self-tap-screwed'] as const) {
      const part = keep(makeStandoff(engine, standoffParams({ fixing, boards: '2', heightMm: 18 })));
      const placed = keep(part.translate([80, 10, -18 - 0.005]));
      const hooks = hookRoomZone(engine, board, 2, HOOK_ROOM - 0.05, keep);
      const slots = slotClearZone(engine, board, 2, HOOK_ROOM - 0.05, keep);
      expect(keep(placed.intersect(hooks)).volume(), fixing).toBeLessThan(1e-6);
      expect(keep(placed.intersect(slots)).volume(), fixing).toBeLessThan(1e-6);
    }
  });

  it("refuses one too short for 2.5 screw diameters of thread, or for its pad or foot behind the hooks' room", () => {
    expect(() => standoffParams({ fixing: 'self-tap', heightMm: 12.5 })).toThrow(/at least 13 mm/);
    expect(() => standoffParams({ fixing: 'self-tap', heightMm: 13 })).not.toThrow();
    expect(() => standoffParams({ fixing: 'self-tap-screwed', heightMm: 11.5 })).toThrow(/at least 12 mm/);
  });

  it('is a choice of its own, with tape, a pilot hole under Advanced, named by both, and says what screw it takes', () => {
    const type = boardType('standoff');
    const fixing = type.settings.find((s) => s.key === 'standoffFixing');
    const options = fixing?.kind === 'choice' ? fixing.options.map((o) => o.value) : [];
    expect(options).toEqual(['screw', 'nut', 'nut-screwed', 'self-tap', 'self-tap-screwed']);
    const pilot = type.settings.find((s) => s.key === 'pilotHoleMm');
    expect(pilot?.kind === 'number' && pilot.advanced).toBe(true);
    expect(settingsNotApplying(type.settings, defaultValues(type.settings))).toContain('pilotHoleMm');
    const read = readValues(type.settings, { standoffFixing: 'self-tap' });
    if (!read.ok) throw new Error(read.errors.map((e) => e.message).join('; '));
    const v = read.values;
    expect([v['heightMm'], v['pilotHoleMm']]).toEqual([18, 3.4]);
    expect(settingsNotApplying(type.settings, v)).not.toContain('tapeWidthMm');
    expect(boardFileName(type, v, 'stl')).toBe('skadis-standoff-1-board-18mm-self-tap-tape-19x19mm.stl');
    const note = type.screws?.(v) ?? '';
    // 5 mm of board and 2.5 x 4 mm of thread; to 3 mm above the wall: 5 + 18 - 3
    expect(note).toMatch(/countersunk 4 mm wood or PT screw, 15 to 20 mm long/);
    expect(note).toMatch(/3\.4 mm pilot/);
    expect(note).toMatch(/snug/);
    const given = readValues(type.settings, { standoffFixing: 'self-tap-screwed', pilotHoleMm: '3.2' });
    if (!given.ok) throw new Error(given.errors.map((e) => e.message).join('; '));
    expect(boardFileName(type, given.values, 'stl')).toBe(
      'skadis-standoff-1-board-15mm-self-tap-screwed-pilot-3.2mm.stl',
    );
    expect(type.screws?.(given.values)).toMatch(/foot/);
  });
});

/** Where the screwed standoff's foot screws are, round where the boards' corners meet (D600). */
function footScrews(boards: '1' | '2' | '2-stacked' | '4'): [number, number][] {
  if (boards === '1')
    return [
      [14, 0],
      [0, 14],
    ];
  if (boards === '2')
    return [
      [0, 14],
      [0, -14],
    ];
  if (boards === '2-stacked')
    return [
      [14, 0],
      [-14, 0],
    ];
  return [
    [0, 24],
    [0, -24],
  ];
}

/** The foot's top at (x, y), beside its screw hole: the highest solid in a thin column 5.5 mm off the hole. */
function footTop(part: Manifold, x: number, y: number): number {
  const probe = keep(keep(keep(engine.CrossSection.square([0.4, 0.4], true)).extrude(20)).translate([x + 5.6, y, -1]));
  return keep(part.intersect(probe)).boundingBox().max[2];
}

describe('what the tape holds, said beside its settings (D609 a, 30 Oct 2026: "609 a")', () => {
  const tapeOf = (id: string, given: Record<string, unknown>) => {
    const type = boardType(id);
    const read = readValues(type.settings, given);
    if (!read.ok) throw new Error(read.errors.map((e) => e.message).join('; '));
    return type.tape?.(read.values);
  };

  it('on a board: its four pieces, their area and what they hold by 3M’s static rule, and to clean the pads', () => {
    for (const id of ['solid', 'lightened', 'skeleton']) {
      const note = tapeOf(id, { standoffs: 'tape' }) ?? '';
      // 4 x 19 x 19 mm = 14.44 cm2; at 4 square inches a pound, about 254 g
      expect(note, id).toMatch(/4 pieces of 19 x 19 mm tape, 14\.44 cm²/);
      expect(note, id).toMatch(/about 250 g/);
      expect(note, id).toMatch(/alcohol/);
      expect(tapeOf(id, { standoffs: 'back' }), id).toBeUndefined();
    }
    expect(tapeOf('solid', { standoffs: 'tape', tapeWidthMm: '12', tapeLengthMm: '18' })).toMatch(/8\.64 cm²/);
  });

  it('on a taped standoff: a piece at each post; none when it is not taped', () => {
    expect(tapeOf('standoff', { standoffFixing: 'nut' })).toMatch(
      /One piece of 19 x 19 mm tape, 3\.61 cm², .*about 60 g/,
    );
    expect(tapeOf('standoff', { standoffFixing: 'self-tap', boards: '4' })).toMatch(/4 pieces of 19 x 19 mm tape/);
    expect(tapeOf('standoff', { standoffFixing: 'nut-screwed' })).toBeUndefined();
    expect(tapeOf('standoff', {})).toBeUndefined();
  });
});

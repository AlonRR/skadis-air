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
import { defaultValues, optionsOff, readValues } from '../src/settings.js';
import { ALL_OPEN } from '../src/slots.js';
import { ISO_4032_NUTS, makeStandoff, standoffParams, type StandoffParams } from '../src/standoff.js';
import { meshOf } from '../src/stl.js';
import { TAPE_WIDTH_SETTING } from '../src/tape.js';
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
  const m = mountingParams({ screwHead: 'none', standoffHeightMm: 15, tapeMm: 19, ...given });
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

describe('the tape width (Q594)', () => {
  it('is one setting, 19 mm unless set, from 10 to 40 mm', () => {
    expect([
      TAPE_WIDTH_SETTING.key,
      TAPE_WIDTH_SETTING.default,
      TAPE_WIDTH_SETTING.min,
      TAPE_WIDTH_SETTING.max,
    ]).toEqual(['tapeWidthMm', 19, 10, 40]);
    for (const type of [boardType('solid'), boardType('lightened'), boardType('skeleton'), boardType('standoff')]) {
      expect(type.settings.filter((s) => s.key === 'tapeWidthMm')).toHaveLength(1);
    }
  });
});

describe('tape standoffs on a board (D593)', () => {
  it('end at the wall in a flat round pad the tape width across, on each corner post, with no hole', () => {
    const board = taped();
    expect(board.boundingBox().min[2]).toBeCloseTo(-15, 9);
    // 0.75 mm off the wall, past the pad's 0.5 mm chamfer: four discs 19 mm across, within 1 %
    const pads = keep(board.slice(-15 + 0.75));
    const four = 4 * Math.PI * 9.5 ** 2;
    expect(Math.abs(pads.area() - four) / four).toBeLessThan(0.01);
    expect(pads.toPolygons()).toHaveLength(4); // four discs, no hole in any
    const plain = keep(makeSolidBoard(engine, solidBoardParams({ columns: 2, rows: 2 })));
    expect(board.genus()).toBe(plain.genus()); // nothing passes through a post or a pad
  });

  it("stay out of the hooks' room and the slots' 8 mm behind the board, and only past it grow to their pads", () => {
    const zoneBoard = { columns: 2, rows: 2, sides: ALL_OPEN };
    const board = taped({ tapeMm: 20 }, 2, 2);
    expect(keep(board.intersect(slotClearZone(engine, zoneBoard, 2, HOOK_ROOM - 0.05, keep))).volume()).toBe(0);
    expect(keep(board.intersect(hookRoomZone(engine, zoneBoard, 2, HOOK_ROOM - 0.05, keep))).volume()).toBe(0);
    // the control: deeper, the pads reach behind the hooks' room
    expect(keep(board.intersect(hookRoomZone(engine, zoneBoard, 2, 14.5, keep))).volume()).toBeGreaterThan(0);
  });

  it('print with nothing facing down past 45 degrees, the pad flaring out from its post', () => {
    const board = taped({ tapeMm: 20, standoffHeightMm: 20 }, 3, 3);
    // as it prints, face down: the posts and pads from 5 mm up, past the plate, to 25 mm
    expect(facingDown(keep(printPose(board)), 5.05, 25.1)).toBe(0);
  });

  it('refuses standoffs too short for the pad to flare behind the hooks, saying how tall', () => {
    const cut = () => taped({ standoffHeightMm: 13 });
    expect(cut).toThrow(/at least 13.5 mm/);
    expect(taped({ standoffHeightMm: 13.5 }).volume()).toBeGreaterThan(0);
  });

  it('refuses a pad wider than its corner leaves on the board, and screw holes with tape', () => {
    expect(() => taped({ tapeMm: 22, standoffHeightMm: 20 })).toThrow(/at most 20 mm/);
    expect(() => mountingParams({ screwHead: 'countersunk', standoffHeightMm: 15, tapeMm: 19 })).toThrow(RangeError);
    expect(() => mountingParams({ screwHead: 'none', standoffHeightMm: 0, tapeMm: 19 })).toThrow(RangeError);
  });

  it('exports with no degenerate facet, on the lattice boards too', () => {
    expect(degenerateFacets(meshOf(taped()))).toBe(0);
    for (const id of ['lightened', 'skeleton']) {
      const type = boardType(id);
      const built = buildBoard(engine, type, { ...defaultValues(type.settings), standoffs: 'tape', screwHead: 'none' });
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
    const v = { ...defaultValues(solid.settings), screwHead: 'none', standoffs: 'tape' };
    expect(boardFileName(solid, v, 'stl')).toBe('skadis-solid-160x160-tape-19mm-standoffs-15mm.stl');
  });
});

describe('the nut standoff connector (D592 a)', () => {
  const nutted = (given: Partial<StandoffParams> = {}) =>
    keep(makeStandoff(engine, standoffParams({ fixing: 'nut', ...given })));

  it('takes ISO 4032 nuts for M3 to M5, and refuses a screw size with no such nut', () => {
    expect(ISO_4032_NUTS).toEqual({
      3: { acrossMm: 5.5, tallMm: 2.4 },
      4: { acrossMm: 7, tallMm: 3.2 },
      5: { acrossMm: 8, tallMm: 4.7 },
    });
    expect(() => standoffParams({ fixing: 'nut', screwMm: 3.5 })).toThrow(/3, 4 or 5 mm/);
    expect(standoffParams({ fixing: 'nut' }).tapeMm).toBe(19);
  });

  it('stands on a flat square pad the tape width a side, with no hole to the wall', () => {
    const part = nutted();
    const box = part.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-9.5, -9.5, 0]);
    expect(box.max[2]).toBeCloseTo(15, 9);
    const foot = keep(part.slice(1));
    expect(foot.toPolygons()).toHaveLength(1); // no hole through the pad
    expect(Math.abs(foot.area() - 19 * 19) / (19 * 19)).toBeLessThan(0.01);
  });

  it('holds a nut of the screw size under a roof, slid in from the side, and not one 0.5 mm larger', () => {
    for (const screwMm of [3, 4, 5] as const) {
      const part = nutted({ screwMm });
      const nut = ISO_4032_NUTS[screwMm] ?? { acrossMm: 0, tallMm: 0 };
      const floor = part.boundingBox().max[2] - 1.5 - (nut.acrossMm + 0.3) / 2 + 0.5 - (nut.tallMm + 0.3);
      const hex = (across: number, tall: number) =>
        keep(
          keep(keep(engine.CrossSection.circle(across / Math.sqrt(3), 6)).extrude(tall)).translate([
            0,
            0,
            floor + 0.05,
          ]),
        );
      expect(keep(part.intersect(hex(nut.acrossMm, nut.tallMm))).volume(), `M${screwMm}`).toBeLessThan(1e-6);
      expect(keep(part.intersect(hex(nut.acrossMm + 0.5, nut.tallMm))).volume(), `M${screwMm}`).toBeGreaterThan(0);
      // the way in: a box the nut's size from the hole out past the post's side is empty
      const way = keep(
        engine.Manifold.cube([20, nut.acrossMm, nut.tallMm]).translate([0, -nut.acrossMm / 2, floor + 0.05]),
      );
      expect(keep(part.intersect(way)).volume(), `M${screwMm}`).toBeLessThan(1e-6);
      // a roof over it: at 0.75 mm under the board face, the post is whole round the screw's hole
      const roof = keep(part.slice(part.boundingBox().max[2] - 0.75));
      expect(roof.toPolygons().length, `M${screwMm}`).toBe(2); // the post's ring: its outside and the hole
    }
  });

  it('builds for every board count, prints with nothing facing down past 45 degrees, no degenerate facet', () => {
    for (const boards of ['1', '2', '2-stacked', '4'] as const) {
      const part = nutted({ boards });
      expect(part.volume(), boards).toBeGreaterThan(0);
      expect(degenerateFacets(meshOf(part)), boards).toBe(0);
      // printed as built, wall face down: nothing over air past 45 degrees but each gable's 1 mm flat, about 6 mm long
      const posts = boards === '1' ? 1 : boards === '4' ? 4 : 2;
      const flats = facingDown(part, 0.05, 15.1);
      expect(flats, boards).toBeGreaterThan(0); // the control: the flat is seen
      expect(flats, boards).toBeLessThan(7 * posts);
    }
  });

  it('leaves the hooks their room at a seam, its pad behind it', () => {
    const board = { columns: 4, rows: 2, sides: ALL_OPEN };
    const part = nutted({ boards: '2' });
    const placed = keep(part.translate([80, 10, -15 - 0.005]));
    expect(keep(placed.intersect(hookRoomZone(engine, board, 2, HOOK_ROOM - 0.05, keep))).volume()).toBeLessThan(1e-6);
    expect(keep(placed.intersect(slotClearZone(engine, board, 2, HOOK_ROOM - 0.05, keep))).volume()).toBeLessThan(1e-6);
  });

  it('refuses one too short for its pad, its nut and its roof, saying how tall', () => {
    expect(() => standoffParams({ fixing: 'nut', heightMm: 9 })).toThrow(/at least/);
  });

  it('is named by its nut and tape, and says what screw it takes', () => {
    const type = boardType('standoff');
    const v = { ...defaultValues(type.settings), standoffFixing: 'nut' };
    expect(boardFileName(type, v, 'stl')).toBe('skadis-standoff-1-board-15mm-nut-tape-19mm.stl');
    expect(type.screws?.(v)).toMatch(/countersunk M4 machine screw/);
  });
});

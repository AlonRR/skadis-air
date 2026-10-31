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
  const m = mountingParams({ screwHead: 'tape', standoffHeightMm: 18, tapeMm: 19, tapeLengthMm: 19, ...given });
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

describe('a board on tape, on posts behind its corner slots (D619 a, 31 Oct 2026: "619 yes and tape a")', () => {
  // the corner tiles' slots' middles on a board two tiles each way, through the slots
  const MIDDLES = [
    [20, 20],
    [60, 20],
    [20, 60],
    [60, 60],
  ];

  it('ends at the wall in a flat rectangular pad the piece of tape, on a post behind each corner slot, with no hole', () => {
    const board = taped({ tapeMm: 19, tapeLengthMm: 24 });
    expect(board.boundingBox().min[2]).toBeCloseTo(-18, 9);
    // 0.75 mm off the wall, past the pad's 0.5 mm chamfer: four rectangles 24 mm along the board's width and 19 mm up
    const pads = keep(board.slice(-18 + 0.75));
    expect(Math.abs(pads.area() - 4 * 24 * 19) / (4 * 24 * 19)).toBeLessThan(1e-6);
    const polygons = pads.toPolygons();
    expect(polygons).toHaveLength(4); // four rectangles, no hole in any
    const middles = polygons.map((polygon) => {
      const xs = polygon.map(([x]) => x);
      const ys = polygon.map(([, y]) => y);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(24, 6);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(19, 6);
      return [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
    });
    const sorted = middles.sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0) || (a[0] ?? 0) - (b[0] ?? 0));
    for (const [k, [x, y]] of MIDDLES.entries()) {
      expect(sorted[k]?.[0]).toBeCloseTo(x ?? 0, 6);
      expect(sorted[k]?.[1]).toBeCloseTo(y ?? 0, 6);
    }
  });

  it("leaves every slot a hook's room behind it, its own post's slot too, and only past it grows to its pad", () => {
    const zoneBoard = { columns: 2, rows: 2, sides: ALL_OPEN };
    const board = taped({ tapeMm: 30, tapeLengthMm: 36, standoffHeightMm: 24 });
    expect(keep(board.intersect(slotClearZone(engine, zoneBoard, 0, HOOK_ROOM - 0.05, keep))).volume()).toBeLessThan(
      1e-9,
    );
    expect(keep(board.intersect(hookRoomZone(engine, zoneBoard, 2, HOOK_ROOM - 0.05, keep))).volume()).toBeLessThan(
      1e-9,
    );
    // the control: deeper, the pads reach behind the hooks' room
    expect(keep(board.intersect(hookRoomZone(engine, zoneBoard, 2, 23.5, keep))).volume()).toBeGreaterThan(0);
  });

  it('prints with no more facing down past 45 degrees than the posts alone have, the pad flaring out from its post', () => {
    for (const [tapeMm, tapeLengthMm] of [
      [19, 19],
      [30, 36],
      [12, 10], // smaller than the post across
    ] as const) {
      const h = 24;
      const p = solidBoardParams({ columns: 3, rows: 3 });
      const posts = mountingParams({ screwHead: 'none', standoffs: 'slots', standoffHeightMm: h });
      const plain = keep(makeSolidBoard(engine, p, mountingCuts(posts, p)));
      const board = taped({ tapeMm, tapeLengthMm, standoffHeightMm: h }, 3, 3);
      // as it prints, face down: the posts and pads from past the plate to the wall; the posts' own hook rooms'
      // ceilings face down in both
      const down = (b: Manifold) => facingDown(keep(printPose(b)), 5.05, 5 + h + 0.1);
      expect(Math.abs(down(board) - down(plain)), `${tapeMm} x ${tapeLengthMm}`).toBeLessThan(0.5);
    }
  });

  it('refuses standoffs too short for the pad to flare to its corners behind the hooks, saying how tall', () => {
    // the 19 x 19 mm piece's corners 3.24 mm past the solid board's post, 15 x 24 mm: 8 + 3.24 + 1 mm
    expect(() => taped({ standoffHeightMm: 12 })).toThrow(/at least 12.24 mm/);
    expect(taped({ standoffHeightMm: 12.24 }).volume()).toBeGreaterThan(0);
  });

  it('refuses a pad past the board, and a corner screw or corner standoffs with tape', () => {
    // a corner slot's middle is 20 mm in from both edges: 40 mm each way at most
    expect(() => taped({ tapeLengthMm: 42, standoffHeightMm: 30 })).toThrow(/at most 40 mm/);
    expect(() => taped({ tapeMm: 41, standoffHeightMm: 30 })).toThrow(/at most 40 mm/);
    expect(taped({ tapeMm: 40, tapeLengthMm: 40, standoffHeightMm: 30 }).volume()).toBeGreaterThan(0);
    expect(() => mountingParams({ screwHead: 'tape', standoffs: 'corners', standoffHeightMm: 18 })).toThrow(RangeError);
    expect(() => mountingParams({ screwHead: 'tape', standoffHeightMm: 0 })).toThrow(RangeError);
    expect(() => mountingParams({ screwHead: 'countersunk', standoffHeightMm: 15, tapeMm: 12 })).toThrow(RangeError);
  });

  it('exports with no degenerate facet, on the lattice boards too, through the slots and between them', () => {
    expect(degenerateFacets(meshOf(taped()))).toBe(0);
    for (const id of ['solid', 'lightened', 'skeleton'])
      for (const seams of ['through', 'between']) {
        const type = boardType(id);
        const read = readValues(type.settings, { screwHead: 'tape', seams });
        if (!read.ok) throw new Error(`${id}: ${read.errors.map((e) => e.message).join('; ')}`);
        const built = buildBoard(engine, type, read.values);
        expect(built.ok && 'built', `${id} ${seams} ${built.ok ? '' : built.problem}`).toBe('built');
        if (!built.ok) continue;
        made.push(built.solid);
        expect(degenerateFacets(meshOf(built.solid)), `${id} ${seams}`).toBe(0);
      }
  }, 120_000);
});

describe('standoffs behind the slots with no screws (D618 a, D619, 31 Oct 2026)', () => {
  it("stand behind the four corner slots, each leaving its slot a hook's room, as the lock screws' do", () => {
    const p = solidBoardParams({ columns: 2, rows: 2 });
    const posts = mountingParams({ screwHead: 'none', standoffs: 'slots', standoffHeightMm: 15 });
    const board = keep(makeSolidBoard(engine, p, mountingCuts(posts, p)));
    const locked = mountingParams({ screwHead: 'lock', standoffHeightMm: 15 });
    const lock = keep(makeSolidBoard(engine, p, mountingCuts(locked, p)));
    // near the wall, the same four outlines as lock screws' posts, less their holes
    const at = (b: Manifold) => keep(b.slice(-14));
    expect(at(board).toPolygons()).toHaveLength(4);
    expect(Math.abs(at(board).bounds().min[0] - at(lock).bounds().min[0])).toBeLessThan(1e-6);
    expect(at(board).area()).toBeGreaterThan(at(lock).area());
    const zoneBoard = { columns: 2, rows: 2, sides: ALL_OPEN };
    expect(keep(board.intersect(hookRoomZone(engine, zoneBoard, 2, HOOK_ROOM - 0.05, keep))).volume()).toBeLessThan(
      1e-9,
    );
  });

  it("refuses them too short for the hook's room and the ramp over its tab, saying how tall", () => {
    const p = solidBoardParams({ columns: 2, rows: 2 });
    const short = mountingParams({ screwHead: 'none', standoffs: 'slots', standoffHeightMm: 10 });
    // the ramp over a hook's tab is 2.5 mm deep at the post's bottom edge, 12 mm below the slot's middle: 8 + 2.5 + 1.2
    expect(() => mountingCuts(short, p)).toThrow(/at least 11.7 mm/);
  });

  it('are refused with a corner screw, which needs its post at the corner', () => {
    for (const screwHead of ['countersunk', 'round'] as const)
      expect(() => mountingParams({ screwHead, standoffs: 'slots', standoffHeightMm: 15 }), screwHead).toThrow(
        RangeError,
      );
    for (const screwHead of ['keyhole', 'lock', 'tape'] as const)
      expect(() => mountingParams({ screwHead, standoffs: 'corners', standoffHeightMm: 18 }), screwHead).toThrow(
        RangeError,
      );
  });
});

describe('the board form: Mounting and Standoffs (D617 c, D618 a, D619, D620 a, 31 Oct 2026)', () => {
  const solid = boardType('solid');
  const choice = (key: string) => solid.settings.find((s) => s.key === key);

  it('names the mounting "Mounting", Tape among its options, and the standoffs None, At the corners, Behind slots', () => {
    const mounting = choice('screwHead');
    expect(mounting?.label).toBe('Mounting');
    expect(mounting?.kind === 'choice' && mounting.options.map((o) => o.label)).toEqual([
      'Countersunk',
      'Round head',
      'Keyholes',
      'Lock screws',
      'Tape',
      'None',
    ]);
    const standoffs = choice('standoffs');
    expect(standoffs?.kind === 'choice' && standoffs.options.map((o) => [o.value, o.label])).toEqual([
      ['none', 'None'],
      ['corners', 'At the corners'],
      ['slots', 'Behind slots'],
    ]);
  });

  it('rules out the standoffs each mounting cannot stand on, saying why, and reads them as the first left', () => {
    const off = (screwHead: string) => Object.keys(optionsOff(solid.settings, { screwHead })['standoffs'] ?? {}).sort();
    expect(off('countersunk')).toEqual(['slots']);
    expect(off('round')).toEqual(['slots']);
    for (const head of ['keyhole', 'lock', 'tape']) expect(off(head), head).toEqual(['corners', 'none']);
    // each said as one thing or many: tape stands, keyholes and lock screws stand
    const said = (head: string) => optionsOff(solid.settings, { screwHead: head })['standoffs']?.['none'] ?? '';
    expect(said('tape')).toMatch(/^Tape stands the board on standoffs behind its corner slots/);
    expect(said('keyhole')).toMatch(/^Keyholes stand the board/);
    expect(() => mountingParams({ screwHead: 'tape', standoffs: 'corners', standoffHeightMm: 18 })).toThrow(
      /^Tape stands on/,
    );
    expect(off('none')).toEqual([]);
    const why = optionsOff(solid.settings, { screwHead: 'countersunk' })['standoffs']?.['slots'];
    expect(why).toMatch(/corner/);
    expect(why).toMatch(/Lock screws/);
    const read = (given: Record<string, unknown>) => {
      const r = readValues(solid.settings, given);
      return r.ok ? [r.values.standoffs, r.values.standoffHeightMm] : r.errors;
    };
    expect(read({ screwHead: 'tape' })).toEqual(['slots', 18]);
    expect(read({ screwHead: 'keyhole', standoffs: 'corners' })).toEqual(['slots', 15]);
    expect(read({ screwHead: 'countersunk', standoffs: 'slots' })).toEqual(['none', 15]);
    expect(read({ screwHead: 'none', standoffs: 'slots' })).toEqual(['slots', 15]);
  });

  it('hands on no screw size with tape or none, and the tape sizes only with tape', () => {
    const off = (given: Record<string, unknown>) => settingsNotApplying(solid.settings, given);
    for (const screwHead of ['tape', 'none']) expect(off({ screwHead }), screwHead).toContain('screwMm');
    for (const screwHead of ['countersunk', 'round', 'keyhole', 'lock'])
      expect(off({ screwHead }), screwHead).not.toContain('screwMm');
    for (const screwHead of ['countersunk', 'round', 'keyhole', 'lock', 'none'])
      expect(off({ screwHead }), screwHead).toEqual(expect.arrayContaining(['tapeWidthMm', 'tapeLengthMm']));
    expect(off({ screwHead: 'tape' })).not.toContain('tapeWidthMm');
    expect(off({ screwHead: 'tape' })).not.toContain('tapeLengthMm');
  });

  it('names the file by its tape and standoffs, and posts behind slots with no screws as such', () => {
    const name = (given: Record<string, unknown>) => {
      const read = readValues(solid.settings, given);
      return read.ok ? boardFileName(solid, read.values, 'stl') : read.errors;
    };
    expect(name({ screwHead: 'tape' })).toBe('skadis-solid-160x160-tape-19x19mm-standoffs-18mm.stl');
    expect(name({ screwHead: 'none', standoffs: 'slots' })).toBe(
      'skadis-solid-160x160-no-holes-standoffs-behind-slots-15mm.stl',
    );
    expect(name({ screwHead: 'none', standoffs: 'corners' })).toBe('skadis-solid-160x160-no-holes-standoffs-15mm.stl');
    expect(name({ screwHead: 'keyhole' })).toBe('skadis-solid-160x160-keyholes-standoffs-15mm.stl');
  });

  it('starts the standoffs at 18 mm with tape, as the taped standoff connector, unless set (D603 b, C604)', () => {
    for (const id of ['solid', 'lightened', 'skeleton']) {
      const type = boardType(id);
      const height = (given: Record<string, unknown>) => {
        const read = readValues(type.settings, given);
        return read.ok ? read.values['standoffHeightMm'] : read.errors;
      };
      expect(height({ screwHead: 'tape' }), id).toBe(18);
      expect(height({ standoffs: 'corners' }), id).toBe(15);
      expect(height({ screwHead: 'tape', standoffHeightMm: '20' }), id).toBe(20);
    }
  });
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
      const note = tapeOf(id, { screwHead: 'tape' }) ?? '';
      // 4 x 19 x 19 mm = 14.44 cm2; at 4 square inches a pound, about 254 g
      expect(note, id).toMatch(/4 pieces of 19 x 19 mm tape, 14\.44 cm²/);
      expect(note, id).toMatch(/about 250 g/);
      expect(note, id).toMatch(/alcohol/);
      expect(tapeOf(id, { standoffs: 'corners' }), id).toBeUndefined();
    }
    expect(tapeOf('solid', { screwHead: 'tape', tapeWidthMm: '12', tapeLengthMm: '18' })).toMatch(/8\.64 cm²/);
  });

  it('on a taped standoff: a piece at each post; none when it is not taped', () => {
    // the nut's way in opens through the pad: 19 x 19 mm less a hexagon 7.3 mm across, 3.15 cm2 (D607 a)
    expect(tapeOf('standoff', { standoffFixing: 'nut' })).toMatch(
      /One piece of 19 x 19 mm tape, 3\.15 cm² less the nut's way in, .*about 60 g/,
    );
    expect(tapeOf('standoff', { standoffFixing: 'self-tap' })).toMatch(/One piece of 19 x 19 mm tape, 3\.61 cm², /);
    expect(tapeOf('solid', { screwHead: 'tape' })).toMatch(/a commenter on one Printables mount/);
    expect(tapeOf('standoff', { standoffFixing: 'self-tap', boards: '4' })).toMatch(/4 pieces of 19 x 19 mm tape/);
    expect(tapeOf('standoff', { standoffFixing: 'nut-screwed' })).toBeUndefined();
    expect(tapeOf('standoff', {})).toBeUndefined();
  });
});

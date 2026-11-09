// The second slot pattern (D641 a, 9 Nov 2026): no slot at a board's corners, the SKÅDIS grid moved 20 mm, so a board
// joins panels of the generators that start the pattern there. Each claim has its control against today's pattern.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { BOARD_TYPES } from '../src/board-types/index.js';
import { loadEngine } from '../src/engine.js';
import { boardParamsOf } from '../src/board-types/solid.js';
import { framedBoard, LATTICE_DEFAULTS, latticeMembers, pocketShape } from '../src/lightened.js';
import { keyholePlaces, bottomSlotPlaces, mountingOf, mountingPads, screwPlaces } from '../src/mounting.js';
import { defaultValues, readValues } from '../src/settings.js';
import { ALL_OPEN, boardExtent, type Sides, slotPlaces, slotsWorth } from '../src/slots.js';
import { meshOf } from '../src/stl.js';
import { wallPlan } from '../src/tiling.js';
import { degenerateFacets, edgesNotOnTwoFacets } from './facets.js';
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

const CLOSED: Sides = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
const key = (p: { xMm: number; yMm: number }) => `${p.xMm},${p.yMm}`;
const typeOf = (id: string) => {
  const type = BOARD_TYPES.find((t) => t.id === id);
  if (type === undefined) throw new Error(`no type ${id}`);
  return type;
};

/** A board of a type at these values, as the library reads them. */
function build(id: string, given: Record<string, unknown>): Manifold {
  const type = typeOf(id);
  const read = readValues(type.settings, { ...defaultValues(type.settings), ...given });
  if (!read.ok) throw new Error(`refused: ${JSON.stringify(read)}`);
  return keep(type.build(engine, read.values));
}

/** How much of a thin column through the board at (x, y) is plastic. */
function plasticAt(board: Manifold, x: number, y: number): number {
  const probe = keep(keep(engine.Manifold.cube([0.3, 0.3, 40])).translate([x - 0.15, y - 0.15, -20]));
  return keep(board.intersect(probe)).volume();
}

/** The part of a board inside a box. */
function within(board: Manifold, [x0, y0, x1, y1]: readonly [number, number, number, number]): Manifold {
  const box = keep(keep(engine.Manifold.cube([x1 - x0, y1 - y0, 40])).translate([x0, y0, -20]));
  return keep(board.intersect(box));
}

describe('where the slots go with none at the corners (D641 a)', () => {
  it('a 40 x 40 tile open all round is four half slots, one on the middle of each side', () => {
    const places = slotPlaces(1, 1, ALL_OPEN, 'offset');
    expect(places.map(key).sort()).toEqual(['0,20', '20,0', '20,40', '40,20']);
    expect(places.every((p) => p.part === 'half')).toBe(true);
  });

  it("is the grid moved 20 mm: every size against today's slots a tile wider, moved and cropped", () => {
    for (const [columns, rows] of [
      [1, 1],
      [2, 3],
      [5, 5],
      [10, 4],
    ] as const) {
      const w = columns * 40;
      const moved = slotPlaces(columns + 1, rows, ALL_OPEN)
        .map((p) => ({ xMm: p.xMm - 20, yMm: p.yMm }))
        .filter((p) => p.xMm >= 0 && p.xMm <= w)
        .map(key)
        .sort();
      expect(slotPlaces(columns, rows, ALL_OPEN, 'offset').map(key).sort()).toEqual(moved);
    }
  });

  it('holds as many slots as today, and never a quarter', () => {
    for (const [columns, rows] of [
      [2, 2],
      [5, 5],
      [3, 7],
    ] as const) {
      const places = slotPlaces(columns, rows, ALL_OPEN, 'offset');
      expect(slotsWorth(places)).toBe(slotsWorth(slotPlaces(columns, rows, ALL_OPEN)));
      expect(places.some((p) => p.part === 'quarter')).toBe(false);
    }
  });

  it('leaves out the halves on a closed side, and keeps the rest', () => {
    const places = slotPlaces(3, 3, { ...ALL_OPEN, left: 'closed' }, 'offset');
    expect(places.some((p) => p.xMm === 0)).toBe(false);
    expect(places.some((p) => p.xMm === 120)).toBe(true);
  });

  it("is today's pattern on a board closed all round, which has no seam to match: an IKEA board's", () => {
    expect(slotPlaces(3, 4, CLOSED, 'offset')).toEqual(slotPlaces(3, 4, CLOSED));
  });

  it('moves no edge', () => {
    expect(boardExtent(4, 4, ALL_OPEN, 'offset')).toEqual(boardExtent(4, 4, ALL_OPEN));
  });

  it("lines up across a wall's seams: every half slot has its partner on the next panel", () => {
    const plan = wallPlan(
      { panels: 'split', widthMm: 400, heightMm: 200, seams: 'offset', sides: CLOSED, panelWidthMm: 200 },
      { xMm: 250, yMm: 210 },
    );
    expect(plan?.panels.length).toBeGreaterThan(1);
    const halves = new Map<string, number>();
    for (const kind of plan?.panels ?? []) {
      const [w, h] = [kind.values['widthMm'] as number, kind.values['heightMm'] as number];
      const places = slotPlaces(w / 40, h / 40, kind.values['sides'] as Sides, 'offset').filter(
        (p) => p.part === 'half',
      );
      for (const x of kind.xs)
        for (const y of kind.ys)
          for (const p of places) {
            const at = `${p.xMm + x},${p.yMm + y}`;
            halves.set(at, (halves.get(at) ?? 0) + 1);
          }
    }
    expect(halves.size).toBeGreaterThan(0);
    expect([...halves.values()].every((n) => n === 2)).toBe(true);
  });
});

describe('the setting (D641 a)', () => {
  for (const id of ['solid', 'lightened', 'skeleton'])
    it(`${id} offers it, starts on today's pattern, and says so in the file name`, () => {
      const type = typeOf(id);
      const seams = type.settings.find((s) => s.key === 'seams');
      expect(seams?.kind === 'choice' && seams.options.map((o) => o.value)).toContain('offset');
      const start = defaultValues(type.settings);
      expect(start['seams']).toBe('through');
      expect(type.label({ ...start, seams: 'offset' })).toContain('no-corner-slots');
      expect(type.label(start)).not.toContain('no-corner-slots');
      expect(type.label({ ...start, seams: 'offset', sides: CLOSED })).not.toContain('no-corner-slots');
    });
});

describe('the boards with no slot at the corners (D641 a)', () => {
  const offset = { widthMm: 200, heightMm: 200, seams: 'offset', screwHead: 'none' };
  const today = { ...offset, seams: 'through' };

  it("cut the commenter's layout, and the control today's", { timeout: 120_000 }, () => {
    const [b, c] = [build('solid', offset), build('solid', today)];
    for (const [x, y, slot] of [
      [40, 20, true], // the first whole slot of the first row
      [20, 40, true], // and of the second
      [20, 0.5, true], // a half on the bottom edge
      [0.5, 20, true], // and on the left
      [20, 20, false], // where today has its first whole slot
    ] as const) {
      expect(plasticAt(b, x, y) < 1e-6, `at ${x}, ${y}`).toBe(slot);
      expect(plasticAt(c, x, y) < 1e-6, `control at ${x}, ${y}`).toBe(!slot);
    }
  });

  for (const id of ['lightened', 'skeleton'])
    it(`${id}: inside the board, today's lattice moved 20 mm`, { timeout: 240_000 }, () => {
      const box = [60, 60, 140, 140] as const;
      const b = within(build(id, offset), box);
      const c = within(build(id, today), [40, 60, 120, 140]);
      const moved = keep(c.translate([20, 0, 0]));
      expect(b.volume()).toBeGreaterThan(0);
      expect(keep(b.subtract(moved)).volume() / b.volume()).toBeLessThan(0.002);
      expect(keep(moved.subtract(b)).volume() / b.volume()).toBeLessThan(0.002);
      // the control: not moved, it is another shape
      expect(keep(b.subtract(c)).volume() / b.volume()).toBeGreaterThan(0.1);
    });

  for (const id of ['solid', 'lightened', 'skeleton'])
    for (const screwHead of ['none', 'countersunk', 'keyhole', 'lock', 'tape'])
      for (const [widthMm, heightMm] of [
        [120, 160],
        [200, 200],
      ] as const)
        it(
          `${id}, ${screwHead}, ${widthMm} x ${heightMm}: one piece, closed, no facet of no area`,
          { timeout: 240_000 },
          () => {
            const b = build(id, { widthMm, heightMm, seams: 'offset', screwHead });
            const mesh = meshOf(b);
            expect(b.decompose().map(keep).length).toBe(1);
            expect(edgesNotOnTwoFacets(mesh)).toBe(0);
            expect(degenerateFacets(mesh)).toBe(0);
          },
        );
});

describe("the pockets at a board's corners with no slot there (D641 a)", () => {
  /** Each pocket's area, smallest first, on a lattice board with a corner screw of this size. */
  function pocketAreas(seams: string, screwMm: number): number[] {
    const type = typeOf('lightened');
    const read = readValues(type.settings, {
      ...defaultValues(type.settings),
      widthMm: 200,
      heightMm: 200,
      seams,
      screwHead: 'countersunk',
      screwMm,
    });
    if (!read.ok) throw new Error('refused');
    const values = read.values as never;
    const board = boardParamsOf(values);
    const framed = framedBoard(board, LATTICE_DEFAULTS);
    const shape = keep(
      pocketShape(engine, board, latticeMembers(board, LATTICE_DEFAULTS), mountingPads(mountingOf(values), framed)),
    );
    return shape
      .decompose()
      .map((p) => keep(p).area())
      .sort((a, b) => a - b);
  }

  for (const screwMm of [3, 4, 5])
    it(`leave no speck beside a ${screwMm} mm corner screw's pad`, () => {
      expect(pocketAreas('offset', screwMm)[0]).toBeGreaterThan(30);
    });

  it("keeps today's pockets, the control: none so small", () => {
    expect(pocketAreas('through', 4)[0]).toBeGreaterThan(30);
  });
});

describe('what stands behind a board with no slot at the corners (D641 a)', () => {
  const board = { columns: 5, rows: 5, sides: ALL_OPEN, seams: 'offset' } as const;

  it('keeps a corner screw at its usual place, 10 mm in', () => {
    expect(screwPlaces(board)).toEqual([
      [10, 10],
      [190, 10],
      [10, 190],
      [190, 190],
    ]);
  });

  it('stands the standoffs behind slots that are there, 20 mm from the top and the bottom', () => {
    const slots = new Set(
      slotPlaces(5, 5, ALL_OPEN, 'offset')
        .filter((p) => p.part === 'whole')
        .map(key),
    );
    const places = [...keyholePlaces(board), ...bottomSlotPlaces(board)];
    expect(places).toEqual([
      [40, 180],
      [160, 180],
      [40, 20],
      [160, 20],
    ]);
    for (const [xMm, yMm] of places) expect(slots.has(key({ xMm, yMm }))).toBe(true);
  });

  for (const screwHead of ['keyhole', 'lock', 'tape'])
    it(`${screwHead}: every slot keeps a hook its room`, { timeout: 120_000 }, () => {
      const b = build('solid', { widthMm: 200, heightMm: 200, seams: 'offset', screwHead });
      const depth = 7.99;
      const room = keep(slotClearZone(engine, board, 0, depth, keep).add(hookRoomZone(engine, board, 2, depth, keep)));
      expect(keep(b.intersect(room)).volume()).toBeLessThan(1e-6);
    });

  it('says so, in words about this pattern, on a board too narrow for two standoffs', () => {
    const type = typeOf('solid');
    const read = readValues(type.settings, {
      ...defaultValues(type.settings),
      widthMm: 80,
      heightMm: 200,
      seams: 'offset',
      screwHead: 'keyhole',
    });
    if (!read.ok) throw new Error('refused too soon');
    expect(() => type.build(engine, read.values)).toThrow(/no slot at the corners/);
  });
});

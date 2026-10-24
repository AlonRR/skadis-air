// The standoff connector (backlog item conn-standoff; D92 to D94, D97): a hollow spacer behind the corner
// screw holes of 1, 2 or 4 boards, the size of the built-in standoffs; the shared ones leave a tunnel along
// the seam for hooks. Each claim is measured on the solid, and placed where it is fitted.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine.js';
import { ALL_OPEN, type Sides } from '../src/slots.js';
import { makeStandoff, standoffParams, type StandoffParams } from '../src/standoff.js';
import { meshOf } from '../src/stl.js';
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

// The shapes' figures are worked out for a standoff 20 mm tall; the starting height is tested on its own (D238).
const standoff = (given: Partial<StandoffParams> = {}) =>
  keep(makeStandoff(engine, standoffParams({ heightMm: 20, ...given })));
const CLOSED: Sides = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };

describe('standoffParams: the starting values', () => {
  it('are 15 mm tall (D238; IKEA spacers are 20 mm, D94) for a 4 mm screw (D76)', () => {
    expect(standoffParams({})).toEqual({ boards: '1', heightMm: 15, screwMm: 4 });
  });

  it('refuses what cannot be made', () => {
    expect(() => standoffParams({ heightMm: 0 })).toThrow(RangeError);
    expect(() => standoffParams({ screwMm: 0 })).toThrow(RangeError);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value the type would not allow
    expect(() => standoffParams({ boards: '3' as StandoffParams['boards'] })).toThrow(RangeError);
  });

  it('refuses a shared standoff too short for its tunnel and a bridge behind it (C99)', () => {
    expect(() => standoffParams({ boards: '2', heightMm: 11.5 })).toThrow(/12 mm/);
    expect(() => standoffParams({ boards: '2-stacked', heightMm: 11.5 })).toThrow(/12 mm/);
    expect(standoffParams({ boards: '4', heightMm: 12 }).heightMm).toBe(12);
    expect(standoffParams({ boards: '1', heightMm: 3 }).heightMm).toBe(3);
  });
});

describe('makeStandoff, for one board', () => {
  it('is a ring 10 mm across with a 4.5 mm hole, as tall as asked, centred on its hole', () => {
    const part = standoff();
    const box = part.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-5, -5, 0]);
    expect(box.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([5, 5, 20]);
    expect(part.genus()).toBe(1);
    // within 1 %, between its chamfers (D270): each circle is drawn with 64 segments
    const ring = Math.PI * (5 ** 2 - 2.25 ** 2);
    expect(Math.abs(keep(part.slice(10)).area() - ring) / ring).toBeLessThan(0.01);
  });

  it('follows the screw: the hole 0.5 mm wider, the ring the hole plus 5.5 mm (C83)', () => {
    const part = standoff({ screwMm: 5, heightMm: 25 });
    expect(part.boundingBox().max[0]).toBeCloseTo(5.5, 3);
    expect(part.boundingBox().max[2]).toBeCloseTo(25, 9);
    const ring = Math.PI * (5.5 ** 2 - 2.75 ** 2);
    expect(Math.abs(keep(part.slice(12.5)).area() - ring) / ring).toBeLessThan(0.01);
  });

  it('behind a corner screw hole, keeps 2 mm clear of every slot, open or closed, at the smallest and largest screws', () => {
    for (const sides of [ALL_OPEN, CLOSED]) {
      for (const screwMm of [3, 5]) {
        const placed = keep(standoff({ screwMm }).translate([10, 10, -20.005]));
        const zone = slotClearZone(engine, { columns: 2, rows: 2, sides }, 2, 30, keep);
        expect(keep(placed.intersect(zone)).volume()).toBe(0);
        // the control: a 4 mm margin reaches it, so the check can see a spacer near a slot
        const wide = slotClearZone(engine, { columns: 2, rows: 2, sides }, 4, 30, keep);
        expect(keep(placed.intersect(wide)).volume()).toBeGreaterThan(0);
        expect(keep(placed.intersect(hookRoomZone(engine, { columns: 2, rows: 2, sides }, 2, 30, keep))).volume()).toBe(
          0,
        );
      }
    }
  });

  it('exports with no degenerate facet', () => {
    expect(degenerateFacets(meshOf(standoff()))).toBe(0);
  });
});

// Fitted behind the boards, the spacer's board face against their back faces at z = 0.
const fitted = (part: Manifold, x: number, y: number, h: number, turn = 0) =>
  keep(keep(part.rotate([0, 0, turn])).translate([x, y, -h - 0.005]));
const TUNNEL_DEPTH = 8; // the hook's 6 mm behind the board and the 2 mm margin
// The room is checked to just inside the tunnel, and, as the control, to just beyond it, where the bridge
// behind the seam's slot column must show: the two together pin the tunnel's depth to within 0.55 mm.
const [INSIDE, BEYOND] = [TUNNEL_DEPTH - 0.05, TUNNEL_DEPTH + 0.5];
const NOTHING = 1e-6; // mm3: an intersection that is empty but for the arithmetic's rounding

/** How far a measure is from the figure worked out, as a part of the figure. */
const off = (measured: number, figure: number) => Math.abs(measured - figure) / figure;
const HOLE = Math.PI * 2.25 ** 2; // a 4.5 mm hole
const POST = Math.PI * 5 ** 2; // a post 10 mm across

describe("makeStandoff, for 2 boards, in the slot clip's shape (D92, D97, D281)", () => {
  it('has a post 10 mm across over each of two holes 20 mm apart, joined by a bar as wide', () => {
    const part = standoff({ boards: '2' });
    const box = part.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-15, -5, 0]);
    expect(box.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([15, 5, 20]);
    expect(part.genus()).toBe(2);
  });

  it('is joined only on the wall side: the bar 12 mm deep, the posts alone in the 8 mm next to the boards', () => {
    const part = standoff({ boards: '2' });
    const bar = 20 * 10 + POST - 2 * HOLE; // a stadium 30 x 10 mm round the two holes
    const posts = 2 * (POST - HOLE);
    expect(off(keep(part.slice(6)).area(), bar)).toBeLessThan(0.01);
    const top = keep(part.slice(16));
    expect(off(top.area(), posts)).toBeLessThan(0.01);
    expect(top.decompose().map(keep)).toHaveLength(2);
    // its edges chamfered 1 mm (D270): a little less than the plain shape, by no more than 5 %
    const volume = bar * (20 - TUNNEL_DEPTH) + posts * TUNNEL_DEPTH;
    expect(part.volume()).toBeLessThan(volume);
    expect(part.volume() / volume).toBeGreaterThan(0.95);
  });

  it('fitted at a seam, at the bottom or the top corners, leaves every slot and every hook its room', () => {
    const board = { columns: 4, rows: 2, sides: ALL_OPEN }; // two 2 x 2 boards side by side (D15)
    for (const y of [10, 70]) {
      const placed = fitted(standoff({ boards: '2' }), 80, y, 20);
      expect(keep(placed.intersect(slotClearZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
      expect(keep(placed.intersect(hookRoomZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
      // the control: deeper than the bar's top, the check finds the bar behind the seam's slot column
      expect(keep(placed.intersect(slotClearZone(engine, board, 2, BEYOND, keep))).volume()).toBeGreaterThan(0);
    }
  });

  it('comes for 2 boards one above the other: the same, a quarter turn round, for a horizontal seam', () => {
    const [side, stacked] = [standoff({ boards: '2' }), standoff({ boards: '2-stacked' })];
    const box = stacked.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-5, -15, 0]);
    expect(box.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([5, 15, 20]);
    expect(stacked.volume()).toBeCloseTo(side.volume(), 3);
    const board = { columns: 2, rows: 4, sides: ALL_OPEN };
    const placed = fitted(stacked, 10, 80, 20);
    expect(keep(placed.intersect(slotClearZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
    expect(keep(placed.intersect(hookRoomZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
  });
});

describe("makeStandoff, for 4 boards, in the slot clip's shape (D92, D97, D281)", () => {
  it('has a post over each of four holes on a 20 mm square, joined by a square ring on the wall side', () => {
    const part = standoff({ boards: '4' });
    const box = part.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-15, -15, 0]);
    expect(box.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([15, 15, 20]);
    expect(part.genus()).toBe(5); // the ring, and a hole through each post
    // the ring: the rounded square 30 x 30 mm round the posts, less the 10 x 10 mm square inside the bars
    const ring = 30 * 30 - (4 - Math.PI) * 25 - 10 * 10 - 4 * HOLE;
    const posts = 4 * (POST - HOLE);
    expect(off(keep(part.slice(6)).area(), ring)).toBeLessThan(0.01);
    expect(off(keep(part.slice(16)).area(), posts)).toBeLessThan(0.01);
    const volume = ring * (20 - TUNNEL_DEPTH) + posts * TUNNEL_DEPTH;
    expect(part.volume()).toBeLessThan(volume);
    expect(part.volume() / volume).toBeGreaterThan(0.95);
  });

  it('fitted where four corners meet, either way up, leaves every slot and every hook its room', () => {
    const board = { columns: 4, rows: 4, sides: ALL_OPEN }; // four 2 x 2 boards
    for (const turn of [0, 90]) {
      const placed = fitted(standoff({ boards: '4' }), 80, 80, 20, turn);
      expect(keep(placed.intersect(slotClearZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
      expect(keep(placed.intersect(hookRoomZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
      expect(keep(placed.intersect(slotClearZone(engine, board, 2, BEYOND, keep))).volume()).toBeGreaterThan(0);
    }
  });

  it('exports with no degenerate facet, for 2 boards either way and 4', () => {
    for (const boards of ['2', '2-stacked', '4'] as const) {
      expect(degenerateFacets(meshOf(standoff({ boards })))).toBe(0);
    }
  });
});

describe("a tight section at the standoff's board face, for the trial (D267)", () => {
  const width = (part: Manifold, z: number) => {
    const holes = keep(part.slice(z))
      .toPolygons()
      .filter((ring) => {
        const xs = ring.map(([x]) => x);
        return Math.max(...xs) - Math.min(...xs) < 6;
      });
    expect(holes).toHaveLength(1);
    const xs = (holes[0] ?? []).map(([x]) => x);
    return Math.max(...xs) - Math.min(...xs);
  };

  it('narrows the hole to the pilot asked for, for its top 2 mm only, so the screw cuts into it there', () => {
    const tight = standoff({ pilotMm: 3.4 });
    expect(width(tight, 19)).toBeCloseTo(3.4, 1);
    expect(width(tight, 17)).toBeCloseTo(4.5, 1);
    // control: without one, the hole is 4.5 mm all the way
    expect(width(standoff(), 19)).toBeCloseTo(4.5, 1);
    expect(degenerateFacets(meshOf(tight))).toBe(0);
  });

  it('has none unless asked, and refuses one no narrower than the hole', () => {
    expect(standoffParams({})).not.toHaveProperty('pilotMm');
    expect(() => standoffParams({ pilotMm: 4.5 })).toThrow(RangeError);
    expect(() => standoffParams({ pilotMm: 0 })).toThrow(RangeError);
  });
});

describe('what the standoff holds the bed with (C463; the owner, 24 Oct 2026: a print that needs a brim is reworked)', () => {
  // The section 0.1 mm above the bed, as the first layer's, against the flat outline's own, 3 mm up: above the wall
  // chamfer and the hole's mouth, below where a shared standoff's posts rise from its bar.
  const contact = (part: Manifold) => keep(part.slice(0.1)).area();
  const outline = (part: Manifold) => keep(part.slice(3)).area();

  it('is at least 45 mm2 for one board, three quarters of its outline, from the 30.7 mm2 (49 %) it had', () => {
    const part = standoff({ boards: '1', heightMm: 15 });
    expect(contact(part)).toBeGreaterThanOrEqual(45);
    expect(contact(part) / outline(part)).toBeGreaterThanOrEqual(0.75);
  });

  it('is three quarters of its outline for every choice of boards, and with the trial pilot too', () => {
    for (const boards of ['1', '2', '2-stacked', '4'] as const) {
      for (const pilotMm of [undefined, 3.2]) {
        const part = standoff({ boards, pilotMm });
        expect(contact(part) / outline(part), `${boards} ${pilotMm ?? 'no'} pilot`).toBeGreaterThanOrEqual(0.75);
      }
    }
  });
});

describe("how the standoff looks (D270; the connectors' design pass, finding 5)", () => {
  /** Each separate outline in a slice, as [minX, maxX, minY, maxY]. */
  const bounds = (part: Manifold, z: number) =>
    keep(part.slice(z))
      .toPolygons()
      .map((ring) => {
        const [xs, ys] = [ring.map(([x]) => x), ring.map(([, y]) => y)];
        return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] as const;
      });
  const widths = (part: Manifold, z: number) =>
    bounds(part, z)
      .map(([minX, maxX]) => Math.round((maxX - minX) * 100) / 100)
      .sort((a, b) => a - b);
  const holds = (part: Manifold, z: number, [x, y]: [number, number]) => {
    const dot = keep(engine.CrossSection.square([0.02, 0.02], true).translate([x, y]));
    return keep(keep(part.slice(z)).intersect(dot)).area() > 0;
  };

  it('chamfers its outside edges 0.4 mm at the wall (C463) and 1 mm at the board, and its hole 0.5 mm at each end', () => {
    const part = standoff();
    // a quarter of a millimetre in from each face: at the wall the ring 9.7 mm across, at the board 8.5, the hole 5
    expect(widths(part, 0.25)).toEqual([5, 9.7]);
    expect(widths(part, 19.75)).toEqual([5, 8.5]);
    // and between them, as before: 10 mm, the hole 4.5
    expect(widths(part, 10)).toEqual([4.5, 10]);
    expect(degenerateFacets(meshOf(part))).toBe(0);
  });

  it("chamfers the bar's top 1 mm in the hooks' room, and each post's top at the board (D281)", () => {
    const part = standoff({ boards: '2' });
    // the bar's top is 8 mm under the board, at 12 mm: a quarter of a millimetre under it, 0.75 mm in each side
    expect(holds(part, 11.75, [0, 4.2])).toBe(true);
    expect(holds(part, 11.75, [0, 4.3])).toBe(false);
    expect(holds(part, 12.25, [0, 0])).toBe(false); // nothing of the bar above it, between the posts
    // a quarter of a millimetre under the board, each post 8.5 mm across, its hole 5
    expect(widths(part, 19.75)).toEqual([5, 5, 8.5, 8.5]);
    expect(degenerateFacets(meshOf(part))).toBe(0);
  });

  it('builds for every screw from 3 to 5 mm and every choice of boards', () => {
    const genus = { '1': 1, '2': 2, '2-stacked': 2, '4': 5 } as const;
    for (const boards of ['1', '2', '2-stacked', '4'] as const) {
      for (const screwMm of [3, 3.5, 4, 4.5, 5]) {
        const part = standoff({ boards, screwMm });
        expect(part.genus()).toBe(genus[boards]);
        expect(degenerateFacets(meshOf(part))).toBe(0);
      }
    }
  });
});

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

const standoff = (given: Partial<StandoffParams> = {}) => keep(makeStandoff(engine, standoffParams(given)));
const CLOSED: Sides = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };

describe('standoffParams: the starting values', () => {
  it('are 20 mm tall (D94, from IKEA spacers) for a 4 mm screw (D76)', () => {
    expect(standoffParams({})).toEqual({ boards: 1, heightMm: 20, screwMm: 4 });
  });

  it('refuses what cannot be made', () => {
    expect(() => standoffParams({ heightMm: 0 })).toThrow(RangeError);
    expect(() => standoffParams({ screwMm: 0 })).toThrow(RangeError);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value the type would not allow
    expect(() => standoffParams({ boards: 3 as StandoffParams['boards'] })).toThrow(RangeError);
  });

  it('refuses a shared standoff too short for its tunnel and a bridge behind it (C99)', () => {
    expect(() => standoffParams({ boards: 2, heightMm: 11.5 })).toThrow(/12 mm/);
    expect(standoffParams({ boards: 4, heightMm: 12 }).heightMm).toBe(12);
    expect(standoffParams({ boards: 1, heightMm: 3 }).heightMm).toBe(3);
  });
});

describe('makeStandoff, for one board', () => {
  it('is a ring 10 mm across with a 4.5 mm hole, as tall as asked, centred on its hole', () => {
    const part = standoff();
    const box = part.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-5, -5, 0]);
    expect(box.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([5, 5, 20]);
    expect(part.genus()).toBe(1);
    // within 1 %: each circle is drawn with 64 segments
    const ring = Math.PI * (5 ** 2 - 2.25 ** 2) * 20;
    expect(Math.abs(part.volume() - ring) / ring).toBeLessThan(0.01);
  });

  it('follows the screw: the hole 0.5 mm wider, the ring the hole plus 5.5 mm (C83)', () => {
    const part = standoff({ screwMm: 5, heightMm: 25 });
    expect(part.boundingBox().max[0]).toBeCloseTo(5.5, 3);
    expect(part.boundingBox().max[2]).toBeCloseTo(25, 9);
    const ring = Math.PI * (5.5 ** 2 - 2.75 ** 2) * 25;
    expect(Math.abs(part.volume() - ring) / ring).toBeLessThan(0.01);
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

describe('makeStandoff, for 2 boards (D92, D97)', () => {
  it('has two holes 20 mm apart, in two rings 10 mm across joined by an 8.8 mm bridge (C100)', () => {
    const part = standoff({ boards: 2 });
    const box = part.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-15, -5, 0]);
    expect(box.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([15, 5, 20]);
    expect(part.genus()).toBe(2);
  });

  it('is joined across the seam only on the wall side: an 11.2 mm tunnel, 8 mm deep, at its board face', () => {
    const part = standoff({ boards: 2 });
    // Two discs of radius 5 at x = +-10 and the bridge, 20 x 8.8 mm, between their centres: the bridge
    // covers the inner half of each disc's band |y| <= 4.4, whose area is worked out by integration.
    const y = 4.4;
    const band = 2 * (y * Math.sqrt(25 - y * y) + 25 * Math.asin(y / 5));
    const outline = 20 * 8.8 + 2 * Math.PI * 25 - band - 2 * Math.PI * 2.25 ** 2;
    const wall = keep(part.slice(6)).area(); // behind the tunnel
    const board = keep(part.slice(16)).area(); // in it
    expect(Math.abs(wall - outline) / outline).toBeLessThan(0.01);
    expect(Math.abs(board - (outline - 11.2 * 8.8)) / board).toBeLessThan(0.01);
    const volume = outline * 20 - 11.2 * 8.8 * TUNNEL_DEPTH;
    expect(Math.abs(part.volume() - volume) / volume).toBeLessThan(0.01);
  });

  it('fitted at a seam, at the bottom or the top corners, leaves every slot and every hook its room', () => {
    const board = { columns: 4, rows: 2, sides: ALL_OPEN }; // two 2 x 2 boards side by side (D15)
    for (const y of [10, 70]) {
      const placed = fitted(standoff({ boards: 2 }), 80, y, 20);
      expect(keep(placed.intersect(slotClearZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
      expect(keep(placed.intersect(hookRoomZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
      // the control: deeper than the tunnel, the check finds the bridge behind the seam's slot column
      expect(keep(placed.intersect(slotClearZone(engine, board, 2, BEYOND, keep))).volume()).toBeGreaterThan(0);
    }
  });

  it('turned a quarter turn for a horizontal seam, leaves them their room too', () => {
    const board = { columns: 2, rows: 4, sides: ALL_OPEN };
    const placed = fitted(standoff({ boards: 2 }), 10, 80, 20, 90);
    expect(keep(placed.intersect(slotClearZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
    expect(keep(placed.intersect(hookRoomZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
  });
});

describe('makeStandoff, for 4 boards (D92, D97)', () => {
  it('has four holes on a 20 mm square in a rounded square 30 x 30 mm, and a tunnel each way', () => {
    const part = standoff({ boards: 4 });
    const box = part.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-15, -15, 0]);
    expect(box.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([15, 15, 20]);
    expect(part.genus()).toBe(4);
    const outline = 30 * 30 - (4 - Math.PI) * 25 - 4 * Math.PI * 2.25 ** 2;
    const cross = 2 * 11.2 * 30 - 11.2 ** 2; // the two tunnels, which cross in the middle
    const volume = outline * 20 - cross * TUNNEL_DEPTH;
    expect(Math.abs(part.volume() - volume) / volume).toBeLessThan(0.01);
  });

  it('fitted where four corners meet, either way up, leaves every slot and every hook its room', () => {
    const board = { columns: 4, rows: 4, sides: ALL_OPEN }; // four 2 x 2 boards
    for (const turn of [0, 90]) {
      const placed = fitted(standoff({ boards: 4 }), 80, 80, 20, turn);
      expect(keep(placed.intersect(slotClearZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
      expect(keep(placed.intersect(hookRoomZone(engine, board, 2, INSIDE, keep))).volume()).toBeLessThan(NOTHING);
      expect(keep(placed.intersect(slotClearZone(engine, board, 2, BEYOND, keep))).volume()).toBeGreaterThan(0);
    }
  });

  it('exports with no degenerate facet, for 2 and 4 boards', () => {
    for (const boards of [2, 4] as const) expect(degenerateFacets(meshOf(standoff({ boards })))).toBe(0);
  });
});

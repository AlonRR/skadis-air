// Mounting (backlog item mounting; D73 to D75): a screw hole in each corner tile, 10 mm in from both
// edges, countersunk or round; and standoffs on the back. Each claim is measured on the solid: the
// holes in a cut through it, its genus, its box and its volume, against figures worked out by hand.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams, type SolidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { mountingCuts, mountingParams, type MountingParams } from '../src/mounting.js';
import { ALL_OPEN, type Sides } from '../src/slots.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets } from './facets.js';
import { slotClearZone } from './slot-zone.js';

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
type Given = Partial<SolidBoardParams> & Pick<SolidBoardParams, 'columns' | 'rows'>;
const plain = (given: Given) => keep(makeSolidBoard(engine, solidBoardParams(given)));
const mounted = (given: Given, mounting: Partial<MountingParams> = {}) => {
  const p = solidBoardParams(given);
  return keep(makeSolidBoard(engine, p, mountingCuts(mountingParams(mounting), p)));
};

/** The round holes of a cut, each as its centre and its width across. */
function roundHoles(cut: CrossSection) {
  return cut
    .toPolygons()
    .map((poly) => {
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      const [w, h] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
      return { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, w, h };
    })
    .filter((b) => Math.abs(b.w - b.h) < 0.01 && b.w < 15); // a slot is three times as tall as wide
}

const corners = (width: number, height: number) => [
  [10, 10],
  [width - 10, 10],
  [10, height - 10],
  [width - 10, height - 10],
];

// A cylinder of radius r through a plate t thick, and the extra a 90 degree countersink d deep takes.
const cylinder = (r: number, t: number) => Math.PI * r * r * t;
const countersink = (r: number, d: number) =>
  ((Math.PI * d) / 3) * ((r + d) ** 2 + (r + d) * r + r * r) - cylinder(r, d);

describe('mountingParams: the starting values', () => {
  it('are a countersunk hole for a 4 mm screw (D74; D76 open), and no standoffs (D75: an option)', () => {
    expect(mountingParams({})).toEqual({ screwHead: 'countersunk', screwMm: 4, standoffHeightMm: 0 });
  });

  it('refuses what cannot be made', () => {
    expect(() => mountingParams({ screwMm: 0 })).toThrow(RangeError);
    expect(() => mountingParams({ standoffHeightMm: -1 })).toThrow(RangeError);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value the type would not allow
    expect(() => mountingParams({ screwHead: 'hex' as MountingParams['screwHead'] })).toThrow(RangeError);
  });
});

describe('screw holes (D73, D74)', () => {
  it('cuts one in each corner tile, 10 mm in from both edges, 4.5 mm across for a 4 mm screw', () => {
    for (const [columns, rows] of [
      [1, 1],
      [3, 2],
    ] as const) {
      const holes = roundHoles(keep(mounted({ columns, rows }).slice(2)));
      expect(holes).toHaveLength(4);
      for (const [x, y] of corners(40 * columns, 40 * rows)) {
        const hole = holes.find((h) => Math.abs(h.x - (x ?? 0)) < 0.01 && Math.abs(h.y - (y ?? 0)) < 0.01);
        expect(hole?.w).toBeCloseTo(4.5, 2);
      }
    }
  });

  it('meets no slot, open or closed: each hole adds one through-hole to the board', () => {
    for (const [columns, rows, sides] of [
      [1, 1, ALL_OPEN],
      [2, 2, ALL_OPEN],
      [3, 2, CLOSED],
      [2, 2, { ...ALL_OPEN, left: 'closed', bottom: 'closed' }],
    ] as const) {
      for (const screwMm of [3, 4, 5]) {
        expect(mounted({ columns, rows, sides }, { screwMm }).genus()).toBe(
          plain({ columns, rows, sides }).genus() + 4,
        );
      }
    }
  });

  it('countersinks the front, the face that prints on the bed (D66): 90 degrees, twice the screw plus 1 mm across', () => {
    // 0.25 mm in from the front a 9 mm countersink is 8.5 mm across; at the back the hole is 4.5 mm
    const [front] = roundHoles(keep(mounted({ columns: 1, rows: 1 }).slice(4.75)));
    const [back] = roundHoles(keep(mounted({ columns: 1, rows: 1 }).slice(0.25)));
    expect(front?.w).toBeCloseTo(8.5, 2);
    expect(back?.w).toBeCloseTo(4.5, 2);
  });

  it('discriminates: a round head is 4.5 mm across at the front as at the back', () => {
    const [front] = roundHoles(keep(mounted({ columns: 1, rows: 1 }, { screwHead: 'round' }).slice(4.75)));
    expect(front?.w).toBeCloseTo(4.5, 2);
  });

  it('takes out what four holes and their countersinks work out to by hand', () => {
    const base = plain({ columns: 1, rows: 1 }).volume();
    const sunk = base - mounted({ columns: 1, rows: 1 }).volume();
    const round = base - mounted({ columns: 1, rows: 1 }, { screwHead: 'round' }).volume();
    // within 1 %: each circle is drawn with 64 segments, about 0.16 % short of its area
    expect(Math.abs(sunk - 4 * (cylinder(2.25, 5) + countersink(2.25, 2.25))) / sunk).toBeLessThan(0.01);
    expect(Math.abs(round - 4 * cylinder(2.25, 5)) / round).toBeLessThan(0.01);
  });

  it('with no screw holes, is the plain board', () => {
    const none = mounted({ columns: 2, rows: 1 }, { screwHead: 'none' });
    expect(none.volume()).toBeCloseTo(plain({ columns: 2, rows: 1 }).volume(), 6);
    expect(none.genus()).toBe(plain({ columns: 2, rows: 1 }).genus());
  });

  it('refuses a countersink that leaves less than 1 mm of plain hole, and takes a round head there', () => {
    expect(() => mounted({ columns: 1, rows: 1, thicknessMm: 3 })).toThrow(/countersunk/);
    expect(mounted({ columns: 1, rows: 1, thicknessMm: 3 }, { screwHead: 'round' }).genus()).toBe(5);
    expect(mounted({ columns: 1, rows: 1, thicknessMm: 3.25 }).genus()).toBe(5);
  });
});

describe('standoffs on the back (D75)', () => {
  it('stand the height asked for behind the back face, at the four screw holes, hollow for the screw', () => {
    const board = mounted({ columns: 2, rows: 2 }, { standoffHeightMm: 20 });
    const box = board.boundingBox();
    expect(box.min[2]).toBeCloseTo(-20, 9);
    expect(box.max[2]).toBeCloseTo(5, 9);
    const cut = keep(board.slice(-10));
    // four rings, 10 mm across with the 4.5 mm hole through: the screw passes through the standoff
    expect(Math.abs(cut.area() - 4 * Math.PI * (5 ** 2 - 2.25 ** 2)) / cut.area()).toBeLessThan(0.01);
    const circles = roundHoles(cut).map((c) => Math.round(c.w * 10) / 10);
    expect(circles.sort((a, b) => a - b)).toEqual([4.5, 4.5, 4.5, 4.5, 10, 10, 10, 10]); // each ring's two edges
    expect(board.genus()).toBe(plain({ columns: 2, rows: 2 }).genus() + 4);
  });

  it('are solid posts where there is no screw hole', () => {
    const board = mounted({ columns: 2, rows: 2 }, { screwHead: 'none', standoffHeightMm: 20 });
    expect(Math.abs(keep(board.slice(-10)).area() - 4 * Math.PI * 25) / (4 * Math.PI * 25)).toBeLessThan(0.01);
    expect(board.genus()).toBe(plain({ columns: 2, rows: 2 }).genus());
  });

  it('keep 2 mm clear of every slot behind the board, so a hook fits, at the smallest and largest screws', () => {
    for (const sides of [ALL_OPEN, CLOSED]) {
      for (const screwMm of [3, 5]) {
        const board = mounted({ columns: 2, rows: 2, sides }, { screwMm, standoffHeightMm: 30 });
        // each slot's outline grown by its 1 mm chamfer and 2 mm more, run 30 mm back from the board
        const zone = slotClearZone(engine, { columns: 2, rows: 2, sides }, 2, 30, keep);
        expect(keep(board.intersect(zone)).volume()).toBe(0);
        // the control: a 4 mm margin reaches the standoffs, so the check can see one near a slot
        const wide = slotClearZone(engine, { columns: 2, rows: 2, sides }, 4, 30, keep);
        expect(keep(board.intersect(wide)).volume()).toBeGreaterThan(0);
      }
    }
  });

  it('stay inside the outline at the largest corner radius and the largest screw', () => {
    // A 20 mm corner's arc is centred at (20, 20); the standoff's far edge, 11 mm across at (10, 10),
    // is 14.1 + 5.5 = 19.6 mm from that centre, so the settings' ranges keep it inside the board.
    const board = mounted(
      { columns: 2, rows: 2, sides: CLOSED, cornerRadiusMm: 20 },
      { screwMm: 5, standoffHeightMm: 20 },
    );
    let checked = 0;
    for (const z of [-10, 4.9]) {
      for (const poly of keep(board.slice(z)).toPolygons()) {
        for (const [x, y] of poly) {
          if (x < 20 && y < 20) {
            expect(Math.hypot(x - 20, y - 20)).toBeLessThanOrEqual(20 + 1e-6);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(64); // the standoff's ring and the corner's arc were both looked at
  });

  it('export with no degenerate facet, with either head', () => {
    for (const screwHead of ['countersunk', 'round', 'none'] as const) {
      const mesh = meshOf(mounted({ columns: 2, rows: 1, sides: CLOSED }, { screwHead, standoffHeightMm: 20 }));
      expect(degenerateFacets(mesh)).toBe(0);
    }
  });
});

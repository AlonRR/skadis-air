// The solid board (backlog item board-solid). Each geometric claim is measured on the solid itself:
// its box, the area of a cut through it, its holes and its volume, against figures worked out by
// hand from docs/skadis-standard.md and the decisions D15, D37, D39, D40 and D41.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams, type SolidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { ALL_OPEN, type Sides, slotPlaces, slotsWorth } from '../src/slots.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets } from './facets.js';

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
const board = (p: Partial<SolidBoardParams> & Pick<SolidBoardParams, 'columns' | 'rows'>) =>
  keep(makeSolidBoard(engine, solidBoardParams(p)));

// A slot's outline: a stadium w wide and h tall. Its area, and its perimeter, by hand.
const stadiumArea = (w: number, h: number) => w * (h - w) + Math.PI * (w / 2) ** 2;
const stadiumPerimeter = (w: number, h: number) => 2 * (h - w) + Math.PI * w;

// The holes of a cut: each contour with its box.
function holesNear(cut: CrossSection, x: number, y: number) {
  return cut
    .toPolygons()
    .map((poly) => {
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    })
    .filter((b) => b.minX < x && b.maxX > x && b.minY < y && b.maxY > y && b.maxX - b.minX < 30);
}

describe('solidBoardParams: the starting values', () => {
  it('are 5 mm thick (standard), open all round (D37), 0.2 mm slot clearance (D40), 1 mm chamfer (D41), 10 mm corners (D39)', () => {
    expect(solidBoardParams({ columns: 1, rows: 1 })).toEqual({
      columns: 1,
      rows: 1,
      thicknessMm: 5,
      sides: ALL_OPEN,
      slotClearanceMm: 0.2,
      slotChamferMm: 1,
      cornerRadiusMm: 10,
    });
  });
});

describe('makeSolidBoard', () => {
  it('is the size of its tiles, 40 mm each, and the thickness asked for', () => {
    const box = board({ columns: 3, rows: 2, thicknessMm: 4.5 }).boundingBox();
    expect(box.min).toEqual([0, 0, 0]);
    expect(box.max[0]).toBeCloseTo(120, 9);
    expect(box.max[1]).toBeCloseTo(80, 9);
    expect(box.max[2]).toBeCloseTo(4.5, 9);
  });

  it('a cut through its middle has the plate less every slot it holds: open all round, square corners', () => {
    for (const [columns, rows] of [
      [1, 1],
      [2, 2],
      [3, 2],
    ] as const) {
      const cut = keep(board({ columns, rows }).slice(2.5));
      const worth = slotsWorth(slotPlaces(columns, rows, ALL_OPEN));
      const expected = 1600 * columns * rows - worth * stadiumArea(5.2, 15.2);
      // within 0.3 %: the slots' round ends are drawn as polygons
      expect(cut.area()).toBeCloseTo(expected, -Math.log10(expected * 0.003));
      expect(Math.abs(cut.area() - expected) / expected).toBeLessThan(0.003);
    }
  });

  it('closed all round, a cut is the plate with its four 10 mm corners rounded, less its whole slots', () => {
    const cut = keep(board({ columns: 3, rows: 2, sides: CLOSED }).slice(2.5));
    const corners = 4 * (100 - (Math.PI * 100) / 4);
    const expected = 120 * 80 - corners - slotsWorth(slotPlaces(3, 2, CLOSED)) * stadiumArea(5.2, 15.2);
    expect(Math.abs(cut.area() - expected) / expected).toBeLessThan(0.003);
  });

  it('discriminates: a square-cornered closed board does not pass for the rounded one', () => {
    const square = keep(board({ columns: 3, rows: 2, sides: CLOSED, cornerRadiusMm: 0 }).slice(2.5)).area();
    const rounded = keep(board({ columns: 3, rows: 2, sides: CLOSED }).slice(2.5)).area();
    const corners = 4 * (100 - (Math.PI * 100) / 4); // 85.8 mm2
    // within 1 %: each arc is drawn with 16 segments, which cuts it about 0.16 % short of the circle
    expect(Math.abs(square - rounded - corners) / corners).toBeLessThan(0.01);
  });

  it('rounds a corner only where both of its sides are closed', () => {
    const area = (sides: Sides) => keep(board({ columns: 2, rows: 2, sides }).slice(2.5)).area();
    const oneCorner = area({ left: 'closed', right: 'open', bottom: 'closed', top: 'open' });
    const none = area({ left: 'closed', right: 'open', bottom: 'open', top: 'open' });
    // With the bottom open, the second board gains the bottom edge's half slot at x = 40 and the
    // quarter at its bottom-right corner (x = 80; the bottom-left one stays out, its left side being
    // closed), and loses the rounded bottom-left corner.
    const expected = -(0.5 + 0.25) * stadiumArea(5.2, 15.2) + (100 - (Math.PI * 100) / 4); // -33.5 mm2
    expect(Math.abs(none - oneCorner - expected) / Math.abs(expected)).toBeLessThan(0.01);
  });

  it('has one through-hole per whole slot: half and quarter slots are notches in its edges', () => {
    expect(board({ columns: 1, rows: 1 }).genus()).toBe(1);
    expect(board({ columns: 2, rows: 2 }).genus()).toBe(5);
    expect(board({ columns: 3, rows: 2, sides: CLOSED }).genus()).toBe(8);
  });

  it('cuts each slot 5.2 x 15.2 mm through the middle: 5 x 15 plus the 0.2 mm clearance (D40)', () => {
    const [hole] = holesNear(keep(board({ columns: 1, rows: 1 }).slice(2.5)), 20, 20);
    expect(hole).toBeDefined();
    expect((hole?.maxX ?? 0) - (hole?.minX ?? 0)).toBeCloseTo(5.2, 2);
    expect((hole?.maxY ?? 0) - (hole?.minY ?? 0)).toBeCloseTo(15.2, 2);
  });

  it('widens each slot by its 1 mm chamfer at both faces (D41), and not without one', () => {
    for (const z of [0.25, 4.75]) {
      const [hole] = holesNear(keep(board({ columns: 1, rows: 1 }).slice(z)), 20, 20);
      expect((hole?.maxX ?? 0) - (hole?.minX ?? 0)).toBeCloseTo(5.2 + 2 * 0.75, 2);
      const [plain] = holesNear(keep(board({ columns: 1, rows: 1, slotChamferMm: 0 }).slice(z)), 20, 20);
      expect((plain?.maxX ?? 0) - (plain?.minX ?? 0)).toBeCloseTo(5.2, 2);
    }
  });

  it('weighs what the plate less its slots and their chamfers works out to by hand', () => {
    const [w, h, c, t] = [5.2, 15.2, 1, 5];
    // a 45 degree chamfer of depth c round a convex outline adds P c^2 / 2 + pi c^3 / 3 at each face
    const slot = stadiumArea(w, h) * t + 2 * ((stadiumPerimeter(w, h) * c * c) / 2 + (Math.PI * c ** 3) / 3);
    // the front's edge chamfer (D277), c^2 / 2 a millimetre, along each 80 mm edge less its 30.4 mm of slots: a
    // quarter, a half and a quarter, 7.6, 15.2 and 7.6 mm long
    const edges = (4 * (80 - 30.4) * (c * c)) / 2;
    const expected = 80 * 80 * t - slotsWorth(slotPlaces(2, 2, ALL_OPEN)) * slot - edges;
    const volume = board({ columns: 2, rows: 2 }).volume();
    expect(Math.abs(volume - expected) / expected).toBeLessThan(0.003);
  });

  it('closed, weighs the plate less its rounded corners, its slots and its edge chamfers, front and back (D276)', () => {
    const [w, h, c, t, r] = [5.2, 15.2, 1, 5, 10];
    const slot = stadiumArea(w, h) * t + 2 * ((stadiumPerimeter(w, h) * c * c) / 2 + (Math.PI * c ** 3) / 3);
    const plate = (120 * 80 - 4 * (r * r - (Math.PI * r * r) / 4)) * t;
    // round a convex outline a chamfer takes P c^2 / 2 - pi c^3 / 3 at each face: about 381 mm3 here
    const perimeter = 2 * (120 + 80) - 8 * r + 2 * Math.PI * r;
    const edges = 2 * ((perimeter * c * c) / 2 - (Math.PI * c ** 3) / 3);
    const expected = plate - slotsWorth(slotPlaces(3, 2, CLOSED)) * slot - edges;
    const volume = board({ columns: 3, rows: 2, sides: CLOSED }).volume();
    expect(Math.abs(volume - expected) / expected).toBeLessThan(0.002);
  });

  it('chamfers its outer edge 1 mm at the front all round, and at the back only where a side is closed (D276, D277)', () => {
    const MIXED: Sides = { left: 'closed', right: 'open', bottom: 'open', top: 'closed' };
    for (const sides of [ALL_OPEN, CLOSED, MIXED]) {
      const b = board({ columns: 2, rows: 2, sides });
      // a cut 0.25 mm inside each face: the outline 0.75 mm in where that face is chamfered
      const inset = (z: number, chamfered: (side: keyof Sides) => boolean) => {
        const { min, max } = keep(b.slice(z)).bounds();
        const by = (side: keyof Sides) => (chamfered(side) ? 0.75 : 0);
        expect(min[0]).toBeCloseTo(by('left'), 6);
        expect(min[1]).toBeCloseTo(by('bottom'), 6);
        expect(max[0]).toBeCloseTo(80 - by('right'), 6);
        expect(max[1]).toBeCloseTo(80 - by('top'), 6);
      };
      inset(4.75, () => true);
      inset(0.25, (side) => sides[side] === 'closed');
    }
  });

  it('two open boards side by side meet in a 2 mm V groove on the front, and are one board under it (D277)', () => {
    const left = board({ columns: 1, rows: 2 });
    const right = keep(board({ columns: 1, rows: 2 }).translate([40, 0, 0]));
    const wall = keep(left.add(right));
    // 0.5 mm under the front the groove is 1 mm wide, and runs the seam's length, through its slots: two pieces
    const front = keep(wall.slice(4.5))
      .decompose()
      .map((piece) => keep(piece).bounds())
      .sort((a, b) => a.min[0] - b.min[0]);
    expect(front).toHaveLength(2);
    expect(front[0]?.max[0]).toBeCloseTo(39.5, 6);
    expect(front[1]?.min[0]).toBeCloseTo(40.5, 6);
    expect(keep(wall.slice(2.5)).decompose().map(keep)).toHaveLength(1);
  });

  it('two open tiles side by side are the board of their size under the front: the seam makes whole slots (D15)', () => {
    const left = board({ columns: 1, rows: 2 });
    const right = keep(board({ columns: 1, rows: 2 }).translate([40, 0, 0]));
    const wall = keep(left.add(right));
    const whole = board({ columns: 2, rows: 2 });
    expect(wall.genus()).toBe(whole.genus());
    // the same cut, to one part in a million, from the back up to the groove
    for (const z of [0.25, 2.5]) {
      const [a, b] = [keep(wall.slice(z)).area(), keep(whole.slice(z)).area()];
      expect(Math.abs(a - b) / b).toBeLessThan(1e-6);
    }
  });

  it('discriminates: with the second tile closed at the seam, the wall has less taken out', () => {
    const left = board({ columns: 1, rows: 2 });
    const right = keep(board({ columns: 1, rows: 2, sides: { ...ALL_OPEN, left: 'closed' } }).translate([40, 0, 0]));
    const wall = keep(left.add(right));
    expect(wall.volume()).toBeGreaterThan(board({ columns: 2, rows: 2 }).volume() + 100);
  });

  it('exports with no degenerate facet, chamfered or not, open or closed', () => {
    for (const given of [
      { columns: 1, rows: 1 },
      { columns: 2, rows: 2, sides: CLOSED },
      { columns: 2, rows: 1, slotChamferMm: 0 },
      { columns: 2, rows: 2, sides: { left: 'closed', right: 'open', bottom: 'open', top: 'closed' } as Sides },
      { columns: 1, rows: 2, sides: { ...CLOSED, right: 'open' } as Sides, cornerRadiusMm: 0 },
    ]) {
      const mesh = meshOf(board(given));
      expect(mesh.triangles.length).toBeGreaterThan(0);
      expect(degenerateFacets(mesh)).toBe(0);
    }
  });

  it('discriminates: the facet count finds a facet with two corners at one point', () => {
    const mesh = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0]),
      triangles: new Uint32Array([0, 1, 2, 0, 1, 3]), // corners 1 and 2 are the same point
    };
    expect(degenerateFacets(mesh)).toBe(1);
  });

  it('refuses settings it cannot make', () => {
    expect(() => solidBoardParams({ columns: 0, rows: 1 })).toThrow(RangeError);
    expect(() => solidBoardParams({ columns: 1, rows: 1, thicknessMm: 2 })).toThrow(RangeError); // two 1 mm chamfers fill it
    expect(() => solidBoardParams({ columns: 1, rows: 1, cornerRadiusMm: 21 })).toThrow(RangeError);
    expect(() => solidBoardParams({ columns: 1, rows: 1, slotClearanceMm: -5.5 })).toThrow(RangeError);
  });
});

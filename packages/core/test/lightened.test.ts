// The lightened board (backlog item board-lightened; D141 to D145): the solid board with pockets cut
// through it, keeping a rim round every slot, webs along the slot grid's diagonals, a band along every
// edge and a pad round each screw hole. Each claim is measured on the built solid, at mid-depth where the
// slots are their drawn size, against the solid board of the same settings; each has a control that
// must fail.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams, type SolidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import {
  EDGE_BAND_MM,
  LATTICE_DEFAULTS,
  latticeParams,
  type LatticeParams,
  makeLightenedBoard,
  MIN_MEMBER_MM,
} from '../src/lightened.js';
import { mountingCuts, mountingParams, type MountingParams } from '../src/mounting.js';
import { circle, stadium } from '../src/rings.js';
import { slotPlaces } from '../src/slots.js';
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

type BoardGiven = Partial<SolidBoardParams>;
const params = (p: BoardGiven = {}) => solidBoardParams({ columns: 4, rows: 4, ...p });
const lightened = (p: BoardGiven = {}, lattice: Partial<LatticeParams> = {}, m: Partial<MountingParams> = {}) =>
  keep(makeLightenedBoard(engine, params(p), { ...LATTICE_DEFAULTS, ...lattice }, mountingParams(m)));
const solid = (p: BoardGiven = {}, m: Partial<MountingParams> = {}) =>
  keep(makeSolidBoard(engine, params(p), mountingCuts(mountingParams(m), params(p))));
const midSlice = (b: Manifold, p: BoardGiven = {}) => keep(b.slice(params(p).thicknessMm / 2));
const shape = (contours: [number, number][][]) => keep(new engine.CrossSection(contours, 'NonZero'));

/** The area of `zone`, within the solid board's slice, that the lightened board's slice leaves open. */
function uncovered(zone: CrossSection, light: CrossSection, full: CrossSection): number {
  return keep(keep(zone.intersect(full)).subtract(light)).area();
}

describe('latticeParams: the starting values', () => {
  it('are a 3 mm rim round each slot and 3 mm webs (D143)', () => {
    expect(latticeParams({})).toEqual({ rimMm: 3, webMm: 3 });
  });

  it('refuse a rim or a web under 1.2 mm (D145)', () => {
    expect(MIN_MEMBER_MM).toBe(1.2);
    expect(() => latticeParams({ rimMm: 1.1 })).toThrow(RangeError);
    expect(() => latticeParams({ webMm: 1.1 })).toThrow(RangeError);
    expect(latticeParams({ rimMm: 1.2, webMm: 1.2 })).toEqual({ rimMm: 1.2, webMm: 1.2 });
  });
});

describe('makeLightenedBoard (D141 to D144)', () => {
  it('is one body, the board less its pockets, inside the solid board', () => {
    const b = lightened();
    const parts = b.decompose();
    made.push(...parts);
    expect(parts).toHaveLength(1);
    const outside = keep(b.subtract(solid()));
    expect(outside.volume()).toBeLessThan(1e-6);
  });

  it('control: with no webs, the rims and the band fall apart into separate pieces', () => {
    const parts = lightened({}, { webMm: 0 }).decompose();
    made.push(...parts);
    expect(parts.length).toBeGreaterThan(1);
  });

  it('cuts its pockets right through, so each face is as open as the middle (D141)', () => {
    const b = lightened();
    const t = params().thicknessMm;
    const area = (z: number) => keep(b.slice(z)).area();
    const [front, middle, back] = [area(0.05), area(t / 2), area(t - 0.05)];
    // the faces differ from the middle only by the slots' chamfers, which take a little more
    expect(front).toBeLessThan(middle);
    expect(back).toBeLessThan(middle);
    expect(front / middle).toBeGreaterThan(0.85);
  });

  it("keeps about a third of the solid board's plastic (D142: about 36 % by the 2D sketch)", () => {
    const ratio = lightened().volume() / solid().volume();
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.45);
  });

  it('keeps a rim as wide as asked round every slot, outside its chamfer (D143)', () => {
    const p = params();
    const [w, h, c] = [5 + p.slotClearanceMm, 15 + p.slotClearanceMm, p.slotChamferMm];
    const rings = (grow: number) =>
      shape(slotPlaces(p.columns, p.rows, p.sides).map((s) => stadium(s.xMm, s.yMm, w, h, grow)));
    const [light, full] = [midSlice(lightened()), midSlice(solid())];
    expect(uncovered(rings(c + LATTICE_DEFAULTS.rimMm - 0.01), light, full)).toBeLessThan(0.01);
    // control: half a millimetre further out is pocket in places
    expect(uncovered(rings(c + LATTICE_DEFAULTS.rimMm + 0.5), light, full)).toBeGreaterThan(1);
  });

  it(`keeps every member at least ${MIN_MEMBER_MM} mm wide: nothing thinner survives an opening by half of it (D145)`, () => {
    // The opening also rounds the outline's outer corners, where a half slot meets an edge (4.9 mm² of the
    // solid board, measured), so only what it takes more than 1 mm inside the outline counts.
    const inside = shape([
      [
        [1, 1],
        [159, 1],
        [159, 159],
        [1, 159],
      ],
    ]);
    const lost = (b: Manifold) => {
      const s = midSlice(b);
      const opened = keep(keep(s.offset(-MIN_MEMBER_MM / 2, 'Round')).offset(MIN_MEMBER_MM / 2, 'Round'));
      return keep(keep(s.subtract(opened)).intersect(inside)).area();
    };
    // what is left is the polygons' rounding where an offset goes round a slot's ends and back: 0.012 mm²
    expect(lost(solid())).toBeLessThan(0.1);
    expect(lost(lightened())).toBeLessThan(0.1);
    // control: webs under the minimum, built past the check, are lost
    expect(lost(lightened({}, { webMm: 0.8 }))).toBeGreaterThan(50);
  });

  it(`keeps a ${EDGE_BAND_MM} mm band along every edge, open or closed (D144)`, () => {
    for (const sides of [
      { left: 'open', right: 'open', bottom: 'open', top: 'open' },
      { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' },
    ] as const) {
      const p = { sides };
      const [light, full] = [midSlice(lightened(p), p), midSlice(solid(p), p)];
      // Strips along the square's edges; where a closed corner is rounded, the solid board's slice clips them
      // to strips that lie inside the band that follows the curve.
      const box = shape([
        [
          [0, 0],
          [160, 0],
          [160, 160],
          [0, 160],
        ],
      ]);
      const band = (width: number) => keep(box.subtract(keep(box.offset(-width, 'Miter'))));
      expect(uncovered(band(EDGE_BAND_MM - 0.01), light, full)).toBeLessThan(0.01);
      // control: a millimetre further in is pocket in places
      expect(uncovered(band(EDGE_BAND_MM + 1), light, full)).toBeGreaterThan(1);
    }
  });

  it('keeps a pad round each screw hole, 13 mm across for a 4 mm screw (D144), and none where there is no screw', () => {
    const pads = (d: number) => shape([10, 150].flatMap((x) => [10, 150].map((y) => circle(x, y, d))));
    const [light, full] = [midSlice(lightened()), midSlice(solid())];
    expect(uncovered(pads(13 - 0.02), light, full)).toBeLessThan(0.01);
    // control: a wider pad is pocket in places
    expect(uncovered(pads(16), light, full)).toBeGreaterThan(1);
    // no screw and no standoff: the pocket runs in where the pad was
    const none = { screwHead: 'none' } as const;
    expect(uncovered(pads(13 - 0.02), midSlice(lightened({}, {}, none)), midSlice(solid({}, none)))).toBeGreaterThan(1);
  });

  it("keeps the keyhole standoffs' footprints solid, and the pads round the standoffs at the bottom (D244, D190)", () => {
    // a 4 mm screw's keyhole standoff: 15 x 24 mm, behind each top corner tile's centre slot
    const pads = (wide: number, long: number) => shape([20, 140].map((x) => stadium(x, 140, wide, long)));
    const m = { screwHead: 'keyhole', standoffHeightMm: 20 } as const;
    const [light, full] = [midSlice(lightened({}, {}, m)), midSlice(solid({}, m))];
    expect(uncovered(pads(15 - 0.02, 24 - 0.02), light, full)).toBeLessThan(0.01);
    expect(uncovered(pads(21, 30), light, full)).toBeGreaterThan(1); // control: wider is pocket in places
    // the bottom standoffs need their pads, lock screws or not (D190)
    const bottom = shape([10, 150].map((x) => circle(x, 10, 13 - 0.02)));
    expect(uncovered(bottom, light, full)).toBeLessThan(0.01);
    expect(uncovered(shape([10, 150].map((x) => circle(x, 10, 16))), light, full)).toBeGreaterThan(1); // control
    const locked = { ...m, lockScrews: true };
    expect(uncovered(bottom, midSlice(lightened({}, {}, locked)), midSlice(solid({}, locked)))).toBeLessThan(0.01);
  });

  it('keeps the pad round a standoff with no screw hole, and the standoff whole', () => {
    const m = { screwHead: 'none', standoffHeightMm: 20 } as const;
    const pads = shape([10, 150].flatMap((x) => [10, 150].map((y) => circle(x, y, 13 - 0.02))));
    expect(uncovered(pads, midSlice(lightened({}, {}, m)), midSlice(solid({}, m)))).toBeLessThan(0.01);
    const behind = (b: Manifold) => keep(b.slice(-10)).area();
    expect(behind(lightened({}, {}, m))).toBeCloseTo(behind(solid({}, m)), 6);
  });

  it('leaves no degenerate facet, open or closed, with standoffs or keyholes', () => {
    expect(degenerateFacets(meshOf(lightened()))).toBe(0);
    const closed = { sides: { left: 'closed', right: 'closed', bottom: 'open', top: 'closed' } } as const;
    expect(degenerateFacets(meshOf(lightened(closed, {}, { standoffHeightMm: 20 })))).toBe(0);
    // the keyhole standoffs, open and closed: the STL check found 90 on the open board (17 Oct 2026)
    const keyholes = { screwHead: 'keyhole', standoffHeightMm: 20 } as const;
    expect(degenerateFacets(meshOf(lightened({}, {}, keyholes)))).toBe(0);
    expect(degenerateFacets(meshOf(lightened(closed, {}, keyholes)))).toBe(0);
  });

  it('is one body at every size from one tile to ten, square or long', () => {
    for (const [columns, rows] of [
      [1, 1],
      [2, 1],
      [1, 3],
      [10, 2],
    ] as const) {
      const parts = keep(
        makeLightenedBoard(engine, solidBoardParams({ columns, rows }), LATTICE_DEFAULTS, mountingParams({})),
      ).decompose();
      made.push(...parts);
      expect(parts).toHaveLength(1);
    }
  });
});

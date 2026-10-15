// The skeleton board (backlog item board-skeleton; D146, D147, D161): the lightened board's lattice with every
// member an I-beam, full width at both faces for 0.6 mm, then narrowing at 45 degrees towards a 1.2 mm core.
// Each claim is measured on sections of the built solid; each has a control that must fail.
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams, type SolidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { LATTICE_DEFAULTS, makeLightenedBoard } from '../src/lightened.js';
import { mountingCuts, mountingParams, type MountingParams } from '../src/mounting.js';
import { circle } from '../src/rings.js';
import {
  FLANGE_MM,
  makeSkeletonBoard,
  SKELETON_DEFAULTS,
  skeletonParams,
  type SkeletonParams,
} from '../src/skeleton.js';
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
const skeleton = (p: BoardGiven = {}, s: Partial<SkeletonParams> = {}, m: Partial<MountingParams> = {}) =>
  keep(makeSkeletonBoard(engine, params(p), { ...SKELETON_DEFAULTS, ...s }, mountingParams(m)));
const solid = (p: BoardGiven = {}) =>
  keep(makeSolidBoard(engine, params(p), mountingCuts(mountingParams({}), params(p))));
const rect = (corners: Vec2[]) => keep(new engine.CrossSection([corners], 'Positive'));

/** How wide the plastic is that a thin strip crosses: the strip's area in the slice over its thickness. */
function widthAcross(slice: CrossSection, [cx, cy]: Vec2, [ux, uy]: Vec2, reach: number): number {
  const thin = 0.05;
  const [vx, vy] = [-uy * thin, ux * thin]; // the strip's thickness, square to its length
  const strip = rect([
    [cx - ux * reach - vx / 2, cy - uy * reach - vy / 2],
    [cx + ux * reach - vx / 2, cy + uy * reach - vy / 2],
    [cx + ux * reach + vx / 2, cy + uy * reach + vy / 2],
    [cx - ux * reach + vx / 2, cy - uy * reach + vy / 2],
  ]);
  return keep(slice.intersect(strip)).area() / thin;
}

const r2 = Math.SQRT1_2;
/** A web's width at depth z: across the web from (20, 20) to (40, 40), at its middle. */
const webAt = (b: Manifold, z: number) => widthAcross(keep(b.slice(z)), [30, 30], [r2, -r2], 4);
/** A rim's width at depth z: along x from the right side of the slot at (20, 20), as far as the pocket. */
const rimAt = (b: Manifold, z: number) => widthAcross(keep(b.slice(z)), [20 + 2.6 + 3, 20], [1, 0], 3);

describe('skeletonParams: the starting values', () => {
  it('are a 3 mm rim, 3 mm webs and a 1.2 mm core (D147)', () => {
    expect(skeletonParams({})).toEqual({ rimMm: 3, webMm: 3, coreMm: 1.2 });
  });

  it('refuse a core under 0.8 mm, or wider than the rim or the webs (D147)', () => {
    expect(() => skeletonParams({ coreMm: 0.7 })).toThrow(RangeError);
    expect(() => skeletonParams({ coreMm: 3.5 })).toThrow(/core/);
    expect(skeletonParams({ coreMm: 0.8 }).coreMm).toBe(0.8);
  });
});

describe('makeSkeletonBoard (D146, D147, D161)', () => {
  it('is one body, inside the lightened board, and lighter: about a third of the solid board', () => {
    const b = skeleton();
    const parts = b.decompose();
    made.push(...parts);
    expect(parts).toHaveLength(1);
    const light = keep(makeLightenedBoard(engine, params(), LATTICE_DEFAULTS, mountingParams({})));
    // within polygon rounding: the lightened board redraws its pads' arcs when it rounds its pockets' corners,
    // which leaves hairlines of the skeleton's pads outside it, 0.05 mm³ in all (measured)
    expect(keep(b.subtract(light)).volume()).toBeLessThan(0.1);
    const share = b.volume() / solid().volume();
    expect(share).toBeGreaterThan(0.28); // D161: about 33 %, worked out from the sections
    expect(share).toBeLessThan(0.38);
  });

  it('has webs 3 mm wide at both faces and 1.2 mm through the middle, an I-beam (D147)', () => {
    const b = skeleton();
    expect(webAt(b, 0.3)).toBeCloseTo(3, 1);
    expect(webAt(b, 4.7)).toBeCloseTo(3, 1);
    expect(webAt(b, 2.5)).toBeCloseTo(1.2, 1);
    // control: the lightened board's webs are 3 mm all through
    const light = keep(makeLightenedBoard(engine, params(), LATTICE_DEFAULTS, mountingParams({})));
    expect(webAt(light, 2.5)).toBeCloseTo(3, 1);
  });

  it('narrows its webs at 45 degrees from the flange to the core, from both faces', () => {
    const b = skeleton();
    let checked = 0;
    for (let z = 0.1; z < 4.95; z += 0.1) {
      const fromFace = Math.min(z, 5 - z);
      const slope = Math.max(1.2, 3 - 2 * Math.max(0, fromFace - FLANGE_MM)); // the 45 degree line
      expect(Math.abs(webAt(b, z) - slope)).toBeLessThan(0.06);
      checked++;
    }
    expect(checked).toBe(49);
  });

  it('keeps its rims 4 mm out from the slot at the faces, narrowing at 45 degrees to 2.1 mm (D161 a)', () => {
    const b = skeleton();
    // 0.3 mm in, the slot's 1 mm chamfer takes 0.7 mm of the 4 mm: 3 mm outside the chamfer, as D143 measures
    expect(rimAt(b, 0.3)).toBeCloseTo(3.3, 1);
    expect(rimAt(b, 1)).toBeCloseTo(3.6, 1); // 0.4 mm past the flange, 0.4 mm narrower
    expect(rimAt(b, 2.5)).toBeCloseTo(2.1, 1);
    expect(rimAt(b, 4)).toBeCloseTo(3.6, 1);
  });

  it('keeps its screw pads full depth', () => {
    const pads = keep(
      new engine.CrossSection(
        [10, 150].flatMap((x) => [10, 150].map((y) => circle(x, y, 12.9))),
        'NonZero',
      ),
    );
    const b = skeleton();
    const full = keep(solid().slice(2.5));
    expect(keep(keep(pads.intersect(full)).subtract(keep(b.slice(2.5)))).area()).toBeLessThan(0.01);
  });

  it('leaves no degenerate facet, open or closed, with keyholes or standoffs', () => {
    expect(degenerateFacets(meshOf(skeleton()))).toBe(0);
    const closed = { sides: { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' } } as const;
    expect(degenerateFacets(meshOf(skeleton(closed, {}, { screwHead: 'keyhole' })))).toBe(0);
    expect(degenerateFacets(meshOf(skeleton({}, {}, { standoffHeightMm: 20 })))).toBe(0);
  });

  it('is one body at every size from one tile to ten', () => {
    for (const [columns, rows] of [
      [1, 1],
      [2, 1],
      [10, 2],
    ] as const) {
      const parts = keep(
        makeSkeletonBoard(engine, solidBoardParams({ columns, rows }), SKELETON_DEFAULTS, mountingParams({})),
      ).decompose();
      made.push(...parts);
      expect(parts).toHaveLength(1);
    }
  });
});

/**
 * What a layer overhangs, printed face down: each section, going from the front (z = t, on the bed) towards
 * the back, may reach past the section printed before it, `rise` mm nearer the bed, by no more than `rise`.
 * The area that reaches further, summed over the board.
 */
function overhang(b: Manifold, t: number, rise: number): number {
  let total = 0;
  // sections between the faces, never on one: a section at a face is empty or the face itself
  for (let z = t - rise * 1.5; z > 0; z -= rise) {
    const below = keep(keep(b.slice(z + rise)).offset(rise + 0.02, 'Round'));
    total += keep(keep(b.slice(z)).subtract(below)).area();
  }
  return total;
}

// A layer of a print; the check compares sections this far apart.
const RISE = 0.2;

describe('printed face down, it overhangs nowhere more than 45 degrees (D147)', () => {
  it('measured a layer at a time, from the front to the back', () => {
    expect(overhang(skeleton(), 5, RISE)).toBeLessThan(0.05);
  });

  it('control: a shelf that juts 2 mm out over one layer is caught', () => {
    const { Manifold } = engine;
    const post = keep(Manifold.cube([4, 4, 5]));
    const shelf = keep(keep(Manifold.cube([6, 4, 1])).translate([0, 0, 0])); // nearest the back, printed last
    expect(overhang(keep(Manifold.union(post, shelf)), 5, RISE)).toBeGreaterThan(1);
  });
});

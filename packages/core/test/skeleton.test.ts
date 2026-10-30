// The skeleton board (backlog item board-skeleton; D146, D147, D161): the lightened board's lattice with every
// member an I-beam, full width at both faces for 0.6 mm, then narrowing at 45 degrees towards a 1.2 mm core.
// Each claim is measured on sections of the built solid; each has a control that must fail.
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { makeSolidBoard, solidBoardParams, type SolidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { LATTICE_DEFAULTS, makeLightenedBoard } from '../src/lightened.js';
import { mountingCuts, mountingParams, type MountingParams } from '../src/mounting.js';
import { circle, stadium } from '../src/rings.js';
import {
  FLANGE_MM,
  makeSkeletonBoard,
  SKELETON_DEFAULTS,
  skeletonParams,
  type SkeletonParams,
} from '../src/skeleton.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets } from './facets.js';

// Every test here builds whole boards, about 1 s each, and on a busy machine three of them passed 5 s.
vi.setConfig({ testTimeout: 30_000 });

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

  it("blends its pockets' corners at both faces as the lightened board's, the blend widening with them inside (D278)", () => {
    const b = skeleton();
    // the corner where the 20 mm slot's rim, its straight side at x = 26.6 mm, meets the lower side of the web up and
    // to the right; the line halfway between the two, into the pocket
    const corner: Vec2 = [26.6, 20 + 6.6 - 1.5 * Math.SQRT2];
    const into: Vec2 = [Math.cos(Math.PI / 8), -Math.sin(Math.PI / 8)];
    const holds = (z: number, d: number) => {
      const dot = keep(
        keep(engine.CrossSection.square([0.02, 0.02], true)).translate([
          corner[0] + d * into[0],
          corner[1] + d * into[1],
        ]),
      );
      return keep(keep(b.slice(z)).intersect(dot)).area() > 0;
    };
    // at both faces the parabola stands 0.57 mm out from the corner, as the lightened board's
    for (const z of [0.3, 4.7]) {
      expect(holds(z, 0.4)).toBe(true);
      expect(holds(z, 0.7)).toBe(false);
    }
    // through the middle the pocket has widened into the web and the rim, and the blend with them
    expect(holds(2.5, 0.4)).toBe(false);
  });

  it('keeps no point a straight wall does not need, so its file is no larger than its shape asks', () => {
    const b = skeleton();
    const simpler = keep(b.simplify(1e-6));
    expect(simpler.numTri()).toBe(b.numTri());
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

  it('leaves the plate round the slots the keyhole standoffs stand behind as round any other slot (D250 f)', () => {
    // round each corner slot of the 160 mm board, inside the plate: the members alone, the standoff no further in
    const windows = keep(
      new engine.CrossSection(
        [20, 140].flatMap((x) => [20, 140].map((y) => stadium(x, y, 17, 26))),
        'NonZero',
      ),
    );
    // but the groove a lock screw at the screw size, 4 mm, has through its slot's sides for its 8 mm head (A248, D479)
    const grooves = keep(
      new engine.CrossSection(
        [20, 140].map((x) => circle(x, 20, 8.5 + 0.02)),
        'NonZero',
      ),
    );
    const inPlate = (b: Manifold, z: number, w = windows) => keep(keep(b.slice(z)).intersect(w)).area();
    const bare = skeleton({}, {}, { screwHead: 'none' });
    for (const lockScrews of [false, true]) {
      const board = skeleton({}, {}, { screwHead: 'keyhole', standoffHeightMm: 20, lockScrews });
      const w = lockScrews ? keep(windows.subtract(grooves)) : windows;
      for (const z of [0.5, 2, 4.5]) expect(inPlate(board, z, w)).toBeCloseTo(inPlate(bare, z, w), 1);
      // the control: the grooves are cut, and left out above
      if (lockScrews) expect(inPlate(bare, 2) - inPlate(board, 2)).toBeGreaterThan(5);
    }
  });

  it('stands each standoff behind a slot inside the frame round that slot, flush with it (D306)', () => {
    // behind the board, at the hook's room, the keyhole's roof and the lips: no standoff with no member in front of it,
    // the members full width at the back face for FLANGE_MM, but for the slot it closes the back of (D244), and a 4 mm
    // lock screw's groove through the slot's sides, the screw size's (A248, D479)
    const slots = keep(
      new engine.CrossSection(
        [20, 140].flatMap((x) => [20, 140].flatMap((y) => [stadium(x, y, 5.2, 15.2, 1.5), circle(x, y, 8.6)])),
        'NonZero',
      ),
    );
    const unbacked = (b: Manifold) => {
      const plate = keep(keep(b.slice(FLANGE_MM - 0.1)).add(slots));
      return Math.max(...[-1.5, -10, -19].map((z) => keep(keep(b.slice(z)).subtract(plate)).area()));
    };
    const keyholes = { screwHead: 'keyhole', standoffHeightMm: 20 } as const;
    const cases: [Partial<SkeletonParams>, Partial<MountingParams>][] = [
      [{}, keyholes],
      [{}, { ...keyholes, lockScrews: true }],
      [{}, { screwHead: 'lock', standoffHeightMm: 20 }],
      [{}, { ...keyholes, screwMm: 5 }],
      [{ rimMm: 2 }, keyholes],
      [{ rimMm: 6 }, keyholes],
    ];
    for (const [s, m] of cases) {
      const b = skeleton({}, s, m);
      expect(unbacked(b)).toBeLessThan(1e-3);
      expect(degenerateFacets(meshOf(b))).toBe(0);
    }
    // flush: above the keyhole's roof the top standoffs cover the frame round their slots, all but its outer 0.15 mm
    const frame = (grow: number) =>
      keep(
        new engine.CrossSection(
          [20, 140].map((x) => stadium(x, 140, 5.2, 15.2, grow)),
          'NonZero',
        ),
      );
    const roof = keep(skeleton({}, {}, keyholes).slice(-10));
    expect(keep(frame(1 + 3 - 0.15).subtract(roof)).area()).toBeLessThan(1e-3);
    expect(keep(frame(1 + 3).subtract(roof)).area()).toBeGreaterThan(1); // control: the outer 0.1 mm is not covered
  }, 120_000);

  it('leaves no degenerate facet, open or closed, with keyholes or standoffs', () => {
    expect(degenerateFacets(meshOf(skeleton()))).toBe(0);
    const closed = { sides: { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' } } as const;
    expect(degenerateFacets(meshOf(skeleton(closed, {}, { screwHead: 'keyhole', standoffHeightMm: 20 })))).toBe(0);
    expect(degenerateFacets(meshOf(skeleton({}, {}, { standoffHeightMm: 20 })))).toBe(0);
    expect(degenerateFacets(meshOf(skeleton({}, {}, { screwHead: 'keyhole', standoffHeightMm: 20 })))).toBe(0);
  });

  it('is made with every screw size, 3 to 5 mm, in each look (D605)', () => {
    // at 3.5 mm in the Curved look, a screw pad's circle met a pocket's blended corner in a notch 0.02 mm long, which
    // the taper's 0.9 mm move turned round, and the board was refused (30 Oct 2026)
    for (const corners of ['eased', 'sharp'] as const) {
      for (const screwMm of [3, 3.5, 4, 4.5, 5]) {
        const board = skeleton({}, { corners }, { screwMm });
        const parts = board.decompose();
        made.push(...parts);
        expect(parts, `${corners} M${screwMm}`).toHaveLength(1);
        expect(degenerateFacets(meshOf(board)), `${corners} M${screwMm}`).toBe(0);
      }
    }
  }, 120_000);

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
  // sections between the faces, never on one: a section at a face is empty or the face itself. Grown with mitred
  // corners, as two 45 degree faces that meet at an outside corner, a slot's chamfer and the edge's (D276), grow
  // there along the mitre; their meeting edge leans at 35 degrees, and no face of either is past 45.
  for (let z = t - rise * 1.5; z > 0; z -= rise) {
    const below = keep(keep(b.slice(z + rise)).offset(rise + 0.02, 'Miter'));
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

  it('control: a face 50 degrees over is caught, and two 45 degree faces meeting at a corner are not', () => {
    const square = (half: number) =>
      keep(
        new engine.CrossSection([
          [
            [-half, -half],
            [half, -half],
            [half, half],
            [-half, half],
          ],
        ]),
      );
    // printed from z = 5 down: a square 2 mm at the bed to 14 mm last, each face 6 mm out over 5, 50 degrees
    expect(overhang(keep(square(7).extrude(5, 0, 0, [1 / 7, 1 / 7])), 5, RISE)).toBeGreaterThan(1);
    // 2 mm to 12 mm, each face 5 mm out over 5, 45 degrees, its corners mitred
    expect(overhang(keep(square(6).extrude(5, 0, 0, [1 / 6, 1 / 6])), 5, RISE)).toBeLessThan(0.05);
  });

  it('control: a shelf that juts 2 mm out over one layer is caught', () => {
    const { Manifold } = engine;
    const post = keep(Manifold.cube([4, 4, 5]));
    const shelf = keep(keep(Manifold.cube([6, 4, 1])).translate([0, 0, 0])); // nearest the back, printed last
    expect(overhang(keep(Manifold.union(post, shelf)), 5, RISE)).toBeGreaterThan(1);
  });
});

// Open sides between the slots (D282, D288 a): the same I-beams on the moved board, its band along the edges where
// they now lie.
describe('makeSkeletonBoard between the slots (D282)', () => {
  const between = [
    { left: 'open', right: 'open', bottom: 'open', top: 'open' },
    { left: 'closed', right: 'open', bottom: 'open', top: 'closed' },
  ] as const;

  it('is one body, inside the lightened board, about a third of the solid board, with no degenerate facet', () => {
    for (const sides of between) {
      const p = { sides, seams: 'between' } as const;
      const b = skeleton(p);
      expect(b.decompose().map(keep)).toHaveLength(1);
      const light = keep(makeLightenedBoard(engine, params(p), LATTICE_DEFAULTS, mountingParams({})));
      expect(keep(b.subtract(light)).volume()).toBeLessThan(0.1);
      // all of it: as wide and as tall as the board, its band reaching the moved edges
      const [box, full] = [b.boundingBox(), solid(p).boundingBox()];
      for (const k of [0, 1] as const) {
        expect(box.min[k]).toBeCloseTo(full.min[k], 6);
        expect(box.max[k]).toBeCloseTo(full.max[k], 6);
      }
      const share = b.volume() / solid(p).volume();
      expect(share).toBeGreaterThan(0.26);
      expect(share).toBeLessThan(0.4);
      expect(degenerateFacets(meshOf(b))).toBe(0);
    }
  });

  it('keeps its band an I-beam along an edge moved between the slots: 3 mm at the faces, its core in the middle', () => {
    const b = skeleton({ seams: 'between' });
    // the left edge, at x = 10, where the webs from the corner tiles' slots meet outside the board
    const at = (z: number) => widthAcross(keep(b.slice(z)), [15, 40], [1, 0], 5);
    expect(at(0.3)).toBeCloseTo(3, 1);
    expect(at(2.5)).toBeCloseTo(SKELETON_DEFAULTS.coreMm, 1);
  });
});

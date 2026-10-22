// The skeleton board (backlog item board-skeleton; D146, D147, D161, D278, D314): the lightened board's lattice, every
// member an I-beam, as the ultralight boards Q12 chose have them. Each rim, web and the edge band is as wide as the
// lightened board's at both faces for FLANGE_MM, and narrow through the board, to its core: from the back's flange
// it narrows at 45 degrees, and behind the front's it steps straight to it. The board prints face down, the front on
// the bed, so the step is the top of the front's flange and the 45 degrees the only overhang; a taper there, as
// until D314, printed as solid infill on every layer for nothing. The webs, narrowing from both sides, reach the core
// first; a rim, from its outer side, and the band, from its inner side, reach it further in, and keep it to the
// front's flange. Where the front's 1 mm chamfers, round each slot and along the edge, reach past the flange, a rim
// and the band lean with the chamfer, the core's width from it, so that neither is ever narrower than its core. The
// screw pads stay full depth. The flanges are 0.4 mm and the core 0.9 mm, D314's option (c).
//
// The members are a slab less the pockets, and the pockets are the lightened board's at both faces, their corners
// blended (D278), each widening through the board into the members round it, edge by edge: one mesh a pocket,
// lofted through the depths where its sides bend. Built so, nothing meets on a plane: the members built as solids
// and joined, as they were until D278, needed their bends staggered (1 078 facets of no area, 15 Oct 2026), and
// pockets cut as slabs stacked through the board took 7.2 s for a 160 x 160 mm board, slabs whose faces lie on each
// other being Manifold's slow case.
import type { Manifold, Vec2 } from 'manifold-3d';
import { boardFace, type BoardCuts, extentOf, makeSolidBoard, type SolidBoardParams } from './board-solid.js';
import { EDGE_CHAMFER_MM, grownRing } from './chamfer.js';
import type { Engine } from './engine.js';
import {
  bothCuts,
  framedBoard,
  LATTICE_DEFAULTS,
  latticeMembers,
  latticeParams,
  type LatticeParams,
  type Members,
  pocketShape,
} from './lightened.js';
import { mountingCuts, mountingPads, type MountingParams } from './mounting.js';
import { loftedSolid } from './rings.js';
import { SLOT_HEIGHT_MM, SLOT_WIDTH_MM, TILE_MM } from './skadis.js';
import { slotPlaces } from './slots.js';

export interface SkeletonParams extends LatticeParams {
  coreMm: number; // how narrow a member gets through the board (D147)
}

/** The core starts at 0.9 mm, D314's option (c); it was 1.2 mm (D147). */
export const SKELETON_DEFAULTS: SkeletonParams = { ...LATTICE_DEFAULTS, coreMm: 0.9 };
/**
 * How deep the full width runs in from each face, before the step at the front and the taper at the back: two 0.2 mm
 * layers (D314 c); it was 0.6 mm (D147).
 */
export const FLANGE_MM = 0.4;
/** The narrowest core made: two lines of a 0.4 mm nozzle (D147). */
export const MIN_CORE_MM = 0.8;
/**
 * Below this a core is made, with a warning: two of the 0.45 mm lines PrusaSlicer's profiles for a 0.4 mm nozzle lay
 * (C315). It was 1.2 mm, the starting core, until D314 made the core thinner.
 */
export const WARN_CORE_MM = 0.9;
/** How far the step behind the front's flange rises, mm: a quarter of a layer, so the loft's rings never meet. */
const STEP_MM = 0.05;

/** The flange a board this thick gets: FLANGE_MM, or half the board where it is thinner than two flanges. */
export const flangeOf = (thicknessMm: number) => Math.min(FLANGE_MM, thicknessMm / 2);

/** The skeleton asked for, with the starting values filled in, refused when it cannot be made. */
export function skeletonParams(given: Partial<SkeletonParams>): SkeletonParams {
  const { coreMm, ...lattice } = given;
  const { rimMm, webMm } = latticeParams(lattice);
  const p: SkeletonParams = { rimMm, webMm, coreMm: coreMm ?? SKELETON_DEFAULTS.coreMm };
  if (!(p.coreMm >= MIN_CORE_MM)) throw new RangeError(`The core must be at least ${MIN_CORE_MM} mm wide`);
  if (p.coreMm > p.rimMm || p.coreMm > p.webMm) {
    throw new RangeError('The core cannot be wider than the rim or the webs');
  }
  return p;
}

/** What a pocket's edge runs along: a member, which it widens into through the board, or a blend between two. */
type Along = 'web' | 'rim' | 'band' | 'pad' | null;

/** How near an edge's middle must lie to a member's side to run along it, mm: the polygons' rounding is less. */
const ON_SIDE_MM = 0.05;

/** Whether a distance is the one a member's side lies at. */
const near = (d: number, at: number) => Math.abs(d - at) < ON_SIDE_MM;

/** The distance from a point to the segment from a to b. */
function toSegment([px, py]: Vec2, [ax, ay]: Vec2, [bx, by]: Vec2): number {
  const [dx, dy] = [bx - ax, by - ay];
  const length2 = dx * dx + dy * dy;
  const k = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2));
  return Math.hypot(px - ax - k * dx, py - ay - k * dy);
}

/** The distance from a value to the nearest multiple of the grid's pitch. */
const offGrid = (v: number) => Math.abs(v - TILE_MM * Math.round(v / TILE_MM));

/**
 * Which member each edge of a pocket's rings runs along, by where its middle lies: a web's side, on the grid's
 * diagonals; a rim, round a slot; the band, inside the outline; a pad, round a screw. A blend lies along none.
 */
function alongOf(
  rings: readonly Vec2[][],
  board: SolidBoardParams,
  members: Members,
  pads: readonly Vec2[][],
): Along[][] {
  const [w, h] = [SLOT_WIDTH_MM + board.slotClearanceMm, SLOT_HEIGHT_MM + board.slotClearanceMm];
  const slots = slotPlaces(board.columns, board.rows, board.sides, board.seams).map((s): [Vec2, Vec2] => [
    [s.xMm, s.yMm - (h - w) / 2],
    [s.xMm, s.yMm + (h - w) / 2],
  ]);
  const outline = boardFace(board);
  const rounds = pads.map((ring): [Vec2, number] => {
    const [cx, cy] = ring.reduce(([x, y], [px, py]) => [x + px / ring.length, y + py / ring.length], [0, 0]);
    const [fx, fy] = ring[0] ?? [cx, cy];
    return [[cx, cy], Math.hypot(fx - cx, fy - cy)];
  });
  return rings.map((ring) =>
    ring.map((a, i): Along => {
      const b = ring[(i + 1) % ring.length] ?? a;
      const m: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const web = Math.min(offGrid(m[0] - m[1]), offGrid(m[0] + m[1])) / Math.SQRT2;
      if (near(web, members.webMm / 2)) return 'web';
      if (slots.some(([s0, s1]) => near(toSegment(m, s0, s1) - w / 2, members.rimGrowMm))) return 'rim';
      const edge = Math.min(...outline.map((p, k) => toSegment(m, p, outline[(k + 1) % outline.length] ?? p)));
      if (near(edge, members.bandMm)) return 'band';
      if (rounds.some(([c, r]) => near(Math.hypot(m[0] - c[0], m[1] - c[1]), r))) return 'pad';
      return null;
    }),
  );
}

/** A member a pocket widens into. */
type Member = Exclude<Along, null>;

/**
 * The members each edge of a pocket's rings widens into: the one it runs along, or for a blend the two it runs
 * between, the members before and after it on the ring. A blend widens no further than the less of its two would
 * (C315): as far as either, from one to the other along its length, as until D314, a blend's wall near the web that
 * leaves a half slot's round end widened past the web's own allowance, from both its sides, and left the web 0.84 mm
 * through its 1.2 mm core. A blend from a pad does not widen, as the pad does not. A pocket with no edge along any
 * member is taken to lie among them all, so it does not widen either.
 */
function membersOf(along: readonly Along[][]): Member[][][] {
  return along.map((kinds) => {
    if (kinds.every((k) => k === null)) return kinds.map((): Member[] => ['web', 'rim', 'band', 'pad']);
    const n = kinds.length;
    return kinds.map((k, i): Member[] => {
      if (k !== null) return [k];
      let [before, after] = [i, i];
      do before = (before - 1 + n) % n;
      while (kinds[before] === null);
      do after = (after + 1) % n;
      while (kinds[after] === null);
      return [kinds[before] ?? 'pad', kinds[after] ?? 'pad'];
    });
  });
}

/** The members a pocket widens into. */
const MEMBERS: readonly Member[] = ['web', 'rim', 'band', 'pad'];

/**
 * How far a pocket widens into each kind of member at depth z, from the back face (z = 0) to the front (z = t): not
 * in the flanges; from the back's flange, at 45 degrees, as far as it is past it, to the member's core at most; and
 * where a chamfer at the front reaches past the flange, only so far that the member keeps its core's width beside the
 * chamfer, leaning with it.
 */
function allowance(
  z: number,
  t: number,
  f: number,
  most: Readonly<Record<Member, number>>,
  front: Readonly<Record<Member, number>>,
): Record<Member, number> {
  const into = z > f && z < t - f - 1e-9 ? z - f : 0;
  const at = (k: Member) => Math.max(0, Math.min(most[k], into, most[k] - Math.max(0, front[k] - (t - z))));
  return { web: at('web'), rim: at('rim'), band: at('band'), pad: at('pad') };
}

/**
 * The depths a pocket's levels lie at: where its walls bend. The back's flange; where each member's core is reached;
 * where each front chamfer ends, and where a member's lean with it meets its 45 degrees; the step, from the core at
 * STEP_MM behind the front's flange to the face's outline at it. Each pocket's edges take the members' own widening,
 * no blend between two, so its walls bend only at these depths, and a pocket keeps a few rings, not one an edge (a
 * ring for each blend edge took 6 s and 500 000 facets for a 160 mm board, against 0.85 s).
 */
function bendDepths(
  t: number,
  f: number,
  most: Readonly<Record<Member, number>>,
  front: Readonly<Record<Member, number>>,
): number[] {
  const last = t - f - STEP_MM;
  const bends = MEMBERS.flatMap((k) => [f + most[k], t - front[k], (most[k] - front[k] + t + f) / 2]);
  const sorted = [f, ...bends.filter((z) => z > f + 1e-6 && z < last - 1e-6), last, t - f].sort((a, b) => a - b);
  return sorted.filter((z, i) => i === 0 || z - (sorted[i - 1] ?? z) > 1e-6);
}

/**
 * The skeleton's members as one solid, reaching past both faces and past the outline: a slab less its pockets. Each
 * pocket is the lightened board's at both faces, its sharp corners blended (D278), and widens through the board into
 * the members round it: from the back's flange at 45 degrees, each edge until its member's core is reached, and on to
 * the front's flange, where it steps back to the face's outline (D314). Each pocket is one mesh, lofted through the
 * depths where its sides bend; built so, nothing meets on a plane.
 */
export function skeletonMembers(
  engine: Engine,
  board: SolidBoardParams,
  p: SkeletonParams,
  pads: readonly Vec2[][],
): Manifold {
  const { Manifold } = engine;
  const t = board.thicknessMm;
  const e = extentOf(board);
  const members = latticeMembers(board, p);
  const shape = pocketShape(engine, board, members, pads);
  const pockets = shape.decompose();
  shape.delete();
  const f = flangeOf(t);
  // how far each member's pocket side moves in to leave its core: a web from each side, the band from its inner side,
  // a rim from its outer side, a pad not at all; and the chamfer each has at the front, round a slot and along the edge
  const most: Record<Member, number> = {
    web: (members.webMm - p.coreMm) / 2,
    rim: members.rimGrowMm - p.coreMm,
    band: members.bandMm - p.coreMm,
    pad: 0,
  };
  const front: Record<Member, number> = { web: 0, rim: board.slotChamferMm, band: EDGE_CHAMFER_MM, pad: 0 };
  // a board too thin to step in from both flanges keeps its pockets straight through, as the lightened board's
  const depths = t - 2 * f - STEP_MM > 1e-6 ? bendDepths(t, f, most, front) : [];
  const allowances = depths.map((z): [number, Record<Member, number>] => [z, allowance(z, t, f, most, front)]);
  const lofts = pockets.map((pocket) => {
    const rings = pocket.toPolygons();
    pocket.delete();
    const along = membersOf(alongOf(rings, board, members, pads));
    const levels: [number, Vec2[][]][] = [
      [-1.5, rings],
      ...allowances.map(([z, a]): [number, Vec2[][]] => [
        z,
        rings.map((ring, r) => {
          const edges = (along[r] ?? []).map((ks) => Math.min(...ks.map((k) => a[k])));
          // each point by the mean of its two edges' widening, so it changes smoothly where a blend meets a member
          const points = edges.map((m, i) => (m + (edges[(i - 1 + edges.length) % edges.length] ?? m)) / 2);
          return grownRing(
            ring,
            points.map((m) => -m),
          );
        }),
      ]),
      [t + 1.5, rings],
    ];
    return loftedSolid(engine, levels);
  });
  const slab = Manifold.cube([e.x1 - e.x0 + 2.4, e.y1 - e.y0 + 2.4, t + 2.4]).translate([e.x0 - 1.2, e.y0 - 1.2, -1.2]);
  const cut = Manifold.union(lofts);
  const kept = slab.subtract(cut);
  for (const m of [slab, cut, ...lofts]) m.delete();
  return kept;
}

/**
 * What the skeleton keeps of the solid board: the plate only where its members are, whose sides stand upright for the
 * back's flange (BoardCuts.within).
 */
export function skeletonCuts(board: SolidBoardParams, p: SkeletonParams, pads: readonly Vec2[][]): BoardCuts {
  return {
    within: {
      solid: (engine: Engine): Manifold => skeletonMembers(engine, board, p, pads),
      uprightMm: flangeOf(board.thicknessMm),
    },
  };
}

/**
 * The board less any hollow sealed inside it: beside each screw pad three members close up at the faces but not
 * through the middle, which leaves a pocket that reaches neither face. Left solid. A hollow is a part of its own,
 * turned inside out, so its volume is negative.
 */
function withoutHollows(engine: Engine, board: Manifold): Manifold {
  const parts = board.decompose();
  if (parts.every((m) => m.volume() > 0)) {
    for (const m of parts) m.delete();
    return board;
  }
  const solid = engine.Manifold.compose(parts.filter((m) => m.volume() > 0));
  for (const m of parts) m.delete();
  board.delete();
  return solid;
}

/** The skeleton board: the solid board, its mounting, and what its members leave of the face cut away. */
export function makeSkeletonBoard(
  engine: Engine,
  board: SolidBoardParams,
  p: SkeletonParams,
  mounting: MountingParams,
): Manifold {
  const framed = framedBoard(board, p);
  const cuts = bothCuts(mountingCuts(mounting, framed), skeletonCuts(board, p, mountingPads(mounting, framed)));
  const made = withoutHollows(engine, makeSolidBoard(engine, board, cuts));
  // without the points the pockets' rings leave on straight walls, where a member's side stands upright between two
  // of its bends: 191 344 facets to 149 028 for a 240 x 200 mm board, the solid itself unchanged (D278)
  const simple = made.simplify(1e-6);
  made.delete();
  return simple;
}

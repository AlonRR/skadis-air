// The skeleton board (backlog item board-skeleton; D146, D147, D161, D278): the lightened board's lattice, every
// member an I-beam, as the ultralight boards Q12 chose have them. Each rim, web and the edge band is as wide as
// the lightened board's at both faces for 0.6 mm, then narrows at 45 degrees towards a 1.2 mm core: the webs,
// narrowing from both sides, reach it; a rim, from one side, stays 2.1 mm through a 5 mm board (D161); the band,
// from its inner side, reaches it at the middle. The screw pads stay full depth. Printed face down, no face
// overhangs more than 45 degrees.
//
// The members are a slab less the pockets, and the pockets are the lightened board's at both faces, their corners
// blended (D278), each widening through the board into the members round it, edge by edge: one mesh a pocket,
// lofted through the depths where its sides bend. Built so, a blend's taper follows its curve, and nothing meets
// on a plane: the members built as solids and joined, as they were until D278, needed their bends staggered
// (1 078 facets of no area, 15 Oct 2026), and pockets cut as slabs stacked through the board took 7.2 s for a
// 160 x 160 mm board, slabs whose faces lie on each other being Manifold's slow case.
import type { Manifold, Vec2 } from 'manifold-3d';
import { boardFace, type BoardCuts, extentOf, makeSolidBoard, type SolidBoardParams } from './board-solid.js';
import { grownRing } from './chamfer.js';
import type { Engine } from './engine.js';
import {
  bothCuts,
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
  coreMm: number; // how narrow a member gets through the middle (D147)
}

export const SKELETON_DEFAULTS: SkeletonParams = { ...LATTICE_DEFAULTS, coreMm: 1.2 }; // D147
/** How deep the full width runs in from each face before the taper (D147). */
export const FLANGE_MM = 0.6;
/** The narrowest core made: two lines of a 0.4 mm nozzle (D147). */
export const MIN_CORE_MM = 0.8;
/** Below this a core is made, with a warning (D147). */
export const WARN_CORE_MM = 1.2;

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

/**
 * How far into its member each edge's pocket widens at most, through the middle of the board: a web from each side
 * to its core, the band from its inner side to its core, a rim from its outer side to its core, a pad not at all. A
 * blend widens as the members it runs between do, from one to the other along its length; one from a pad not at all.
 */
function widening(
  rings: readonly Vec2[][],
  along: readonly Along[][],
  p: SkeletonParams,
  members: Members,
): number[][] {
  const most: Record<Exclude<Along, null>, number> = {
    web: (members.webMm - p.coreMm) / 2,
    rim: members.rimGrowMm - p.coreMm,
    band: members.bandMm - p.coreMm,
    pad: 0,
  };
  return rings.map((ring, r) => {
    const kinds = along[r] ?? [];
    const n = ring.length;
    const known = kinds.map((k) => (k === null ? null : most[k]));
    if (known.every((v) => v === null)) return known.map(() => most.band);
    const lengths = ring.map((a, i) => {
      const b = ring[(i + 1) % n] ?? a;
      return Math.hypot(b[0] - a[0], b[1] - a[1]);
    });
    const starts = lengths.reduce<number[]>((s, l, i) => [...s, (s[i] ?? 0) + l], [0]);
    const perimeter = starts[n] ?? 0;
    const wrap = (d: number) => ((d % perimeter) + perimeter) % perimeter;
    return known.map((v, i) => {
      if (v !== null) return v;
      let [before, after] = [i, i];
      do before = (before - 1 + n) % n;
      while (known[before] === null);
      do after = (after + 1) % n;
      while (known[after] === null);
      // from the end of the edge before to the start of the edge after, by where this edge's middle lies
      const from = (starts[before] ?? 0) + (lengths[before] ?? 0);
      const span = wrap((starts[after] ?? 0) - from) || perimeter;
      const k = wrap((starts[i] ?? 0) + (lengths[i] ?? 0) / 2 - from) / span;
      // a blend from a pad is the pad's, full depth: it leaves the pad tangent, and any widening would cut into it
      if (kinds[before] === 'pad' || kinds[after] === 'pad') return 0;
      const [a, b] = [known[before] ?? 0, known[after] ?? 0];
      return a + (b - a) * Math.min(1, k);
    });
  });
}

/**
 * The skeleton's members as one solid, reaching past both faces and past the outline: a slab less its pockets. Each
 * pocket is the lightened board's at both faces, its sharp corners blended (D278), and widens through the board into
 * the members round it, at 45 degrees from the flange, each edge until its member's core is reached or the board's
 * middle: the I-beams of D147, the blends' taper following their curve. Each pocket is one mesh, lofted through the
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
  const f = Math.min(FLANGE_MM, t / 2);
  const middle = t / 2 - f; // how far a taper reaches by the middle
  const lofts = pockets.map((pocket) => {
    const rings = pocket.toPolygons();
    pocket.delete();
    const most = widening(rings, alongOf(rings, board, members, pads), p, members);
    // where the members bend: the flange, each kind's core, the middle; a blend, between two kinds, runs straight
    // from one of these depths to the next, less than 45 degrees, so the pocket keeps a few rings, not one a blend
    // edge (6 s and 500 000 facets for a 160 mm board, against 0.85 s)
    const cores = [members.webMm / 2 - p.coreMm / 2, members.bandMm - p.coreMm, members.rimGrowMm - p.coreMm];
    const bends = [...new Set(cores.filter((d) => d > 1e-6 && d < middle - 1e-6))].sort((a, b) => a - b);
    const depths = [0, ...bends, middle];
    const reach = [
      ...depths.map((d) => f + d),
      // and back out to the other face, the middle once
      ...depths.slice(0, -1).map((_, i, all) => t - f - (all[all.length - 1 - i] ?? 0)),
    ];
    const levels: [number, Vec2[][]][] = [
      [-1.5, rings],
      ...reach.map((z): [number, Vec2[][]] => {
        const into = Math.max(0, Math.min(z - f, t - f - z));
        return [
          z,
          rings.map((ring, r) => {
            // each point by the mean of its two edges' widening, so it changes smoothly along a blend
            const edges = most[r] ?? [];
            const points = edges.map((m, i) => (m + (edges[(i - 1 + edges.length) % edges.length] ?? m)) / 2);
            return grownRing(
              ring,
              points.map((m) => -Math.min(m, into)),
            );
          }),
        ];
      }),
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

/** What the skeleton keeps of the solid board: the plate only where its members are (BoardCuts.within). */
export function skeletonCuts(board: SolidBoardParams, p: SkeletonParams, pads: readonly Vec2[][]): BoardCuts {
  return { within: (engine: Engine): Manifold => skeletonMembers(engine, board, p, pads) };
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
  const cuts = bothCuts(mountingCuts(mounting, board), skeletonCuts(board, p, mountingPads(mounting, board)));
  const made = withoutHollows(engine, makeSolidBoard(engine, board, cuts));
  // without the points the pockets' rings leave on straight walls, where a member's side stands upright between two
  // of its bends: 191 344 facets to 149 028 for a 240 x 200 mm board, the solid itself unchanged (D278)
  const simple = made.simplify(1e-6);
  made.delete();
  return simple;
}

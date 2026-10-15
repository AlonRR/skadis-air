// The skeleton board (backlog item board-skeleton; D146, D147, D161): the lightened board's lattice, every
// member an I-beam, as the ultralight boards Q12 chose have them. Each rim, web and the edge band is as wide as
// the lightened board's at both faces for 0.6 mm, then narrows at 45 degrees towards a 1.2 mm core: the webs,
// narrowing from both sides, reach it; a rim, from one side, stays 2.1 mm through a 5 mm board (D161); the band,
// from its inner side, reaches it at the middle. The screw pads stay full depth. Printed face down, no face
// overhangs more than 45 degrees.
//
// The members are built as solids and joined, and what they leave of the face is cut as one pocket cutter
// through makeSolidBoard's extraCutters: a web is one bar along each diagonal line of the grid, its I-profile
// run along the line; a rim is rings of the slot's outline stacked through the board (rings.ts); the band is a
// bar along each edge with half the profile; the pads are prisms. Pockets cut as slabs stacked through the
// board took 7.2 s for a 160 x 160 mm board, as slabs whose faces lie on each other are Manifold's slow case
// (15 Oct 2026).
import type { Manifold, Mat4, Vec2 } from 'manifold-3d';
import { type BoardCuts, makeSolidBoard, type SolidBoardParams } from './board-solid.js';
import type { Engine } from './engine.js';
import { bothCuts, EDGE_BAND_MM, LATTICE_DEFAULTS, latticeParams, type LatticeParams } from './lightened.js';
import { mountingCuts, mountingPads, type MountingParams } from './mounting.js';
import { ringedSolid, stadium } from './rings.js';
import { SLOT_HEIGHT_MM, SLOT_WIDTH_MM, TILE_MM } from './skadis.js';
import { slotPlaces } from './slots.js';

export interface SkeletonParams extends LatticeParams {
  coreMm: number; // how narrow a member gets through the middle (D147)
}

export const SKELETON_DEFAULTS: SkeletonParams = { ...LATTICE_DEFAULTS, coreMm: 1.2 }; // D147
/** How deep the full width runs in from each face before the taper (D147). */
export const FLANGE_MM = 0.6;
/**
 * How much deeper a web's flange runs than a rim's, and the band's than a web's: where two kinds of member bend at
 * one depth, the edges where they bend meet, and the join left 1 078 facets of no area in a 160 x 160 mm board
 * (15 Oct 2026). 0.03 mm is far below what a printer draws.
 */
const KINK_STAGGER_MM = 0.03;
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

/**
 * A member's width at each depth through a board `t` thick, as [depth, half-width] from the front face to the
 * back, `beyond` mm past each face: `face` at both faces for the flange, then 45 degrees towards `core`,
 * reaching it if the board is deep enough, else meeting the other face's taper at the middle.
 */
function profile(face: number, core: number, t: number, beyond: number, flange: number): [number, number][] {
  const [f, half] = [Math.min(flange, t / 2), t / 2];
  const taper = face - core;
  const middle: [number, number][] =
    f + taper < half - 1e-9
      ? [
          [f + taper, core],
          [t - f - taper, core],
        ]
      : [[half, face - (half - f)]];
  return [[-beyond, face], [f, face], ...middle, [t - f, face], [t + beyond, face]];
}

/** A web's cross-section, (across, depth), counter-clockwise: the I-profile, centred on the web's line. */
function webSection(p: SkeletonParams, t: number, beyond: number): Vec2[] {
  const right = profile(p.webMm / 2, p.coreMm / 2, t, beyond, FLANGE_MM + KINK_STAGGER_MM).map(([z, w]): Vec2 => [
    w,
    z,
  ]);
  const left: Vec2[] = []; // down the left side
  for (const [w, z] of right) left.unshift([-w, z]);
  return [...right, ...left];
}

/** The band's cross-section, (in from the edge, depth): half the profile, its outer face at the edge. */
function bandSection(p: SkeletonParams, t: number, beyond: number): Vec2[] {
  const inner = profile(EDGE_BAND_MM, p.coreMm, t, beyond, FLANGE_MM + 2 * KINK_STAGGER_MM).map(([z, w]): Vec2 => [
    w,
    z,
  ]);
  return [...inner, [-1, t + beyond], [-1, -beyond]];
}

/** A section run along the line from `a` to `b`: across it to the left of the direction of travel, depth up. */
function bar(engine: Engine, section: Vec2[], [ax, ay]: Vec2, [bx, by]: Vec2): Manifold {
  const length = Math.hypot(bx - ax, by - ay);
  const [dx, dy] = [(bx - ax) / length, (by - ay) / length];
  const prism = new engine.CrossSection([section], 'Positive').extrude(length);
  // extruded: x across, y depth, z along; turned so across is (-dy, dx), depth is up and along is (dx, dy)
  const turn: Mat4 = [-dy, dx, 0, 0, 0, 0, 1, 0, dx, dy, 0, 0, ax, ay, 0, 1];
  const placed = prism.transform(turn);
  prism.delete();
  return placed;
}

/** How far short of a tile's corner its webs stop: inside the corner's slot, so two tiles' webs never meet end to end. */
const WEB_SHORT_MM = 0.5;

/** The skeleton's members as one solid, reaching past both faces and past the outline. */
export function skeletonMembers(
  engine: Engine,
  board: SolidBoardParams,
  p: SkeletonParams,
  pads: readonly Vec2[][],
): Manifold {
  const { Manifold, CrossSection } = engine;
  const t = board.thicknessMm;
  const [width, height] = [TILE_MM * board.columns, TILE_MM * board.rows];
  const [w, h] = [SLOT_WIDTH_MM + board.slotClearanceMm, SLOT_HEIGHT_MM + board.slotClearanceMm];
  // Each kind reaches its own distance past the faces, so no two kinds' end faces lie on one plane.
  const solids: Manifold[] = [];
  // a rim: 3 mm outside the chamfer at the faces, measured from the slot's drawn edge (D143)
  const rim = profile(board.slotChamferMm + p.rimMm, p.coreMm, t, 1, FLANGE_MM);
  const rimOf = (x: number, y: number) => ringedSolid(engine, (grow) => stadium(x, y, w, h, grow), rim);
  const web = webSection(p, t, 1.1);
  const half = TILE_MM / 2;
  const reach = half * Math.SQRT2 - WEB_SHORT_MM;
  // Tile by tile: the centre slot's rim and the four webs out from it, joined, then the tiles and the rims of the
  // slots between them. Joined all at once, webs crossing many rims took 9 s for a 400 x 400 mm board (C163).
  for (let i = 0; i < board.columns; i++) {
    for (let j = 0; j < board.rows; j++) {
      const [cx, cy] = [TILE_MM * i + half, TILE_MM * j + half];
      const tile = [rimOf(cx, cy)];
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        const end: Vec2 = [cx + (dx * reach) / Math.SQRT2, cy + (dy * reach) / Math.SQRT2];
        tile.push(bar(engine, web, [cx, cy], end));
      }
      solids.push(Manifold.union(tile));
      for (const m of tile) m.delete();
    }
  }
  for (const slot of slotPlaces(board.columns, board.rows, board.sides)) {
    if (slot.xMm % TILE_MM === 0) solids.push(rimOf(slot.xMm, slot.yMm)); // a slot on the 40 mm grid, between tiles
  }
  const band = bandSection(p, t, 1.2);
  const edges: [Vec2, Vec2][] = [
    [
      [-1, 0],
      [width + 1, 0],
    ],
    [
      [width, -1],
      [width, height + 1],
    ],
    [
      [width + 1, height],
      [-1, height],
    ],
    [
      [0, height + 1],
      [0, -1],
    ],
  ];
  for (const [a, b] of edges) solids.push(bar(engine, band, a, b));
  if (pads.length > 0) {
    const outlines = new CrossSection([...pads], 'NonZero');
    const prism = outlines.extrude(t + 2.6);
    solids.push(prism.translate([0, 0, -1.3]));
    prism.delete();
    outlines.delete();
  }
  const members = Manifold.union(solids);
  for (const m of solids) m.delete();
  return members;
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
  return withoutHollows(engine, makeSolidBoard(engine, board, cuts));
}

// The lightened board (backlog item board-lightened; D141 to D145): the solid board with pockets cut
// right through it (D141). What stays is a lattice: a rim round every slot, webs along the slot grid's
// diagonals, so each slot is joined to its four nearest neighbours 28.3 mm away (D142), a band along
// every edge and a pad round each screw hole or standoff (D144). In each 40 mm tile the webs make an X
// from corner to corner through the centre slot, and the pockets are the diamonds between, rounded at
// their corners. It is drawn in 2D, what stays as one shape, and the face less that shape is cut as one
// pocket cutter through makeSolidBoard's extraCutters, so the slots, the screw holes and the outline are
// the solid board's own.
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { boardOutline, type BoardCuts, makeSolidBoard, type SolidBoardParams } from './board-solid.js';
import { blendCorners } from './chamfer.js';
import type { Engine } from './engine.js';
import { mountingCuts, mountingPads, type MountingParams } from './mounting.js';
import { stadium } from './rings.js';
import { GRID_PITCH_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM, TILE_MM } from './skadis.js';
import { slotPlaces } from './slots.js';

export interface LatticeParams {
  rimMm: number; // round each slot, from its edge at the face, outside its chamfer (D143)
  webMm: number; // the diagonal webs' width (D143)
}

export const LATTICE_DEFAULTS: LatticeParams = { rimMm: 3, webMm: 3 }; // D143
/** The band kept solid along every edge, open or closed (D144). */
export const EDGE_BAND_MM = 3;
/** The narrowest rim or web made: about three lines of a 0.4 mm nozzle (D145). */
export const MIN_MEMBER_MM = 1.2;
/** Below this a rim or web is made, with a warning (D145). */
export const WARN_MEMBER_MM = 2;
/** Each pocket's sharp corners run on a parabola this far along both sides (D278), so a web runs on into a rim on
 * a long eased curve, as the practice asks, not on a short round; held short of halfway to the next corner. */
export const BLEND_LEG_MM = 3;
/** What is left of a pocket narrower than twice this is dropped: too narrow to print. */
export const POCKET_CORNER_MM = 1;

/** The lattice asked for, with the starting values filled in, refused when a member is under the minimum. */
export function latticeParams(given: Partial<LatticeParams>): LatticeParams {
  const l: LatticeParams = { ...LATTICE_DEFAULTS, ...given };
  for (const [v, name] of [
    [l.rimMm, 'rim'],
    [l.webMm, 'web'],
  ] as const) {
    if (!(v >= MIN_MEMBER_MM)) throw new RangeError(`The ${name} must be at least ${MIN_MEMBER_MM} mm wide`);
  }
  return l;
}

/** How wide each kind of member is at one depth: the pockets are the face less these. */
export interface Members {
  rimGrowMm: number; // how far the rim reaches out from the slot's drawn edge
  webMm: number;
  bandMm: number; // the band along every edge
}

/** The lightened board's members, the same all through it (D143, D144). */
export function latticeMembers(board: SolidBoardParams, lattice: LatticeParams): Members {
  return { rimGrowMm: board.slotChamferMm + lattice.rimMm, webMm: lattice.webMm, bandMm: EDGE_BAND_MM };
}

/** A bar `width` wide from one point to another, its ends square: one web. */
function bar([x0, y0]: Vec2, [x1, y1]: Vec2, width: number): Vec2[] {
  const length = Math.hypot(x1 - x0, y1 - y0);
  const [nx, ny] = [((y0 - y1) / length) * (width / 2), ((x1 - x0) / length) * (width / 2)];
  return [
    [x0 + nx, y0 + ny],
    [x0 - nx, y0 - ny],
    [x1 - nx, y1 - ny],
    [x1 + nx, y1 + ny],
  ];
}

/**
 * The pockets, in 2D: the face inside its edge band, less the rims, the webs and the pads. Not checked
 * here against the minimum, so a test can build a lattice under it.
 */
export function pocketShape(
  engine: Engine,
  board: SolidBoardParams,
  members: Members,
  pads: readonly Vec2[][],
): CrossSection {
  const { CrossSection } = engine;
  const made: CrossSection[] = [];
  const keep = (c: CrossSection): CrossSection => {
    made.push(c);
    return c;
  };
  const [width, height] = [TILE_MM * board.columns, TILE_MM * board.rows];
  const [w, h] = [SLOT_WIDTH_MM + board.slotClearanceMm, SLOT_HEIGHT_MM + board.slotClearanceMm];
  const half = GRID_PITCH_MM / 2;

  const contours: Vec2[][] = [];
  for (const s of slotPlaces(board.columns, board.rows, board.sides)) {
    contours.push(stadium(s.xMm, s.yMm, w, h, members.rimGrowMm));
  }
  // Every tile's X, corner to corner through its centre, also where a closed side leaves out the corner's
  // slot: there the web runs into the edge band.
  for (let i = 0; i < board.columns; i++) {
    for (let j = 0; j < board.rows; j++) {
      const centre: Vec2 = [TILE_MM * i + half, TILE_MM * j + half];
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        contours.push(bar(centre, [centre[0] + dx * half, centre[1] + dy * half], members.webMm));
      }
    }
  }
  contours.push(...pads);
  const kept = keep(new CrossSection(contours, 'NonZero'));
  const face = keep(new CrossSection([boardOutline(width, height, board.sides, board.cornerRadiusMm)], 'Positive'));
  const inner = keep(face.offset(-members.bandMm, 'Round'));
  const pockets = keep(inner.subtract(kept));
  // Each sharp corner on a parabola (D278); then shrink and grow back by the same amount, which drops any sliver of
  // pocket too narrow to print and leaves the blends, wider than that, as they are. Growing back adds an arc's points
  // at each of a blend's, which doubled the build's time: the points within 5 microns of the line through their
  // neighbours are taken out again.
  const blended = keep(new CrossSection(blendCorners(pockets.toPolygons(), BLEND_LEG_MM), 'Positive'));
  const opened = keep(keep(blended.offset(-POCKET_CORNER_MM, 'Round')).offset(POCKET_CORNER_MM, 'Round'));
  const rounded = opened.simplify(0.005);
  for (const c of made) c.delete();
  return rounded;
}

/** What the lattice cuts from the solid board: its pockets, through the plate and a millimetre beyond each face. */
export function latticeCuts(board: SolidBoardParams, lattice: LatticeParams, pads: readonly Vec2[][]): BoardCuts {
  return {
    extraCutters: (engine: Engine): Manifold[] => {
      const pockets = pocketShape(engine, board, latticeMembers(board, lattice), pads);
      const prism = pockets.extrude(board.thicknessMm + 2);
      const cutter = prism.translate([0, 0, -1]);
      pockets.delete();
      prism.delete();
      return [cutter];
    },
  };
}

/** Two parts' cuts as one: everything each cuts away or adds. */
export function bothCuts(a: BoardCuts, b: BoardCuts): BoardCuts {
  const clearanceOf = a.clearanceOf ?? b.clearanceOf;
  const within = a.within ?? b.within;
  return {
    ...(clearanceOf === undefined ? {} : { clearanceOf }),
    ...(within === undefined ? {} : { within }),
    extraCutters: (engine) => [...(a.extraCutters?.(engine) ?? []), ...(b.extraCutters?.(engine) ?? [])],
    extraSolids: (engine) => [...(a.extraSolids?.(engine) ?? []), ...(b.extraSolids?.(engine) ?? [])],
  };
}

/** The lightened board: the solid board, its mounting, and the lattice's pockets. */
export function makeLightenedBoard(
  engine: Engine,
  board: SolidBoardParams,
  lattice: LatticeParams,
  mounting: MountingParams,
): Manifold {
  const cuts = bothCuts(mountingCuts(mounting, board), latticeCuts(board, lattice, mountingPads(mounting, board)));
  return makeSolidBoard(engine, board, cuts);
}

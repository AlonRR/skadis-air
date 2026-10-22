// The solid board (backlog item board-solid; D11): a plate of 40 mm tiles with the SKÅDIS slots
// cut through it. It is built as it hangs (C42): x across, y up the wall, its back at z = 0 and its
// front toward +z; printPose turns it over to print face down (D66).
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { chamferedExtrusion, EDGE_CHAMFER_MM } from './chamfer.js';
import type { Engine } from './engine.js';
import { arc, CIRCLE_SEGMENTS, ringedSolid, stadium } from './rings.js';
export { CIRCLE_SEGMENTS } from './rings.js';
import { BOARD_THICKNESS_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM, TILE_MM } from './skadis.js';
import {
  ALL_OPEN,
  boardExtent,
  type Extent,
  type Seams,
  type Side,
  type Sides,
  type SlotPlace,
  slotPlaces,
} from './slots.js';

export interface SolidBoardParams {
  columns: number; // tiles across, 40 mm each (D15)
  rows: number; // tiles up
  thicknessMm: number;
  sides: Sides; // each open or closed (D34); open all round unless set (D37)
  slotClearanceMm: number; // added to the slot's width and height (D40)
  slotChamferMm: number; // 45 degree chamfer round each slot, at both faces (D41)
  cornerRadiusMm: number; // where both sides at a corner are closed (D39); open corners stay square to tile
  seams: Seams; // the open sides through the slots (D15) or between them (D282, D288 a)
}

export const SOLID_BOARD_DEFAULTS = {
  thicknessMm: BOARD_THICKNESS_MM,
  slotClearanceMm: 0.2, // D40: real IKEA slots measure about 5.2 x 15.2 mm; settled by the fit coupon and T17
  slotChamferMm: 1, // D41
  cornerRadiusMm: 10, // D39: <<CONFIRM>> IKEA's own corner, as one generator states it
  seams: 'through', // D282: through the slots, as before, unless set
} as const satisfies Partial<SolidBoardParams>;

/** A board's settings, with the starting values filled in, refused when they cannot make a board. */
export function solidBoardParams(
  given: Partial<SolidBoardParams> & Pick<SolidBoardParams, 'columns' | 'rows'>,
): SolidBoardParams {
  const p: SolidBoardParams = { ...SOLID_BOARD_DEFAULTS, ...given, sides: { ...ALL_OPEN, ...given.sides } };
  for (const [n, name] of [
    [p.columns, 'columns'],
    [p.rows, 'rows'],
  ] as const) {
    if (!Number.isInteger(n) || n < 1) throw new RangeError(`The ${name} must be a whole number of tiles, 1 or more`);
  }
  if (!(p.slotChamferMm >= 0)) throw new RangeError('The slot chamfer cannot be negative');
  if (!(p.thicknessMm > 2 * p.slotChamferMm)) {
    throw new RangeError('The board must be thicker than its two slot chamfers together');
  }
  if (!(p.cornerRadiusMm >= 0 && p.cornerRadiusMm <= TILE_MM / 2)) {
    throw new RangeError(`The corner radius must be from 0 to ${TILE_MM / 2} mm`);
  }
  if (!(SLOT_WIDTH_MM + p.slotClearanceMm > 0)) throw new RangeError('The slot clearance leaves no slot');
  for (const side of ['left', 'right', 'bottom', 'top'] as const) {
    if (p.sides[side] !== 'open' && p.sides[side] !== 'closed') {
      throw new RangeError(`The ${side} side must be open or closed`);
    }
  }
  if (p.seams !== 'through' && p.seams !== 'between') {
    throw new RangeError('The open sides must run through the slots or between them');
  }
  return p;
}

/** Where a board's edges lie (D288 a): its tiles' edges, an open side between the slots 10 mm right or up. */
export const extentOf = (p: Pick<SolidBoardParams, 'columns' | 'rows' | 'sides' | 'seams'>): Extent =>
  boardExtent(p.columns, p.rows, p.sides, p.seams);

/** The board's outline where its edges lie, counter-clockwise, with its closed corners rounded. */
export function boardFace(
  p: Pick<SolidBoardParams, 'columns' | 'rows' | 'sides' | 'seams' | 'cornerRadiusMm'>,
): Vec2[] {
  const e = extentOf(p);
  return boardOutline(e.x1 - e.x0, e.y1 - e.y0, p.sides, p.cornerRadiusMm).map(([x, y]): Vec2 => [x + e.x0, y + e.y0]);
}

/** The board's outline, counter-clockwise, with a rounded corner wherever both of its sides are closed. */
export function boardOutline(width: number, height: number, sides: Sides, radius: number): Vec2[] {
  const quarter = CIRCLE_SEGMENTS / 4;
  const corner = (x: number, y: number, a: Side, b: Side, cx: number, cy: number, from: number): Vec2[] =>
    radius > 0 && sides[a] === 'closed' && sides[b] === 'closed'
      ? arc(cx, cy, radius, from, from + Math.PI / 2, quarter)
      : [[x, y]];
  const r = radius;
  return [
    ...corner(0, 0, 'left', 'bottom', r, r, Math.PI),
    ...corner(width, 0, 'right', 'bottom', width - r, r, 1.5 * Math.PI),
    ...corner(width, height, 'right', 'top', width - r, height - r, 0),
    ...corner(0, height, 'left', 'top', r, height - r, 0.5 * Math.PI),
  ];
}

/** Whether both of an edge's ends lie on one line of the outline, as `at`. */
const on = (u: number, v: number, at: number) => Math.abs(u - at) < 1e-6 && Math.abs(v - at) < 1e-6;

/** The side of the board's outline an edge runs along, or null for a rounded corner's, which only closed sides have. */
function sideOf([ax, ay]: Vec2, [bx, by]: Vec2, e: Extent): Side | null {
  if (on(ax, bx, e.x0)) return 'left';
  if (on(ax, bx, e.x1)) return 'right';
  if (on(ay, by, e.y0)) return 'bottom';
  if (on(ay, by, e.y1)) return 'top';
  return null;
}

/**
 * The plate, its outer edge chamfered as the family's parts are (D276, D277): at the front all round, so where two
 * boards meet they make a V groove and a board alone has the chamfer everywhere; at the back only along a closed
 * side and round a rounded corner, as an open side's back butts its neighbour's over the clip behind them.
 */
function plateOf(engine: Engine, face: CrossSection, p: SolidBoardParams, e: Extent): Manifold {
  const atBack = (a: Vec2, b: Vec2) => {
    const side = sideOf(a, b, e);
    return side === null || p.sides[side] === 'closed' ? EDGE_CHAMFER_MM : 0;
  };
  return chamferedExtrusion(engine, face, p.thicknessMm, { bottomMm: atBack, topMm: EDGE_CHAMFER_MM });
}

/**
 * One slot's cutter as a single closed mesh (ringedSolid): rings of the slot's outline stacked through
 * the plate, grown by c + 1 a millimetre beyond each face and exact at depth c, so the 45 degree
 * chamfers and the straight wall between them are one solid.
 */
function slotCutter(engine: Engine, x: number, y: number, w: number, h: number, t: number, c: number): Manifold {
  const levels: [number, number][] =
    c > 0
      ? [
          [-1, c + 1],
          [c, 0],
          [t - c, 0],
          [t + 1, c + 1],
        ]
      : [
          [-1, 0],
          [t + 1, 0],
        ];
  return ringedSolid(engine, (grow) => stadium(x, y, w, h, grow), levels);
}

/** Remembers an object so it can be freed once the board is made. */
function keep<T>(m: T, into: T[]): T {
  into.push(m);
  return m;
}

/** What a part built on the solid board may change: a slot's own clearance, more to cut away, more to add. */
export interface BoardCuts {
  clearanceOf?: (slot: SlotPlace) => number; // in place of slotClearanceMm, slot by slot (the fit coupon)
  extraCutters?: (engine: Engine) => Manifold[]; // cut away with the slots; freed here (the coupon's dots, screw holes)
  extraSolids?: (engine: Engine) => Manifold[]; // added to the plate before anything is cut; freed here (standoffs)
  within?: Within; // the plate is kept only inside this, before the rest (the skeleton)
}

/** What a board keeps of its plate: the solid it keeps, freed here, and how deep from the back face its sides stand
 * upright, which what is added may reach into (the skeleton's back flange). */
export interface Within {
  solid: (engine: Engine) => Manifold;
  uprightMm: number;
}

export function makeSolidBoard(engine: Engine, params: SolidBoardParams, cuts: BoardCuts = {}): Manifold {
  const { Manifold, CrossSection } = engine;
  const p = solidBoardParams(params);
  const [e, t, c] = [extentOf(p), p.thicknessMm, p.slotChamferMm];
  const sections: CrossSection[] = [];
  const solids: Manifold[] = [];

  const face = keep(new CrossSection([boardFace(p)], 'Positive'), sections);
  // What is added goes on before the cuts, so a screw hole runs on through a standoff.
  const added = (cuts.extraSolids?.(engine) ?? []).map((m) => keep(m, solids));
  const whole = keep(plateOf(engine, face, p, e), solids);
  const within = cuts.within ? keep(cuts.within.solid(engine), solids) : undefined;
  const plate = within ? keep(whole.intersect(within), solids) : whole;
  // With the plate kept only inside its members, what is added reaches into the plate only where they are, and only
  // into the back three quarters of the depth where a member's sides stand upright (0.3 mm of the skeleton's 0.4 mm
  // flange, D314; 0.45 of 0.6 before it): a standoff meets the members and fills no gap between them (D250 f). Up to
  // half that depth it is whole, which keeps its cut off the members' back face. Cut on that face, or reaching up to
  // the I-beams' slopes, it left degenerate facets.
  const upright = cuts.within?.uprightMm ?? 0;
  const block = within ? keep(Manifold.cube([e.x1 - e.x0 + 2, e.y1 - e.y0 + 2, 1000]), solids) : null;
  const behind = block ? keep(block.translate([e.x0 - 1, e.y0 - 1, upright / 2 - 1000]), solids) : null;
  const flange = block ? keep(block.translate([e.x0 - 1, e.y0 - 1, (3 * upright) / 4 - 1000]), solids) : null;
  const inFlange = within && flange ? keep(within.intersect(flange), solids) : null;
  const allowed = behind && inFlange ? keep(Manifold.union(behind, inFlange), solids) : null;
  const kept = allowed ? added.map((m) => keep(m.intersect(allowed), solids)) : added;
  const body = kept.length > 0 ? keep(Manifold.union([plate, ...kept]), solids) : plate;

  // Every slot is cut whole; at an edge the cut runs past the plate, which leaves the half or quarter.
  const cutters = slotPlaces(p.columns, p.rows, p.sides, p.seams).map((slot) => {
    const clearance = cuts.clearanceOf?.(slot) ?? p.slotClearanceMm;
    if (!(SLOT_WIDTH_MM + clearance > 0)) throw new RangeError('A slot clearance leaves no slot');
    const [w, h] = [SLOT_WIDTH_MM + clearance, SLOT_HEIGHT_MM + clearance];
    return keep(slotCutter(engine, slot.xMm, slot.yMm, w, h, t, c), solids);
  });
  for (const extra of cuts.extraCutters?.(engine) ?? []) cutters.push(keep(extra, solids));
  const cut = keep(Manifold.union(cutters), solids);
  const board = body.subtract(cut);
  // WebAssembly memory is not garbage-collected: free every intermediate object.
  for (const m of solids) m.delete();
  for (const s of sections) s.delete();
  return board;
}

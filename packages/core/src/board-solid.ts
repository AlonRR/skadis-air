// The solid board (backlog item board-solid; D11): a plate of 40 mm tiles with the SKÅDIS slots
// cut through it. It is built as it hangs (C42): x across, y up the wall, its back at z = 0 and its
// front toward +z; printPose turns it over to print face down (D66).
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import type { Engine } from './engine.js';
import { arc, CIRCLE_SEGMENTS, ringedSolid, stadium } from './rings.js';
export { CIRCLE_SEGMENTS } from './rings.js';
import { BOARD_THICKNESS_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM, TILE_MM } from './skadis.js';
import { ALL_OPEN, type Side, type Sides, type SlotPlace, slotPlaces } from './slots.js';

export interface SolidBoardParams {
  columns: number; // tiles across, 40 mm each (D15)
  rows: number; // tiles up
  thicknessMm: number;
  sides: Sides; // each open or closed (D34); open all round unless set (D37)
  slotClearanceMm: number; // added to the slot's width and height (D40)
  slotChamferMm: number; // 45 degree chamfer round each slot, at both faces (D41)
  cornerRadiusMm: number; // where both sides at a corner are closed (D39); open corners stay square to tile
}

export const SOLID_BOARD_DEFAULTS = {
  thicknessMm: BOARD_THICKNESS_MM,
  slotClearanceMm: 0.2, // D40: real IKEA slots measure about 5.2 x 15.2 mm; settled by the fit coupon and T17
  slotChamferMm: 1, // D41
  cornerRadiusMm: 10, // D39: <<CONFIRM>> IKEA's own corner, as one generator states it
} as const;

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
  return p;
}

/** The board's outline, counter-clockwise, with a rounded corner wherever both of its sides are closed. */
function outline(width: number, height: number, sides: Sides, radius: number): Vec2[] {
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
}

export function makeSolidBoard(engine: Engine, params: SolidBoardParams, cuts: BoardCuts = {}): Manifold {
  const { Manifold, CrossSection } = engine;
  const p = solidBoardParams(params);
  const [width, height, t, c] = [TILE_MM * p.columns, TILE_MM * p.rows, p.thicknessMm, p.slotChamferMm];
  const sections: CrossSection[] = [];
  const solids: Manifold[] = [];

  const face = keep(new CrossSection([outline(width, height, p.sides, p.cornerRadiusMm)], 'Positive'), sections);
  // What is added goes on before the cuts, so a screw hole runs on through a standoff.
  const added = (cuts.extraSolids?.(engine) ?? []).map((m) => keep(m, solids));
  const plate = keep(face.extrude(t), solids);
  const body = added.length > 0 ? keep(Manifold.union([plate, ...added]), solids) : plate;

  // Every slot is cut whole; at an edge the cut runs past the plate, which leaves the half or quarter.
  const cutters = slotPlaces(p.columns, p.rows, p.sides).map((slot) => {
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

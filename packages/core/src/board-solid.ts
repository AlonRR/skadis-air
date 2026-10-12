// The solid board (backlog item board-solid; D11): a plate of 40 mm tiles with the SKÅDIS slots
// cut through it. It lies as it prints: its face on the bed at z = 0, x across, y up the wall.
import type { CrossSection, Manifold, Vec2, Vec3 } from 'manifold-3d';
import type { Engine } from './engine.js';
import { BOARD_THICKNESS_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM, TILE_MM } from './skadis.js';
import { ALL_OPEN, type Side, type Sides, slotPlaces } from './slots.js';

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

/** Segments in a full circle, for the board's rounded corners and the slots' round ends. */
export const CIRCLE_SEGMENTS = 64;

function arc(cx: number, cy: number, r: number, from: number, to: number, segments: number): Vec2[] {
  const points: Vec2[] = [];
  for (let k = 0; k <= segments; k++) {
    const a = from + ((to - from) * k) / segments;
    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return points;
}

/** A slot's outline, counter-clockwise: a stadium w wide and h tall at (x, y), grown by `grow` all round. */
function stadium(x: number, y: number, w: number, h: number, grow = 0): Vec2[] {
  const r = w / 2 + grow;
  const straight = (h - w) / 2;
  const half = CIRCLE_SEGMENTS / 2;
  return [...arc(x, y + straight, r, 0, Math.PI, half), ...arc(x, y - straight, r, Math.PI, 2 * Math.PI, half)];
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
 * One slot's cutter as a single closed mesh: rings of the slot's outline stacked through the plate,
 * grown by c + 1 a millimetre beyond each face and exact at depth c, so the 45 degree chamfers and
 * the straight wall between them are one solid. Built as cones and a prism joined by a union, the
 * three met exactly along the outline at depth c, and the cut left near-duplicate corners there:
 * 440 degenerate facets in a 40 x 40 tile, found by scad-tools' stl-mesh.py (12 Oct 2026).
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
  const rings = levels.map(([z, grow]) => stadium(x, y, w, h, grow).map(([px, py]): Vec3 => [px, py, z]));
  const n = rings[0]?.length ?? 0;
  const positions = new Float32Array(rings.flat(2));
  const triangles: number[] = [];
  const at = (level: number, i: number) => level * n + (i % n);
  for (let i = 1; i < n - 1; i++) triangles.push(at(0, 0), at(0, i + 1), at(0, i)); // bottom cap, facing down
  for (let level = 0; level < rings.length - 1; level++) {
    for (let i = 0; i < n; i++) {
      triangles.push(at(level, i), at(level, i + 1), at(level + 1, i + 1));
      triangles.push(at(level, i), at(level + 1, i + 1), at(level + 1, i));
    }
  }
  const top = rings.length - 1;
  for (let i = 1; i < n - 1; i++) triangles.push(at(top, 0), at(top, i), at(top, i + 1)); // top cap, facing up
  const mesh = new engine.Mesh({ numProp: 3, vertProperties: positions, triVerts: new Uint32Array(triangles) });
  return new engine.Manifold(mesh);
}

/** Remembers an object so it can be freed once the board is made. */
function keep<T>(m: T, into: T[]): T {
  into.push(m);
  return m;
}

export function makeSolidBoard(engine: Engine, params: SolidBoardParams): Manifold {
  const { Manifold, CrossSection } = engine;
  const p = solidBoardParams(params);
  const [width, height, t, c] = [TILE_MM * p.columns, TILE_MM * p.rows, p.thicknessMm, p.slotChamferMm];
  const w = SLOT_WIDTH_MM + p.slotClearanceMm;
  const h = SLOT_HEIGHT_MM + p.slotClearanceMm;

  const sections: CrossSection[] = [];
  const solids: Manifold[] = [];

  const face = keep(new CrossSection([outline(width, height, p.sides, p.cornerRadiusMm)], 'Positive'), sections);
  const plate = keep(face.extrude(t), solids);

  // Every slot is cut whole; at an edge the cut runs past the plate, which leaves the half or quarter.
  const cutters = slotPlaces(p.columns, p.rows, p.sides).map((slot) =>
    keep(slotCutter(engine, slot.xMm, slot.yMm, w, h, t, c), solids),
  );
  const cut = keep(Manifold.union(cutters), solids);
  const board = plate.subtract(cut);
  // WebAssembly memory is not garbage-collected: free every intermediate object.
  for (const m of solids) m.delete();
  for (const s of sections) s.delete();
  return board;
}

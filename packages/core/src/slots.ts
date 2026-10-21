// Where a board's slots go. A board is a whole number of 40 mm tiles (D15), and its edges run
// through slot centres: the 40 mm grid's points lie on the edges and corners, the shifted grid's
// points in each tile's centre. So a slot centred on an edge is cut in half, one on a corner in
// four. Each side is open, keeping those halves and quarters to make whole slots with a neighbour,
// or closed, leaving them out (D34); a board is open all round unless told otherwise (D37). Or an open side runs
// between the slots (D282, D288 a): 10 mm right of or above the grid line it would run through, so its seam falls
// midway between two columns of slots, or across the web between two slots' ends, and every slot is whole; a
// closed side stays where it is.
import { GRID_PITCH_MM, TILE_MM } from './skadis.js';

export type Side = 'left' | 'right' | 'bottom' | 'top';
export type SideState = 'open' | 'closed';
export type Sides = Record<Side, SideState>;

export const ALL_OPEN: Readonly<Sides> = Object.freeze({ left: 'open', right: 'open', bottom: 'open', top: 'open' });

/** Where a board's open sides run: through a line of slots, cutting them in half (D15), or between them (D282). */
export type Seams = 'through' | 'between';

/** How far an open side between the slots lies right of or above the grid line it would run through (D288 a):
 * midway between the 40 mm grid's slots and the shifted grid's. */
export const BETWEEN_SHIFT_MM = 10;

/** A board's rectangle, mm, from the corner of its first tile: its left, bottom, right and top edges. */
export interface Extent {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Where a board's edges lie: on its tiles' edges, or with each open side between the slots moved 10 mm right or
 * up, so a left or bottom side comes in and a right or top one goes out (D288 a). */
export function boardExtent(columns: number, rows: number, sides: Sides, seams: Seams = 'through'): Extent {
  const shift = (side: Side) => (seams === 'between' && sides[side] === 'open' ? BETWEEN_SHIFT_MM : 0);
  return {
    x0: shift('left'),
    y0: shift('bottom'),
    x1: TILE_MM * columns + shift('right'),
    y1: TILE_MM * rows + shift('top'),
  };
}

/** How much of a slot the board holds: all of it, the half on one side of an edge, or a corner's quarter. */
export type SlotPart = 'whole' | 'half' | 'quarter';

export interface SlotPlace {
  xMm: number; // the slot's centre, from the board's left edge
  yMm: number; // and from its bottom edge
  part: SlotPart;
}

const HALF = GRID_PITCH_MM / 2;

/** Whether v lies on a grid line: a multiple of the pitch from `offset`. */
const onLine = (v: number, offset: number) => (((v - offset) % GRID_PITCH_MM) + GRID_PITCH_MM) % GRID_PITCH_MM === 0;

/** Whether a point, in mm from a tile corner, is on the SKÅDIS grid: the 40 mm grid or the one shifted 20 mm. */
export function onSkadisGrid(xMm: number, yMm: number): boolean {
  return (onLine(xMm, 0) && onLine(yMm, 0)) || (onLine(xMm, HALF) && onLine(yMm, HALF));
}

function tiles(n: number, name: string): number {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`${name} must be a whole number of tiles, 1 or more`);
  return n;
}

export function slotPlaces(columns: number, rows: number, sides: Sides, seams: Seams = 'through'): SlotPlace[] {
  tiles(columns, 'The number of columns');
  tiles(rows, 'The number of rows');
  if (seams === 'between') return wholePlaces(columns, rows, sides);
  const places: SlotPlace[] = [];
  // the shifted grid: one whole slot in the middle of every tile
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < rows; j++) places.push({ xMm: TILE_MM * i + HALF, yMm: TILE_MM * j + HALF, part: 'whole' });
  }
  // the 40 mm grid: whole inside, half on an edge, a quarter on a corner, left out on a closed side
  for (let i = 0; i <= columns; i++) {
    for (let j = 0; j <= rows; j++) {
      const on: Side[] = [];
      if (i === 0) on.push('left');
      if (i === columns) on.push('right');
      if (j === 0) on.push('bottom');
      if (j === rows) on.push('top');
      if (on.some((side) => sides[side] === 'closed')) continue;
      const part: SlotPart = on.length === 0 ? 'whole' : on.length === 1 ? 'half' : 'quarter';
      places.push({ xMm: TILE_MM * i, yMm: TILE_MM * j, part });
    }
  }
  return places;
}

/** Between the slots: every slot of the grid that lies whole on the board, its tiles' centres and the points where
 * its tiles meet, those on a moved side's grid line too, those on an edge's line left out (D288 a). */
function wholePlaces(columns: number, rows: number, sides: Sides): SlotPlace[] {
  const e = boardExtent(columns, rows, sides, 'between');
  const places: SlotPlace[] = [];
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < rows; j++) places.push({ xMm: TILE_MM * i + HALF, yMm: TILE_MM * j + HALF, part: 'whole' });
  }
  for (let i = 0; i <= columns; i++) {
    for (let j = 0; j <= rows; j++) {
      const [x, y] = [TILE_MM * i, TILE_MM * j];
      if (x > e.x0 && x < e.x1 && y > e.y0 && y < e.y1) places.push({ xMm: x, yMm: y, part: 'whole' });
    }
  }
  return places;
}

/** How many whole slots the places add up to: a half is half a slot, a quarter a quarter. */
export function slotsWorth(places: readonly SlotPlace[]): number {
  const worth: Record<SlotPart, number> = { whole: 1, half: 0.5, quarter: 0.25 };
  return places.reduce((sum, p) => sum + worth[p.part], 0);
}

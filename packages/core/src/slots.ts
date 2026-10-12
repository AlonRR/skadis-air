// Where a board's slots go. A board is a whole number of 40 mm tiles (D15), and its edges run
// through slot centres: the 40 mm grid's points lie on the edges and corners, the shifted grid's
// points in each tile's centre. So a slot centred on an edge is cut in half, one on a corner in
// four. Each side is open, keeping those halves and quarters to make whole slots with a neighbour,
// or closed, leaving them out (D34); a board is open all round unless told otherwise (D37).
import { GRID_PITCH_MM, TILE_MM } from './skadis.js';

export type Side = 'left' | 'right' | 'bottom' | 'top';
export type SideState = 'open' | 'closed';
export type Sides = Record<Side, SideState>;

export const ALL_OPEN: Readonly<Sides> = Object.freeze({ left: 'open', right: 'open', bottom: 'open', top: 'open' });

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

export function slotPlaces(columns: number, rows: number, sides: Sides): SlotPlace[] {
  tiles(columns, 'The number of columns');
  tiles(rows, 'The number of rows');
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

/** How many whole slots the places add up to: a half is half a slot, a quarter a quarter. */
export function slotsWorth(places: readonly SlotPlace[]): number {
  const worth: Record<SlotPart, number> = { whole: 1, half: 0.5, quarter: 0.25 };
  return places.reduce((sum, p) => sum + worth[p.part], 0);
}

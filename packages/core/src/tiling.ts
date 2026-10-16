// A wall split into panels (backlog item tiling; D15, D37, D175 to D178). A board whose "Panels" setting says
// "Split into panels" is a wall: its width and height are the wall's, and it is cut into panels as even as they
// can be (D176), none larger than the bed takes, either way round, nor than the largest panel the user sets.
// The wall's outer edge follows its sides setting, closed unless opened (D37); every seam is open, half a slot
// on each side, so the slots run on across it (D15). Each panel is a board with the wall's own settings, its
// mounting in its own corners (D177). Panels of the same size and sides are one kind, printed as often as the
// wall has them (D178). A panel's kind is its column's width and outer sides with its row's height and outer
// sides, so each kind holds the places of its columns and of its rows, and its copies are every pair of them:
// a wall of any size plans in the time its columns and rows take, not its panels (backlog item wall-grid; C200).
import type { Bed } from './printer.js';
import { TILE_MM } from './skadis.js';
import type { Side, Sides } from './slots.js';

/** The most tiles a panel has each way: the largest single board (C51). */
export const MAX_PANEL_TILES = 10;
/** The largest wall each way, mm: a kilometre, far past any real wall, so a slip of the keys is refused (D223). */
export const MAX_WALL_MM = 1_000_000;

/** A run of `n` tiles in as few parts as `most` allows, as even as they can be, the larger ones first (D176). */
export function evenSplit(n: number, most: number): number[] {
  if (!(Number.isInteger(n) && n >= 1 && Number.isInteger(most) && most >= 1)) {
    throw new RangeError('A wall and its panels are whole numbers of tiles, 1 or more');
  }
  const parts = Math.ceil(n / most);
  const [base, extra] = [Math.floor(n / parts), n % parts];
  return Array.from({ length: parts }, (_, k) => base + (k < extra ? 1 : 0));
}

const tiles = (mm: number) => Math.min(MAX_PANEL_TILES, Math.floor(mm / TILE_MM));

/** The most whole tiles a panel can have each way on this bed, as the bed lies. */
export function largestPanel(bed: Bed): { columns: number; rows: number } {
  return { columns: tiles(bed.xMm), rows: tiles(bed.yMm) };
}

/** One kind of panel: the board values that make it, and where its copies' lower left corners go, in mm: one at
 * each of its columns' places across and each of its rows' places up (C200). */
export interface PanelKind {
  values: Record<string, unknown>;
  xs: number[]; // where each column of panels of this kind starts, left to right
  ys: number[]; // where each row of them starts, bottom to top
}

/** How many copies of a kind of panel the wall has. */
export const panelCount = (kind: Pick<PanelKind, 'xs' | 'ys'>): number => kind.xs.length * kind.ys.length;

/** Every copy's lower left corner, mm: for a wall small enough to list its panels one by one. */
export function panelPlaces(kind: Pick<PanelKind, 'xs' | 'ys'>): [number, number][] {
  return kind.xs.flatMap((x) => kind.ys.map((y): [number, number] => [x, y]));
}

export interface WallPlan {
  columns: number[]; // tiles across each column of panels, left to right
  rows: number[]; // tiles up each row, bottom to top
  panels: PanelKind[];
}

const number = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** The wall a board's values describe, split for this bed; null when the board is one panel. */
export function wallPlan(values: Readonly<Record<string, unknown>>, bed: Bed): WallPlan | null {
  if (values['panels'] !== 'split') return null;
  const [columns, rows] = [number(values['widthMm'], TILE_MM) / TILE_MM, number(values['heightMm'], TILE_MM) / TILE_MM];
  if (columns * TILE_MM > MAX_WALL_MM || rows * TILE_MM > MAX_WALL_MM) {
    throw new RangeError('A wall is at most 1 km each way');
  }
  const limit = {
    columns: Math.floor(number(values['panelWidthMm'], MAX_PANEL_TILES * TILE_MM) / TILE_MM),
    rows: Math.floor(number(values['panelHeightMm'], MAX_PANEL_TILES * TILE_MM) / TILE_MM),
  };
  const bedPanel = largestPanel(bed);
  if (bedPanel.columns < 1 || bedPanel.rows < 1) throw new RangeError('The bed is too small for a 40 mm tile');
  // As the bed lies, or turned on it: whichever makes fewer panels; as it lies when both make as many.
  const shapes = [bedPanel, { columns: bedPanel.rows, rows: bedPanel.columns }].map((s) => ({
    columns: Math.max(1, Math.min(s.columns, limit.columns)),
    rows: Math.max(1, Math.min(s.rows, limit.rows)),
  }));
  const count = (s: { columns: number; rows: number }) => Math.ceil(columns / s.columns) * Math.ceil(rows / s.rows);
  const shape = shapes.reduce((best, s) => (count(s) < count(best) ? s : best));
  const [across, up] = [evenSplit(columns, shape.columns), evenSplit(rows, shape.rows)];

  const given: unknown = values['sides'];
  // a wall side the values do not say is closed, as a wall's outer edge is unless opened (D37)
  const wallSide = (side: Side): 'open' | 'closed' =>
    typeof given === 'object' && given !== null && Object.getOwnPropertyDescriptor(given, side)?.value === 'open'
      ? 'open'
      : 'closed';
  const columnKinds = runKinds(across, wallSide('left'), wallSide('right'));
  const rowKinds = runKinds(up, wallSide('bottom'), wallSide('top'));
  const panels = columnKinds.flatMap((c) =>
    rowKinds.map((r): PanelKind => {
      const sides: Sides = { left: c.first, right: c.last, bottom: r.first, top: r.last };
      return {
        values: { ...values, panels: 'one', widthMm: c.tiles * TILE_MM, heightMm: r.tiles * TILE_MM, sides },
        xs: c.at,
        ys: r.at,
      };
    }),
  );
  return { columns: across, rows: up, panels };
}

/**
 * The kinds of a run of columns or rows, in the order they first come: each its size in tiles, its sides at
 * the start and the end of the run, which are the wall's own at its ends and open at the seams, and where each
 * of its kind starts, mm.
 */
function runKinds(
  run: readonly number[],
  start: 'open' | 'closed',
  end: 'open' | 'closed',
): { tiles: number; first: 'open' | 'closed'; last: 'open' | 'closed'; at: number[] }[] {
  const kinds = new Map<string, { tiles: number; first: 'open' | 'closed'; last: 'open' | 'closed'; at: number[] }>();
  let at = 0;
  run.forEach((size, k) => {
    const [first, last] = [k === 0 ? start : 'open', k === run.length - 1 ? end : 'open'] as const;
    const key = `${size}:${first},${last}`;
    const kind = kinds.get(key) ?? { tiles: size, first, last, at: [] };
    kind.at.push(at);
    kinds.set(key, kind);
    at += size * TILE_MM;
  });
  return [...kinds.values()];
}

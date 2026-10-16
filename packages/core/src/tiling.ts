// A wall split into panels (backlog item tiling; D15, D37, D175 to D178). A board whose "Panels" setting says
// "Split into panels" is a wall: its width and height are the wall's, and it is cut into panels as even as they
// can be (D176), none larger than the bed takes, either way round, nor than the largest panel the user sets.
// The wall's outer edge follows its sides setting, closed unless opened (D37); every seam is open, half a slot
// on each side, so the slots run on across it (D15). Each panel is a board with the wall's own settings, its
// mounting in its own corners (D177). Panels of the same size and sides are one kind, printed as often as the
// wall has them (D178).
import type { Bed } from './printer.js';
import { TILE_MM } from './skadis.js';
import type { Side, Sides } from './slots.js';

/** The most tiles a panel has each way: the largest single board (C51). */
export const MAX_PANEL_TILES = 10;

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

/** One kind of panel: the board values that make it, and where each copy's lower left corner goes, in mm. */
export interface PanelKind {
  values: Record<string, unknown>;
  places: [number, number][];
}

export interface WallPlan {
  columns: number[]; // tiles across each column of panels, left to right
  rows: number[]; // tiles up each row, bottom to top
  panels: PanelKind[];
}

const SIDES: readonly Side[] = ['left', 'right', 'bottom', 'top'];
const number = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** The wall a board's values describe, split for this bed; null when the board is one panel. */
export function wallPlan(values: Readonly<Record<string, unknown>>, bed: Bed): WallPlan | null {
  if (values['panels'] !== 'split') return null;
  const [columns, rows] = [number(values['widthMm'], TILE_MM) / TILE_MM, number(values['heightMm'], TILE_MM) / TILE_MM];
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
  const kinds = new Map<string, PanelKind>();
  let x = 0;
  across.forEach((w, i) => {
    let y = 0;
    up.forEach((h, j) => {
      const outer: Record<Side, boolean> = {
        left: i === 0,
        right: i === across.length - 1,
        bottom: j === 0,
        top: j === up.length - 1,
      };
      const sideOf = (side: Side) => (outer[side] ? wallSide(side) : 'open');
      const sides: Sides = {
        left: sideOf('left'),
        right: sideOf('right'),
        bottom: sideOf('bottom'),
        top: sideOf('top'),
      };
      const key = `${w}x${h}:${SIDES.map((side) => sides[side]).join(',')}`;
      const kind = kinds.get(key) ?? {
        values: { ...values, panels: 'one', widthMm: w * TILE_MM, heightMm: h * TILE_MM, sides },
        places: [],
      };
      kind.places.push([x, y]);
      kinds.set(key, kind);
      y += h * TILE_MM;
    });
    x += w * TILE_MM;
  });
  return { columns: across, rows: up, panels: [...kinds.values()] };
}

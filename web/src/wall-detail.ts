// Which of a wall's panels to draw in full, and what stands in for the rest (backlog item wall-detail; D197,
// C203). As games draw a large scene: a panel is drawn in full only where the view needs it, when its slots are
// wide enough on the screen to be seen, nearest first and no more than a budget of triangles; the rest of the
// wall's face is drawn as flat rectangles with the slot pattern painted on, which costs two triangles each
// however much wall they cover. The SKÅDIS pattern repeats every 40 mm, and a wall's seams are open, so the
// pattern runs on across them (D15): one picture of one tile, repeated, stands in for any part of the wall. Its
// closed outer edges have no slots, so the strips along them stand in plain.
//
// No drawing here: given the wall's grid and the camera, it says what to draw, so it can be tested on its own.

/** A rectangle on the wall's face, mm: [left, bottom, right, top]. */
export type Rect = [number, number, number, number];

/** A wall's panels as a grid: where each column and row starts and how wide or tall it is, mm, left to right
 * and bottom to top, and which kind of panel is at a column and a row. */
export interface WallGrid {
  xs: readonly number[];
  widths: readonly number[];
  ys: readonly number[];
  heights: readonly number[];
  kindAt: (column: number, row: number) => number;
  frontMm: number; // how far the panels' front faces stand out from the wall plane
  closed: { left: boolean; right: boolean; bottom: boolean; top: boolean };
}

/** The camera, in the wall's millimetres, and how many pixels a millimetre spans on screen 1 mm away from it:
 * the stage's height over twice the tangent of half the vertical field of view. */
export interface Eye {
  x: number;
  y: number;
  z: number;
  pixelsAtOneMm: number;
}

export interface DetailOptions {
  showSlotPx: number; // a panel is drawn in full once its slots are at least this many pixels wide
  keepSlotPx: number; // and stays so until they are narrower than this, so it does not flicker at the edge
  budget: number; // the most triangles drawn in full
  trianglesOf: (kind: number) => number;
  inView: (rect: Rect) => boolean; // whether a panel's rectangle is in the camera's view at all
  shown: ReadonlySet<string>; // the panels drawn in full last time, as `column,row`
}

export interface Detail {
  full: [number, number][]; // the columns and rows of the panels drawn in full, nearest first
  standIns: Rect[]; // the rest of the face, the slot pattern painted on
  plain: Rect[]; // the strips along closed outer edges, which have no slots
}

/** A slot's width as the board cuts it (5 mm and its 0.2 mm clearance), which decides whether it can be seen. */
export const SLOT_MM = 5.2;
/** How far in from a closed outer edge the slots that edge leaves out would have reached: half a slot and its
 * 1 mm chamfer, across a side and along the top or bottom. */
export const PLAIN_SIDE_MM = 5.2 / 2 + 1;
export const PLAIN_END_MM = 15.2 / 2 + 1;

export const key = (column: number, row: number) => `${column},${row}`;

/** How many pixels a millimetre spans 1 mm from the camera, for a stage `heightPx` tall seen through a lens of
 * `fovDegrees` top to bottom; at a distance d it spans this over d. */
export function pixelsAtOneMm(heightPx: number, fovDegrees: number): number {
  return heightPx / (2 * Math.tan((fovDegrees * Math.PI) / 360));
}

/** The first index whose run reaches past `from`, by halving: the runs are in order and touch. */
function firstReaching(starts: readonly number[], sizes: readonly number[], from: number): number {
  let [low, high] = [0, starts.length];
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((starts[mid] ?? 0) + (sizes[mid] ?? 0) <= from) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** Where the last of a run of columns or rows ends, mm. */
const runEnd = (starts: readonly number[], sizes: readonly number[]) => (starts.at(-1) ?? 0) + (sizes.at(-1) ?? 0);

/** The wall's width and height, mm. */
export function wallSize(grid: WallGrid): [number, number] {
  return [runEnd(grid.xs, grid.widths), runEnd(grid.ys, grid.heights)];
}

/** What to draw in full and what stands in for the rest, seen from `eye`. */
export function chooseDetail(grid: WallGrid, eye: Eye, options: DetailOptions): Detail {
  // Only panels within this distance can have slots wide enough, so only they are looked at: the columns and
  // rows the distance reaches, found by halving, however large the wall.
  const reach = (SLOT_MM * eye.pixelsAtOneMm) / Math.min(options.showSlotPx, options.keepSlotPx);
  const depth = Math.abs(eye.z - grid.frontMm);
  const candidates: { column: number; row: number; distance: number }[] = [];
  if (depth < reach) {
    const across = Math.sqrt(reach * reach - depth * depth);
    const [c0, r0] = [
      firstReaching(grid.xs, grid.widths, eye.x - across),
      firstReaching(grid.ys, grid.heights, eye.y - across),
    ];
    for (let column = c0; column < grid.xs.length && (grid.xs[column] ?? 0) < eye.x + across; column++) {
      for (let row = r0; row < grid.ys.length && (grid.ys[row] ?? 0) < eye.y + across; row++) {
        const rect = panelRect(grid, column, row);
        const dx = Math.max(rect[0] - eye.x, 0, eye.x - rect[2]);
        const dy = Math.max(rect[1] - eye.y, 0, eye.y - rect[3]);
        const distance = Math.hypot(dx, dy, depth);
        const slotPx = (SLOT_MM * eye.pixelsAtOneMm) / Math.max(distance, 1e-6);
        const needed = options.shown.has(key(column, row)) ? options.keepSlotPx : options.showSlotPx;
        if (slotPx >= needed && options.inView(rect)) candidates.push({ column, row, distance });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const full: [number, number][] = [];
  let spent = 0;
  for (const { column, row } of candidates) {
    const cost = options.trianglesOf(grid.kindAt(column, row));
    if (spent + cost > options.budget) break;
    spent += cost;
    full.push([column, row]);
  }
  const { standIns, plain } = coverRest(grid, full);
  return { full, standIns, plain };
}

/** A panel's rectangle on the wall's face. */
export function panelRect(grid: WallGrid, column: number, row: number): Rect {
  const [x, y] = [grid.xs[column] ?? 0, grid.ys[row] ?? 0];
  return [x, y, x + (grid.widths[column] ?? 0), y + (grid.heights[row] ?? 0)];
}

/**
 * The wall's face less the panels drawn in full, as rectangles: whole bands of rows with no panel drawn in full,
 * and in a row with some, the runs of columns between them; each then split into its part inside the closed
 * edges' strips, which stands in with the pattern, and its parts in them, which stand in plain.
 */
function coverRest(grid: WallGrid, full: readonly [number, number][]): { standIns: Rect[]; plain: Rect[] } {
  const [width, height] = wallSize(grid);
  const byRow = new Map<number, number[]>();
  for (const [column, row] of full) byRow.set(row, [...(byRow.get(row) ?? []), column]);
  const rest: Rect[] = [];
  let bandFrom: number | null = null;
  const closeBand = (to: number) => {
    if (bandFrom !== null && to > bandFrom) rest.push([0, bandFrom, width, to]);
    bandFrom = null;
  };
  for (let row = 0; row < grid.ys.length; row++) {
    const [y0, y1] = [grid.ys[row] ?? 0, (grid.ys[row] ?? 0) + (grid.heights[row] ?? 0)];
    const columns = byRow.get(row);
    if (columns === undefined) {
      bandFrom ??= y0;
      continue;
    }
    closeBand(y0);
    let x = 0;
    for (const column of [...columns].sort((a, b) => a - b)) {
      const [x0, x1] = [grid.xs[column] ?? 0, (grid.xs[column] ?? 0) + (grid.widths[column] ?? 0)];
      if (x0 > x) rest.push([x, y0, x0, y1]);
      x = x1;
    }
    if (x < width) rest.push([x, y0, width, y1]);
  }
  closeBand(height);

  const inner: Rect = [
    grid.closed.left ? PLAIN_SIDE_MM : 0,
    grid.closed.bottom ? PLAIN_END_MM : 0,
    width - (grid.closed.right ? PLAIN_SIDE_MM : 0),
    height - (grid.closed.top ? PLAIN_END_MM : 0),
  ];
  const standIns: Rect[] = [];
  const plain: Rect[] = [];
  for (const r of rest) {
    const middle: Rect = [
      Math.max(r[0], inner[0]),
      Math.max(r[1], inner[1]),
      Math.min(r[2], inner[2]),
      Math.min(r[3], inner[3]),
    ];
    if (middle[0] < middle[2] && middle[1] < middle[3]) {
      standIns.push(middle);
      // what lies outside the middle: below and above it across the whole rectangle, then left and right of it
      const parts: Rect[] = [
        [r[0], r[1], r[2], middle[1]],
        [r[0], middle[3], r[2], r[3]],
        [r[0], middle[1], middle[0], middle[3]],
        [middle[2], middle[1], r[2], middle[3]],
      ];
      for (const p of parts) if (p[0] < p[2] && p[1] < p[3]) plain.push(p);
    } else {
      plain.push(r);
    }
  }
  return { standIns, plain };
}

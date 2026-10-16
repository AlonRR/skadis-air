// Which of a wall's panels the preview draws in full, and what stands in for the rest (backlog item wall-detail;
// D197, C203): panels near enough for their slots to be seen, nearest first, within a budget of triangles; the
// rest of the face as rectangles with the slot pattern painted on, plain along closed outer edges. Each claim is
// worked out by hand from where the eye is.
import { describe, expect, it } from 'vitest';
import {
  chooseDetail,
  panelRect,
  pixelsAtOneMm,
  PLAIN_END_MM,
  PLAIN_SIDE_MM,
  SLOT_MM,
  wallSize,
  type DetailOptions,
  type Eye,
  type Rect,
  type WallGrid,
} from '../src/wall-detail.js';

const CLOSED = { left: true, right: true, bottom: true, top: true };
const OPEN = { left: false, right: false, bottom: false, top: false };

/** A wall of panels `size` mm square, `columns` across and `rows` up, its fronts 5 mm out. */
function wall(columns: number, rows: number, size = 400, closed = CLOSED): WallGrid {
  return {
    xs: Array.from({ length: columns }, (_, k) => k * size),
    widths: Array.from({ length: columns }, () => size),
    ys: Array.from({ length: rows }, (_, k) => k * size),
    heights: Array.from({ length: rows }, () => size),
    kindAt: () => 0,
    frontMm: 5,
    closed,
  };
}

// An 800 px stage seen through the preview's 35 degree lens.
const PX = pixelsAtOneMm(800, 35);
const eye = (x: number, y: number, z: number): Eye => ({ x, y, z, pixelsAtOneMm: PX });
const options = (given: Partial<DetailOptions> = {}): DetailOptions => ({
  showSlotPx: 2.5,
  keepSlotPx: 2,
  budget: 5e6,
  trianglesOf: () => 50_000,
  inView: () => true,
  shown: new Set(),
  ...given,
});
const area = (rects: readonly Rect[]) => rects.reduce((sum, [x0, y0, x1, y1]) => sum + (x1 - x0) * (y1 - y0), 0);
const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

describe('pixelsAtOneMm', () => {
  it("is the stage's height over twice the tangent of half the lens's angle", () => {
    expect(PX).toBeCloseTo(800 / (2 * Math.tan((17.5 * Math.PI) / 180)), 9);
  });
});

describe('chooseDetail', () => {
  it('draws every panel of a 1.6 m wall in full when its slots are wide enough everywhere', () => {
    // 1.5 m out from the middle, the farthest panel's nearest point is 1.6 m away: its slots 4.1 px wide
    const detail = chooseDetail(wall(4, 4), eye(800, 800, 1505), options());
    expect(detail.full).toHaveLength(16);
    expect(detail.standIns).toEqual([]);
    expect(detail.plain).toEqual([]);
  });

  it('draws none in full from far away: one patterned rectangle inside the closed edges, plain strips round it', () => {
    const detail = chooseDetail(wall(4, 4), eye(800, 800, 100_000), options());
    expect(detail.full).toEqual([]);
    expect(detail.standIns).toEqual([[PLAIN_SIDE_MM, PLAIN_END_MM, 1600 - PLAIN_SIDE_MM, 1600 - PLAIN_END_MM]]);
    expect(detail.plain).toHaveLength(4);
    expect(area(detail.standIns) + area(detail.plain)).toBeCloseTo(1600 * 1600, 6);
  });

  it('leaves the plain strips out where the wall is open: its half slots are real', () => {
    const detail = chooseDetail(wall(4, 4, 400, OPEN), eye(800, 800, 100_000), options());
    expect(detail.standIns).toEqual([[0, 0, 1600, 1600]]);
    expect(detail.plain).toEqual([]);
  });

  it('takes the nearest first and stops at the budget', () => {
    // a million triangles a panel and five million to spend; the eye half a metre in front of the corner
    const detail = chooseDetail(wall(4, 4), eye(0, 0, 505), options({ trianglesOf: () => 1e6 }));
    expect(detail.full).toHaveLength(5);
    expect(detail.full[0]).toEqual([0, 0]);
    expect(new Set(detail.full.slice(0, 4).map(String))).toEqual(new Set(['0,0', '1,0', '0,1', '1,1']));
  });

  it('shows a panel once its slots are 2.5 px wide, and keeps it until they are under 2 px (C203)', () => {
    // straight above one panel, at the distance where its slots are 2.2 px wide
    const distance = (SLOT_MM * PX) / 2.2;
    const at = eye(200, 200, 5 + distance);
    expect(chooseDetail(wall(1, 1), at, options()).full).toEqual([]);
    expect(chooseDetail(wall(1, 1), at, options({ shown: new Set(['0,0']) })).full).toEqual([[0, 0]]);
    // control: farther, at 1.9 px, even a panel shown before goes
    const far = eye(200, 200, 5 + (SLOT_MM * PX) / 1.9);
    expect(chooseDetail(wall(1, 1), far, options({ shown: new Set(['0,0']) })).full).toEqual([]);
  });

  it('draws nothing in full that is out of the view, however near', () => {
    const detail = chooseDetail(wall(4, 4), eye(800, 800, 1505), options({ inView: ([x0]) => x0 < 800 }));
    expect(detail.full).toHaveLength(8);
    expect(detail.full.every(([column]) => column < 2)).toBe(true);
  });

  it('covers the rest of the face exactly once: the stand-ins, the strips and the full panels add up to the wall', () => {
    const grid = wall(5, 3, 400);
    const detail = chooseDetail(grid, eye(500, 300, 700), options({ trianglesOf: () => 1e6 }));
    expect(detail.full.length).toBeGreaterThan(0);
    const full = detail.full.map(([c, r]) => panelRect(grid, c, r));
    const [width, height] = wallSize(grid);
    expect(area(detail.standIns) + area(detail.plain) + area(full)).toBeCloseTo(width * height, 6);
    for (const r of [...detail.standIns, ...detail.plain]) for (const f of full) expect(overlap(r, f)).toBe(0);
    for (const s of detail.standIns) for (const p of detail.plain) expect(overlap(s, p)).toBe(0);
  });

  it('chooses for a wall a kilometre wide at once, looking only near the eye (D196)', () => {
    const grid = wall(2500, 750); // 1 km by 300 m, in 400 mm panels: 1 875 000 of them
    const t0 = performance.now();
    const close = chooseDetail(grid, eye(500_000, 150_000, 1000), options());
    const ms = performance.now() - t0;
    expect(close.full.length).toBeGreaterThan(0);
    expect(close.full.length).toBeLessThan(200);
    expect(ms).toBeLessThan(100);
    // rows with no panel in full go together, so the stand-ins are few however large the wall
    expect(close.standIns.length).toBeLessThan(4 * close.full.length + 4);
    const far = chooseDetail(grid, eye(500_000, 150_000, 1e9), options());
    expect([far.full, far.standIns.length]).toEqual([[], 1]);
  });
});

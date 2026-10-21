// Where a board's slots go (backlog item board-solid): D15 cuts tiles through slot centres in
// 40 mm steps, so a 40 x 40 tile is one whole slot and four quarter slots; D34 and D37 make each
// side open (the half and quarter slots) or closed (left out), open by default.
import { describe, expect, it } from 'vitest';
import { ALL_OPEN, boardExtent, type Sides, onSkadisGrid, slotPlaces, slotsWorth } from '../src/slots.js';

const closed = (...names: (keyof Sides)[]): Sides => {
  const sides: Sides = { ...ALL_OPEN };
  for (const n of names) sides[n] = 'closed';
  return sides;
};
const key = (p: { xMm: number; yMm: number }) => `${p.xMm},${p.yMm}`;
const byPart = (places: ReturnType<typeof slotPlaces>) => ({
  whole: places.filter((p) => p.part === 'whole').length,
  half: places.filter((p) => p.part === 'half').length,
  quarter: places.filter((p) => p.part === 'quarter').length,
});

describe('the SKÅDIS grid', () => {
  it('holds the 40 mm grid and the second grid shifted 20 mm in x and y', () => {
    for (const [x, y] of [
      [0, 0],
      [40, 80],
      [20, 20],
      [60, 100],
    ] as const)
      expect(onSkadisGrid(x, y)).toBe(true);
  });

  it('discriminates: points between the two grids are not on it', () => {
    for (const [x, y] of [
      [20, 0],
      [0, 20],
      [10, 10],
      [40, 20],
    ] as const)
      expect(onSkadisGrid(x, y)).toBe(false);
  });
});

describe('slotPlaces', () => {
  it('a 40 x 40 tile open all round is one whole slot and four quarter slots (D15)', () => {
    const places = slotPlaces(1, 1, ALL_OPEN);
    expect(byPart(places)).toEqual({ whole: 1, half: 0, quarter: 4 });
    expect(places.find((p) => p.part === 'whole')).toMatchObject({ xMm: 20, yMm: 20 });
    expect(
      places
        .filter((p) => p.part === 'quarter')
        .map(key)
        .sort(),
    ).toEqual(['0,0', '0,40', '40,0', '40,40']);
  });

  it('a 40 x 40 tile closed all round keeps only its centre slot, 20 mm from each edge as on an IKEA board', () => {
    expect(slotPlaces(1, 1, closed('left', 'right', 'bottom', 'top'))).toEqual([{ xMm: 20, yMm: 20, part: 'whole' }]);
  });

  it('an 80 x 80 board open all round: 5 whole, 4 half, 4 quarter', () => {
    expect(byPart(slotPlaces(2, 2, ALL_OPEN))).toEqual({ whole: 5, half: 4, quarter: 4 });
  });

  it('a closed side leaves out every slot whose centre lies on it, corners included', () => {
    const places = slotPlaces(2, 2, closed('left', 'bottom')).filter((p) => p.part !== 'whole');
    expect(places.map((p) => `${key(p)} ${p.part}`).sort()).toEqual(['40,80 half', '80,40 half', '80,80 quarter']);
  });

  it('every place is on the grid and on the board, for every size up to 5 x 5 and all 16 side choices', () => {
    const states = ['open', 'closed'] as const;
    let boards = 0;
    for (let columns = 1; columns <= 5; columns++) {
      for (let rows = 1; rows <= 5; rows++) {
        for (let m = 0; m < 16; m++) {
          const sides: Sides = {
            left: states[m & 1] ?? 'open',
            right: states[(m >> 1) & 1] ?? 'open',
            bottom: states[(m >> 2) & 1] ?? 'open',
            top: states[(m >> 3) & 1] ?? 'open',
          };
          const places = slotPlaces(columns, rows, sides);
          for (const p of places) {
            expect(onSkadisGrid(p.xMm, p.yMm)).toBe(true);
            expect(p.xMm).toBeGreaterThanOrEqual(0);
            expect(p.xMm).toBeLessThanOrEqual(40 * columns);
            expect(p.yMm).toBeGreaterThanOrEqual(0);
            expect(p.yMm).toBeLessThanOrEqual(40 * rows);
          }
          // The whole slots do not depend on the sides: one per tile, and one where four tiles meet.
          expect(byPart(places).whole).toBe(columns * rows + (columns - 1) * (rows - 1));
          boards++;
        }
      }
    }
    expect(boards).toBe(400);
  });

  it('two open tiles side by side make the same slots as one board of their size', () => {
    const wall = new Map<string, number>();
    for (const offset of [0, 40]) {
      for (const p of slotPlaces(1, 2, ALL_OPEN)) {
        const k = `${p.xMm + offset},${p.yMm}`;
        wall.set(k, (wall.get(k) ?? 0) + slotsWorth([p]));
      }
    }
    const board = new Map(slotPlaces(2, 2, ALL_OPEN).map((p) => [key(p), slotsWorth([p])]));
    expect(wall).toEqual(board);
    expect(wall.get('40,40')).toBe(1); // the seam's two halves make a whole slot
  });

  it('discriminates: with the second tile closed at the seam, the seam slot is only a half', () => {
    let seam = 0;
    for (const [offset, sides] of [
      [0, ALL_OPEN],
      [40, closed('left')],
    ] as const) {
      for (const p of slotPlaces(1, 2, sides)) if (p.xMm + offset === 40 && p.yMm === 40) seam += slotsWorth([p]);
    }
    expect(seam).toBe(0.5);
  });

  it('refuses a size that is not a whole number of tiles', () => {
    expect(() => slotPlaces(0, 1, ALL_OPEN)).toThrow(RangeError);
    expect(() => slotPlaces(1.5, 1, ALL_OPEN)).toThrow(RangeError);
  });
});

// Open sides between the slots (D282, D288 a): an open side moves 10 mm right of or above the grid line it ran
// through, so its seam falls midway between two columns of slots, or across the web between two slots' ends; a
// closed side stays. Every slot the board holds is then whole.
describe('between the slots (D282, D288)', () => {
  const states = ['open', 'closed'] as const;
  const everySides = Array.from({ length: 16 }, (_, m): Sides => ({
    left: states[m & 1] ?? 'open',
    right: states[(m >> 1) & 1] ?? 'open',
    bottom: states[(m >> 2) & 1] ?? 'open',
    top: states[(m >> 3) & 1] ?? 'open',
  }));

  it('moves only an open side, 10 mm right of or above its grid line', () => {
    expect(boardExtent(3, 2, ALL_OPEN, 'between')).toEqual({ x0: 10, y0: 10, x1: 130, y1: 90 });
    expect(boardExtent(3, 2, closed('left', 'right', 'bottom', 'top'), 'between')).toEqual({
      x0: 0,
      y0: 0,
      x1: 120,
      y1: 80,
    });
    expect(boardExtent(3, 2, closed('left', 'bottom'), 'between')).toEqual({ x0: 0, y0: 0, x1: 130, y1: 90 });
    expect(boardExtent(3, 2, closed('right', 'top'), 'between')).toEqual({ x0: 10, y0: 10, x1: 120, y1: 80 });
  });

  it('discriminates: through the slots, no side moves', () => {
    for (const sides of everySides)
      expect(boardExtent(3, 2, sides, 'through')).toEqual({ x0: 0, y0: 0, x1: 120, y1: 80 });
    expect(boardExtent(3, 2, ALL_OPEN)).toEqual({ x0: 0, y0: 0, x1: 120, y1: 80 });
  });

  it('holds only whole slots, each inside the board, as many as the tiles are worth, for all 16 side choices', () => {
    for (const sides of everySides) {
      for (const [columns, rows] of [
        [1, 1],
        [3, 2],
        [4, 5],
      ] as const) {
        const places = slotPlaces(columns, rows, sides, 'between');
        const e = boardExtent(columns, rows, sides, 'between');
        for (const p of places) {
          expect(p.part).toBe('whole');
          expect(onSkadisGrid(p.xMm, p.yMm)).toBe(true);
          // the 5 x 15 mm slot, all of it, on the board
          expect(p.xMm - 2.5).toBeGreaterThan(e.x0);
          expect(p.xMm + 2.5).toBeLessThan(e.x1);
          expect(p.yMm - 7.5).toBeGreaterThan(e.y0);
          expect(p.yMm + 7.5).toBeLessThan(e.y1);
        }
        // and every slot of the grid that lies whole on the board is there
        let whole = 0;
        for (let x = -40; x <= 40 * columns + 40; x += 20) {
          for (let y = -40; y <= 40 * rows + 40; y += 20) {
            if (onSkadisGrid(x, y) && x - 2.5 > e.x0 && x + 2.5 < e.x1 && y - 7.5 > e.y0 && y + 7.5 < e.y1) whole++;
          }
        }
        expect(places).toHaveLength(whole);
        // a closed side leaves out what it cut, as through the slots: the same worth where every side is closed
        if (Object.values(sides).every((s) => s === 'closed')) {
          expect(slotsWorth(places)).toBe(slotsWorth(slotPlaces(columns, rows, sides)));
        }
      }
    }
  });

  it('open all round, the slots are worth what the tiles are through the slots, all of them whole', () => {
    expect(byPart(slotPlaces(3, 2, ALL_OPEN, 'between'))).toEqual({ whole: 12, half: 0, quarter: 0 });
    expect(slotsWorth(slotPlaces(3, 2, ALL_OPEN))).toBe(12);
  });

  it('boards side by side and one above another make the slots of one board their size, once each', () => {
    // a wall of 2 x 2 boards, each 2 x 1 tiles, closed round the wall and open at its seams
    const wall = new Map<string, number>();
    for (const [i, j] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const sides: Sides = {
        left: i === 0 ? 'closed' : 'open',
        right: i === 1 ? 'closed' : 'open',
        bottom: j === 0 ? 'closed' : 'open',
        top: j === 1 ? 'closed' : 'open',
      };
      for (const p of slotPlaces(2, 1, sides, 'between')) {
        const k = `${p.xMm + 80 * i},${p.yMm + 40 * j}`;
        wall.set(k, (wall.get(k) ?? 0) + 1);
      }
    }
    const one = slotPlaces(4, 2, closed('left', 'right', 'bottom', 'top'), 'between')
      .map(key)
      .sort();
    expect([...wall.keys()].sort()).toEqual(one);
    expect([...wall.values()].every((n) => n === 1)).toBe(true);
  });
});

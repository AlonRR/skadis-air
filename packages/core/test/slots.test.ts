// Where a board's slots go (backlog item board-solid): D15 cuts tiles through slot centres in
// 40 mm steps, so a 40 x 40 tile is one whole slot and four quarter slots; D34 and D37 make each
// side open (the half and quarter slots) or closed (left out), open by default.
import { describe, expect, it } from 'vitest';
import { ALL_OPEN, type Sides, onSkadisGrid, slotPlaces, slotsWorth } from '../src/slots.js';

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

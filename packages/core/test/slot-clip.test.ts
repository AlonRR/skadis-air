// The slot clip (backlog item conn-slot-clip; D185, D187 to D189, C191): behind a seam, as deep as the gap,
// a peg in the nearest whole slot of each board; for 4 boards a square ring. Each claim is measured on the
// solid, and placed behind the boards where it is fitted.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine.js';
import { stadium } from '../src/rings.js';
import { makeSlotClip, slotClipParams, type SlotClipParams } from '../src/slot-clip.js';
import { ALL_OPEN, slotPlaces } from '../src/slots.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets } from './facets.js';
import { hookRoomZone, slotClearZone } from './slot-zone.js';

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

const clip = (given: Partial<SlotClipParams> = {}) => keep(makeSlotClip(engine, slotClipParams(given)));
const within = (actual: number, expected: number) => Math.abs(actual - expected) / expected;
const round = (v: number[]) => v.map((x) => Math.round(x * 1000) / 1000);

// Areas, worked out by hand. A band of width w across a circle of radius r, centred on it, on one side of
// the centre: half of what the band covers of the disc, by integration.
const halfBand = (r: number, w: number) => {
  const u = w / 2;
  return 2 * ((u / 2) * Math.sqrt(r * r - u * u) + ((r * r) / 2) * Math.asin(u / r));
};
const PEG = 4.8 * 10 + Math.PI * 2.4 ** 2; // a 4.8 x 14.8 mm stadium
const POST = Math.PI * 10 ** 2; // a post, 20 mm across
// Where the 10 mm bar runs into a post at its end: the band on the inner side, and the bar's round end.
const BAR_IN_POST = halfBand(10, 10) + (Math.PI * 25) / 2;

describe('slotClipParams: the starting values', () => {
  it('are for 2 boards side by side, 20 mm deep (D187), with pegs 0.4 mm smaller than the slot (D189)', () => {
    expect(slotClipParams({})).toEqual({ boards: '2', depthMm: 20, pegClearanceMm: 0.4 });
  });

  it('refuses a clip too shallow for the hooks room and a bar behind it (C99)', () => {
    expect(() => slotClipParams({ depthMm: 11.5 })).toThrow(/12 mm/);
    expect(slotClipParams({ depthMm: 12 }).depthMm).toBe(12);
  });

  it('refuses what cannot be made', () => {
    expect(() => slotClipParams({ pegClearanceMm: -0.1 })).toThrow(RangeError);
    expect(() => slotClipParams({ pegClearanceMm: 5 })).toThrow(RangeError);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value the type would not allow
    expect(() => slotClipParams({ boards: '3' as SlotClipParams['boards'] })).toThrow(RangeError);
  });
});

describe('makeSlotClip, for 2 boards side by side', () => {
  it('is a 10 mm bar between two posts 40 mm apart, a peg on each, 20 mm deep and the pegs 2.5 mm more', () => {
    const part = clip();
    const box = part.boundingBox();
    expect(round(box.min)).toEqual([-30, -10, 0]);
    expect(round(box.max)).toEqual([30, 10, 22.5]);
    expect(part.genus()).toBe(0);
  });

  it('is the bar and the posts at the wall, the posts alone for the 8 mm next to the boards, then the pegs', () => {
    const part = clip();
    const bar = 40 * 10 + Math.PI * 25; // two 10 mm discs and the band between their centres
    const wall = bar + 2 * POST - 2 * BAR_IN_POST;
    expect(within(keep(part.slice(6)).area(), wall)).toBeLessThan(0.01);
    expect(within(keep(part.slice(16)).area(), 2 * POST)).toBeLessThan(0.01);
    expect(within(keep(part.slice(21)).area(), 2 * PEG)).toBeLessThan(0.01);
  });

  it('makes the pegs the slot the board cuts less the peg clearance, and chamfers their tips', () => {
    const loose = clip({ pegClearanceMm: 0.2 }); // pegs 5.0 x 15.0 mm
    expect(within(keep(loose.slice(21)).area(), 2 * (5 * 10 + Math.PI * 2.5 ** 2))).toBeLessThan(0.01);
    const tip = keep(clip().slice(22.49)).area(); // 0.4 mm in all round, near the top
    expect(tip).toBeLessThan(2 * (4 * 10 + Math.PI * 2 ** 2) + 1);
    expect(tip).toBeGreaterThan(2 * (4 * 10 + Math.PI * 2 ** 2) - 2);
  });

  it('follows the depth asked for', () => {
    const box = clip({ depthMm: 30 }).boundingBox();
    expect(box.max[2]).toBeCloseTo(32.5, 6);
  });
});

// Fitted behind the boards, its board face against their back faces at z = 0, the boards from z = 0 to 5.
const fitted = (part: Manifold, x: number, y: number, depth = 20, shift = 0) =>
  keep(part.translate([x + shift, y, -depth - 0.005]));
const ROOM = 8; // the hook's 6 mm behind the board and the 2 mm margin (C99)
const [INSIDE, BEYOND] = [ROOM - 0.05, ROOM + 0.5];
const NOTHING = 1e-6; // mm3: an intersection empty but for the arithmetic's rounding
type Board = { columns: number; rows: number; sides: typeof ALL_OPEN };

/** The boards' plate, 5 mm thick, with every slot cut as the board cuts it (5.2 x 15.2 mm). */
function plate(board: Board): Manifold {
  const outline = keep(
    new engine.CrossSection([
      [0, 0],
      [board.columns * 40, 0],
      [board.columns * 40, board.rows * 40],
      [0, board.rows * 40],
    ]),
  );
  const slots = keep(
    new engine.CrossSection(
      slotPlaces(board.columns, board.rows, board.sides).map((s) => stadium(s.xMm, s.yMm, 5.2, 15.2)),
      'NonZero',
    ),
  );
  return keep(keep(outline.subtract(slots)).extrude(5));
}

/** Whether the clip, fitted, leaves every slot but its own and every hook below them their room, 8 mm deep. */
function roomLeft(placed: Manifold, board: Board, pegs: [number, number][]) {
  const taken = (zone: Manifold) => keep(placed.intersect(zone)).volume();
  return {
    slots: taken(slotClearZone(engine, board, 2, INSIDE, keep, pegs)) < NOTHING,
    hooks: taken(hookRoomZone(engine, board, 2, INSIDE, keep, pegs)) < NOTHING,
    // its pegs are in the slots, wholly: nothing of it is in the plate
    pegsInSlots: taken(plate(board)) < NOTHING,
    // the control: the same check counting its own slots finds its posts there
    seenAtItsOwnSlots: taken(slotClearZone(engine, board, 2, INSIDE, keep)) > 0,
  };
}
const ROOM_LEFT = { slots: true, hooks: true, pegsInSlots: true, seenAtItsOwnSlots: true };

describe('makeSlotClip, fitted at a seam (D187)', () => {
  it('side by side, at either row of whole slots, leaves every other slot and every hook its room', () => {
    const board = { columns: 4, rows: 2, sides: ALL_OPEN }; // two 2 x 2 boards side by side, the seam at x = 80
    for (const y of [20, 60]) {
      expect(
        roomLeft(fitted(clip(), 80, y), board, [
          [60, y],
          [100, y],
        ]),
      ).toEqual(ROOM_LEFT);
      // the control for the room: deeper than 8 mm, the bar is behind the hook hanging in the seam's slot above
      const deeper = hookRoomZone(engine, board, 2, BEYOND, keep, [
        [60, y],
        [100, y],
      ]);
      expect(keep(fitted(clip(), 80, y).intersect(deeper)).volume()).toBeGreaterThan(0);
    }
  });

  it('a peg 1 mm off its place is caught: the plate check can see a peg in the board', () => {
    const board = { columns: 4, rows: 2, sides: ALL_OPEN };
    expect(keep(fitted(clip(), 80, 20, 20, 1).intersect(plate(board))).volume()).toBeGreaterThan(0);
  });

  it('one above the other, its pegs one above the other, leaves them their room too (C191)', () => {
    const part = clip({ boards: '2-stacked' });
    expect(round(part.boundingBox().min)).toEqual([-10, -30, 0]);
    expect(round(part.boundingBox().max)).toEqual([10, 30, 22.5]);
    const board = { columns: 2, rows: 4, sides: ALL_OPEN }; // the seam at y = 80
    for (const x of [20, 60]) {
      expect(
        roomLeft(fitted(part, x, 80), board, [
          [x, 60],
          [x, 100],
        ]),
      ).toEqual(ROOM_LEFT);
    }
  });

  it('at a shallower gap, as deep as it is made, still leaves the room', () => {
    const board = { columns: 4, rows: 2, sides: ALL_OPEN };
    expect(
      roomLeft(fitted(clip({ depthMm: 12 }), 80, 20, 12), board, [
        [60, 20],
        [100, 20],
      ]),
    ).toEqual(ROOM_LEFT);
  });
});

describe('makeSlotClip, for 4 boards (D188)', () => {
  it('is a square ring through four posts on a 40 mm square, a peg on each', () => {
    const part = clip({ boards: '4' });
    const box = part.boundingBox();
    expect(round(box.min)).toEqual([-30, -30, 0]);
    expect(round(box.max)).toEqual([30, 30, 22.5]);
    expect(part.genus()).toBe(1);
    // the ring: a 50 mm square with its outer corners rounded to 5 mm, less the 30 mm square inside it
    const ring = 50 * 50 - (4 - Math.PI) * 25 - 30 * 30;
    // at each corner the ring is two 10 mm bands meeting, which cover 25 mm2 twice, and its rounded corner
    const ringInPost = 2 * halfBand(10, 10) - 25 + (Math.PI * 25) / 4;
    const wall = ring + 4 * POST - 4 * ringInPost;
    expect(within(keep(part.slice(6)).area(), wall)).toBeLessThan(0.01);
    expect(within(keep(part.slice(16)).area(), 4 * POST)).toBeLessThan(0.01);
    expect(within(keep(part.slice(21)).area(), 4 * PEG)).toBeLessThan(0.01);
  });

  it('fitted where four corners meet, leaves the slot they share and every other its room', () => {
    const board = { columns: 4, rows: 4, sides: ALL_OPEN }; // four 2 x 2 boards, meeting at (80, 80)
    const pegs: [number, number][] = [
      [60, 60],
      [100, 60],
      [100, 100],
      [60, 100],
    ];
    expect(roomLeft(fitted(clip({ boards: '4' }), 80, 80), board, pegs)).toEqual(ROOM_LEFT);
  });
});

describe('makeSlotClip exports', () => {
  it('with no degenerate facet, for each layout', () => {
    for (const boards of ['2', '2-stacked', '4'] as const) expect(degenerateFacets(meshOf(clip({ boards })))).toBe(0);
  });
});

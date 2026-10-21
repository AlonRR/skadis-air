// The slot clip (backlog items conn-slot-clip and clip-grip-fixing; D185, D187 to D189, D194, D195, C191, C199):
// behind a seam, as deep as the gap, a peg in the nearest whole slot of each board; for 4 boards a square ring;
// its pegs gripping by ribs, the snap lip taken out (D261); fixed by a screw or a keyhole, or not at all. Each claim is measured
// on the solid, and placed behind real boards, their slots chamfered, where it is fitted.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { boardType } from '../src/board-types/index.js';
import { defaultValues } from '../src/settings.js';
import { keyholeClipDepth, makeSlotClip, makeSlotFill, slotClipParams, type SlotClipParams } from '../src/slot-clip.js';
import { ALL_OPEN } from '../src/slots.js';
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

// The shapes' figures are worked out for a clip 20 mm deep with no screw; the starting depth and fixing are tested
// on their own (D238, D250 b).
const clip = (given: Partial<SlotClipParams> = {}) =>
  keep(makeSlotClip(engine, slotClipParams({ depthMm: 20, fixing: 'none', ...given })));
const within = (actual: number, expected: number) => Math.abs(actual - expected) / expected;
const round = (v: number[]) => v.map((x) => Math.round(x * 1000) / 1000);
/** The bounds of each separate outline in a slice, as [minX, maxX, minY, maxY]. */
const outlines = (section: CrossSection) =>
  section.toPolygons().map((ring): Bounds => {
    const xs = ring.map(([x]) => x);
    const ys = ring.map(([, y]) => y);
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  });

type Bounds = [number, number, number, number];
/** The one outline that matches, failing the test unless exactly one does. */
function only(rings: Bounds[], match: (b: Bounds) => boolean): Bounds {
  const found = rings.filter(match);
  expect(found).toHaveLength(1);
  return found.shift() ?? [0, 0, 0, 0];
}

// Areas, worked out by hand. A band of width w across a circle of radius r, centred on it, on one side of
// the centre: half of what the band covers of the disc, by integration.
const halfBand = (r: number, w: number) => {
  const u = w / 2;
  return 2 * ((u / 2) * Math.sqrt(r * r - u * u) + ((r * r) / 2) * Math.asin(u / r));
};
const PEG = 4.8 * 10 + Math.PI * 2.4 ** 2; // a 4.8 x 14.8 mm stadium
// A rib, 0.8 mm across, its centre 0.1 mm inside the peg's side: the part of its circle beyond that chord.
const RIB = 0.16 * Math.acos(0.1 / 0.4) - 0.1 * Math.sqrt(0.16 - 0.01);
const RIBS = 6 * RIB; // three along each long side
const POST = Math.PI * 10 ** 2; // a post, 20 mm across
// Where the 10 mm bar runs into a post at its end: the band on the inner side, and the bar's round end.
const BAR_IN_POST = halfBand(10, 10) + (Math.PI * 25) / 2;
// The long blend where the bar meets a post (D270): a parabola from 14 mm along the bar to where the post's round is
// 8 mm out, its area worked out as the ring longBlend draws it, by the shoelace formula, 21 Oct 2026.
const BLEND = 3.4836;

describe('slotClipParams: the starting values', () => {
  it('are for 2 boards side by side, 15 mm deep, pegs 0.4 mm under the slot with ribs, and a screw (D238, D250 b)', () => {
    expect(slotClipParams({})).toEqual({
      boards: '2',
      depthMm: 15,
      pegClearanceMm: 0.4,
      fixing: 'screw',
      screwHead: 'countersunk',
      screwMm: 4,
    });
  });

  it('refuses a clip too shallow for the hooks room and a bar behind it (C99)', () => {
    expect(() => slotClipParams({ depthMm: 11.5 })).toThrow(/12 mm/);
    expect(slotClipParams({ depthMm: 12 }).depthMm).toBe(12);
  });

  it('refuses what cannot be made', () => {
    expect(() => slotClipParams({ pegClearanceMm: -0.1 })).toThrow(RangeError);
    expect(() => slotClipParams({ pegClearanceMm: 5 })).toThrow(RangeError);
    expect(() => slotClipParams({ screwMm: 0 })).toThrow(RangeError);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value the type would not allow
    expect(() => slotClipParams({ boards: '3' as SlotClipParams['boards'] })).toThrow(RangeError);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value the type would not allow
    expect(() => slotClipParams({ fixing: 'nail' as SlotClipParams['fixing'] })).toThrow(RangeError);
  });

  it('takes a peg as narrow as its chamfered tip allows', () => {
    // a 3.5 mm clearance leaves a 1.7 mm peg: enough for ribs and a chamfered tip
    expect(slotClipParams({ pegClearanceMm: 3.5 }).pegClearanceMm).toBe(3.5);
  });

  it("has no grip on the page: ribs alone, as the lip did not hold (T193, D261); the lip is the trial's (T268)", () => {
    expect(slotClipParams({})).not.toHaveProperty('grip');
    // a lip kept in a browser from before is not passed on by the page's clip, which builds whole pegs
    const type = boardType('slot-clip');
    const built = keep(type.build(engine, { ...defaultValues(type.settings), depthMm: 20, grip: 'lip' }));
    expect(keep(built.slice(22)).toPolygons()).toHaveLength(2);
  });

  it('refuses a screw whose countersink is wider than the gap between the seam and a post (C199)', () => {
    expect(slotClipParams({ fixing: 'screw', screwMm: 4 }).screwMm).toBe(4);
    expect(() => slotClipParams({ fixing: 'screw', screwMm: 4.5 })).toThrow(/smaller screw/);
    expect(slotClipParams({ fixing: 'none', screwMm: 5 }).screwMm).toBe(5); // no screw, nothing to refuse
  });

  it('refuses a keyhole in a clip too shallow for its lips, the head and a roof (C199)', () => {
    // 8 mm of hooks' room, 1.5 mm of lips, the 3.5 mm channel for a 4 mm screw's head, and 1.2 mm of roof
    expect(keyholeClipDepth(4)).toBeCloseTo(14.2, 9);
    expect(() => slotClipParams({ fixing: 'keyhole', depthMm: 14 })).toThrow(/14\.2 mm/);
    expect(slotClipParams({ fixing: 'keyhole', depthMm: 14.5 }).depthMm).toBe(14.5);
  });
});

describe('makeSlotClip, for 2 boards side by side', () => {
  it('is a 10 mm bar between two posts 40 mm apart, a peg on each, 20 mm deep and the pegs flush with a 5 mm board (D250 a)', () => {
    const part = clip();
    const box = part.boundingBox();
    expect(round(box.min)).toEqual([-30, -10, 0]);
    expect(round(box.max)).toEqual([30, 10, 25]);
    expect(part.genus()).toBe(0);
  });

  it('is the bar and the posts at the wall, the posts alone for the 8 mm next to the boards, then the pegs', () => {
    const part = clip();
    const bar = 40 * 10 + Math.PI * 25; // two 10 mm discs and the band between their centres
    const wall = bar + 2 * POST - 2 * BAR_IN_POST + 4 * BLEND; // and a long blend each side where it meets a post (D270)
    expect(within(keep(part.slice(6)).area(), wall)).toBeLessThan(0.01);
    expect(within(keep(part.slice(16)).area(), 2 * POST)).toBeLessThan(0.01);
    expect(within(keep(part.slice(21)).area(), 2 * (PEG + RIBS))).toBeLessThan(0.005);
  });

  it('makes the pegs the slot the board cuts less the peg clearance, and chamfers their tips', () => {
    const loose = clip({ pegClearanceMm: 0.2 }); // pegs 5.0 x 15.0 mm
    expect(within(keep(loose.slice(21)).area(), 2 * (5 * 10 + Math.PI * 2.5 ** 2 + RIBS))).toBeLessThan(0.005);
    const tip = keep(clip().slice(24.99)).area(); // 0.4 mm in all round, near the top, the ribs gone
    expect(tip).toBeLessThan(2 * (4 * 10 + Math.PI * 2 ** 2) + 1);
    expect(tip).toBeGreaterThan(2 * (4 * 10 + Math.PI * 2 ** 2) - 2);
  });

  it("chamfers each peg's root 0.8 mm, so it is no sharp corner on a layer line (D266)", () => {
    const part = clip();
    // 0.4 mm above the post, the peg 0.4 mm wider all round, its ribs inside the chamfer
    const root = 2 * (5.6 * 10 + Math.PI * 2.8 ** 2);
    expect(within(keep(part.slice(20.4)).area(), root)).toBeLessThan(0.005);
    // past 0.8 mm, the peg and its ribs as before
    expect(within(keep(part.slice(20.85)).area(), 2 * (PEG + RIBS))).toBeLessThan(0.005);
  });

  it('follows the depth asked for', () => {
    const box = clip({ depthMm: 30 }).boundingBox();
    expect(box.max[2]).toBeCloseTo(35, 6); // 30 mm and the 5 mm pegs, flush with the board (D250 a)
  });
});

// Fitted behind the boards, its board face against their back faces at z = 0, the boards from z = 0 to 5.
const fitted = (part: Manifold, x: number, y: number, depth = 20, shift: [number, number] = [0, 0]) =>
  keep(part.translate([x + shift[0], y, -depth - 0.005 + shift[1]]));
const ROOM = 8; // the hook's 6 mm behind the board and the 2 mm margin (C99)
const [INSIDE, BEYOND] = [ROOM - 0.05, ROOM + 0.5];
const NOTHING = 1e-6; // mm3: an intersection empty but for the arithmetic's rounding
type Board = { columns: number; rows: number; sides: typeof ALL_OPEN };

/** The boards themselves, as the solid board builds them: 5 mm thick, each slot 5.2 x 15.2 mm, chamfered. */
const boards = (board: Board) => keep(makeSolidBoard(engine, solidBoardParams(board)));

/**
 * What of the clip is in the boards: nothing but the ribs, each pressing a little into a slot's long wall at one
 * of its three places (C199).
 */
function fitsTheSlots(placed: Manifold, board: Board, pegs: [number, number][]): boolean {
  const inside = keep(placed.intersect(boards(board)));
  const pieces = inside.decompose().map(keep);
  const atARib = (piece: Manifold) => {
    const { min, max } = piece.boundingBox();
    const [x, y] = [((min[0] ?? 0) + (max[0] ?? 0)) / 2, ((min[1] ?? 0) + (max[1] ?? 0)) / 2];
    return pegs.some(([px, py]) => {
      const [dx, dy] = [Math.abs(x - px), y - py];
      return dx > 2.4 && dx < 2.9 && [-4, 0, 4].some((k) => Math.abs(dy - k) < 0.5);
    });
  };
  // six ribs a peg, each about 0.035 mm2 into the slot's straight wall over its 3 mm (D250 a): about 0.63 mm3
  return pieces.length > 0 && pieces.every(atARib) && inside.volume() < 1 * pegs.length;
}

/** Whether the clip, fitted, leaves every slot but its own and every hook below them their room, 8 mm deep. */
function roomLeft(placed: Manifold, board: Board, pegs: [number, number][]) {
  const taken = (zone: Manifold) => keep(placed.intersect(zone)).volume();
  return {
    slots: taken(slotClearZone(engine, board, 2, INSIDE, keep, pegs)) < NOTHING,
    hooks: taken(hookRoomZone(engine, board, 2, INSIDE, keep, pegs)) < NOTHING,
    fitsTheSlots: fitsTheSlots(placed, board, pegs),
    // the control: the same check counting its own slots finds its posts there
    seenAtItsOwnSlots: taken(slotClearZone(engine, board, 2, INSIDE, keep)) > 0,
  };
}
const ROOM_LEFT = { slots: true, hooks: true, fitsTheSlots: true, seenAtItsOwnSlots: true };
const SIDE_BY_SIDE = { columns: 4, rows: 2, sides: ALL_OPEN }; // two 2 x 2 boards side by side, the seam at x = 80
const PEGS_SIDE_BY_SIDE: [number, number][] = [
  [60, 20],
  [100, 20],
];

describe('makeSlotClip, fitted at a seam (D187)', () => {
  it('side by side, at either row of whole slots, leaves every other slot and every hook its room', () => {
    for (const y of [20, 60]) {
      const pegs: [number, number][] = [
        [60, y],
        [100, y],
      ];
      expect(roomLeft(fitted(clip(), 80, y), SIDE_BY_SIDE, pegs)).toEqual(ROOM_LEFT);
      // the control for the room: deeper than 8 mm, the bar is behind the hook hanging in the seam's slot above
      const deeper = hookRoomZone(engine, SIDE_BY_SIDE, 2, BEYOND, keep, pegs);
      expect(keep(fitted(clip(), 80, y).intersect(deeper)).volume()).toBeGreaterThan(0);
    }
  });

  it('a peg 1 mm off its place is caught: the fit check sees more than the ribs in the board', () => {
    const off = fitted(clip(), 80, 20, 20, [1, 0]);
    expect(fitsTheSlots(off, SIDE_BY_SIDE, PEGS_SIDE_BY_SIDE)).toBe(false);
  });

  it('one above the other, its pegs one above the other, leaves them their room too (C191)', () => {
    const part = clip({ boards: '2-stacked' });
    expect(round(part.boundingBox().min)).toEqual([-10, -30, 0]);
    expect(round(part.boundingBox().max)).toEqual([10, 30, 25]);
    const board = { columns: 2, rows: 4, sides: ALL_OPEN }; // the seam at y = 80
    for (const x of [20, 60]) {
      const pegs: [number, number][] = [
        [x, 60],
        [x, 100],
      ];
      expect(roomLeft(fitted(part, x, 80), board, pegs)).toEqual(ROOM_LEFT);
    }
  });

  it('at a shallower gap, as deep as it is made, still leaves the room', () => {
    expect(roomLeft(fitted(clip({ depthMm: 12 }), 80, 20, 12), SIDE_BY_SIDE, PEGS_SIDE_BY_SIDE)).toEqual(ROOM_LEFT);
  });
});

describe('makeSlotClip, for 4 boards (D188)', () => {
  it('is a square ring through four posts on a 40 mm square, a peg on each', () => {
    const part = clip({ boards: '4' });
    const box = part.boundingBox();
    expect(round(box.min)).toEqual([-30, -30, 0]);
    expect(round(box.max)).toEqual([30, 30, 25]);
    expect(part.genus()).toBe(1);
    // the ring: a 50 mm square with its outer corners rounded to 5 mm, less the 30 mm square inside it
    const ring = 50 * 50 - (4 - Math.PI) * 25 - 30 * 30;
    // at each corner the ring is two 10 mm bands meeting, which cover 25 mm2 twice, and its rounded corner
    const ringInPost = 2 * halfBand(10, 10) - 25 + (Math.PI * 25) / 4;
    const wall = ring + 4 * POST - 4 * ringInPost + 16 * BLEND; // a long blend each side of each bar at each post (D270)
    expect(within(keep(part.slice(6)).area(), wall)).toBeLessThan(0.01);
    expect(within(keep(part.slice(16)).area(), 4 * POST)).toBeLessThan(0.01);
    expect(within(keep(part.slice(21)).area(), 4 * (PEG + RIBS))).toBeLessThan(0.005);
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

describe('the ribs (D194, C199)', () => {
  it('fitted, press into the slots only where they stand, and not at all with 0.3 mm more clearance', () => {
    expect(fitsTheSlots(fitted(clip(), 80, 20), SIDE_BY_SIDE, PEGS_SIDE_BY_SIDE)).toBe(true);
    // control: 0.3 mm more clearance takes the ribs 0.05 mm off the slot's wall, and nothing is in the board
    const eased = keep(fitted(clip({ pegClearanceMm: 0.7 }), 80, 20).intersect(boards(SIDE_BY_SIDE)));
    expect(eased.volume()).toBeLessThan(NOTHING);
  });
});

describe("the trial's grips (T268)", () => {
  /** The left peg's outline at a height: [minX, maxX]. */
  const peg = (part: Manifold, z: number) =>
    only(outlines(keep(part.slice(z))), ([minX, maxX]) => maxX < -15 && maxX - minX < 8);

  it("puts nubs on the ribbed pegs, wholly past the slot's straight wall, in its front chamfer", () => {
    const nubbed = clip({ nubMm: 0.45 });
    // 4.5 mm into the board, 0.5 mm into its front chamfer: the peg and two nubs a side, 0.45 mm proud
    const at = peg(nubbed, 24.5);
    expect(at[1] - at[0]).toBeCloseTo(4.8 + 2 * 0.45, 1);
    // at the chamfer's foot, 4 mm in, no nub yet: the peg and its ribs, as without them
    const foot = peg(nubbed, 24);
    expect(foot[1] - foot[0]).toBeCloseTo(4.8 + 2 * 0.3, 1);
    expect(degenerateFacets(meshOf(nubbed))).toBe(0);
  });

  it('splits each peg for the lip, the halves in a pocket, as before D261', () => {
    const lipped = clip({ grip: 'lip' });
    expect(keep(lipped.slice(22)).toPolygons()).toHaveLength(4); // two halves a peg
    expect(degenerateFacets(meshOf(lipped))).toBe(0);
  });

  it("makes a fill for the lip clip's slit, 1.2 mm thick, from the pocket's floor to the board's front", () => {
    const p = slotClipParams({ grip: 'lip', depthMm: 20 });
    const fill = keep(makeSlotFill(engine, p));
    const { min, max } = fill.boundingBox();
    expect(round([max[0] - min[0], max[1] - min[1], max[2] - min[2]])).toEqual([1.2, 14.8, 11]);
    expect(round([(min[0] + max[0]) / 2, min[2], max[2]])).toEqual([-20, 14, 25]);
    // in its slit it spreads the halves 0.1 mm each way: a little of it in the clip, all of it in the slot
    const spread = keep(fill.intersect(clip({ grip: 'lip' }))).volume();
    expect(spread).toBeGreaterThan(0.5);
    expect(spread).toBeLessThan(2 * 0.1 * 14.8 * 11);
    expect(keep(fitted(fill, 80, 20).intersect(boards(SIDE_BY_SIDE))).volume()).toBeLessThan(NOTHING);
    expect(degenerateFacets(meshOf(fill))).toBe(0);
  });

  it('refuses nubs on a split peg, and a fill for a clip without one', () => {
    expect(() => slotClipParams({ grip: 'lip', nubMm: 0.3 })).toThrow(RangeError);
    expect(() => slotClipParams({ nubMm: -0.1 })).toThrow(RangeError);
    expect(() => makeSlotFill(engine, slotClipParams({}))).toThrow(RangeError);
  });
});

describe('a screw through the clip (D195, C199)', () => {
  it('goes through the bar midway between the seam and the post, countersunk at its board face', () => {
    const part = clip({ fixing: 'screw' });
    expect(part.genus()).toBe(1);
    // at the wall, the 4.5 mm hole centred 5 mm right of the seam
    const hole = only(outlines(keep(part.slice(1))), ([minX, maxX]) => maxX - minX < 6);
    expect(round(hole)).toEqual(round([5 - 2.25, 5 + 2.25, -2.25, 2.25]));
    // at the bar's board face, 12 mm out, the countersink nearly 9 mm across
    const sink = only(outlines(keep(part.slice(11.9))), ([minX, maxX]) => maxX - minX < 10 && maxX - minX > 6);
    expect(sink[1] - sink[0]).toBeCloseTo(8.8, 1);
  });

  it('sinks a round head in a counterbore, its floor under the head, the head 8 x 3.2 mm for a 4 mm screw (D265)', () => {
    const part = clip({ fixing: 'screw', screwHead: 'round' });
    expect(part.genus()).toBe(1);
    // 1 mm under the bar's board face, 12 mm out: the counterbore, 8.5 mm across round the 8 mm head
    const bore = only(outlines(keep(part.slice(11))), ([minX, maxX]) => maxX - minX < 10 && maxX - minX > 6);
    expect(bore[1] - bore[0]).toBeCloseTo(8.5, 1);
    // 3.4 mm down, the head's height and 0.2 mm, its floor: the 4.5 mm hole again
    const floor = only(outlines(keep(part.slice(8.5))), ([minX, maxX]) => maxX - minX < 6);
    expect(floor[1] - floor[0]).toBeCloseTo(4.5, 1);
  });

  it('refuses a round head where the bar is too thin to sink it, or the bore too wide for its place', () => {
    // the hooks' 8 mm, the 3.4 mm bore and 2 mm of floor
    expect(() => slotClipParams({ fixing: 'screw', screwHead: 'round', depthMm: 13 })).toThrow(/13.4 mm/);
    expect(slotClipParams({ fixing: 'screw', screwHead: 'round', depthMm: 13.5 }).screwHead).toBe('round');
    // a 4.5 mm screw's bore is 9.5 mm across, the most the 10 mm between seam and post takes; 5 mm's is not
    expect(slotClipParams({ fixing: 'screw', screwHead: 'round', screwMm: 4.5 }).screwMm).toBe(4.5);
    expect(() => slotClipParams({ fixing: 'screw', screwHead: 'round', screwMm: 5 })).toThrow(/smaller screw/);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value the type would not allow
    expect(() => slotClipParams({ screwHead: 'hex' as SlotClipParams['screwHead'] })).toThrow(RangeError);
  });

  it("leaves the post beside it whole: the countersink stops at the bar's board face (the review, 16 Oct 2026)", () => {
    // 0.1 mm under the post's foot-to-room step, where the cone had gone on 1 mm past the bar and notched the post
    const at = (part: Manifold) => keep(part.slice(12.9)).area();
    expect(at(clip({ fixing: 'screw' }))).toBeCloseTo(at(clip()), 2);
  });

  it('goes above the seam for boards one above the other, and on the ring right of the seam for 4 boards', () => {
    const stacked = clip({ boards: '2-stacked', fixing: 'screw' });
    expect(stacked.genus()).toBe(1);
    const s = only(outlines(keep(stacked.slice(1))), ([minX, maxX]) => maxX - minX < 6);
    expect(round([(s[0] + s[1]) / 2, (s[2] + s[3]) / 2])).toEqual([0, 5]);
    const ring = clip({ boards: '4', fixing: 'screw' });
    expect(ring.genus()).toBe(2);
    const r = only(outlines(keep(ring.slice(1))), ([minX, maxX]) => maxX - minX < 6);
    expect(round([(r[0] + r[1]) / 2, (r[2] + r[3]) / 2])).toEqual([5, 20]);
  });

  it('leaves the hooks and the slots their room, its pad on the wall side', () => {
    expect(roomLeft(fitted(clip({ fixing: 'screw' }), 80, 20), SIDE_BY_SIDE, PEGS_SIDE_BY_SIDE)).toEqual(ROOM_LEFT);
  });
});

describe('a keyhole in the clip (D195, C199)', () => {
  it('opens in its wall face: the entry below, the slot up to where the screw rests, 1.5 mm of lips', () => {
    const part = clip({ fixing: 'keyhole' });
    expect(part.genus()).toBe(0); // a pocket from the wall face, not a hole through
    // in the lips, the 9 mm entry centred 4.5 mm below the middle, the 4.5 mm slot up to the screw 4.5 mm above it
    const opening = only(outlines(keep(part.slice(0.75))), ([minX, maxX]) => maxX - minX < 10);
    expect(round(opening)).toEqual(round([-4.5, 4.5, -9, 4.5 + 2.25]));
  });

  it("has the head's channel above the lips, as wide as the entry, from the entry up past the screw", () => {
    const channel = only(outlines(keep(clip({ fixing: 'keyhole' }).slice(3))), ([minX, maxX]) => maxX - minX < 10);
    expect(round(channel)).toEqual(round([-4.5, 4.5, -9, 9]));
    // control: the channel takes more from the pad than the lips' opening does, by about 44 mm2
    const part = clip({ fixing: 'keyhole' });
    expect(keep(part.slice(1.25)).area() - keep(part.slice(3)).area()).toBeGreaterThan(30); // above the chamfer (D270)
  });

  it("goes in the middle of the ring's top for 4 boards, and leaves the hooks and the slots their room", () => {
    const opening = only(
      outlines(keep(clip({ boards: '4', fixing: 'keyhole' }).slice(0.75))),
      ([minX, maxX, minY]) => maxX - minX < 10 && minY > 0,
    );
    expect(round(opening)).toEqual(round([-4.5, 4.5, 20 - 9, 20 + 6.75]));
    expect(roomLeft(fitted(clip({ fixing: 'keyhole' }), 80, 20), SIDE_BY_SIDE, PEGS_SIDE_BY_SIDE)).toEqual(ROOM_LEFT);
  });
});

describe('makeSlotClip exports', () => {
  it('with no degenerate facet, for each layout and fixing', () => {
    let checked = 0;
    for (const layout of ['2', '2-stacked', '4'] as const) {
      for (const fixing of ['none', 'screw', 'keyhole'] as const) {
        expect(degenerateFacets(meshOf(clip({ boards: layout, fixing })))).toBe(0);
        checked++;
      }
    }
    expect(checked).toBe(9);
    // and a round head in its counterbore, for each layout (D265)
    for (const layout of ['2', '2-stacked', '4'] as const) {
      expect(degenerateFacets(meshOf(clip({ boards: layout, fixing: 'screw', screwHead: 'round' })))).toBe(0);
    }
  });
});

describe("how the clip looks (D270; the connectors' design pass, finding 5)", () => {
  const holds = (part: Manifold, z: number, [x, y]: [number, number]) => {
    const dot = keep(engine.CrossSection.square([0.02, 0.02], true).translate([x, y]));
    return keep(keep(part.slice(z)).intersect(dot)).area() > 0;
  };
  const strip = keep(engine.CrossSection.square([2, 40], true));
  const barAcross = (part: Manifold, z: number) => keep(keep(part.slice(z)).intersect(strip)).area() / 2;

  it("chamfers its outside edges 1 mm at the wall, at the bar's face and at the board", () => {
    const part = clip();
    // a quarter of a millimetre up from the wall, the whole part 0.75 mm in all round: 58.5 mm long
    const wall = keep(part.slice(0.25)).bounds();
    expect(wall.max[0] - wall.min[0]).toBeCloseTo(58.5, 2);
    // the bar 8.5 mm across there, and under its face at 12 mm, and 10 mm between
    expect(barAcross(part, 0.25)).toBeCloseTo(8.5, 2);
    expect(barAcross(part, 11.75)).toBeCloseTo(8.5, 2);
    expect(barAcross(part, 6)).toBeCloseTo(10, 2);
    // each post 18.5 mm across a quarter of a millimetre under the board
    const posts = keep(part.slice(19.75))
      .toPolygons()
      .filter((ring) => ring.length > 40);
    expect(posts).toHaveLength(2);
    for (const ring of posts) {
      const xs = ring.map(([x]) => x);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(18.5, 1);
    }
    expect(degenerateFacets(meshOf(part))).toBe(0);
  });

  it("blends the bar into each post on a long curve, in plan, below the hooks' room", () => {
    const part = clip();
    // 12 mm from the right post's centre, the curve stands 5.19 mm out from the bar's middle
    expect(holds(part, 6, [8, 5.1])).toBe(true);
    expect(holds(part, 6, [8, 5.3])).toBe(false);
    expect(holds(part, 6, [-8, -5.1])).toBe(true);
    // not above the bar, in the hooks' room
    expect(holds(part, 13, [8, 5.1])).toBe(false);
  });

  it('blends the bars into the posts for 4 boards too, inside the ring and out', () => {
    const ring = clip({ boards: '4' });
    // the top bar, its inner edge at 15 mm: the blend 2 mm into the ring at 8 mm from the top right post
    expect(holds(ring, 6, [8, 14.9])).toBe(true);
    expect(holds(ring, 6, [8, 25.1])).toBe(true);
    expect(holds(ring, 6, [0, 14.9])).toBe(false); // the bar's middle, straight
    expect(degenerateFacets(meshOf(ring))).toBe(0);
  });
});

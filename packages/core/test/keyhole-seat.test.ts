// A keyhole's head seats on a 45 degree countersink, for a countersunk screw (D358), and where a hook's room runs out
// of its standoff its ceiling rises at 45 degrees to the standoff's face (D369): the keyhole printability pass's
// answers (23 Oct 2026; docs/research/2026-10-23-keyhole-printability.md). A board prints face down, its standoffs'
// wall faces up (D66), so flat lips are a ledge over the head's channel and a flat ceiling ends in a free edge where the
// room runs out of the standoff; both sagged in T151's print. Each claim is measured on the solid as it prints: the
// area of the faces that face down more steeply than 45 degrees, the gap between the room and the keyhole, and the
// depth the seat takes. Each control rebuilds what was there before from the built part, so the measure is shown to
// find it: the flat lips by cutting the old channel's prism, the flat ceiling by filling the ramp back in.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { latticeParams, makeLightenedBoard } from '../src/lightened.js';
import {
  bottomSlotPlaces,
  countersunkHead,
  hookRoomCutter,
  keyholePad,
  keyholePlaces,
  keyholeScrews,
  keyholeSeat,
  MIN_BEHIND_CHANNEL_MM,
  MIN_KEYHOLE_STANDOFF_MM,
  mountingCuts,
  mountingParams,
  type MountingParams,
  wallKeyholeCutter,
} from '../src/mounting.js';
import { printPose } from '../src/print-pose.js';
import { stadium } from '../src/rings.js';
import { makeSkeletonBoard, skeletonParams } from '../src/skeleton.js';
import { keyholeClipDepth, makeSlotClip, slotClipParams } from '../src/slot-clip.js';
import { ALL_OPEN } from '../src/slots.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets } from './facets.js';
import { hookRoomZone, slotClearZone } from './slot-zone.js';

const engine = await loadEngine();
const { CrossSection: Section, Manifold: Solid } = engine;
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

const T = 5; // the board's thickness
const H = 15; // the starting standoffs (D238)
const board = { columns: 2, rows: 2 } as const; // 80 x 80 mm: slots at x 20 and 60, y 20 and 60
const SCREWS = [3, 4, 5]; // the page's screw sizes run 3 to 5 mm
const KINDS = ['solid', 'lightened', 'skeleton'] as const;
/** The sweeps build up to a dozen boards each, lattice ones among them: a few seconds alone, more beside other work. */
const SLOW = 30_000;
/** The least standoff the seat takes: the seat, a roof behind it and the hook's room (D190). */
const least = (screwMm: number) => keyholeSeat(screwMm).depthMm + MIN_BEHIND_CHANNEL_MM + MIN_KEYHOLE_STANDOFF_MM;

/** A board of a kind on the mounting given, keyholes on the starting 15 mm standoffs unless given, as it hangs. */
const mounted = (given: Partial<MountingParams>, kind: (typeof KINDS)[number] = 'solid') => {
  const p = solidBoardParams({ ...board, sides: ALL_OPEN });
  const m = mountingParams({ screwHead: 'keyhole', standoffHeightMm: H, ...given });
  if (kind === 'lightened') return keep(makeLightenedBoard(engine, p, latticeParams({}), m));
  if (kind === 'skeleton') return keep(makeSkeletonBoard(engine, p, skeletonParams({}), m));
  return keep(makeSolidBoard(engine, p, mountingCuts(m, p)));
};

/** The area, mm2, of a printed part's faces that face down more steeply than 45 degrees, where `at` takes their
 * middles; the bed face is never one, nor a face at 45 degrees exactly. */
function steepDown(printed: Manifold, at: (x: number, y: number, z: number) => boolean): number {
  const { positions: p, triangles } = meshOf(printed);
  let area = 0;
  for (let t = 0; t < triangles.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => (triangles[t + k] ?? 0) * 3);
    const v = (i: number, d: number) => p[(i ?? 0) + d] ?? 0;
    const u = [0, 1, 2].map((d) => v(b ?? 0, d) - v(a ?? 0, d));
    const w = [0, 1, 2].map((d) => v(c ?? 0, d) - v(a ?? 0, d));
    const n = [
      (u[1] ?? 0) * (w[2] ?? 0) - (u[2] ?? 0) * (w[1] ?? 0),
      (u[2] ?? 0) * (w[0] ?? 0) - (u[0] ?? 0) * (w[2] ?? 0),
      (u[0] ?? 0) * (w[1] ?? 0) - (u[1] ?? 0) * (w[0] ?? 0),
    ];
    const length = Math.hypot(n[0] ?? 0, n[1] ?? 0, n[2] ?? 0);
    if (length === 0 || (n[2] ?? 0) / length > -0.7072) continue;
    const [x, y, z] = [0, 1, 2].map((d) => (v(a ?? 0, d) + v(b ?? 0, d) + v(c ?? 0, d)) / 3);
    if ((z ?? 0) > 0.01 && at(x ?? 0, y ?? 0, z ?? 0)) area += length / 2;
  }
  return area;
}
/** A board as it prints (D66): turned about y, so x runs from the far side (80 - x), y is as it hangs, z = 5 - z. */
const printed = (b: Manifold) => keep(printPose(b));

/** Over the top standoffs' keyholes as the board prints: above the room's ceiling, up to the wall face. */
const overHeads = (x: number, y: number, z: number) =>
  [20, 60].some((sx) => Math.abs(x - (80 - sx)) < 8) &&
  Math.abs(y - 60) < 14 &&
  z > T + MIN_KEYHOLE_STANDOFF_MM + 0.01 &&
  z < T + H - 0.01;
/** Where each of the four rooms runs out of its standoff, as the board prints: above the board, under the hook's back
 * tab, below where the ceiling starts to rise for this screw, 0.5 mm short of the keyhole's channel, which ends 2 x the
 * screw and 1 mm below the slot's middle; the ceiling before it is the room's, a bridge held all round. */
const atExits = (screwMm: number) => (x: number, y: number, z: number) =>
  [20, 60].some((sx) => Math.abs(x - (80 - sx)) < 4.3) &&
  [20, 60].some((sy) => y < sy - (2 * screwMm + 1) - 0.5 - 0.01 && y > sy - 20) &&
  z > T + 0.01;

/** Control: the keyholes' lips as they were until D358, from a built board: the old channel, a pan head's 0.8 x the
 * screw and 0.3 mm deep, cut as a prism from the lips' top; the seat lies inside that channel, so what is left is the
 * old flat ledge round the slot. */
function withFlatLips(part: Manifold, screwMm: number): Manifold {
  const entry = 2 * screwMm + 1;
  const prisms = keyholePlaces(board, screwMm).map(([x, y]) => {
    const section = keep(new Section([stadium(x, y, entry, 2 * entry)]));
    return keep(keep(section.extrude(0.8 * screwMm + 0.3)).translate([0, 0, -H + 1.5]));
  });
  return keep(part.subtract(keep(Solid.union(prisms))));
}

/** Control: the rooms' flat ceilings as they were until D369, from a built solid board on 4 mm keyholes: each
 * standoff filled back in under the hook's back tab, 4 mm on from the room's ceiling, below where the ramp starts. */
function withFlatCeilings(part: Manifold): Manifold {
  const fills = [...keyholePlaces(board), ...bottomSlotPlaces(board)].map(([x, y]) => {
    const pad = keep(keep(keep(new Section([keyholePad(4, [x, y])])).extrude(H - 8)).translate([0, 0, -H]));
    const box = keep(Solid.cube([8.5, 20 - 9.5, 4]).translate([x - 4.25, y - 20, -12]));
    return keep(pad.intersect(box));
  });
  return keep(part.add(keep(Solid.union(fills))));
}

describe("the keyhole's countersunk seat (D358)", () => {
  it("takes a 90 degree countersunk head, DIN 7991's: the lips, a 45 degree cone to the channel, the head and 0.3 mm", () => {
    // a 4 mm screw: a 4.5 mm slot, a 9 mm channel; the head 8 x 2.48 mm, its cone through the slot's edge at the lips
    expect(countersunkHead(4)).toEqual({ acrossMm: 8, tallMm: 0.62 * 4 });
    const s = keyholeSeat(4);
    expect(s.lipsMm).toBe(1.5);
    expect(s.coneMm).toBeCloseTo(2.25, 9); // from the 4.5 mm slot out to the 9 mm channel
    expect(s.headOutMm).toBeCloseTo(1.5 - 0.25 + 2.48, 9); // 3.73: its top out of the wall, seated
    expect(s.depthMm).toBeCloseTo(1.5 - 0.25 + 2.48 + 0.3, 9); // 4.03, where the flat lips' channel ended at 5
    // 3 and 5 mm: the head and its spare go past the cone too
    expect(keyholeSeat(3).depthMm).toBeCloseTo(1.5 - 0.25 + 1.86 + 0.3, 9);
    expect(keyholeSeat(5).depthMm).toBeCloseTo(1.5 - 0.25 + 3.1 + 0.3, 9);
  });

  it('control: the flat lips print a ledge about 2.25 mm wide round each slot, over 40 mm2 a keyhole', () => {
    expect(steepDown(printed(withFlatLips(mounted({}), 4)), overHeads)).toBeGreaterThan(2 * 40);
  });

  for (const kind of KINDS) {
    it(
      `prints nothing over the head steeper than 45 degrees, on the ${kind} board, every screw size`,
      () => {
        for (const screwMm of SCREWS) {
          const over = steepDown(printed(mounted({ screwMm }, kind)), overHeads);
          expect({ screwMm, over: Math.round(over * 100) / 100 }).toEqual({ screwMm, over: 0 });
        }
      },
      SLOW,
    );
  }

  it('widens at 45 degrees from the slot to the channel: 2.25 mm across over 2.25 mm of depth', () => {
    const foot = -H;
    const cutter = keep(wallKeyholeCutter(engine, [20, 60], 4, foot));
    // the slot's straight part, round the resting screw at 64.5: as wide as the slot through the lips' 1.5 mm, then
    // 2 x 1 mm wider 1 mm into the seat, and the channel's 9 mm once past it
    const band = keep(Section.square([40, 0.2]).translate([0, 61.9]));
    const across = (z: number) => {
      const { min, max } = keep(keep(cutter.slice(z)).intersect(band)).bounds();
      return max[0] - min[0];
    };
    expect(across(foot + 0.75)).toBeCloseTo(4.5, 2);
    expect(across(foot + 1.5 + 1)).toBeCloseTo(4.5 + 2, 2);
    expect(across(foot + 1.5 + 2.25 + 0.1)).toBeCloseTo(9, 2);
    // and ends 4.03 mm in, at the channel's floor
    expect(cutter.boundingBox().max[2]).toBeCloseTo(foot + 4.03, 6);
  });

  it('refuses standoffs too short for the seat, a roof behind it and the room: 13.23 mm for 4 mm, 13.85 for 5', () => {
    expect(least(4)).toBeCloseTo(13.23, 9);
    expect(() => mounted({ standoffHeightMm: 13.2 })).toThrow(/standoffs at least 13\.23 mm/);
    expect(mounted({ standoffHeightMm: 13.25 }).genus()).toBeGreaterThan(0);
    expect(least(5)).toBeCloseTo(13.85, 9);
    expect(() => mounted({ screwMm: 5, standoffHeightMm: 13.8 })).toThrow(/standoffs at least 13\.85 mm/);
    expect(mounted({ screwMm: 5, standoffHeightMm: 13.85 }).genus()).toBeGreaterThan(0);
  });

  it('tells the user to leave a countersunk screw standing with its head 3.73 to 4.03 mm out of the wall', () => {
    expect(keyholeScrews('Each keyhole', 4)).toBe(
      'Each keyhole hangs on a 4 mm countersunk screw (a 90 degree head) left standing out of the wall, the top of ' +
        'its head 3.73 to 4.03 mm out.',
    );
  });
});

describe("the hook room's ramp (D369)", () => {
  /** Every board a standoff behind a slot stands on: keyholes, with lock screws or without, and lock screws alone. */
  const MOUNTINGS: Partial<MountingParams>[] = [
    { screwHead: 'keyhole' },
    { screwHead: 'keyhole', lockScrews: true },
    { screwHead: 'lock' },
  ];

  it('control: the flat ceiling ends in an edge over the opening at all four standoffs', () => {
    expect(steepDown(printed(withFlatCeilings(mounted({}))), atExits(4))).toBeGreaterThan(4 * 5);
  });

  for (const kind of KINDS) {
    it(
      `leaves no face past 45 degrees where each of the four rooms runs out of its standoff, on the ${kind} board`,
      () => {
        for (const m of MOUNTINGS) {
          for (const screwMm of m.screwHead === 'lock' ? [4] : SCREWS) {
            const steep = steepDown(printed(mounted({ ...m, screwMm }, kind)), atExits(screwMm));
            expect({ ...m, screwMm, steep: Math.round(steep * 100) / 100 }).toEqual({ ...m, screwMm, steep: 0 });
          }
        }
      },
      SLOW,
    );
  }

  it('is cut at each of the four standoffs: the room reaches past its ceiling under the tab', () => {
    // a slab 0.9 to 1.1 mm past the ceiling, 4 mm across under the tab, 1.3 to 1.6 mm below where the ramp starts:
    // inside the standoff's rounded bottom end on the solid board and the lattice ones
    const slabs = (part: Manifold) =>
      [...keyholePlaces(board), ...bottomSlotPlaces(board)].map(([x, y]) => {
        const slab = keep(Solid.cube([4, 0.3, 0.2]).translate([x - 2, y - 9.5 - 1.6, -8 - 1.1]));
        return keep(part.intersect(slab)).volume();
      });
    // control: with the ceiling flat, the standoff fills each slab
    for (const v of slabs(withFlatCeilings(mounted({})))) expect(v).toBeCloseTo(4 * 0.3 * 0.2, 6);
    for (const kind of KINDS) {
      for (const v of slabs(mounted({}, kind))) expect(v).toBeLessThan(1e-6);
    }
  });

  it('keeps the 1.2 mm between the room and the keyhole at the least standoff, every screw size', () => {
    for (const screwMm of SCREWS) {
      const h = least(screwMm);
      const room = keep(hookRoomCutter(engine, [20, 60], { ...board, thicknessMm: T }, screwMm));
      const key = keep(wallKeyholeCutter(engine, [20, 60], screwMm, -h));
      expect(room.minGap(key, 5)).toBeGreaterThan(MIN_BEHIND_CHANNEL_MM - 1e-6);
      // control: half a millimetre shorter, the gap is too small, so minGap measures it
      const near = keep(wallKeyholeCutter(engine, [20, 60], screwMm, -h + 0.5));
      expect(room.minGap(near, 5)).toBeLessThan(MIN_BEHIND_CHANNEL_MM - 0.1);
    }
  });

  it(
    'leaves a hook its 8 mm behind every slot, and takes no more than a wedge under the tab from each standoff',
    () => {
      const zone = keep(
        slotClearZone(engine, { ...board, sides: ALL_OPEN }, 0, 7.99, keep).add(
          hookRoomZone(engine, { ...board, sides: ALL_OPEN }, 2, 7.99, keep),
        ),
      );
      for (const kind of KINDS) {
        for (const m of MOUNTINGS) expect(keep(mounted(m, kind).intersect(zone)).volume()).toBeLessThan(1e-6);
      }
      // the ramp takes a wedge, under 2.5 x 2.5 / 2 x 8.5 = 27 mm3 at each of the four standoffs
      const b = mounted({});
      const wedge = withFlatCeilings(b).volume() - b.volume();
      expect(wedge).toBeGreaterThan(4 * 2);
      expect(wedge).toBeLessThan(4 * 27);
    },
    SLOW,
  );
});

describe('the seat and the ramp build clean', () => {
  const MOUNTINGS: Partial<MountingParams>[] = [{}, { lockScrews: true }, { screwHead: 'lock' }, { screwMm: 5 }];
  for (const kind of KINDS) {
    it(
      `with no degenerate facet, on the ${kind} board, with lock screws or without, as built and as printed`,
      () => {
        for (const m of MOUNTINGS) {
          const part = mounted(m, kind);
          expect(part.decompose().length).toBe(1);
          expect(degenerateFacets(meshOf(part))).toBe(0);
          expect(degenerateFacets(meshOf(printed(part)))).toBe(0);
        }
      },
      SLOW,
    );
  }
});

describe("the slot clip's keyhole takes the same seat (D358)", () => {
  it("needs the hooks' room, the seat and a roof: 8 mm, 4.03 and 1.2, 13.23 mm for a 4 mm screw", () => {
    expect(keyholeClipDepth(4)).toBeCloseTo(8 + 4.03 + 1.2, 9);
    expect(() => slotClipParams({ fixing: 'keyhole', depthMm: 13.2 })).toThrow(/at least 13\.23 mm deep/);
    expect(slotClipParams({ fixing: 'keyhole', depthMm: 13.5 }).depthMm).toBe(13.5);
  });

  it("is cut with the boards' seat, so one screw holds a whole wall", () => {
    // the clip as built, its wall face at z 0, its keyhole's middle at the origin for 2 boards, the screw resting at
    // y 4.5: across the slot's straight part, 8 mm of the clip beside the screw, as much of it solid as the seat leaves
    const clip = keep(makeSlotClip(engine, slotClipParams({ fixing: 'keyhole', depthMm: H })));
    const band = keep(Section.square([8, 0.2]).translate([-4, 2.4]));
    const solid = (z: number) => keep(keep(clip.slice(z)).intersect(band)).area() / 0.2;
    expect(solid(0.75)).toBeCloseTo(8 - 4.5, 2); // through the lips, the 4.5 mm slot
    expect(solid(1.5 + 1)).toBeCloseTo(8 - 6.5, 2); // 1 mm into the seat, 2 x 1 mm wider
    expect(solid(4)).toBeCloseTo(0, 2); // past the seat, the 9 mm channel
  });

  it("prints wall face down with only the channel's roof facing down past 45 degrees (C199)", () => {
    // the channel's roof: a 9 mm stadium 18 mm long, 81 + pi x 4.5^2 mm2, bridged all round
    const roof = 81 + Math.PI * 4.5 ** 2;
    const clip = keep(makeSlotClip(engine, slotClipParams({ fixing: 'keyhole', depthMm: H })));
    const down = steepDown(clip, (x, y, z) => Math.abs(x) < 6.5 && Math.abs(y) < 11 && z < H - 8);
    expect(Math.abs(down - roof) / roof).toBeLessThan(0.01);
    expect(degenerateFacets(meshOf(clip))).toBe(0);
  });
});

// The lock screws at the screw size are the same countersunk screw as the keyholes' (D479; D370 a, "countersunk lock
// screws in a 45 degree seat, like the keyholes"): each head seats on a 45 degree countersink from the shank's hole out
// to the 8.5 mm its groove takes, so nothing over it faces down more steeply as the board prints face down, where a pan
// head's recess had a flat floor over air. A lock screw small enough that its pan head passes the slot, 2.5 mm or less,
// keeps the pan head's recess, as before.
describe('a lock screw whose head needs a groove seats on a 45 degree countersink (D479, D370 a)', () => {
  /** Round the bottom standoffs' lock screws as the board prints: past the room's ceiling, up to the wall face. */
  const overLocks = (x: number, y: number, z: number) =>
    [20, 60].some((sx) => Math.hypot(x - (80 - sx), y - 20) < 4.4) &&
    z > T + MIN_KEYHOLE_STANDOFF_MM + 0.01 &&
    z < T + H - 0.01;

  it("control: a 2.5 mm lock screw's pan head recess has its flat floor over air, round the shank", () => {
    // the floor between the 3 mm hole and the 5.4 mm recess: pi x (2.7^2 - 1.5^2) = 15.8 mm2 at each lock screw
    const pan = steepDown(printed(mounted({ lockScrews: true, lockScrewMm: 2.5 })), overLocks);
    expect(pan).toBeGreaterThan(2 * 15);
    expect(pan).toBeLessThan(2 * 16);
  });

  for (const kind of KINDS) {
    it(
      `leaves nothing over the head steeper than 45 degrees, on the ${kind} board, at every screw size, or alone`,
      () => {
        for (const m of [...SCREWS.map((screwMm) => ({ screwMm, lockScrews: true })), { screwHead: 'lock' as const }]) {
          const over = steepDown(printed(mounted(m, kind)), overLocks);
          expect({ ...m, over: Math.round(over * 100) / 100 }).toEqual({ ...m, over: 0 });
        }
      },
      SLOW,
    );
  }

  it("widens at 45 degrees from the shank's 4.5 mm hole to the 8.5 mm the head and its groove take", () => {
    // a 4 mm countersunk head, 2.48 mm tall, 0.25 mm of it in the hole, its top 0.3 mm short of the hook's 8 mm of
    // room: it bears 2.53 mm behind the room, where the countersink starts, and the countersink is 2 mm deep
    const b = mounted({ lockScrews: true });
    const floor = -8 - (0.62 * 4 - 0.25 + 0.3);
    const window = keep(Section.square([9.6, 9.6]).translate([20 - 4.8, 20 - 4.8]));
    const across = (z: number) =>
      2 * Math.sqrt((window.area() - keep(keep(b.slice(z)).intersect(window)).area()) / Math.PI);
    expect(across(floor - 0.5)).toBeCloseTo(4.5, 1);
    expect(across(floor + 0.5)).toBeCloseTo(5.5, 1);
    expect(across(floor + 1.5)).toBeCloseTo(7.5, 1);
    expect(across(floor + 2.3)).toBeCloseTo(8.5, 1);
    // the control: a 2.5 mm lock screw's pan head, its 5.4 mm recess flat from its 3 mm hole, 2.3 mm behind the room
    const pan = mounted({ lockScrews: true, lockScrewMm: 2.5 });
    const panAcross = (z: number) =>
      2 * Math.sqrt((window.area() - keep(keep(pan.slice(z)).intersect(window)).area()) / Math.PI);
    expect(panAcross(-8 - 2.3 - 0.25)).toBeCloseTo(3, 1);
    expect(panAcross(-8 - 2.3 + 0.25)).toBeCloseTo(5.4, 1);
  });

  it(
    'builds clean, with no degenerate facet, as built and as printed',
    () => {
      for (const kind of KINDS) {
        for (const m of [{ lockScrews: true }, { screwHead: 'lock' as const }, { lockScrews: true, screwMm: 5 }]) {
          const part = mounted(m, kind);
          expect(part.decompose().map(keep)).toHaveLength(1);
          expect(degenerateFacets(meshOf(part))).toBe(0);
          expect(degenerateFacets(meshOf(printed(part)))).toBe(0);
        }
      }
    },
    SLOW,
  );
});

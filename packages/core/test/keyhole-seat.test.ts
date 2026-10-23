// The keyhole printability pass (23 Oct 2026; docs/research/2026-10-23-keyhole-printability.md): prototypes, which
// the page does not offer, of how a keyhole seats its screw's head and how a standoff's hook room runs out of it. A
// board prints face down, its standoffs' wall faces up (D66), so the keyhole's flat lips are a ledge over the head's
// channel and the room's ceiling ends in a free edge where the room runs out of the standoff; both sagged in T151's
// print. Each claim is measured on the solid as it prints: the area of the faces that face down more steeply than
// 45 degrees, the gap between the room and the keyhole, and the depth each seat takes.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { latticeParams, makeLightenedBoard } from '../src/lightened.js';
import {
  hookRoomCutter,
  KEYHOLE_SEATS,
  keyholeSeat,
  type KeyholeSeat,
  MIN_BEHIND_CHANNEL_MM,
  MIN_KEYHOLE_STANDOFF_MM,
  mountingCuts,
  mountingParams,
  type MountingParams,
  ROOM_EXITS,
  type RoomExit,
  wallKeyholeCutter,
} from '../src/mounting.js';
import { printPose } from '../src/print-pose.js';
import { keyholeClipDepth, makeSlotClip, slotClipParams } from '../src/slot-clip.js';
import { ALL_OPEN, type Sides } from '../src/slots.js';
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

const T = 5; // the board's thickness
const board = { columns: 2, rows: 2 } as const; // 80 x 80 mm: slots at x 20 and 60, y 20 and 60
/** The least standoff a seat takes for a 4 mm screw: the seat, a roof behind it and the hook's room (D190). */
const least = (seat: KeyholeSeat) => keyholeSeat(4, seat).depthMm + MIN_BEHIND_CHANNEL_MM + MIN_KEYHOLE_STANDOFF_MM;
/** The standoff each seat is tried at: the starting 15 mm (D238), or the whole millimetre above its least. */
const tall = (seat: KeyholeSeat) => Math.max(15, Math.ceil(least(seat) - 1e-9));
const mounted = (given: Partial<MountingParams>, sides: Sides = ALL_OPEN) => {
  const p = solidBoardParams({ ...board, sides });
  const m = mountingParams({ screwHead: 'keyhole', standoffHeightMm: 15, ...given });
  return keep(makeSolidBoard(engine, p, mountingCuts(m, p)));
};

/** The area, mm2, of a printed part's faces that face down more steeply than 45 degrees, where `at` takes their
 * middles; the bed face is never one. */
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
/** A board as it prints (D66): turned about y, so x runs from the far side, y is as it hangs, z = 5 - z. */
const printed = (b: Manifold) => keep(printPose(b));

describe('keyhole seats (the printability pass; prototypes)', () => {
  it('take the depth their heads need: the lips, the seat, the head and 0.3 mm spare', () => {
    // a 4 mm screw: a 4.5 mm slot, a 9 mm channel; a pan head 8 x 3.2 mm, a 90 degree countersunk head 8 x 2.48 mm
    const depth = (seat: KeyholeSeat) => keyholeSeat(4, seat).depthMm;
    expect(depth('flat')).toBeCloseTo(5, 9); // today's: 1.5 mm of lips and a 3.5 mm channel
    expect(depth('countersunk')).toBeCloseTo(1.5 - 0.25 + 2.48 + 0.3, 9); // 4.03
    expect(depth('either')).toBeCloseTo(1.5 + 1.75 + 3.2 + 0.3, 9); // the pan head's rim on the cone, 4 mm out
    expect(depth('ledge')).toBeCloseTo(1.5 + 0.75 + 3.2 + 0.3, 9); // its rim on the cone past a 1 mm ledge
    // how far out of the wall each head's top stands, seated
    expect(keyholeSeat(4, 'flat').heads.pan?.outMm).toBeCloseTo(4.7, 9);
    expect(keyholeSeat(4, 'flat').heads.countersunk).toBeUndefined();
    expect(keyholeSeat(4, 'countersunk').heads.countersunk?.outMm).toBeCloseTo(3.73, 9);
    expect(keyholeSeat(4, 'countersunk').heads.pan).toBeUndefined();
    expect(keyholeSeat(4, 'either').heads.pan?.outMm).toBeCloseTo(6.45, 9);
    expect(keyholeSeat(4, 'either').heads.countersunk?.outMm).toBeCloseTo(3.73, 9);
    expect(keyholeSeat(4, 'ledge').heads.pan?.outMm).toBeCloseTo(5.45, 9);
    expect(keyholeSeat(4, 'ledge').heads.countersunk?.outMm).toBeCloseTo(3.73, 9);
  });

  it('flat, the starting seat, is the keyhole as built until now', () => {
    const today = mounted({});
    const flat = mounted({ keyholeSeat: 'flat', roomExit: 'flat' });
    expect(flat.volume()).toBeCloseTo(today.volume(), 6);
    expect(keep(today.subtract(flat)).volume()).toBeLessThan(1e-6);
  });

  it('print with no face over the head steeper than 45 degrees, but for the ledge one keeps', () => {
    // above the room's ceiling, 5 + 8 = 13 mm up as it prints, to the wall face: the keyholes, in the top standoffs
    const over = (seat: KeyholeSeat) => {
      const h = tall(seat);
      return steepDown(printed(mounted({ keyholeSeat: seat, standoffHeightMm: h })), (_x, _y, z) => {
        return z > T + MIN_KEYHOLE_STANDOFF_MM + 0.01 && z < T + h - 0.01;
      });
    };
    const flat = over('flat');
    // control: today's flat lips are a ledge round the slot, about 50 mm2 a keyhole
    expect(flat).toBeGreaterThan(2 * 40);
    expect(over('countersunk')).toBeLessThan(0.01);
    expect(over('either')).toBeLessThan(0.01);
    const ledge = over('ledge');
    expect(ledge).toBeGreaterThan(2 * 5);
    expect(ledge).toBeLessThan(flat / 2);
  });

  it('widen at 45 degrees from the slot to the channel: 2.25 mm across over 2.25 mm of depth', () => {
    const foot = -15;
    const cutter = keep(wallKeyholeCutter(engine, [20, 60], 4, foot, 'countersunk'));
    // the slot's straight part, round the resting screw at 64.5: as wide as the slot through the lips' 1.5 mm, then
    // 2 x 1 mm wider 1 mm into the seat, and the channel's 9 mm once past it
    const band = keep(engine.CrossSection.square([40, 0.2]).translate([0, 61.9]));
    const across = (z: number) => {
      const { min, max } = keep(keep(cutter.slice(z)).intersect(band)).bounds();
      return max[0] - min[0];
    };
    expect(across(foot + 0.75)).toBeCloseTo(4.5, 2);
    expect(across(foot + 1.5 + 1)).toBeCloseTo(4.5 + 2, 2);
    expect(across(foot + 1.5 + 2.25 + 0.1)).toBeCloseTo(9, 2);
  });

  it('refuse standoffs too short for the seat, its roof and the room', () => {
    expect(least('countersunk')).toBeCloseTo(13.23, 9);
    expect(() => mounted({ keyholeSeat: 'countersunk', standoffHeightMm: 13.2 })).toThrow(/at least 13\.23 mm/);
    expect(mounted({ keyholeSeat: 'countersunk', standoffHeightMm: 13.25 }).genus()).toBeGreaterThan(0);
    // either head needs more than the starting 15 mm
    expect(() => mounted({ keyholeSeat: 'either' })).toThrow(/at least 15\.95 mm/);
    expect(mounted({ keyholeSeat: 'either', standoffHeightMm: 16 }).genus()).toBeGreaterThan(0);
    expect(mounted({ keyholeSeat: 'ledge', standoffHeightMm: 14.95 }).genus()).toBeGreaterThan(0);
    expect(() => mountingParams({ keyholeSeat: 'round' as KeyholeSeat })).toThrow(/seat/);
  });
});

describe("the hook room's exit (the printability pass; prototypes)", () => {
  // the room runs out of each standoff's bottom face below its slot: slots at y 20 and 60, their bottom ends 7.6 mm
  // below; the ramp starts 0.5 mm below the keyhole's channel, which ends 9 mm below the slot's middle
  const exits = (x: number, y: number) =>
    [20, 60].some((sx) => Math.abs(x - (80 - sx)) < 4.3) && [20, 60].some((sy) => y < sy - 9.5 - 0.01 && y > sy - 20);

  it("ramp: no face past 45 degrees where the room runs out of the standoff, where flat leaves the ceiling's edge", () => {
    const steep = (roomExit: RoomExit) =>
      steepDown(printed(mounted({ keyholeSeat: 'countersunk', roomExit })), (x, y, z) => z > T + 0.01 && exits(x, y));
    // control: the flat ceiling runs on to the standoff's face over the opening, at all four standoffs
    expect(steep('flat')).toBeGreaterThan(4 * 5);
    expect(steep('ramp')).toBeLessThan(0.01);
  });

  it('ramp: keeps the 1.2 mm between the room and the keyhole at the least standoff, every seat', () => {
    for (const seat of KEYHOLE_SEATS) {
      const h = least(seat);
      const room = keep(hookRoomCutter(engine, [20, 60], { ...board, thicknessMm: T }, 'ramp'));
      const key = keep(wallKeyholeCutter(engine, [20, 60], 4, -h, seat));
      expect(room.minGap(key, 5)).toBeGreaterThan(MIN_BEHIND_CHANNEL_MM - 1e-6);
      // control: half a millimetre shorter, the gap is too small, so minGap measures it
      const near = keep(wallKeyholeCutter(engine, [20, 60], 4, -h + 0.5, seat));
      expect(room.minGap(near, 5)).toBeLessThan(MIN_BEHIND_CHANNEL_MM - 0.1);
    }
  });

  it("ramp: leaves a hook its 8 mm behind every slot, and takes nothing more than the room's from the standoff", () => {
    const b = mounted({ keyholeSeat: 'countersunk', roomExit: 'ramp' });
    const room = keep(
      slotClearZone(engine, { ...board, sides: ALL_OPEN }, 0, 7.99, keep).add(
        hookRoomZone(engine, { ...board, sides: ALL_OPEN }, 2, 7.99, keep),
      ),
    );
    expect(keep(b.intersect(room)).volume()).toBeLessThan(1e-6);
    // the ramp takes a wedge, under 2.5 x 2.5 / 2 x 8.5 = 27 mm3 at each of the four standoffs
    const flat = mounted({ keyholeSeat: 'countersunk', roomExit: 'flat' });
    const wedge = flat.volume() - b.volume();
    expect(wedge).toBeGreaterThan(4 * 2);
    expect(wedge).toBeLessThan(4 * 27);
  });
});

describe('every seat and exit builds clean (the printability pass; prototypes)', () => {
  it('with no degenerate facet, on the solid board and the lightened one, as built and as printed', () => {
    for (const seat of KEYHOLE_SEATS) {
      for (const roomExit of ROOM_EXITS) {
        const m = { screwHead: 'keyhole', standoffHeightMm: tall(seat), keyholeSeat: seat, roomExit } as const;
        const solid = mounted(m);
        expect(degenerateFacets(meshOf(solid))).toBe(0);
        expect(degenerateFacets(meshOf(printed(solid)))).toBe(0);
        const p = solidBoardParams({ ...board, sides: ALL_OPEN });
        const light = keep(makeLightenedBoard(engine, p, latticeParams({}), mountingParams(m)));
        expect(light.decompose().length).toBe(1);
        expect(degenerateFacets(meshOf(light))).toBe(0);
        expect(degenerateFacets(meshOf(printed(light)))).toBe(0);
      }
    }
  });
});

describe("the slot clip's keyhole, with each seat (the printability pass; prototypes)", () => {
  it('needs the hooks room, the seat and a roof: 8 mm, the seat, 1.2 mm', () => {
    for (const seat of KEYHOLE_SEATS) {
      expect(keyholeClipDepth(4, seat)).toBeCloseTo(8 + keyholeSeat(4, seat).depthMm + 1.2, 9);
    }
    expect(keyholeClipDepth(4)).toBeCloseTo(14.2, 9);
  });

  it("prints wall face down with only the channel's roof facing down past 45 degrees, every seat (C199)", () => {
    // the channel's roof: a 9 mm stadium 18 mm long, 81 + pi x 4.5^2 mm2, bridged all round
    const roof = 81 + Math.PI * 4.5 ** 2;
    for (const seat of KEYHOLE_SEATS) {
      const p = slotClipParams({ fixing: 'keyhole', keyholeSeat: seat, depthMm: tall(seat) });
      const clip = keep(makeSlotClip(engine, p));
      const down = steepDown(clip, (x, y, z) => Math.abs(x) < 6.5 && Math.abs(y) < 11 && z < tall(seat) - 8);
      expect(Math.abs(down - roof) / roof).toBeLessThan(0.01);
      expect(degenerateFacets(meshOf(clip))).toBe(0);
    }
  });
});

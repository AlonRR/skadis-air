// The rounded roots (D375): where a standoff meets a board's back, and where the slot clip's posts meet its bar, the
// part runs out onto the face on a long eased curve, not a sharp inner edge, which the physics tests found the weakest
// place on every board on standoffs. Each claim is measured on the solid, in slices just off the face and past the
// root, and on the part as it prints, against figures worked out here by hand: a parabola tangent to the post's side
// 3 mm up it and to a plane 0.05 mm inside the face, 1.5 mm out at its foot, so 0.02 mm off the face it is out
// (1 - sqrt(0.07 / 3.05))^2 = 0.72 of its reach, 1.08 mm. It is drawn in rings, nine down the curve, and between two
// the part runs straight from one to the next, so up to CHORD_MM past the curve.
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams, type SolidBoardParams } from '../src/board-solid.js';
import { LIGHTENED, SKELETON, SOLID } from '../src/board-types/index.js';
import { EDGE_CHAMFER_MM } from '../src/chamfer.js';
import { loadEngine } from '../src/engine.js';
import {
  bottomSlotPlaces,
  keyholePlaces,
  mountingCuts,
  mountingParams,
  type MountingParams,
  screwHole,
  screwPlaces,
} from '../src/mounting.js';
import { printPose } from '../src/print-pose.js';
import { stadium } from '../src/rings.js';
import { defaultValues, SettingsProblem } from '../src/settings.js';
import { HOOK_DROP_MM, HOOK_WIDTH_MM } from '../src/skadis.js';
import { makeSlotClip, slotClipParams, type SlotClipParams } from '../src/slot-clip.js';
import { ALL_OPEN, type Seams, type Sides } from '../src/slots.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets, edgesNotOnTwoFacets } from './facets.js';

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

const CLOSED: Sides = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
type Given = Partial<SolidBoardParams> & Pick<SolidBoardParams, 'columns' | 'rows'>;
const mounted = (given: Given, mounting: Partial<MountingParams>) => {
  const p = solidBoardParams(given);
  return keep(makeSolidBoard(engine, p, mountingCuts(mountingParams(mounting), p)));
};

/** The design's root, by hand: how far it runs out at most, how far up the post it starts, and how far out it is
 * 0.02 mm off the face, as a share of its reach. */
const REACH_MM = 1.5;
const RISE_MM = 3;
const OFF_FACE = (1 - Math.sqrt(0.07 / 3.05)) ** 2;
/** How far the part runs past the curve between two of its rings, at most, mm: 0.02 by hand, near the foot. */
const CHORD_MM = 0.03;

/** The section of a solid within `half` of (x, y), as a slice at z gives it. */
function near(solid: Manifold, z: number, [x, y]: readonly [number, number], half: number): CrossSection {
  const box = keep(keep(engine.CrossSection.square([2 * half, 2 * half], true)).translate([x, y]));
  return keep(keep(solid.slice(z)).intersect(box));
}

/** How far a section's outline reaches from (x, y) at its farthest, in each of 36 ten-degree bins round it; its edges
 * walked every 0.05 mm, so no bin falls between two of its points. */
function reachRound(section: CrossSection, [cx, cy]: readonly [number, number]): number[] {
  const most = Array.from({ length: 36 }, () => 0);
  for (const ring of section.toPolygons()) {
    ring.forEach((a, i) => {
      const b: Vec2 = ring[(i + 1) % ring.length] ?? a;
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05));
      for (let k = 0; k < n; k++) {
        const [x, y] = [a[0] + ((b[0] - a[0]) * k) / n - cx, a[1] + ((b[1] - a[1]) * k) / n - cy];
        const bin = Math.floor(((Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 18)) % 36;
        most[bin] = Math.max(most[bin] ?? 0, Math.hypot(x, y));
      }
    });
  }
  return most;
}

/** How many triangles of a solid face down more steeply than 45 degrees, their middles between z0 and z1. */
function facingDown(solid: Manifold, z0: number, z1: number): number {
  const mesh = meshOf(solid);
  const corner = (t: number, k: number): [number, number, number] => {
    const v = (mesh.triangles[t * 3 + k] ?? 0) * 3;
    return [mesh.positions[v] ?? 0, mesh.positions[v + 1] ?? 0, mesh.positions[v + 2] ?? 0];
  };
  let count = 0;
  for (let t = 0; t < mesh.triangles.length / 3; t++) {
    const [a, b, c] = [corner(t, 0), corner(t, 1), corner(t, 2)];
    const [u, w] = [b.map((q, d) => q - (a[d] ?? 0)), c.map((q, d) => q - (a[d] ?? 0))];
    const [ux, uy, uz] = [u[0] ?? 0, u[1] ?? 0, u[2] ?? 0];
    const [wx, wy, wz] = [w[0] ?? 0, w[1] ?? 0, w[2] ?? 0];
    const normal = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
    const length = Math.hypot(...normal);
    const middle = (a[2] + b[2] + c[2]) / 3;
    if (length > 1e-9 && middle > z0 && middle < z1 && (normal[2] ?? 0) / length < -Math.SQRT1_2 - 1e-6) count++;
  }
  return count;
}

const share = (bins: number[], least: number) => bins.filter((r) => r >= least).length / bins.length;

describe("each round standoff's root on the board's back (D375)", () => {
  it('runs out over the back on a curve from 3 mm up the post, at every corner and screw size', () => {
    for (const screwMm of [3, 4, 5]) {
      const board = mounted({ columns: 2, rows: 2, sides: CLOSED }, { screwMm, standoffHeightMm: 15 });
      const r = screwHole(screwMm).standoffDiameterMm / 2;
      for (const place of screwPlaces({ columns: 2, rows: 2, sides: CLOSED })) {
        const where = `${screwMm} mm screw at ${place.join(', ')}`;
        const at = (z: number) => reachRound(near(board, z, place, r + 3), place);
        // past the root, the post as it was: 64 points round, so between r cos(pi / 64) and r
        for (const reach of at(-RISE_MM - 0.2)) {
          expect(reach, where).toBeGreaterThan(r * Math.cos(Math.PI / 64) - 0.01);
          expect(reach, where).toBeLessThan(r + 0.01);
        }
        // just off the face, most of the way round 1.08 mm out, where no slot or hook comes near; nowhere past 1.5 mm
        const foot = at(-0.02);
        expect(share(foot, r + REACH_MM * OFF_FACE - 0.05), where).toBeGreaterThanOrEqual(0.5);
        expect(Math.max(...foot), where).toBeLessThan(r + REACH_MM * OFF_FACE + CHORD_MM);
        // halfway up the root, between the two, the curve easing in toward the post
        const middle = at(-RISE_MM / 2);
        foot.forEach((out, i) => {
          expect(middle[i] ?? 0, where).toBeLessThanOrEqual(out + 0.01);
        });
        // 1.5 mm up, (1 - sqrt(1.55 / 3.05))^2 = 0.082 of the reach out, 0.12 mm
        expect(Math.abs(Math.max(...middle) - r - 0.082 * REACH_MM), where).toBeLessThan(CHORD_MM);
      }
    }
  });

  it('on a short standoff, a shorter root, and its foot chamfered as before', () => {
    // 3 mm: 1 mm of chamfer at the wall, 0.5 mm plain above it, so a root 1.5 mm up and 0.75 mm out
    const board = mounted({ columns: 2, rows: 2, sides: CLOSED }, { standoffHeightMm: 3 });
    const place = screwPlaces({ columns: 2, rows: 2, sides: CLOSED })[0] ?? [10, 10];
    const foot = reachRound(near(board, -0.02, place, 8), place);
    const out = (1 - Math.sqrt(0.07 / 1.55)) ** 2 * 0.75;
    expect(share(foot, 5 + out - 0.05)).toBeGreaterThanOrEqual(0.5);
    expect(Math.max(...foot)).toBeLessThan(5 + out + CHORD_MM);
    for (const reach of reachRound(near(board, -1.6, place, 8), place)) expect(reach).toBeLessThan(5.01);
    for (const reach of reachRound(near(board, -3 + 0.25, place, 8), place)) expect(reach).toBeLessThan(4.26);
  });

  it('as the board prints face down, faces up all the way: nothing over air', () => {
    for (const screwMm of [3, 4, 5]) {
      const board = keep(printPose(mounted({ columns: 2, rows: 2, sides: CLOSED }, { screwMm, standoffHeightMm: 15 })));
      // the back is 5 mm up as it prints; the roots run from there to 3 mm up the posts
      expect(facingDown(board, 5.001, 5 + RISE_MM + 0.1), `${screwMm} mm screw`).toBe(0);
    }
    // the control: on keyholes, the ceiling of a hook's room, 8 mm behind the back, faces straight down as it prints
    const keyholes = keep(
      printPose(mounted({ columns: 2, rows: 2, sides: CLOSED }, { screwHead: 'keyhole', standoffHeightMm: 15 })),
    );
    expect(facingDown(keyholes, 5 + 8 - 0.1, 5 + 8 + 0.1)).toBeGreaterThan(0);
  });
});

/** The room a hook takes behind the slot at (x, y), as hookRoomOutline cuts it from a standoff behind a slot: the slot
 * at the starting clearance, 5.2 x 15.2 mm, grown by its 1 mm chamfer and 1.5 mm more, and below it the back tab's
 * room, its 4.5 mm width and 8.25 mm drop each with C99's 2 mm, from 1 mm up the slot's bottom end. */
function hookRoom([x, y]: readonly [number, number], grow = 0): CrossSection {
  const bottom = y - 15.2 / 2;
  const [half, drop] = [HOOK_WIDTH_MM / 2 + 2 + grow, HOOK_DROP_MM + 2 + grow];
  const tab: Vec2[] = [
    [x - half, bottom - drop],
    [x + half, bottom - drop],
    [x + half, bottom + 1],
    [x - half, bottom + 1],
  ];
  return keep(new engine.CrossSection([stadium(x, y, 5.2, 15.2, 2.5 + grow), tab], 'NonZero'));
}

describe("each standoff behind a slot, its root on the solid board's back (D375)", () => {
  const board = { columns: 2, rows: 2, sides: CLOSED };
  const places = [...keyholePlaces(board), ...bottomSlotPlaces(board)];
  /** What a section near a standoff gains at z0 over its section at z1, outside the hook's room, which has a root of
   * its own (D411), mm2. */
  const outside = (solid: Manifold, z: number, place: readonly [number, number]) =>
    keep(near(solid, z, place, 16).subtract(hookRoom(place))).area();
  const gained = (solid: Manifold, place: readonly [number, number], [z0, z1]: [number, number]) =>
    outside(solid, z0, place) - outside(solid, z1, place);

  for (const mounting of [
    { screwHead: 'keyhole', lockScrews: false },
    { screwHead: 'keyhole', lockScrews: true },
    { screwHead: 'lock', lockScrews: false },
  ] as const) {
    it(`runs out over the back round each, with ${mounting.screwHead}s${mounting.lockScrews ? ' and lock screws' : ''}`, () => {
      const solid = mounted(board, { ...mounting, standoffHeightMm: 15 });
      for (const place of places) {
        const where = `${mounting.screwHead} at ${place.join(', ')}`;
        // a 15 x 24 mm standoff, 65 mm round: its sides and top arc, 42 mm of it, clear of the hook's room below its
        // slot, at 1.08 mm out, 45 mm2; the root keeps 3 mm past the room, so somewhat less
        expect(gained(solid, place, [-0.02, -RISE_MM - 0.2]), where).toBeGreaterThan(25);
        expect(gained(solid, place, [-0.02, -RISE_MM - 0.2]), where).toBeLessThan(65 * REACH_MM * OFF_FACE);
        // and nothing past it: the standoff the same from 3.2 mm up to the hook's room
        expect(Math.abs(gained(solid, place, [-RISE_MM - 0.2, -6])), where).toBeLessThan(0.01);
      }
    });
  }
});

describe('on a lattice board (D375, D306)', () => {
  /** A lattice board 120 mm square on 15 mm standoffs, closed all round, or open between the slots. */
  const common = (seams: Seams) => ({
    widthMm: 120,
    heightMm: 120,
    sides: seams === 'between' ? ALL_OPEN : CLOSED, // between the slots, the open sides run between them
    seams,
    standoffs: 'back' as const,
    standoffHeightMm: 15,
  });

  it('runs out from each round standoff over its pad, which nothing is cut from (D144)', () => {
    for (const type of [LIGHTENED, SKELETON]) {
      const board = keep(type.build(engine, { ...defaultValues(type.settings), ...common('through') }));
      for (const place of screwPlaces({ columns: 3, rows: 3, sides: CLOSED })) {
        const where = `${type.id} at ${place.join(', ')}`;
        // the pad 13 mm across round a 10 mm standoff, so the root 1.5 mm less its 0.25 mm margin out
        const foot = reachRound(near(board, -0.02, place, 8), place);
        expect(share(foot, 5 + 1.25 * OFF_FACE - 0.05), where).toBeGreaterThanOrEqual(0.5);
        expect(Math.max(...foot), where).toBeLessThan(5 + 1.25 * OFF_FACE + CHORD_MM);
      }
    }
  });

  it('runs out from each standoff behind a slot where a web meets the frame round its slot, which it fills (D306)', () => {
    const grid = { columns: 3, rows: 3, sides: CLOSED };
    for (const type of [LIGHTENED, SKELETON]) {
      for (const given of [{ screwHead: 'keyhole' }, { screwHead: 'lock' }] as const) {
        const board = keep(type.build(engine, { ...defaultValues(type.settings), ...common('through'), ...given }));
        for (const place of [...keyholePlaces(grid), ...bottomSlotPlaces(grid)]) {
          const where = `${type.id} ${given.screwHead} at ${place.join(', ')}`;
          // four 3 mm webs meet each frame on the diagonals, the two below only in part clear of the hook's room: on
          // the two above alone, eased in from the pockets either side, 0.7 mm out over 3 mm of each, 4 mm2
          const gained = near(board, -0.02, place, 16).area() - near(board, -RISE_MM - 0.2, place, 16).area();
          expect(gained, where).toBeGreaterThan(2);
        }
      }
    }
  });

  it('never runs out over a pocket: behind the back and in its first 0.3 mm, nothing the members do not have', () => {
    for (const type of [LIGHTENED, SKELETON]) {
      for (const seams of ['through', 'between'] as const) {
        for (const given of [
          { screwHead: 'countersunk' },
          { screwHead: 'keyhole', lockScrews: 'bottom' },
          { screwHead: 'lock' },
        ] as const) {
          const where = `${type.id} ${seams} ${given.screwHead}`;
          const board = keep(type.build(engine, { ...defaultValues(type.settings), ...common(seams), ...given }));
          // the members 0.5 mm into the back: on the skeleton still their full width (its flange is 0.6 mm), and past
          // the 0.45 mm into which what stands on the back is kept whole, as a slice nearer the back is not
          const members = keep(board.slice(0.5));
          for (const z of [-1.5, -0.02, 0.1, 0.25]) {
            const section = keep(board.slice(z));
            expect(keep(section.subtract(members)).area(), `${where} at ${z} mm`).toBeLessThan(0.01);
            // the control: grown 0.5 mm, what is there runs over a pocket, and the check sees it
            expect(keep(keep(section.offset(0.5, 'Round')).subtract(members)).area(), where).toBeGreaterThan(1);
          }
        }
      }
    }
  });
});

describe("the slot clip's posts, their roots on its bar (D375)", () => {
  const clip = (given: Partial<SlotClipParams>) => keep(makeSlotClip(engine, slotClipParams(given)));
  /** The posts' centres: each a 20 mm disc in the slice 4 mm above the bar, past its root. */
  const posts = (part: Manifold, bar: number) =>
    keep(part.slice(bar + 4))
      .toPolygons()
      .map((ring): [number, number] => {
        const [xs, ys] = [ring.map((q) => q[0]), ring.map((q) => q[1])];
        return [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
      });

  for (const [boards, seams] of [
    ['2', 'through'],
    ['2-stacked', 'through'],
    ['4', 'through'],
    ['2', 'between'],
  ] as const) {
    for (const fixing of ['none', 'screw', 'keyhole'] as const) {
      it(`runs out over the bar round each post, for ${boards} boards ${seams} the slots, fixed by ${fixing}`, () => {
        for (const depthMm of [15, 20]) {
          const part = clip({ boards, seams, fixing, depthMm });
          const bar = depthMm - 8; // the bar's face, the hooks' 8 mm in front of it
          const centres = posts(part, bar);
          expect(centres).toHaveLength(boards === '4' ? 4 : 2);
          for (const c of centres) {
            const where = `${depthMm} mm deep, the post at ${c.map((v) => Math.round(v)).join(', ')}`;
            const gained = (z0: number, z1: number) => near(part, z0, c, 13).area() - near(part, z1, c, 13).area();
            // where the bar runs on past the post: at least 8 mm of its round across the bar's face, inside its
            // chamfer, 1.08 mm out; a screw's countersink beside one post leaves it less
            expect(gained(bar + 0.02, bar + RISE_MM + 0.2), where).toBeGreaterThan(fixing === 'screw' ? 3 : 6);
            // and nothing past the root: the post alone from 3.2 mm up to the boards
            expect(Math.abs(gained(bar + RISE_MM + 0.2, depthMm - 2)), where).toBeLessThan(0.01);
          }
        }
      });
    }
  }

  it('exports closed, each edge on two facets, where a keyhole pad leaves a post at a few degrees between the slots', () => {
    let checked = 0;
    for (const boards of ['2', '2-stacked'] as const) {
      for (const fixing of ['none', 'screw', 'keyhole'] as const) {
        for (const screwMm of [3, 4, 5]) {
          for (const depthMm of [15, 20, 30]) {
            const given = { boards, seams: 'between', fixing, screwMm, depthMm } as const;
            expect(edgesNotOnTwoFacets(meshOf(clip(given))), JSON.stringify(given)).toBe(0);
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(54);
    // the control: a facet given twice puts each of its three edges on three facets
    const mesh = meshOf(clip({ fixing: 'none' }));
    const twice = { ...mesh, triangles: Uint32Array.from([...mesh.triangles, ...mesh.triangles.slice(0, 3)]) };
    expect(edgesNotOnTwoFacets(twice)).toBe(3);
  });

  it('as it prints, wall face down, faces up all the way: nothing over air', () => {
    for (const fixing of ['none', 'screw', 'keyhole'] as const) {
      expect(facingDown(clip({ fixing, depthMm: 15 }), 7.001, 7 + RISE_MM + 0.1), fixing).toBe(0);
    }
    // the control: a keyhole's channel ends on a ceiling 4.03 mm up from the wall face, which faces down
    expect(facingDown(clip({ fixing: 'keyhole', depthMm: 15 }), 3.9, 4.2)).toBeGreaterThan(0);
  });
});

describe("the slot clip's posts, their roots on over the bar's side chamfer (D409)", () => {
  const clip = (given: Partial<SlotClipParams>) => keep(makeSlotClip(engine, slotClipParams(given)));
  /** Each outline's middle in a section, as [x, y]. */
  const middles = (section: CrossSection) =>
    section.toPolygons().map((ring): [number, number] => {
      const [xs, ys] = [ring.map((q) => q[0]), ring.map((q) => q[1])];
      return [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
    });
  /** The clip's bar and posts as they would be with no root: its footprint, in the slice 2 mm below the bar's face,
   * below every post's root and above the bar's foot chamfer and a keyhole's channel; and the posts, 4 mm above it. */
  function parts(part: Manifold, bar: number) {
    const footprint = keep(part.slice(bar - 2));
    const posts = keep(part.slice(bar + 4));
    /** At `below` under the bar's face, what the slice holds past the bar's 45 degree chamfer and the posts. */
    const overChamfer = (below: number) =>
      keep(
        keep(part.slice(bar - below)).subtract(
          keep(keep(footprint.offset(-(EDGE_CHAMFER_MM - below), 'Miter', 10)).add(posts)),
        ),
      );
    /** At height z, what the slice holds past the bar's outline and the posts. */
    const pastOutline = (z: number) => keep(keep(part.slice(z)).subtract(keep(footprint.add(posts)))).area();
    return { posts, overChamfer, pastOutline };
  }
  /** The pieces of a section, each its area and its middle. */
  const pieces = (section: CrossSection) =>
    section.decompose().map((piece) => {
      keep(piece);
      const b = piece.bounds();
      return { area: piece.area(), at: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2] as [number, number] };
    });

  for (const [boards, seams] of [
    ['2', 'through'],
    ['2-stacked', 'through'],
    ['4', 'through'],
    ['2', 'between'],
  ] as const) {
    for (const fixing of ['none', 'screw', 'keyhole'] as const) {
      it(`runs on over the chamfer beside each post, inside the bar, for ${boards} boards ${seams} the slots, fixed by ${fixing}`, () => {
        for (const depthMm of [15, 20]) {
          const part = clip({ boards, seams, fixing, depthMm });
          const bar = depthMm - 8;
          const { posts, overChamfer, pastOutline } = parts(part, bar);
          const centres = middles(posts);
          expect(centres).toHaveLength(boards === '4' ? 4 : 2);
          // a quarter of a millimetre under the face, where before it the bar's chamfer met each post on a sharp edge,
          // the root stands out over the chamfer beside each post: 0.3 mm2 where the bar's side meets a post
          const found = pieces(overChamfer(0.25)).filter((q) => q.area > 0.01);
          for (const c of centres) {
            const where = `${depthMm} mm deep, the post at ${c.map((v) => Math.round(v)).join(', ')}`;
            const beside = found.filter((q) => Math.hypot(q.at[0] - c[0], q.at[1] - c[1]) < 18);
            expect(
              beside.reduce((sum, q) => sum + q.area, 0),
              where,
            ).toBeGreaterThan(0.15);
          }
          // and nowhere else: the bar keeps its chamfer away from the posts
          const far = found.filter((q) => centres.every((c) => Math.hypot(q.at[0] - c[0], q.at[1] - c[1]) >= 18));
          expect(
            far.reduce((sum, q) => sum + q.area, 0),
            `${depthMm} mm deep, away from the posts`,
          ).toBeLessThan(0.01);
          // never past the bar's outline, from its chamfer's foot to the top of the root
          for (const z of [bar - 0.9, bar - 0.5, bar - 0.25, bar - 0.02, bar + 0.02, bar + 1, bar + RISE_MM - 0.2]) {
            expect(pastOutline(z), `${depthMm} mm deep, at ${z} mm`).toBeLessThan(0.001);
          }
        }
      });
    }
  }

  it('meets the bar on both sides of each post, for 2 boards side by side, and leaves the chamfer whole between', () => {
    const part = clip({ fixing: 'none', depthMm: 15 });
    const { overChamfer } = parts(part, 7);
    const found = pieces(overChamfer(0.25)).filter((q) => q.area > 0.01);
    // the bar's two sides meet each post where its blend leaves the post's round, 8 mm out from the bar's middle
    for (const [x, y] of [
      [-20, -1],
      [-20, 1],
      [20, -1],
      [20, 1],
    ] as const) {
      const side = found.filter((q) => Math.sign(q.at[0]) === Math.sign(x) && Math.sign(q.at[1]) === Math.sign(y));
      expect(
        side.reduce((sum, q) => sum + q.area, 0),
        `the post at ${x}, the bar's ${y > 0 ? 'top' : 'bottom'} side`,
      ).toBeGreaterThan(0.2);
    }
    // halfway between the posts, the slice is the bar's chamfered outline, neither more nor less
    const window = keep(engine.CrossSection.square([12, 30], true));
    const section = keep(keep(part.slice(7 - 0.5)).intersect(window));
    const chamfered = keep(keep(keep(part.slice(5)).offset(-0.5, 'Miter', 10)).intersect(window));
    expect(keep(section.subtract(chamfered)).area()).toBeLessThan(0.01);
    expect(keep(chamfered.subtract(section)).area()).toBeLessThan(0.01);
    expect(section.area()).toBeGreaterThan(12 * 9 - 0.1); // the 10 mm bar less its chamfer's 0.5 mm each side
  });

  it('as it prints, wall face down, faces up all the way over the chamfer too: nothing over air', () => {
    for (const [boards, seams] of [
      ['2', 'through'],
      ['4', 'through'],
      ['2', 'between'],
    ] as const) {
      for (const fixing of ['none', 'screw', 'keyhole'] as const) {
        // from the bar's chamfer's foot, 6 mm up at 15 mm deep, to past the root
        const where = `${boards} ${seams} ${fixing}`;
        expect(facingDown(clip({ boards, seams, fixing, depthMm: 15 }), 6.001, 7 + RISE_MM + 0.1), where).toBe(0);
      }
    }
  });

  it('exports closed with no facet of no area, every layout, fixing, head and screw at 15, 20 and 30 mm deep', () => {
    let [built, refused] = [0, 0];
    for (const [boards, seams] of [
      ['2', 'through'],
      ['2-stacked', 'through'],
      ['4', 'through'],
      ['2', 'between'],
      ['2-stacked', 'between'],
    ] as const) {
      for (const fixing of ['none', 'screw', 'keyhole'] as const) {
        // the screw's head and size matter to a screw, its size alone to a keyhole, neither without a fixing
        const heads = fixing === 'screw' ? (['countersunk', 'round'] as const) : (['countersunk'] as const);
        for (const screwHead of heads) {
          for (const screwMm of fixing === 'none' ? [4] : [3, 4, 5]) {
            for (const depthMm of [15, 20, 30]) {
              const given = { boards, seams, fixing, screwHead, screwMm, depthMm };
              let p: SlotClipParams;
              try {
                p = slotClipParams(given);
              } catch {
                refused++;
                continue;
              }
              const mesh = meshOf(keep(makeSlotClip(engine, p)));
              expect(edgesNotOnTwoFacets(mesh), JSON.stringify(given)).toBe(0);
              expect(degenerateFacets(mesh), JSON.stringify(given)).toBe(0);
              built++;
            }
          }
        }
      }
    }
    // 5 layouts at 3 depths, 10 clips each: no fixing, a screw with 2 heads in 3 sizes, a keyhole in 3; through the
    // slots, a 5 mm screw's head is refused as too wide between the seam and a post, with either head (3 x 2 x 3)
    expect(built + refused).toBe(150);
    expect(refused).toBe(18);
    expect(built).toBe(132);
  }, 120_000);
});

describe("the walls of a hook's room in each standoff behind a slot, their roots on the back (D411)", () => {
  const MOUNTINGS = [
    { screwHead: 'keyhole', lockScrews: 'none' },
    { screwHead: 'keyhole', lockScrews: 'bottom' },
    { screwHead: 'lock', lockScrews: 'none' },
  ] as const;
  /** A board of a type, 80 x 80 mm closed all round on 15 mm standoffs, its standoffs behind its four corner slots. */
  const board = (type: typeof SOLID | typeof LIGHTENED | typeof SKELETON, given: object) =>
    keep(
      type.build(engine, {
        ...defaultValues(type.settings),
        widthMm: 80,
        heightMm: 80,
        sides: CLOSED,
        standoffs: 'back',
        standoffHeightMm: 15,
        ...given,
      }),
    );
  const places = [
    ...keyholePlaces({ columns: 2, rows: 2, sides: CLOSED }),
    ...bottomSlotPlaces({ columns: 2, rows: 2, sides: CLOSED }),
  ];
  /** What a slice holds inside a region round a place, mm2. */
  const inside = (solid: Manifold, z: number, region: CrossSection) =>
    keep(keep(solid.slice(z)).intersect(region)).area();

  for (const type of [SOLID, LIGHTENED, SKELETON]) {
    for (const mounting of MOUNTINGS) {
      it(`round the slot, not where the tab goes: the ${type.id} board, ${mounting.screwHead}s, lock screws ${mounting.lockScrews}`, () => {
        const solid = board(type, mounting);
        for (const place of places) {
          const where = `${type.id} ${mounting.screwHead} ${mounting.lockScrews} at ${place.join(', ')}`;
          const room = hookRoom(place);
          // 0.02 mm behind the back, the root round the room's walls by the slot: the room's 10.2 x 20.2 mm stadium,
          // 52.0 mm round, less its lower arc where the tab's room meets it, 10.0 mm, 42 mm of wall, the root 1.5 mm
          // past the slot's chamfer less its 0.25 mm margin, 1.25 mm out, 0.72 of it there: 0.9 mm, 38 mm2 at most,
          // less where it eases in to the tab's walls
          expect(inside(solid, -0.02, room), where).toBeGreaterThan(25);
          expect(inside(solid, -0.02, room), where).toBeLessThan(42 * 1.25 * OFF_FACE);
          // 1 mm behind, (1 - sqrt(1.05 / 3.05))^2 = 0.17 of its reach out, 0.21 mm, under 9 mm2
          expect(inside(solid, -1, room), where).toBeLessThan(42 * 1.25 * 0.17 + 0.5);
          // and from 3.2 mm behind the back to the room's ceiling, the room as it was, empty
          for (const z of [-RISE_MM - 0.2, -5, -7.9])
            expect(inside(solid, z, room), `${where} at ${z}`).toBeLessThan(0.001);
          // never in what a hook takes: the slot and its chamfer and the 0.25 mm margin, and the tab's room as it is cut
          const slot = keep(new engine.CrossSection([stadium(place[0], place[1], 5.2, 15.2, 1.25)]));
          const tab = keep(room.subtract(keep(new engine.CrossSection([stadium(place[0], place[1], 5.2, 15.2, 2.5)]))));
          for (const z of [-0.02, -0.5, -1, -2, -2.9]) {
            expect(inside(solid, z, slot), `${where}, the slot, at ${z}`).toBeLessThan(0.001);
            expect(inside(solid, z, tab), `${where}, the tab, at ${z}`).toBeLessThan(0.001);
          }
        }
      });
    }
  }

  it('as the board prints face down, faces up all the way, the roots in the rooms too: nothing over air', () => {
    for (const type of [SOLID, LIGHTENED, SKELETON]) {
      for (const mounting of MOUNTINGS) {
        // the back 5 mm up as the board prints, the roots from there to 3 mm up the walls
        const printed = keep(printPose(board(type, mounting)));
        expect(facingDown(printed, 5.001, 5 + RISE_MM + 0.1), `${type.id} ${JSON.stringify(mounting)}`).toBe(0);
      }
    }
  });

  it('exports closed with no facet of no area, every board type, size and mounting behind the slots', () => {
    let [checked, refused] = [0, 0];
    for (const type of [SOLID, LIGHTENED, SKELETON]) {
      for (const size of [
        { widthMm: 80, heightMm: 80, sides: CLOSED, seams: 'through' },
        { widthMm: 120, heightMm: 160, sides: CLOSED, seams: 'through' },
        { widthMm: 160, heightMm: 120, sides: ALL_OPEN, seams: 'through' },
        { widthMm: 160, heightMm: 160, sides: ALL_OPEN, seams: 'between' },
      ] as const) {
        for (const mounting of [
          ...MOUNTINGS,
          // the lock screws above at the screw size, 4 mm, their heads through a groove (D479); one of its own, 2.5 mm,
          // whose 5 mm head passes the slot, as the start was before
          { screwHead: 'keyhole', lockScrews: 'bottom', lockScrewSize: 'own', lockScrewMm: 2.5 },
          { screwHead: 'keyhole', lockScrews: 'none', screwMm: 3 },
          { screwHead: 'keyhole', lockScrews: 'none', screwMm: 5 },
        ]) {
          const given = { ...size, ...mounting };
          let built: Manifold;
          try {
            built = board(type, given);
          } catch (error) {
            if (!(error instanceof SettingsProblem)) throw error;
            refused++;
            continue;
          }
          const mesh = meshOf(built);
          expect(edgesNotOnTwoFacets(mesh), `${type.id} ${JSON.stringify(given)}`).toBe(0);
          expect(degenerateFacets(mesh), `${type.id} ${JSON.stringify(given)}`).toBe(0);
          checked++;
        }
      }
    }
    // the skeleton refuses one: between the slots, a 5 mm screw's keyhole standoffs leave pockets beside them too
    // small for its taper, as it did before D411
    expect(refused).toBe(1);
    expect(checked).toBe(3 * 4 * 6 - 1);
  }, 180_000);
});

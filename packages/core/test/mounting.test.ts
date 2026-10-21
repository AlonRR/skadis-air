// Mounting (backlog item mounting; D73 to D75): a screw hole in each corner tile, 10 mm in from both
// edges, countersunk or round; and standoffs on the back. Each claim is measured on the solid: the
// holes in a cut through it, its genus, its box and its volume, against figures worked out by hand.
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams, type SolidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { keyhole, mountingCuts, mountingParams, type MountingParams } from '../src/mounting.js';
import { stadium } from '../src/rings.js';
import { ALL_OPEN, type Sides, slotPlaces } from '../src/slots.js';
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

const CLOSED: Sides = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
type Given = Partial<SolidBoardParams> & Pick<SolidBoardParams, 'columns' | 'rows'>;
const plain = (given: Given) => keep(makeSolidBoard(engine, solidBoardParams(given)));
const mounted = (given: Given, mounting: Partial<MountingParams> = {}) => {
  const p = solidBoardParams(given);
  return keep(makeSolidBoard(engine, p, mountingCuts(mountingParams(mounting), p)));
};

/** The round holes of a cut, each as its centre and its width across. */
function roundHoles(cut: CrossSection) {
  return cut
    .toPolygons()
    .map((poly) => {
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      const [w, h] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
      return { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, w, h };
    })
    .filter((b) => Math.abs(b.w - b.h) < 0.01 && b.w < 15); // a slot is three times as tall as wide
}

const corners = (width: number, height: number) => [
  [10, 10],
  [width - 10, 10],
  [10, height - 10],
  [width - 10, height - 10],
];

// A cylinder of radius r through a plate t thick, and the extra a 90 degree countersink d deep takes.
const cylinder = (r: number, t: number) => Math.PI * r * r * t;
const countersink = (r: number, d: number) =>
  ((Math.PI * d) / 3) * ((r + d) ** 2 + (r + d) * r + r * r) - cylinder(r, d);

describe('mountingParams: the starting values', () => {
  it('are a countersunk hole for a 4 mm screw (D74; D76 open), and no standoffs (D75: an option)', () => {
    expect(mountingParams({})).toEqual({
      screwHead: 'countersunk',
      screwMm: 4,
      standoffHeightMm: 0,
      lockScrews: false,
      lockScrewMm: 2.5, // its head passes the slot (A248)
    });
  });

  it('refuses what cannot be made', () => {
    expect(() => mountingParams({ screwMm: 0 })).toThrow(RangeError);
    expect(() => mountingParams({ standoffHeightMm: -1 })).toThrow(RangeError);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value the type would not allow
    expect(() => mountingParams({ screwHead: 'hex' as MountingParams['screwHead'] })).toThrow(RangeError);
  });
});

describe('screw holes (D73, D74)', () => {
  it('cuts one in each corner tile, 10 mm in from both edges, 4.5 mm across for a 4 mm screw', () => {
    for (const [columns, rows] of [
      [1, 1],
      [3, 2],
    ] as const) {
      const holes = roundHoles(keep(mounted({ columns, rows }).slice(2)));
      expect(holes).toHaveLength(4);
      for (const [x, y] of corners(40 * columns, 40 * rows)) {
        const hole = holes.find((h) => Math.abs(h.x - (x ?? 0)) < 0.01 && Math.abs(h.y - (y ?? 0)) < 0.01);
        expect(hole?.w).toBeCloseTo(4.5, 2);
      }
    }
  });

  it('meets no slot, open or closed: each hole adds one through-hole to the board', () => {
    for (const [columns, rows, sides] of [
      [1, 1, ALL_OPEN],
      [2, 2, ALL_OPEN],
      [3, 2, CLOSED],
      [2, 2, { ...ALL_OPEN, left: 'closed', bottom: 'closed' }],
    ] as const) {
      for (const screwMm of [3, 4, 5]) {
        expect(mounted({ columns, rows, sides }, { screwMm }).genus()).toBe(
          plain({ columns, rows, sides }).genus() + 4,
        );
      }
    }
  });

  it('countersinks the front, the face that prints on the bed (D66): 90 degrees, twice the screw plus 1 mm across', () => {
    // 0.25 mm in from the front a 9 mm countersink is 8.5 mm across; at the back the hole is 4.5 mm
    const [front] = roundHoles(keep(mounted({ columns: 1, rows: 1 }).slice(4.75)));
    const [back] = roundHoles(keep(mounted({ columns: 1, rows: 1 }).slice(0.25)));
    expect(front?.w).toBeCloseTo(8.5, 2);
    expect(back?.w).toBeCloseTo(4.5, 2);
  });

  it('sinks a round head in a counterbore at the front, flush: 8.5 mm across, 3.4 mm deep, for a 4 mm screw (D279)', () => {
    const round = mounted({ columns: 1, rows: 1 }, { screwHead: 'round' });
    const [bore] = roundHoles(keep(round.slice(3)));
    expect(bore?.w).toBeCloseTo(8.5, 2);
    // control: a countersink is 5 mm across there, 2 mm from the front
    const [sink] = roundHoles(keep(mounted({ columns: 1, rows: 1 }).slice(3)));
    expect(sink?.w).toBeCloseTo(5, 2);
    // under the bore, 1.6 mm of board, the plain hole
    const [floor] = roundHoles(keep(round.slice(1)));
    expect(floor?.w).toBeCloseTo(4.5, 2);
  });

  it('leaves a round head on the front where the board is too thin to sink it over 1 mm, a step it cannot avoid', () => {
    // a 5 mm screw's head, 4.2 mm deep with its spare, would leave 0.8 mm of a 5 mm board: its hole is plain
    const [front] = roundHoles(keep(mounted({ columns: 1, rows: 1 }, { screwHead: 'round', screwMm: 5 }).slice(4.75)));
    expect(front?.w).toBeCloseTo(5.5, 2);
    // a 4.5 mm screw's, 3.8 mm deep, leaves 1.2 mm: sunk
    const [sunk] = roundHoles(keep(mounted({ columns: 1, rows: 1 }, { screwHead: 'round', screwMm: 4.5 }).slice(4.75)));
    expect(sunk?.w).toBeCloseTo(9.5, 2);
  });

  it('takes out what four holes and their countersinks work out to by hand', () => {
    const base = plain({ columns: 1, rows: 1 }).volume();
    const sunk = base - mounted({ columns: 1, rows: 1 }).volume();
    const round = base - mounted({ columns: 1, rows: 1 }, { screwHead: 'round' }).volume();
    // within 1 %: each circle is drawn with 64 segments, about 0.16 % short of its area
    expect(Math.abs(sunk - 4 * (cylinder(2.25, 5) + countersink(2.25, 2.25))) / sunk).toBeLessThan(0.01);
    // a round head's: the hole, and its counterbore round it, 8.5 mm across and 3.4 mm deep (D279)
    const bore = cylinder(4.25, 3.4) - cylinder(2.25, 3.4);
    expect(Math.abs(round - 4 * (cylinder(2.25, 5) + bore)) / round).toBeLessThan(0.01);
  });

  it('with no screw holes, is the plain board', () => {
    const none = mounted({ columns: 2, rows: 1 }, { screwHead: 'none' });
    expect(none.volume()).toBeCloseTo(plain({ columns: 2, rows: 1 }).volume(), 6);
    expect(none.genus()).toBe(plain({ columns: 2, rows: 1 }).genus());
  });

  it('refuses a countersink that leaves less than 1 mm of plain hole, and takes a round head there', () => {
    expect(() => mounted({ columns: 1, rows: 1, thicknessMm: 3 })).toThrow(/countersunk/);
    expect(mounted({ columns: 1, rows: 1, thicknessMm: 3 }, { screwHead: 'round' }).genus()).toBe(5);
    expect(mounted({ columns: 1, rows: 1, thicknessMm: 3.25 }).genus()).toBe(5);
  });
});

describe('standoffs on the back (D75)', () => {
  it('stand the height asked for behind the back face, at the four screw holes, hollow for the screw', () => {
    const board = mounted({ columns: 2, rows: 2 }, { standoffHeightMm: 20 });
    const box = board.boundingBox();
    expect(box.min[2]).toBeCloseTo(-20, 9);
    expect(box.max[2]).toBeCloseTo(5, 9);
    const cut = keep(board.slice(-10));
    // four rings, 10 mm across with the 4.5 mm hole through: the screw passes through the standoff
    expect(Math.abs(cut.area() - 4 * Math.PI * (5 ** 2 - 2.25 ** 2)) / cut.area()).toBeLessThan(0.01);
    const circles = roundHoles(cut).map((c) => Math.round(c.w * 10) / 10);
    expect(circles.sort((a, b) => a - b)).toEqual([4.5, 4.5, 4.5, 4.5, 10, 10, 10, 10]); // each ring's two edges
    expect(board.genus()).toBe(plain({ columns: 2, rows: 2 }).genus() + 4);
  });

  it('are solid posts where there is no screw hole', () => {
    const board = mounted({ columns: 2, rows: 2 }, { screwHead: 'none', standoffHeightMm: 20 });
    expect(Math.abs(keep(board.slice(-10)).area() - 4 * Math.PI * 25) / (4 * Math.PI * 25)).toBeLessThan(0.01);
    expect(board.genus()).toBe(plain({ columns: 2, rows: 2 }).genus());
  });

  it('keep 2 mm clear of every slot behind the board, so a hook fits, at the smallest and largest screws', () => {
    for (const sides of [ALL_OPEN, CLOSED]) {
      for (const [screwMm, screwHead] of [
        [3, 'countersunk'],
        [5, 'countersunk'],
      ] as const) {
        // keyhole standoffs keep 1.25 mm, as D237 decided: their own test, with the keyholes
        const board = mounted({ columns: 2, rows: 2, sides }, { screwMm, screwHead, standoffHeightMm: 30 });
        // each slot's outline grown by its 1 mm chamfer and 2 mm more, run 30 mm back from the board
        const zone = slotClearZone(engine, { columns: 2, rows: 2, sides }, 2, 30, keep);
        expect(keep(board.intersect(zone)).volume()).toBe(0);
        // the control: a 4 mm margin reaches the standoffs, so the check can see one near a slot
        const wide = slotClearZone(engine, { columns: 2, rows: 2, sides }, 4, 30, keep);
        expect(keep(board.intersect(wide)).volume()).toBeGreaterThan(0);
      }
    }
  });

  it('stay inside the outline at the largest corner radius and the largest screw', () => {
    // A 20 mm corner's arc is centred at (20, 20); the standoff's far edge, 11 mm across at (10, 10),
    // is 14.1 + 5.5 = 19.6 mm from that centre, so the settings' ranges keep it inside the board.
    const board = mounted(
      { columns: 2, rows: 2, sides: CLOSED, cornerRadiusMm: 20 },
      { screwMm: 5, standoffHeightMm: 20 },
    );
    let checked = 0;
    for (const z of [-10, 4.9]) {
      for (const poly of keep(board.slice(z)).toPolygons()) {
        for (const [x, y] of poly) {
          if (x < 20 && y < 20) {
            expect(Math.hypot(x - 20, y - 20)).toBeLessThanOrEqual(20 + 1e-6);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(64); // the standoff's ring and the corner's arc were both looked at
  });

  it('export with no degenerate facet, with either head', () => {
    for (const screwHead of ['countersunk', 'round', 'none'] as const) {
      const mesh = meshOf(mounted({ columns: 2, rows: 1, sides: CLOSED }, { screwHead, standoffHeightMm: 20 }));
      expect(degenerateFacets(mesh)).toBe(0);
    }
  });
});

/** The holes of a cut whose box holds the point (x, y), each as its box and its area. */
function holesAt(cut: CrossSection, x: number, y: number) {
  return cut
    .toPolygons()
    .map((poly) => {
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      let twice = 0; // the shoelace formula; a hole runs clockwise, so its area comes out negative
      for (let i = 0; i < poly.length; i++) {
        const [a, b] = [poly[i], poly[(i + 1) % poly.length]];
        twice += (a?.[0] ?? 0) * (b?.[1] ?? 0) - (b?.[0] ?? 0) * (a?.[1] ?? 0);
      }
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        area: Math.abs(twice) / 2,
      };
    })
    .filter((b) => b.minX < x && x < b.maxX && b.minY < y && y < b.maxY)
    .filter((b) => b.maxX - b.minX < 15); // not the board's outline
}

describe('keyholes, in the top standoffs behind the corner slots (D235, D244; D156, D157, D190)', () => {
  // a 4 mm screw: a 4.5 mm slot, a 9 mm entry, a 9 mm slide (D157), cut in each top standoff's wall face: 1.5 mm of
  // lips, then the head's 3.5 mm channel, then a roof. Each standoff stands behind its top corner tile's centre slot,
  // 15 x 24 mm, the keyhole's middle on the slot's; on an 80 mm board at (20, 60) and (60, 60), the screw resting at
  // 64.5. A pocket leaves a hook its room behind that slot: the slot, the back tab's drop below it, 8 mm deep (D244).
  const board = { columns: 2, rows: 2 } as const;
  const keyholes = { screwHead: 'keyhole', standoffHeightMm: 20 } as const;
  const foot = -20;
  const middles = [20, 60];
  // the slots the standoffs stand behind: the top corner tiles' (D244) and the bottom ones' (D245)
  const behind: [number, number][] = [
    [20, 60],
    [60, 60],
    [20, 20],
    [60, 20],
  ];
  const pad = 15 * 9 + Math.PI * 7.5 ** 2; // a standoff, 15 x 24 mm for a 4 mm screw
  /** The rings of a cut in the board's bottom half: the bottom standoffs. */
  const lower = (rings: Vec2[][]) => rings.filter((ring) => ring.every(([, y]) => y < 40));
  const keyholeAt = (cut: CrossSection, x: number) => holesAt(cut, x, 60).filter((h) => h.maxX - h.minX < 10);

  it('are sized from the screw: the head twice the screw, the entry 1 mm wider, the slide as long (D157)', () => {
    expect(keyhole(4)).toEqual({ slotMm: 4.5, entryMm: 9, slideMm: 9, channelMm: 3.5 });
    const k = keyhole(3);
    expect([k.slotMm, k.entryMm, k.slideMm]).toEqual([3.5, 7, 7]);
    expect(k.channelMm).toBeCloseTo(2.7, 9);
  });

  it("leave the board's face plain: nothing is cut from the front (D235)", () => {
    const face = (m: Partial<MountingParams>) => keep(mounted(board, m).slice(5 - 0.1)).area();
    expect(face(keyholes)).toBeCloseTo(face({ screwHead: 'none', standoffHeightMm: 20 }), 6);
    // control: countersunk holes do cut the face
    expect(face({ screwHead: 'countersunk' })).toBeLessThan(face({ screwHead: 'none' }) - 10);
  });

  it("cut the entry and the slot through the lips at each top standoff's foot, behind the corner slot (D244)", () => {
    const lips = keep(mounted(board, keyholes).slice(foot + 0.75));
    for (const x of middles) {
      const [hole] = keyholeAt(lips, x);
      expect(hole?.maxY).toBeCloseTo(64.5 + 2.25, 2); // the slot's top end, round the resting screw
      expect(hole?.minY).toBeCloseTo(55.5 - 4.5, 2); // the entry's bottom
      expect((hole?.maxX ?? 0) - (hole?.minX ?? 0)).toBeCloseTo(9, 2);
      expect((hole?.maxX ?? 0) + (hole?.minX ?? 0)).toBeCloseTo(2 * x, 2);
    }
    // the bottom standoffs have no keyhole: at their foot each is one ring, nothing cut in it, behind the bottom
    // corner tile's centre slot (D245)
    const bottom = lower(lips.toPolygons());
    expect(bottom).toHaveLength(2);
    expect(Math.abs(keep(new engine.CrossSection(bottom)).area() - 2 * pad) / (2 * pad)).toBeLessThan(0.01);
    for (const ring of bottom) {
      const xs = ring.map(([x]) => x);
      const ys = ring.map(([, y]) => y);
      expect(middles.some((x) => Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - x) < 0.01)).toBe(true);
      expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(20, 2);
    }
  });

  it('hold the head in a channel as wide as the entry, behind the lips', () => {
    const channel = keep(mounted(board, keyholes).slice(foot + 1.5 + 1.75));
    for (const x of middles) {
      const [hole] = keyholeAt(channel, x);
      expect(hole?.minY).toBeCloseTo(55.5 - 4.5, 2);
      expect(hole?.maxY).toBeCloseTo(64.5 + 4.5, 2);
      // a 9 mm stadium 18 mm long: a 9 x 9 mm middle and a 9 mm circle; 64 segments fall 0.16 % short
      expect(hole?.area).toBeCloseTo(81 + Math.PI * 4.5 ** 2, 0);
    }
    // control: in the lips the hole is narrower than the channel
    const [lips] = keyholeAt(keep(mounted(board, keyholes).slice(foot + 0.75)), 20);
    expect(lips?.area ?? 0).toBeLessThan(81 + Math.PI * 4.5 ** 2 - 30);
  });

  it('roof the channel: above it each top standoff is whole, 15 x 24 mm, centred behind the corner slot (D244)', () => {
    const roof = keep(mounted(board, keyholes).slice(foot + 1.5 + 3.5 + 0.5)).toPolygons();
    const top = roof.filter((ring) => ring.every(([, y]) => y > 40));
    expect(top).toHaveLength(2); // one ring each, no hole in it
    expect(Math.abs(keep(new engine.CrossSection(top)).area() - 2 * pad) / (2 * pad)).toBeLessThan(0.01);
    for (const ring of top) {
      const xs = ring.map(([x]) => x);
      const ys = ring.map(([, y]) => y);
      const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(middles.some((x) => Math.abs(middle - x) < 0.01)).toBe(true);
      expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(60, 2);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(15, 1);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(24, 1);
    }
    // the bottom two are as wide, whole too (D245)
    expect(Math.abs(keep(new engine.CrossSection(lower(roof))).area() - 2 * pad) / (2 * pad)).toBeLessThan(0.01);
  });

  it('leave a hook its room behind the slot in front of each, and every other slot its 2 mm (D244, C83)', () => {
    const sized = (sides: Sides) => ({ columns: 2, rows: 2, sides });
    const taken = (b: Manifold, zone: Manifold) => keep(b.intersect(zone)).volume();
    for (const sides of [ALL_OPEN, CLOSED]) {
      for (const [screwMm, lockScrews] of [
        [3, false],
        [4, false],
        [5, false],
        [4, true],
      ] as const) {
        const b = mounted(sized(sides), { ...keyholes, screwMm, lockScrews });
        // a hook in any slot, those in front of the standoffs too: the slot and its chamfer, and the back tab's
        // drop with C99's 2 mm, 8 mm back from the board (the zones stop 0.01 mm off its face)
        const room = (depth: number) =>
          keep(
            slotClearZone(engine, sized(sides), 0, depth, keep).add(hookRoomZone(engine, sized(sides), 2, depth, keep)),
          );
        expect(taken(b, room(7.99))).toBeLessThan(1e-6);
        // the slots not in front of a standoff keep C83's 2 mm all the way back
        const others = keep(
          slotClearZone(engine, sized(sides), 2, 30, keep, behind).add(
            hookRoomZone(engine, sized(sides), 2, 30, keep, behind),
          ),
        );
        expect(taken(b, others)).toBeLessThan(1e-6);
      }
    }
    // controls: 10 mm back reaches the roof over the keyhole; and the slots in front of the standoffs, 30 mm back,
    // reach the standoffs
    const b = mounted(sized(ALL_OPEN), keyholes);
    const deep = keep(
      slotClearZone(engine, sized(ALL_OPEN), 0, 10, keep).add(hookRoomZone(engine, sized(ALL_OPEN), 2, 10, keep)),
    );
    expect(taken(b, deep)).toBeGreaterThan(1);
    expect(taken(b, slotClearZone(engine, sized(ALL_OPEN), 2, 30, keep))).toBeGreaterThan(1);
  });

  it('add no through-hole; lock screws go in through the bottom corner slots, tucked behind them (D247, A248)', () => {
    const none = mounted(board, { screwHead: 'none' }).genus();
    expect(mounted(board, keyholes).genus()).toBe(none);
    // a 2.5 mm lock screw, head and all, through each bottom corner slot: one hole each through the standoff
    const locked = mounted(board, { ...keyholes, lockScrews: true });
    expect(locked.genus()).toBe(none + 2);
    // the front stays plain: no countersink in a corner, the slot as it is
    const face = (b: Manifold) => keep(b.slice(5 - 0.1)).area();
    expect(face(locked)).toBeCloseTo(face(mounted(board, keyholes)), 6);
    // at the wall, the screw's 3 mm hole in each bottom standoff, behind the slot's middle
    const at = (z: number) =>
      roundHoles(keep(locked.slice(z)))
        .filter((h) => h.y < 40)
        .map((h) => [Math.round(h.x * 10) / 10, Math.round(h.y * 10) / 10, Math.round(h.w * 10) / 10]);
    expect(at(foot + 0.5)).toEqual(
      expect.arrayContaining([
        [20, 20, 3],
        [60, 20, 3],
      ]),
    );
    expect(at(foot + 0.5)).toHaveLength(2);
    // its head in a recess 5.4 mm across, just behind the hook's 8 mm of room
    expect(at(-8 - 1)).toEqual(
      expect.arrayContaining([
        [20, 20, 5.4],
        [60, 20, 5.4],
      ]),
    );
    // lock screws mean nothing without keyholes
    expect(mounted(board, { lockScrews: true }).genus()).toBe(none + 4);
  });

  it("cut a groove in the slot's sides for a lock screw whose head is wider than 5 mm, to pass it (A248)", () => {
    // the hole round the bottom left slot, halfway through the board: the slot, 5.2 mm wide, or the groove
    const width = (lockScrewMm: number) => {
      const b = mounted(board, { ...keyholes, lockScrews: true, lockScrewMm });
      const [hole] = holesAt(keep(b.slice(2.5)), 20, 20);
      return (hole?.maxX ?? 0) - (hole?.minX ?? 0);
    };
    expect(width(2.5)).toBeCloseTo(5.2, 1); // a 5 mm head passes the slot
    expect(width(4)).toBeCloseTo(8.5, 1); // an 8 mm head and 0.5 mm
    expect(width(5)).toBeCloseTo(10.5, 1);
  });

  it('take a board of any thickness, as nothing is cut from it (D235): 4.6 mm was refused before', () => {
    expect(mounted({ ...board, thicknessMm: 4.6 }, keyholes).genus()).toBe(
      mounted(board, { screwHead: 'none' }).genus(),
    );
    expect(mounted({ ...board, thicknessMm: 3 }, keyholes).volume()).toBeGreaterThan(0);
  });

  it('take every screw the setting offers, 3 to 5 mm, as the standoff has room behind the slot (D244)', () => {
    for (const screwMm of [3, 3.5, 4, 4.5, 5])
      expect(mounted(board, { ...keyholes, screwMm }).volume()).toBeGreaterThan(0);
  });

  it('refuse a board one tile tall or wide, where the keyhole standoffs would meet the others or each other (C241)', () => {
    expect(() => mounted({ columns: 2, rows: 1 }, keyholes)).toThrow(/80 x 80 mm/);
    expect(() => mounted({ columns: 1, rows: 2 }, keyholes)).toThrow(/80 x 80 mm/);
    expect(() => mounted({ columns: 2, rows: 1 }, { screwHead: 'countersunk', standoffHeightMm: 20 })).not.toThrow();
  });

  it("refuse standoffs too short for the keyhole, a roof over it and a hook's 8 mm of room (D190, D244, C99)", () => {
    // 1.5 mm of lips, the 3.5 mm channel, a 1.2 mm roof and 8 mm of room: 14.2 mm for a 4 mm screw, 15 for 5 mm
    expect(() => mounted(board, { screwHead: 'keyhole' })).toThrow(/standoffs at least 14\.2 mm/);
    expect(() => mounted(board, { ...keyholes, standoffHeightMm: 14 })).toThrow(/standoffs at least 14\.2 mm/);
    expect(mounted(board, { ...keyholes, standoffHeightMm: 14.2 }).genus()).toBeGreaterThan(0);
    expect(() => mounted(board, { ...keyholes, screwMm: 5, standoffHeightMm: 14.9 })).toThrow(/at least 15 mm/);
    expect(mounted(board, { ...keyholes, screwMm: 5, standoffHeightMm: 15 }).genus()).toBeGreaterThan(0);
    // a 5 mm lock screw's 4 mm head in its recess, behind the 8 mm room, and 2 mm of standoff under it: 14.3 mm
    const big = { ...keyholes, lockScrews: true, lockScrewMm: 5 };
    expect(() => mounted(board, { ...big, standoffHeightMm: 14.2 })).toThrow(/at least 14\.3 mm/);
    expect(mounted(board, { ...big, standoffHeightMm: 14.3 }).genus()).toBeGreaterThan(0);
  });

  it('export with no degenerate facet, with lock screws or without, open or closed', () => {
    for (const sides of [ALL_OPEN, CLOSED]) {
      for (const lockScrews of [false, true]) {
        const mesh = meshOf(mounted({ ...board, sides }, { ...keyholes, lockScrews }));
        expect(degenerateFacets(mesh)).toBe(0);
      }
    }
  });
});

// D131: IKEA's spacer is held through a peg slot near the corner, so no screw hole, countersink or keyhole may
// cut into any slot. Measured as what the mounting takes from the board, against the slots' chamfered outlines
// grown by half a millimetre, at every screw size, at the largest and the smallest corner, open and closed.
describe('the corner slots stay whole (D131)', () => {
  const takenFromSlots = (given: Given, mounting: Partial<MountingParams>, marginMm: number) => {
    const p = solidBoardParams(given);
    const taken = keep(plain(given).subtract(mounted(given, mounting)));
    const outlines = slotPlaces(p.columns, p.rows, p.sides).map((s) =>
      stadium(s.xMm, s.yMm, 5 + p.slotClearanceMm, 15 + p.slotClearanceMm, p.slotChamferMm + marginMm),
    );
    const zone = keep(
      keep(keep(new engine.CrossSection(outlines, 'NonZero')).extrude(p.thicknessMm + 2)).translate([0, 0, -1]),
    );
    return keep(taken.intersect(zone)).volume();
  };

  it('at every screw size and head, with the corner square or rounded 20 mm', () => {
    let checked = 0;
    for (const sides of [ALL_OPEN, CLOSED]) {
      for (const cornerRadiusMm of [0, 20]) {
        for (const screwMm of [3, 3.5, 4, 4.5, 5]) {
          for (const screwHead of ['countersunk', 'round', 'keyhole'] as const) {
            const given = { columns: 2, rows: 2, sides, cornerRadiusMm, thicknessMm: 6 };
            // what is left is rounding where two cuts meet: 1e-7 mm³ measured
            const standoffHeightMm = screwHead === 'keyhole' ? 20 : 0; // keyholes stand off the wall (D190)
            expect(takenFromSlots(given, { screwHead, screwMm, lockScrews: true, standoffHeightMm }, 0.5)).toBeLessThan(
              1e-6,
            );
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(60);
  }, 60_000); // 60 boards, about 15 s on a busy machine

  it('control: a zone grown 3 mm, past the 0.9 mm left beside a 5 mm screw, is cut into', () => {
    const given = { columns: 2, rows: 2, thicknessMm: 6 };
    expect(takenFromSlots(given, { screwMm: 5 }, 3)).toBeGreaterThan(1);
  });
});

// The straight look (Q510, 28 Oct 2026; a choice on the board, the owner's 515 answer): today's lightened and skeleton
// boards with their pocket corners left as the first boards had them, L1's 1 mm round and S1's sharp, not on the long eased curves (D278); everything
// else, the plate's chamfers and V groove (D276, D277) and all of the mounting, is today's. Each claim is measured on
// the built solid, and each has a control that must fail: today's boards, whose corners are eased.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { BOARD_TYPES, boardFileName, boardType, buildBoard } from '../src/board-types/index.js';
import { loadEngine } from '../src/engine.js';
import { defaultValues } from '../src/settings.js';

// Each test builds whole boards, about 1 s each.
vi.setConfig({ testTimeout: 60_000 });

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

/** A board type built at its starting values: a 160 x 160 mm board, open all round, mounting as it starts. */
const built = new Map<string, Manifold>();
function board(id: string, given: Record<string, unknown> = {}): Manifold {
  const key = `${id} ${JSON.stringify(given)}`;
  const known = built.get(key);
  if (known !== undefined) return known;
  const type = boardType(id);
  const result = buildBoard(engine, type, { ...defaultValues(type.settings), ...given } as never);
  if (!result.ok) throw new Error(`${id} did not build: ${result.problem}`);
  built.set(key, keep(result.solid));
  return result.solid;
}

const STRAIGHT = { look: 'straight' };

/** Whether a section holds plastic at the point: a 0.02 mm square there is not all pocket. */
const holds = (s: CrossSection, [x, y]: [number, number]) =>
  keep(s.intersect(keep(keep(engine.CrossSection.square([0.02, 0.02], true)).translate([x, y])))).area() > 0;

// A pocket's corner where a web meets a rim, worked out by hand from the drawn slot: the slot of the tile at (60, 60)
// is 5.2 mm wide (5 mm and 0.2 mm clearance, D40), its rim reaching 1 + 3 mm past its edge (the chamfer, D41, and
// the rim, D143), so the rim's right side is the line x = 60 + 2.6 + 4; the web towards the tile's top right corner is
// 3 mm wide (D143) along y = x, its lower side the line y = x - 1.5 * sqrt(2). Between them, right of the rim and
// below the web, a pocket's corner of 135 degrees, which opens along its bisector, (sin 67.5, -cos 67.5).
const CORNER: [number, number] = [66.6, 66.6 - 1.5 * Math.SQRT2];
const BISECTOR: [number, number] = [Math.sin((67.5 * Math.PI) / 180), -Math.cos((67.5 * Math.PI) / 180)];
const along = (d: number): [number, number] => [CORNER[0] + d * BISECTOR[0], CORNER[1] + d * BISECTOR[1]];
// How far along the bisector each kind of corner keeps plastic: a 1 mm round, r (1 / sin 67.5 - 1) = 0.08 mm; D278's
// parabola, 3 mm along each side, its middle a quarter of the way from the corner to each end, 0.57 mm; a sharp
// corner, none. Probed 0.3 mm in, in plastic only on an eased corner, and 0.03 mm in, in plastic on a round one too.
const PAST_ROUND_MM = 0.3;
const INSIDE_ROUND_MM = 0.03;

/** A cut 0.3 mm in from the front face, inside the skeleton's 0.6 mm flange (D147), where its pockets are the face's. */
const front = (b: Manifold) => keep(b.slice(5 - 0.3));

describe("the look, a choice on the lightened and the skeleton boards (Q510; the owner's 515 answer)", () => {
  it('is on the main form of both, first, Curved or Straight, Curved unless chosen', () => {
    for (const id of ['lightened', 'skeleton']) {
      const [first] = boardType(id).settings;
      expect(first?.key, id).toBe('look');
      expect(first?.kind === 'choice' && first.options.map((o) => [o.value, o.label])).toEqual([
        ['curved', 'Curved'],
        ['straight', 'Straight'],
      ]);
      expect(first?.default).toBe('curved');
      expect(first?.advanced).toBeUndefined();
      expect(first?.help).toMatch(/Straight/);
    }
  });

  it('is on no other part', () => {
    const others = BOARD_TYPES.filter((t) => t.id !== 'lightened' && t.id !== 'skeleton');
    expect(others.length).toBeGreaterThan(0);
    for (const t of others) expect(t.settings.map((s) => s.key)).not.toContain('look');
  });

  it("names a Straight board's file skadis-<id>-straight-..., and a Curved board's as before", () => {
    for (const id of ['lightened', 'skeleton']) {
      const type = boardType(id);
      const start: Record<string, unknown> = { ...defaultValues(type.settings), rimMm: 2.5, standoffs: 'back' };
      const curved = boardFileName(type, start as never, 'stl');
      expect(curved).toMatch(new RegExp(`^skadis-${id}-160x160-rim-2[.]5mm`));
      expect(curved).not.toMatch(/straight|curved/);
      const straight = boardFileName(type, { ...start, look: 'straight' }, 'stl');
      expect(straight).toBe(curved.replace(`skadis-${id}-`, `skadis-${id}-straight-`));
    }
  });
});

describe('the straight lightened board: pocket corners 1 mm round, as L1 has them, not eased (D278)', () => {
  it('keeps plastic just inside a corner, as a 1 mm round does, and none past it', () => {
    const s = front(board('lightened', STRAIGHT));
    expect(holds(s, along(INSIDE_ROUND_MM))).toBe(true);
    expect(holds(s, along(PAST_ROUND_MM))).toBe(false);
  });

  it("discriminates: today's lightened board, its corner eased, keeps plastic past the round", () => {
    expect(holds(front(board('lightened')), along(PAST_ROUND_MM))).toBe(true);
  });

  it("weighs less than today's, the eased corners left out, and the same at the back face as at the front", () => {
    const [straight, today] = [board('lightened', STRAIGHT), board('lightened')];
    expect(straight.volume()).toBeLessThan(today.volume() - 100);
    // a lightened board's pockets go straight through: the same corner 0.3 mm from the back
    const back = keep(straight.slice(0.3));
    expect(holds(back, along(INSIDE_ROUND_MM))).toBe(true);
    expect(holds(back, along(PAST_ROUND_MM))).toBe(false);
  });
});

describe('the straight skeleton board: pocket corners sharp, as S1 has them, not eased (D278)', () => {
  it('keeps no plastic inside a corner at either face', () => {
    for (const s of [front(board('skeleton', STRAIGHT)), keep(board('skeleton', STRAIGHT).slice(0.3))]) {
      expect(holds(s, along(INSIDE_ROUND_MM))).toBe(false);
      expect(holds(s, along(PAST_ROUND_MM))).toBe(false);
    }
  });

  it("discriminates: today's skeleton board, its corner eased, keeps plastic in it", () => {
    const s = front(board('skeleton'));
    expect(holds(s, along(INSIDE_ROUND_MM))).toBe(true);
    expect(holds(s, along(PAST_ROUND_MM))).toBe(true);
  });

  it("is today's I-beam through the board (D514 a): its members narrow to the same 1.2 mm core", () => {
    // halfway through, a web is its core wide; the middle of the web towards the top right corner of the tile at
    // (60, 60), across it: the same in both boards, the corners far from it
    const mid = (id: string, given: Record<string, unknown> = {}) => keep(board(id, given).slice(2.5));
    const web = (s: CrossSection) => {
      const [cx, cy] = [70, 70];
      const strip = keep(
        new engine.CrossSection(
          [
            [
              [cx - 3, cy + 3 - 0.05],
              [cx + 3 - 0.05, cy - 3],
              [cx + 3, cy - 3 + 0.05],
              [cx - 3 + 0.05, cy + 3],
            ],
          ],
          'Positive',
        ),
      );
      return keep(s.intersect(strip)).area() / (0.05 * Math.SQRT2);
    };
    expect(web(mid('skeleton', STRAIGHT))).toBeCloseTo(1.2, 1);
    expect(web(mid('skeleton', STRAIGHT))).toBeCloseTo(web(mid('skeleton')), 3);
  });
});

describe("the straight boards keep the plate's edge chamfers and V groove (D276, D277)", () => {
  it('are 0.75 mm in at a cut 0.25 mm under the front all round, and not at the back of an open board', () => {
    for (const id of ['lightened', 'skeleton']) {
      const b = board(id, STRAIGHT);
      const at = (z: number) => keep(b.slice(z)).bounds();
      const frontCut = at(4.75);
      expect(frontCut.min[0]).toBeCloseTo(0.75, 6);
      expect(frontCut.min[1]).toBeCloseTo(0.75, 6);
      expect(frontCut.max[0]).toBeCloseTo(160 - 0.75, 6);
      expect(frontCut.max[1]).toBeCloseTo(160 - 0.75, 6);
      const backCut = at(0.25);
      expect(backCut.min[0]).toBeCloseTo(0, 6);
      expect(backCut.max[0]).toBeCloseTo(160, 6);
    }
  });
});

describe("today's lightened and skeleton boards, the Curved look, are unchanged by the Straight one", () => {
  // measured on main at 39ce8cf, 28 Oct 2026, at their starting values, before the straight boards were added
  const BEFORE = {
    lightened: { volume: 48159.56276907475, area: 40742.919163481936, tris: 43978 },
    skeleton: { volume: 38927.52390547201, area: 45122.07543535595, tris: 79838 },
  };
  for (const [id, was] of Object.entries(BEFORE)) {
    it(`${id}: the same volume, area and facets as before, at its start and with Curved chosen`, () => {
      expect(board(id, { look: 'curved' }).volume()).toBe(board(id).volume());
      const b = board(id);
      expect(Math.abs(b.volume() - was.volume)).toBeLessThan(1e-6);
      expect(Math.abs(b.surfaceArea() - was.area)).toBeLessThan(1e-6);
      expect(b.numTri()).toBe(was.tris);
    });
  }
});

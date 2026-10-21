// The seam-test pair (D69): two 40 x 80 mm tiles, open only on the sides that face each other, printed
// apart; pushed together they are the 80 x 80 board closed all round, the seam making one whole slot.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { makeSeamTest, SEAM_TEST_GAP_MM, seamTestParams } from '../src/seam-test.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets } from './facets.js';

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

const CLOSED = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' } as const;
const pair = (given = {}) => keep(makeSeamTest(engine, seamTestParams(given)));

describe('seamTestParams', () => {
  it('starts at the thickness, slot clearance and chamfer of a board (D40, D41)', () => {
    expect(seamTestParams({})).toEqual({ thicknessMm: 5, slotClearanceMm: 0.2, slotChamferMm: 1 });
  });
});

describe('makeSeamTest', () => {
  it('is two tiles of 40 x 80 mm, side by side, 10 mm apart', () => {
    const parts = pair().decompose();
    for (const p of parts) keep(p);
    expect(parts).toHaveLength(2);
    const boxes = parts.map((p) => p.boundingBox()).sort((a, b) => a.min[0] - b.min[0]);
    expect(boxes.map((b) => [b.min[0], b.max[0], b.max[1], b.max[2]].map((v) => Math.round(v * 1000) / 1000))).toEqual([
      [0, 40, 80, 5],
      [40 + SEAM_TEST_GAP_MM, 80 + SEAM_TEST_GAP_MM, 80, 5],
    ]);
    expect(SEAM_TEST_GAP_MM).toBe(10);
  });

  it('pushed together, is the 80 x 80 board closed all round: the seam makes one whole slot', () => {
    const [left, right] = pair()
      .decompose()
      .map(keep)
      .sort((a, b) => a.boundingBox().min[0] - b.boundingBox().min[0]);
    if (left === undefined || right === undefined) throw new Error('two tiles expected');
    const joined = keep(left.add(keep(right.translate([-SEAM_TEST_GAP_MM, 0, 0]))));
    const board = keep(makeSolidBoard(engine, solidBoardParams({ columns: 2, rows: 2, sides: CLOSED })));
    expect(board.genus()).toBe(5);
    expect(joined.genus()).toBe(board.genus());
    // the same cut, to one part in a million, from the back up to the front's V groove at the seam (D277)
    for (const z of [0.25, 2.5]) {
      const [a, b] = [keep(joined.slice(z)).area(), keep(board.slice(z)).area()];
      expect(Math.abs(a - b) / b).toBeLessThan(1e-6);
    }
    // apart, each tile has its two whole slots and half of the seam's
    expect(left.genus() + right.genus()).toBe(4);
  });

  it('discriminates: tiles closed at the seam, pushed together, make no slot there', () => {
    // (Their volume is no guide: closed all round, their inner corners are rounded too.)
    const closedTile = keep(makeSolidBoard(engine, solidBoardParams({ columns: 1, rows: 2, sides: CLOSED })));
    const twice = keep(closedTile.add(keep(closedTile.translate([40, 0, 0]))));
    expect(twice.genus()).toBe(4);
  });

  it('cuts its slots at the clearance asked for: 5.3 mm across with 0.3 mm', () => {
    const cut = keep(pair({ slotClearanceMm: 0.3 }).slice(2.5));
    const widths = cut
      .toPolygons()
      .map((poly) => {
        const xs = poly.map((p) => p[0]);
        const ys = poly.map((p) => p[1]);
        return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      })
      .filter((b) => Math.abs(b.h - 15.3) < 0.01);
    expect(widths.length).toBe(4); // the four whole slots; the seam's halves are notches in the edges
    for (const b of widths) expect(b.w).toBeCloseTo(5.3, 2);
  });

  it('exports with no degenerate facet', () => {
    expect(degenerateFacets(meshOf(pair()))).toBe(0);
  });
});

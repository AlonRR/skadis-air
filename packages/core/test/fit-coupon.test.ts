// The fit coupon (backlog item fit-coupon; D67, D68): four 40 mm tiles in a row, each with its slot at
// its own clearance, 0, 0.1, 0.2 and 0.3 mm unless set, told apart by 1 to 4 dots in the front face.
// Measured on the solid: the slots' widths through the middle, and the dots in a cut just inside the front.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine.js';
import { FIT_COUPON_TILES, fitCouponParams, makeFitCoupon } from '../src/fit-coupon.js';

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

/** Every contour of a cut, as its box. */
const contours = (cut: CrossSection) =>
  cut.toPolygons().map((poly) => {
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  });

const coupon = keep(makeFitCoupon(engine, fitCouponParams({})));

describe('the fit coupon', () => {
  it('is four tiles in a row, 160 x 40 mm, 5 mm thick', () => {
    expect(FIT_COUPON_TILES).toBe(4);
    const box = coupon.boundingBox();
    expect(box.max.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([160, 40, 5]);
  });

  it('cuts each tile its slot at its own clearance: 5.0, 5.1, 5.2 and 5.3 mm wide through the middle', () => {
    const slots = contours(keep(coupon.slice(2.5)))
      .filter((b) => b.maxX - b.minX < 10 && b.maxY - b.minY > 10) // the slots, not the outline
      .sort((a, b) => a.minX - b.minX);
    expect(slots.map((b) => Math.round((b.maxX - b.minX) * 100) / 100)).toEqual([5, 5.1, 5.2, 5.3]);
    expect(slots.map((b) => Math.round((b.maxY - b.minY) * 100) / 100)).toEqual([15, 15.1, 15.2, 15.3]);
    expect(coupon.genus()).toBe(4); // four through-holes; the dots go only part way
  });

  it('marks tile 1 with one dot, tile 2 with two, up to four, in the front face', () => {
    const dots = contours(keep(coupon.slice(5 - 0.3))).filter((b) => b.maxX - b.minX < 3 && b.maxY - b.minY < 3);
    const perTile = [0, 1, 2, 3].map((i) => dots.filter((d) => d.minX > 40 * i && d.maxX < 40 * (i + 1)).length);
    expect(perTile).toEqual([1, 2, 3, 4]);
  });

  it('discriminates: the dots are not cut through, so the middle of the coupon has none', () => {
    const dots = contours(keep(coupon.slice(2.5))).filter((b) => b.maxX - b.minX < 3 && b.maxY - b.minY < 3);
    expect(dots).toEqual([]);
  });

  it('takes its first clearance and its step as settings', () => {
    const other = keep(makeFitCoupon(engine, fitCouponParams({ clearanceFromMm: 0.2, clearanceStepMm: 0.05 })));
    const slots = contours(keep(other.slice(2.5)))
      .filter((b) => b.maxX - b.minX < 10 && b.maxY - b.minY > 10)
      .sort((a, b) => a.minX - b.minX);
    expect(slots.map((b) => Math.round((b.maxX - b.minX) * 100) / 100)).toEqual([5.2, 5.25, 5.3, 5.35]);
  });

  it('has left and right open and top and bottom closed (D68); on one row that leaves square corners', () => {
    const p = fitCouponParams({});
    expect(p.sides).toEqual({ left: 'open', right: 'open', bottom: 'closed', top: 'closed' });
    // a square corner: the coupon's area near (0, 0) is filled right to the corner, between its faces' edge chamfers
    const corner = keep(coupon.intersect(keep(keep(engine.Manifold.cube([1, 1, 1])).translate([0, 0, 2])))).volume();
    expect(corner).toBeCloseTo(1, 6);
  });
});

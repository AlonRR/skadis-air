// The standoff connector (backlog item conn-standoff; D92 to D94), for one board: a hollow round spacer
// behind a corner screw hole, the size of the built-in standoffs. Each claim is measured on the solid.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine.js';
import { ALL_OPEN, type Sides } from '../src/slots.js';
import { makeStandoff, standoffParams, type StandoffParams } from '../src/standoff.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets } from './facets.js';
import { slotClearZone } from './slot-zone.js';

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

const standoff = (given: Partial<StandoffParams> = {}) => keep(makeStandoff(engine, standoffParams(given)));
const CLOSED: Sides = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };

describe('standoffParams: the starting values', () => {
  it('are 20 mm tall (D94, from IKEA spacers) for a 4 mm screw (D76)', () => {
    expect(standoffParams({})).toEqual({ heightMm: 20, screwMm: 4 });
  });

  it('refuses what cannot be made', () => {
    expect(() => standoffParams({ heightMm: 0 })).toThrow(RangeError);
    expect(() => standoffParams({ screwMm: 0 })).toThrow(RangeError);
  });
});

describe('makeStandoff, for one board', () => {
  it('is a ring 10 mm across with a 4.5 mm hole, as tall as asked, centred on its hole', () => {
    const part = standoff();
    const box = part.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1000) / 1000)).toEqual([-5, -5, 0]);
    expect(box.max.map((v) => Math.round(v * 1000) / 1000)).toEqual([5, 5, 20]);
    expect(part.genus()).toBe(1);
    // within 1 %: each circle is drawn with 64 segments
    const ring = Math.PI * (5 ** 2 - 2.25 ** 2) * 20;
    expect(Math.abs(part.volume() - ring) / ring).toBeLessThan(0.01);
  });

  it('follows the screw: the hole 0.5 mm wider, the ring the hole plus 5.5 mm (C83)', () => {
    const part = standoff({ screwMm: 5, heightMm: 25 });
    expect(part.boundingBox().max[0]).toBeCloseTo(5.5, 3);
    expect(part.boundingBox().max[2]).toBeCloseTo(25, 9);
    const ring = Math.PI * (5.5 ** 2 - 2.75 ** 2) * 25;
    expect(Math.abs(part.volume() - ring) / ring).toBeLessThan(0.01);
  });

  it('behind a corner screw hole, keeps 2 mm clear of every slot, open or closed, at the smallest and largest screws', () => {
    for (const sides of [ALL_OPEN, CLOSED]) {
      for (const screwMm of [3, 5]) {
        const placed = keep(standoff({ screwMm }).translate([10, 10, -20.005]));
        const zone = slotClearZone(engine, { columns: 2, rows: 2, sides }, 2, 30, keep);
        expect(keep(placed.intersect(zone)).volume()).toBe(0);
        // the control: a 4 mm margin reaches it, so the check can see a spacer near a slot
        const wide = slotClearZone(engine, { columns: 2, rows: 2, sides }, 4, 30, keep);
        expect(keep(placed.intersect(wide)).volume()).toBeGreaterThan(0);
      }
    }
  });

  it('exports with no degenerate facet', () => {
    expect(degenerateFacets(meshOf(standoff()))).toBe(0);
  });
});

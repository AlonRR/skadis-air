// The engine module (backlog item page-skeleton): Manifold loads, and a boolean operation gives
// the volume worked out by hand. Runs in Node; the browser half is web/e2e/page.spec.ts.
// Copied from parametric-window-sealer (C32).
import { describe, expect, it } from 'vitest';
import { CHECK_PART_VOLUME_MM3, buildCheckPart, loadEngine } from '../src/engine.js';

describe('loadEngine', () => {
  it('starts Manifold and returns the same instance on every call', async () => {
    const first = await loadEngine();
    const second = await loadEngine();
    expect(typeof first.Manifold.cube).toBe('function');
    expect(second).toBe(first);
  });
});

describe('buildCheckPart', () => {
  it('is a 20 mm cube with a 10 mm cube cut from one corner: 8000 - 1000 = 7000 mm3', async () => {
    const part = buildCheckPart(await loadEngine());
    expect(CHECK_PART_VOLUME_MM3).toBe(7000);
    expect(part.volumeMm3).toBeCloseTo(7000, 6);
    expect(part.genus).toBe(0);
    expect(part.triangles).toBeGreaterThan(12); // the cut adds faces to a plain cube's 12
  });

  it('discriminates: the uncut cube does not pass for the check part', async () => {
    const { Manifold } = await loadEngine();
    const uncut = Manifold.cube([20, 20, 20]);
    expect(uncut.volume()).toBeCloseTo(8000, 6);
    expect(uncut.volume()).not.toBeCloseTo(CHECK_PART_VOLUME_MM3, 0);
    uncut.delete();
  });
});

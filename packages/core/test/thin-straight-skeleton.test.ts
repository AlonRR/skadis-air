// The thinnest Straight skeleton joined through its whole depth (D519 a, 28 Oct 2026). At rims and webs 1.2 mm and a
// 0.8 mm core, along an open top or bottom edge, a pocket's sharp corner where the edge band meets a web, beside each
// half slot, ran along the web's line into the half slot as the band widened through the board: band and web met only
// near the faces, a 0.93 mm gap between them from 1.57 to 3.43 mm deep (C538, C570). Each claim is measured on the
// built solid; the Curved skeleton at the same settings, joined before, is the measure.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { boardType, buildBoard } from '../src/board-types/index.js';
import { loadEngine } from '../src/engine.js';
import { defaultValues } from '../src/settings.js';

// A 240 x 200 mm board takes a few seconds; each test builds two.
vi.setConfig({ testTimeout: 120_000 });

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

function skeleton(given: Record<string, unknown>): Manifold {
  const type = boardType('skeleton');
  const result = buildBoard(engine, type, { ...defaultValues(type.settings), ...given } as never);
  if (!result.ok) throw new Error(`the skeleton did not build: ${result.problem}`);
  return keep(result.solid);
}

const THIN = { rimMm: 1.2, webMm: 1.2, coreMm: 0.8 };
const T = 5; // the board's thickness at its starting value
/** How many outlines the board's section has at a depth. */
const outlines = (b: Manifold, z: number) => keep(b.slice(z)).toPolygons().length;
/** Depths from just inside the back face's 0.6 mm flange to just inside the front's, every 0.25 mm. */
const DEPTHS = Array.from({ length: 18 }, (_, i) => 0.3 + 0.25 * i).concat([T - 0.3]);

describe('the thinnest Straight skeleton is joined through its whole depth (D519 a)', () => {
  for (const [widthMm, heightMm] of [
    [240, 200],
    [200, 240],
    [160, 160],
  ] as const) {
    it(`${widthMm} x ${heightMm} mm, open all round: every section has the faces' outlines, and the Curved one's genus`, () => {
      const size = { widthMm, heightMm };
      const straight = skeleton({ ...size, look: 'straight', ...THIN });
      const curved = skeleton({ ...size, look: 'curved', ...THIN });
      const atFaces = outlines(straight, 0.3);
      expect(outlines(straight, T - 0.3)).toBe(atFaces);
      // the Curved skeleton has as many outlines at its faces: the same members, the same pockets
      expect(outlines(curved, 0.3)).toBe(atFaces);
      for (const z of DEPTHS) expect(outlines(straight, z), `${z.toFixed(2)} mm deep`).toBe(atFaces);
      expect(straight.genus()).toBe(curved.genus());
    });
  }
});

describe("the Straight skeleton at its starting values is today's (D519 a)", () => {
  // measured on main at 311aee6, 28 Oct 2026, before the fix: a 160 x 160 mm board, open all round
  const BEFORE = { volume: 36408.03300693962, area: 46047.311214533765, tris: 42176, genus: 69 };
  it('the same volume, area, facets and genus as before', () => {
    const b = skeleton({ look: 'straight' });
    expect(Math.abs(b.volume() - BEFORE.volume)).toBeLessThan(1e-6);
    expect(Math.abs(b.surfaceArea() - BEFORE.area)).toBeLessThan(1e-6);
    expect(b.numTri()).toBe(BEFORE.tris);
    expect(b.genus()).toBe(BEFORE.genus);
  });
});

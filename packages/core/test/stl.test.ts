// The STL writer: binary STL, one record per triangle, a header no reader takes for text.
import { describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine.js';
import { meshOf, toStl } from '../src/stl.js';

describe('toStl', () => {
  it('writes 84 bytes of header and count, then 50 bytes per triangle', async () => {
    const { Manifold } = await loadEngine();
    const cube = Manifold.cube([10, 10, 10]);
    const mesh = meshOf(cube);
    const bytes = toStl(mesh, 'cube');
    const triangles = mesh.triangles.length / 3;
    expect(triangles).toBe(12);
    expect(bytes.length).toBe(84 + 50 * triangles);
    expect(new DataView(bytes.buffer).getUint32(80, true)).toBe(triangles);
    // a binary STL whose header starts with "solid" is misread as text by some readers
    expect(new TextDecoder().decode(bytes.slice(0, 5))).not.toBe('solid');
    cube.delete();
  });

  it('keeps every corner where the solid has it', async () => {
    const { Manifold } = await loadEngine();
    const cube = Manifold.cube([10, 20, 30]);
    const bytes = toStl(meshOf(cube), 'cube');
    const view = new DataView(bytes.buffer);
    let maxX = 0;
    let maxY = 0;
    let maxZ = 0;
    for (let t = 0; t < 12; t++) {
      for (let corner = 0; corner < 3; corner++) {
        const at = 84 + t * 50 + 12 + corner * 12;
        maxX = Math.max(maxX, view.getFloat32(at, true));
        maxY = Math.max(maxY, view.getFloat32(at + 4, true));
        maxZ = Math.max(maxZ, view.getFloat32(at + 8, true));
      }
    }
    expect([maxX, maxY, maxZ]).toEqual([10, 20, 30]);
    cube.delete();
  });
});

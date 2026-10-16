// 3MF and zip (backlog item download-3mf-zip; D181 to D183): a 3MF is an OPC zip of [Content_Types].xml,
// _rels/.rels and the model, in millimetres, one object for each part, set apart on the plate; a zip holds
// the files it is given. Each is read back here and measured.
import { strFromU8, unzipSync } from 'fflate';
import type { Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { loadEngine } from '../src/engine.js';
import { to3mf, zipFiles } from '../src/export3mf.js';
import { meshOf } from '../src/stl.js';

const engine = await loadEngine();
const made: Manifold[] = [];
afterAll(() => {
  for (const m of made) m.delete();
});
const cube = (x: number, y: number) => {
  const m = engine.Manifold.cube([x, y, 5]);
  made.push(m);
  return meshOf(m);
};

/** The model's objects, as name, vertex and triangle counts, and its build items' offsets. */
function readModel(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  const model = strFromU8(files['3D/3dModel.model'] ?? new Uint8Array());
  const objects = [...model.matchAll(/<object id="(\d+)" type="model" name="([^"]*)">(.*?)<\/object>/g)].map((m) => ({
    id: m[1],
    name: m[2],
    vertices: (m[3]?.match(/<vertex /g) ?? []).length,
    triangles: (m[3]?.match(/<triangle /g) ?? []).length,
  }));
  const items = [
    ...model.matchAll(/<item objectid="(\d+)" transform="1 0 0 0 1 0 0 0 1 ([-\d.]+) ([-\d.]+) 0"\/>/g),
  ].map((m) => ({ id: m[1], x: Number(m[2]), y: Number(m[3]) }));
  return { files: Object.keys(files).sort(), model, objects, items };
}

describe('to3mf', () => {
  it('is a 3MF package: the content types, the relationship and the model, in millimetres', () => {
    const { files, model } = readModel(to3mf([{ name: 'one', mesh: cube(40, 40) }]));
    expect(files).toEqual(['3D/3dModel.model', '[Content_Types].xml', '_rels/.rels']);
    expect(model).toContain('unit="millimeter"');
    expect(model).toContain('xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"');
  });

  it('holds one object for each part, its name and its every vertex and triangle (D182)', () => {
    const [a, b] = [cube(40, 40), cube(80, 40)];
    const { objects, items } = readModel(
      to3mf([
        { name: '40 x 40 mm, x 4', mesh: a },
        { name: '80 x 40 mm, x 1', mesh: b },
      ]),
    );
    expect(objects).toEqual([
      { id: '1', name: '40 x 40 mm, x 4', vertices: a.positions.length / 3, triangles: a.triangles.length / 3 },
      { id: '2', name: '80 x 40 mm, x 1', vertices: b.positions.length / 3, triangles: b.triangles.length / 3 },
    ]);
    expect(items.map((i) => i.id)).toEqual(['1', '2']); // one copy each: the slicer makes the rest
    // set apart on the plate, not on top of each other
    expect((items[1]?.x ?? 0) - (items[0]?.x ?? 0)).toBeGreaterThanOrEqual(40 + 10);
  });

  it('puts a part alone at the origin', () => {
    const m = engine.Manifold.cube([40, 40, 5]).translate([7, 9, 0]);
    made.push(m);
    const { items } = readModel(to3mf([{ name: 'moved', mesh: meshOf(m) }]));
    expect(items).toEqual([{ id: '1', x: -7, y: -9 }]);
  });

  it('writes a name with XML in it safely', () => {
    const { objects } = readModel(to3mf([{ name: 'a & b < "c" >', mesh: cube(40, 40) }]));
    expect(objects[0]?.name).toBe('a &amp; b &lt; &quot;c&quot; &gt;');
  });
});

describe('zipFiles', () => {
  it('holds the files given, byte for byte', () => {
    const zipped = zipFiles([
      { name: 'a.stl', bytes: new Uint8Array([1, 2, 3]) },
      { name: 'print-list.txt', bytes: new TextEncoder().encode('2 x 40 x 40 mm\n') },
    ]);
    const files = unzipSync(zipped);
    expect(Object.keys(files).sort()).toEqual(['a.stl', 'print-list.txt']);
    expect([...(files['a.stl'] ?? [])]).toEqual([1, 2, 3]);
    expect(strFromU8(files['print-list.txt'] ?? new Uint8Array())).toBe('2 x 40 x 40 mm\n');
  });
});

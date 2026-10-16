// 3MF and zip (backlog item download-3mf-zip; D181 to D183). Adapted from parametric-window-sealer's
// packages/core/src/export.ts (C32): 3MF follows the 3MF Core Specification, an OPC (zip) package holding
// [Content_Types].xml, _rels/.rels and the model at /3D/3dModel.model, in millimetres, with triangles wound
// counter-clockwise seen from outside, as Manifold winds them. A wall's 3MF holds one object for each kind of
// panel, named with how many to print, and leaves the copies to the slicer (D182). Whatever is generated is
// the user's (D8).
import { strToU8, zipSync } from 'fflate';
import type { MeshData } from './stl.js';

/** The gap left between parts set side by side on the plate, mm. */
const GAP_MM = 10;

const num = (n: number) => String(Math.round(n * 1e5) / 1e5);
const xmlAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** How much of the plate a mesh takes: its lowest corner and its size, mm. */
function footprint({ positions }: MeshData) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let v = 0; v < positions.length; v += 3) {
    const [x, y] = [positions[v] ?? 0, positions[v + 1] ?? 0];
    [minX, maxX, minY, maxY] = [Math.min(minX, x), Math.max(maxX, x), Math.min(minY, y), Math.max(maxY, y)];
  }
  return { minX, minY, width: maxX - minX };
}

function objectXml(id: number, name: string, { positions, triangles }: MeshData): string {
  const vertices: string[] = [];
  for (let v = 0; v < positions.length; v += 3) {
    vertices.push(
      `<vertex x="${num(positions[v] ?? 0)}" y="${num(positions[v + 1] ?? 0)}" z="${num(positions[v + 2] ?? 0)}"/>`,
    );
  }
  const tris: string[] = [];
  for (let t = 0; t < triangles.length; t += 3) {
    tris.push(`<triangle v1="${triangles[t]}" v2="${triangles[t + 1]}" v3="${triangles[t + 2]}"/>`);
  }
  return (
    `<object id="${id}" type="model" name="${xmlAttr(name)}"><mesh><vertices>${vertices.join('')}</vertices>` +
    `<triangles>${tris.join('')}</triangles></mesh></object>`
  );
}

const itemXml = (id: number, x: number, y: number) =>
  `<item objectid="${id}" transform="1 0 0 0 1 0 0 0 1 ${num(x)} ${num(y)} 0"/>`;

/** One 3MF of the parts given, each as it prints, set side by side from the origin in a row. */
export function to3mf(parts: readonly { name: string; mesh: MeshData }[]): Uint8Array {
  const objects: string[] = [];
  const items: string[] = [];
  let x = 0;
  parts.forEach(({ name, mesh }, i) => {
    const { minX, minY, width } = footprint(mesh);
    objects.push(objectXml(i + 1, name, mesh));
    items.push(itemXml(i + 1, x - minX, -minY));
    x += width + GAP_MM;
  });
  const model =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">' +
    `<resources>${objects.join('')}</resources><build>${items.join('')}</build></model>\n`;
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="model" ContentType="application/vnd.ms-package.3dmodel+xml"/>' +
    '</Types>\n';
  const rels =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Target="/3D/3dModel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>' +
    '</Relationships>\n';
  return zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rels),
    '3D/3dModel.model': strToU8(model),
  });
}

/** One zip of the files given, each under its own name (D183). */
export function zipFiles(files: readonly { name: string; bytes: Uint8Array }[]): Uint8Array {
  return zipSync(Object.fromEntries(files.map((f) => [f.name, f.bytes])));
}

/** The type each download says it is. */
export const MEDIA_TYPES = { stl: 'model/stl', '3mf': 'model/3mf', zip: 'application/zip' } as const;

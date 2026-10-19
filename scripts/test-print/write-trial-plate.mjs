// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the trial print as one plate (T193, T151; C234): the slot clip, its pegs ribbed, tried in boards already
// printed (D242; the lip it was tried against is taken out, D261), and an
// 80 x 80 mm lightened board on keyholes and its standoffs; each as the page downloads it, laid in rows 10 mm
// apart, into .check/test-print/. Reads the library's build, so run `npm run build -w skadis-air` first;
// `npm run trial-plate` does both and checks it.
//
//   node scripts/test-print/write-trial-plate.mjs [clips | keyhole]
//
// `clips` writes T193's part alone, the ribbed clip, as skadis-trial-clips.stl; `keyhole` T151's
// board alone, as skadis-trial-keyhole.stl.
// One file, as write-test-plate.mjs says why: PrusaSlicer's command line slices each input file on its own.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  boardFileName,
  boardType,
  buildBoard,
  defaultValues,
  loadEngine,
  meshOf,
  printedPart,
  readValues,
  toStl,
} from '../../packages/core/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, '.check', 'test-print');
const BED = { xMm: 250, yMm: 210 }; // an MK3S's
const GAP_MM = 10;
const CLIPS = [
  { id: 'slot-clip', given: { boards: '2' } }, // T193
];
const KEYHOLE = { id: 'lightened', given: { widthMm: 80, heightMm: 80, screwHead: 'keyhole', standoffs: 'back' } }; // T151
const only = process.argv[2];
const PARTS = only === 'clips' ? CLIPS : only === 'keyhole' ? [KEYHOLE] : [KEYHOLE, ...CLIPS];
const stem = only === 'clips' || only === 'keyhole' ? `skadis-trial-${only}` : 'skadis-trial-clips-keyhole';

const engine = await loadEngine();
const solids = PARTS.map(({ id, given }) => {
  const type = boardType(id);
  const read = readValues(type.settings, { ...defaultValues(type.settings), ...given });
  if (!read.ok) throw new Error(`${id}: ${read.errors.map((e) => e.message).join('; ')}`);
  const built = buildBoard(engine, type, read.values);
  if (!built.ok) throw new Error(`${id}: ${built.problem}`);
  return { name: boardFileName(type, read.values, 'stl'), solid: printedPart(type, built.solid) };
});

// In rows across the bed, left to right, a new row 10 mm behind the deepest part of the last.
let [x, y, rowDepth] = [0, 0, 0];
const placed = solids.map(({ name, solid }) => {
  const { min, max } = solid.boundingBox();
  const [w, d] = [max[0] - min[0], max[1] - min[1]];
  if (x > 0 && x + w > BED.xMm) [x, y, rowDepth] = [0, y + rowDepth + GAP_MM, 0];
  const moved = solid.translate([x - min[0], y - min[1], -min[2]]);
  console.log(`  ${name}: ${w.toFixed(0)} x ${d.toFixed(0)} x ${(max[2] - min[2]).toFixed(0)} mm`);
  [x, rowDepth] = [x + w + GAP_MM, Math.max(rowDepth, d)];
  return moved;
});
const plate = engine.Manifold.union(placed);

// The plate must be every part, apart, on the bed.
const parts = plate.decompose().length;
const box = plate.boundingBox();
if (parts !== PARTS.length) throw new Error(`the plate has ${parts} parts, expected ${PARTS.length}`);
if (box.max[0] > BED.xMm || box.max[1] > BED.yMm)
  throw new Error(`the plate is ${box.max[0].toFixed(0)} x ${box.max[1].toFixed(0)} mm, larger than the bed`);

mkdirSync(out, { recursive: true });
const file = join(out, `${stem}.stl`);
writeFileSync(file, toStl(meshOf(plate), 'Skadis Air trial print: slot clips and a keyhole board'));
writeFileSync(join(out, `${stem}.parts`), String(PARTS.length)); // for stl-check.sh (C107)
console.log(
  `${file}: ${parts} parts, ${box.max[0].toFixed(0)} x ${box.max[1].toFixed(0)} mm, ${plate.volume().toFixed(0)} mm3`,
);

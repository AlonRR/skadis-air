// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the parts the keyhole printability pass measures as built (D358, D369; docs/research/
// 2026-10-23-keyhole-printability.md) into .check/keyhole-parts/, each as one STL laid as the page downloads it, with
// its .parts beside it for stl-check.sh: T151's board, the 80 x 80 mm lightened board on keyholes and 15 mm standoffs;
// the same board with lock screws at the bottom, at the screw size, 4 mm, and of their own size, 2.5 mm, whose heads
// pass the slots, and 5 mm; a head wider than the slot gets a groove (A248, D479); and the slot clip for 2 boards with
// a keyhole, 15 mm deep. Prints each file's plastic, mm3, as JSON on the
// last line. Reads the library's build, so run `npm run build -w skadis-air` first; slice them one at a time:
//
//   node scripts/checks/write-keyhole-parts.mjs
//   FILAMENT="PETG Basic NPETG087-ZX" bash scripts/checks/stl-check.sh .check/keyhole-parts/<name>.stl
//   uv run --no-project python scripts/checks/overhang-report.py .check/keyhole-parts/<name>.gcode
//
// The pass's options, before the decisions, were written by this script's first form, write-keyhole-options.mjs,
// from the prototypes the decisions replaced (C381).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
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
const out = join(root, '.check', 'keyhole-parts');
const engine = await loadEngine();

/** A page type's part at its starting values and the given ones, as the page downloads it. */
function pagePart(id, given) {
  const type = boardType(id);
  const read = readValues(type.settings, { ...defaultValues(type.settings), ...given });
  if (!read.ok) throw new Error(`${id}: ${read.errors.map((e) => e.message).join('; ')}`);
  const built = buildBoard(engine, type, read.values);
  if (!built.ok) throw new Error(`${id}: ${built.problem}`);
  const printed = printedPart(type, built.solid);
  built.solid.delete();
  return printed;
}

const T151 = { widthMm: 80, heightMm: 80, screwHead: 'keyhole', standoffs: 'back', standoffHeightMm: 15 };
const PARTS = [
  { name: 't151-board', make: () => pagePart('lightened', T151) },
  { name: 't151-board-lock-screws', make: () => pagePart('lightened', { ...T151, lockScrews: 'bottom' }) },
  {
    name: 't151-board-lock-screws-2.5mm',
    make: () => pagePart('lightened', { ...T151, lockScrews: 'bottom', lockScrewSize: 'own', lockScrewMm: 2.5 }),
  },
  {
    name: 't151-board-lock-screws-5mm',
    make: () => pagePart('lightened', { ...T151, lockScrews: 'bottom', lockScrewSize: 'own', lockScrewMm: 5 }),
  },
  { name: 'slot-clip-2-keyhole', make: () => pagePart('slot-clip', { boards: '2', fixing: 'keyhole', depthMm: 15 }) },
];

rmSync(out, { recursive: true, force: true }); // never judge a file a previous run left behind
mkdirSync(out, { recursive: true });
const volumes = {};
for (const { name, make } of PARTS) {
  const solid = make();
  const parts = solid.decompose().length;
  if (parts !== 1) throw new Error(`${name}: ${String(parts)} parts`);
  const file = join(out, `${name}.stl`);
  writeFileSync(file, toStl(meshOf(solid), `Skadis Air keyhole parts: ${name}`));
  writeFileSync(join(out, `${name}.parts`), '1');
  const { min, max } = solid.boundingBox();
  volumes[name] = Math.round(solid.volume() * 100) / 100;
  const size = [0, 1, 2].map((k) => (max[k] - min[k]).toFixed(k < 2 ? 0 : 2)).join(' x ');
  console.log(`${file}: ${size} mm`);
  solid.delete();
}
console.log(JSON.stringify(volumes));

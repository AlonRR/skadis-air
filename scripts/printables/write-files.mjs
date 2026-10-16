// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the files for the Printables model page (D211, D212) into .check/printables/, each named as the page
// names it and laid as the page downloads it: the solid, lightened and skeleton boards at 200 x 200 mm (most beds)
// and 240 x 200 mm (a 250 x 210 mm bed), the fit coupon, the standoff for 1, 2 and 4 boards, and the slot clip
// side by side, one above the other and for 4 boards, each at the page's starting values. Reads the library's
// build; `npm run printables` at the repo root builds it, writes the files and checks each with stl-check.sh.
//
//   node scripts/printables/write-files.mjs
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
const out = join(root, '.check', 'printables');

const at = (id, given = {}) => {
  const type = boardType(id);
  return { type, values: { ...defaultValues(type.settings), ...given } };
};
const files = [
  ...['solid', 'lightened', 'skeleton'].flatMap((id) => [
    at(id, { widthMm: 200, heightMm: 200 }),
    at(id, { widthMm: 240, heightMm: 200 }),
  ]),
  at('fit-coupon'),
  ...['1', '2', '4'].map((boards) => at('standoff', { boards })),
  ...['2', '2-stacked', '4'].map((boards) => at('slot-clip', { boards })),
];

rmSync(out, { recursive: true, force: true }); // never upload a file a previous run left behind
mkdirSync(out, { recursive: true });
const engine = await loadEngine();
for (const { type, values } of files) {
  const read = readValues(type.settings, values);
  if (!read.ok) throw new Error(`${type.id}: ${read.errors.map((e) => e.message).join('; ')}`);
  const name = boardFileName(type, read.values, 'stl');
  const built = buildBoard(engine, type, read.values);
  if (!built.ok) throw new Error(`${name}: ${built.problem}`);
  const printed = printedPart(type, built.solid); // as the page downloads it: a board face down (D66)
  writeFileSync(join(out, name), toStl(meshOf(printed), name));
  console.log(`${name}  ${built.solid.volume().toFixed(0)} mm3`);
  printed.delete();
  built.solid.delete();
}
console.log(`${files.length} files in .check/printables/`);

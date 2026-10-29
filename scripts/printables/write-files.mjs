// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the files for the Printables model page (D211, D212) into .check/printables/, each named as the page
// names it and laid as the page downloads it, in a folder of its own named as the model page's folder (D525): the
// solid, lightened and skeleton boards at 200 x 200 mm with each of the page's mountings, the Straight look's
// lightened and skeleton boards, the standoff for 1, 2 and 4 boards, and the slot clip side by side, one above the
// other and for 4 boards, each at the page's starting values otherwise. Reads the library's build; `npm run
// printables` at the repo root builds it, writes the files and checks each with stl-check.sh.
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

const at = (folder, id, given = {}) => {
  const type = boardType(id);
  return { folder, type, values: { ...defaultValues(type.settings), ...given } };
};
const boards = (folder, mounting, ids = ['solid', 'lightened', 'skeleton']) =>
  ids.map((id) => at(folder, id, { widthMm: 200, heightMm: 200, ...mounting }));
const files = [
  ...boards('Skadis Boards with screw holes', {}),
  ...boards('Skadis Boards with round-head screw holes', { screwHead: 'round' }),
  ...boards('Skadis Boards with keyholes', { screwHead: 'keyhole', standoffs: 'back' }),
  ...boards('Skadis Boards with keyholes and lock screws', {
    screwHead: 'keyhole',
    lockScrews: 'bottom',
    standoffs: 'back',
  }),
  ...boards('Skadis Boards with lock screws', { screwHead: 'lock', standoffs: 'back' }),
  ...boards('Skadis Boards without screw holes', { screwHead: 'none' }),
  ...boards('Skadis Boards, Straight look, with screw holes', { look: 'straight' }, ['lightened', 'skeleton']),
  ...['1', '2', '4'].map((n) => at('Skadis standoffs', 'standoff', { boards: n })),
  ...['2', '2-stacked', '4'].map((n) => at('Skadis connectors', 'slot-clip', { boards: n })),
];

rmSync(out, { recursive: true, force: true }); // never upload a file a previous run left behind
mkdirSync(out, { recursive: true });
const engine = await loadEngine();
for (const { folder, type, values } of files) {
  const read = readValues(type.settings, values);
  if (!read.ok) throw new Error(`${type.id}: ${read.errors.map((e) => e.message).join('; ')}`);
  const name = boardFileName(type, read.values, 'stl');
  const built = buildBoard(engine, type, read.values);
  if (!built.ok) throw new Error(`${name}: ${built.problem}`);
  const printed = printedPart(type, built.solid); // as the page downloads it: a board face down (D66)
  mkdirSync(join(out, folder), { recursive: true });
  writeFileSync(join(out, folder, name), toStl(meshOf(printed), name));
  console.log(`${folder}/${name}  ${built.solid.volume().toFixed(0)} mm3`);
  printed.delete();
  built.solid.delete();
}
console.log(`${files.length} files in ${new Set(files.map((f) => f.folder)).size} folders in .check/printables/`);

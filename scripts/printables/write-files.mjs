// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the files for the Printables model page (D211, D212) into .check/printables/, laid as the page downloads
// them, each in a folder of its own named as the model page's folder (D525) and named for exactly what it is, every
// choice spelt out, where the page's own names leave out its starting values (C85; the owner, 29 Oct 2026: "name
// and rename files and folders according to exactly what they are"): the solid, lightened and skeleton boards at
// 200 x 200 mm with each of the page's mountings, the lattice boards in both looks, the standoff for each way boards
// meet, and the slot clip for each seam, way boards meet and fixing. Reads the library's build; `npm run printables`
// at the repo root builds it, writes the files and checks each with stl-check.sh.
//
//   node scripts/printables/write-files.mjs
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
const out = join(root, '.check', 'printables');

const at = (folder, name, id, given = {}) => {
  const type = boardType(id);
  return { folder, name: `${name}.stl`, type, values: { ...defaultValues(type.settings), ...given } };
};

const MOUNTINGS = [
  ['countersunk screw holes', 'countersunk-screw-holes', {}],
  ['round-head screw holes', 'round-head-screw-holes', { screwHead: 'round' }],
  ['keyholes, on standoffs', 'keyholes-15mm-standoffs', { screwHead: 'keyhole', standoffs: 'back' }],
  [
    'keyholes+lock screws, on standoffs',
    'keyholes-lock-screws-15mm-standoffs',
    { screwHead: 'keyhole', lockScrews: 'bottom', standoffs: 'back' },
  ],
  ['lock screws, on standoffs', 'lock-screws-15mm-standoffs', { screwHead: 'lock', standoffs: 'back' }],
  ['no screw holes', 'no-screw-holes', { screwHead: 'none' }],
];
// the solid board has no look; the lattice boards come Curved, as the page starts, and Straight with screw holes
const board = (folder, id, look, mountingName, mounting) =>
  at(folder, `skadis-${id}${look ? `-${look}` : ''}-200x200mm-${mountingName}`, id, {
    widthMm: 200,
    heightMm: 200,
    ...(look ? { look } : {}),
    ...mounting,
  });
const boards = MOUNTINGS.flatMap(([folder, mountingName, mounting]) => [
  board(`Skadis boards 200x200mm, ${folder}`, 'solid', '', mountingName, mounting),
  board(`Skadis boards 200x200mm, ${folder}`, 'lightened', 'curved', mountingName, mounting),
  board(`Skadis boards 200x200mm, ${folder}`, 'skeleton', 'curved', mountingName, mounting),
]);
const straight = ['lightened', 'skeleton'].map((id) =>
  board('Skadis boards 200x200mm, Straight, countersunk screw holes', id, 'straight', 'countersunk-screw-holes', {}),
);

const MEET = {
  1: '1-board-at-a-corner',
  2: '2-boards-side-by-side',
  '2-stacked': '2-boards-one-above-the-other',
  4: '4-boards-where-four-corners-meet',
};
const standoffs = ['1', '2', '2-stacked', '4'].map((n) =>
  at('Skadis standoffs 15mm', `skadis-standoff-${MEET[n]}-15mm`, 'standoff', { boards: n }),
);

const FIXINGS = [
  ['countersunk-screw', { fixing: 'screw' }],
  ['round-head-screw', { fixing: 'screw', screwHead: 'round' }],
  ['keyhole', { fixing: 'keyhole' }],
  ['no-fixing', { fixing: 'none' }],
];
// a clip for a seam between the slots joins 2 boards side by side or one above the other, the same clip (D290 a)
const clips = [
  ...['2', '2-stacked', '4'].map((n) => ['through the slots', 'through-the-slots', MEET[n], { boards: n }]),
  [
    'between the slots',
    'between-the-slots',
    '2-boards-side-by-side-or-one-above-the-other',
    { boards: '2', seams: 'between' },
  ],
].flatMap(([seam, seamName, meet, given]) =>
  FIXINGS.map(([fixingName, fixing]) =>
    at(
      `Skadis slot clips 15mm deep, seams ${seam}`,
      `skadis-slot-clip-${meet}-seam-${seamName}-15mm-${fixingName}`,
      'slot-clip',
      {
        ...given,
        ...fixing,
      },
    ),
  ),
);
const files = [...boards, ...straight, ...clips, ...standoffs]; // the model page's order
// Printables takes a folder's name to 60 characters and a file's to 146
for (const { folder, name } of files)
  if (folder.length > 60 || name.length - 4 > 146) throw new Error(`${folder}/${name}: too long`);
if (new Set(files.map((f) => f.name)).size !== files.length) throw new Error('two files share a name');

rmSync(out, { recursive: true, force: true }); // never upload a file a previous run left behind
mkdirSync(out, { recursive: true });
const engine = await loadEngine();
for (const { folder, name, type, values } of files) {
  const read = readValues(type.settings, values);
  if (!read.ok) throw new Error(`${type.id}: ${read.errors.map((e) => e.message).join('; ')}`);
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

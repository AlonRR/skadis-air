// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes a set of sample boards as STL into .check/boards/, for scripts/checks/stl-check.sh to judge.
// Reads the library's build, so run `npm run build -w skadis-ultralight-generator` first;
// `npm run check:stl` at the repo root does both, then the check.
//
//   node scripts/checks/write-sample-boards.mjs
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine, makeSolidBoard, meshOf, solidBoardParams, toStl } from '../../packages/core/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, '.check', 'boards');

const open = { left: 'open', right: 'open', bottom: 'open', top: 'open' };
const closed = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };

// One of each kind of edge: open all round, closed all round with rounded corners, both on one
// board, and the largest a 250 x 210 mm bed takes (240 x 200 mm).
const samples = [
  { name: 'solid-1x1-open', given: { columns: 1, rows: 1, sides: open } },
  { name: 'solid-1x1-closed', given: { columns: 1, rows: 1, sides: closed } },
  {
    name: 'solid-2x2-left-bottom-closed',
    given: { columns: 2, rows: 2, sides: { ...open, left: 'closed', bottom: 'closed' } },
  },
  { name: 'solid-3x2-closed', given: { columns: 3, rows: 2, sides: closed } },
  { name: 'solid-6x5-open', given: { columns: 6, rows: 5, sides: open } },
];

rmSync(out, { recursive: true, force: true }); // never judge a file a previous run left behind
mkdirSync(out, { recursive: true });
const engine = await loadEngine();
for (const { name, given } of samples) {
  const board = makeSolidBoard(engine, solidBoardParams(given));
  writeFileSync(join(out, `${name}.stl`), toStl(meshOf(board), name));
  console.log(`${name}.stl  volume ${board.volume().toFixed(1)} mm3  genus ${board.genus()}`);
  board.delete();
}

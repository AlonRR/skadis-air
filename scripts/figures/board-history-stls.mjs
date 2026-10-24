// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Each history state's 200 x 200 mm board as an STL, from that state's own library build, into
// .check/board-history-stl/<label>.stl and solid-<label>.stl, to slice (board-history.mjs names the states).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HISTORY } from './board-history.mjs';
import { makeKit } from './kit.mjs';

const root = process.env.HIST_ROOT ?? join(process.cwd(), '..');
const out = join(process.cwd(), '.check', 'board-history-stl');
mkdirSync(out, { recursive: true });
const big = { widthMm: 200, heightMm: 200 };
const state = async (s) => {
  const kit = await makeKit(join(root, s.tree));
  const stl = kit.lib.toStl;
  if (typeof stl !== 'function') throw new Error(`${s.label}: this build has no toStl`);
  for (const [name, type] of [
    [s.label, s.type],
    [`solid-${s.label}`, 'solid'],
  ]) {
    const solid = kit.built(type, big);
    writeFileSync(join(out, `${name}.stl`), stl(kit.lib.meshOf(solid), name));
    console.log(join(out, `${name}.stl`));
  }
};
// one library build at a time
await HISTORY.reduce((done, s) => done.then(() => state(s)), Promise.resolve());

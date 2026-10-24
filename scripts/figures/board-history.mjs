// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The lightened and skeleton boards as earlier designs built them (24 Oct 2026), so the owner can say which to bring
// back as options: each state is one commit of the library, built in a worktree of its own, and drawn from the same
// camera, three views of the same 160 x 160 mm board at its type's starting values. The worktrees are made by hand:
//
//   git worktree add --detach <dir> <commit>; npm ci; npm run build -w skadis-air      (in each)
//
// and named in HISTORY below by HIST_ROOT (default: ../ beside this repository's worktrees). BH_ONLY=l1,s3 draws
// only those states. The numbers (volume of a 200 x 200 mm board against the solid one) go to numbers.json.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeKit } from './kit.mjs';

const root = process.env.HIST_ROOT ?? join(process.cwd(), '..');

/** The states: label, type, worktree, release, date, the one line on it. */
export const HISTORY = [
  {
    label: 'L1',
    type: 'lightened',
    tree: 'skadis-air-v0.2.1',
    commit: '6dbdd41',
    release: 'v0.2.1',
    date: '15 Oct 2026',
    line: 'As first built: pockets with 1 mm round corners, square edges, no V groove.',
  },
  {
    label: 'L2',
    type: 'lightened',
    tree: 'skadis-air-hist-v030',
    commit: 'f32fb47 + 67a4a85',
    release: 'v0.3.0',
    date: '21 Oct 2026',
    line: 'After the design pass: pocket corners on long eased curves (D278), 1 mm edge chamfers (D276).',
  },
  {
    label: 'L3',
    type: 'lightened',
    tree: 'skadis-air-hist-v080',
    commit: 'a134f59',
    release: 'v0.8.0',
    date: '24 Oct 2026',
    line: "Today's: the same lattice as L2; the changes since are in the mounting, not in these views.",
  },
  {
    label: 'S1',
    type: 'skeleton',
    tree: 'skadis-air-v0.2.1',
    commit: 'f0d815a',
    release: 'v0.2.1',
    date: '15 Oct 2026',
    line: 'As first built: every member an I-beam, 1.2 mm core, sharp pocket corners.',
  },
  {
    label: 'S2',
    type: 'skeleton',
    tree: 'skadis-air-hist-v030',
    commit: 'f32fb47 + af8b6d1',
    release: 'v0.3.0',
    date: '21 Oct 2026',
    line: 'After the design pass: eased pocket corners, edge chamfers, a simpler mesh.',
  },
  {
    label: 'S3',
    type: 'skeleton',
    tree: 'skadis-air-hist-v080',
    commit: 'a134f59',
    release: 'v0.8.0',
    date: '24 Oct 2026',
    line: "Today's: v0.4.2's profile, on main again since the revert 8983c3a.",
  },
  {
    label: 'S4',
    type: 'skeleton',
    tree: 'skadis-air-hist-s4',
    commit: '72aabde',
    release: 'never released',
    date: '23 Oct 2026',
    line: 'The slimmer stepped skeleton (D314): steps to a 0.9 mm core behind the front flange.',
  },
  {
    label: 'S5',
    type: 'skeleton',
    tree: 'skadis-air-hist-s5',
    commit: 'c500966',
    release: 'never released',
    date: '24 Oct 2026',
    line: 'The reworked profile (D408), on branch feat/skeleton-rework-r2b.',
  },
];

const T = 5; // the board's thickness
const CUT_AT = 30; // the section is cut across the diagonal members where the line x + y = 2 * CUT_AT crosses them

/** The three views of one state; `kit` is the kit of that state's library. */
function viewsOf(s, kit) {
  const { box, mesh, built, COLOURS } = kit;
  const board = built(s.type, { widthMm: 160, heightMm: 160 });
  const head = `${s.label} · ${s.type === 'lightened' ? 'Lightened' : 'Skeleton'} board`;
  const caption = [`${s.date} · ${s.release} · ${s.commit}`, s.line];
  const grey = [['the board, 160 x 160 mm, starting values', COLOURS.grey]];
  const out = [];
  out.push({
    id: `${s.label.toLowerCase()}-front`,
    title: `${head} · front, three-quarter`,
    caption,
    legend: grey,
    camera: { position: [215, -95, 190], target: [80, 70, 0], fov: 38 },
    labels: [],
    meshes: [mesh(board, COLOURS.grey)],
  });
  out.push({
    id: `${s.label.toLowerCase()}-close`,
    title: `${head} · where members meet`,
    caption,
    legend: grey,
    camera: { position: [78, -22, 70], target: [24, 24, 2.5], fov: 30 },
    labels: [],
    meshes: [mesh(board, COLOURS.grey)],
  });
  // the board turned so a plane across the diagonal members is x = 0: its point (CUT_AT, CUT_AT) at the origin, the
  // diagonal along x
  const turned = board.translate([-CUT_AT, -CUT_AT, 0]).rotate([0, 0, -45]);
  const half = turned.intersect(box(-120, 0, -120, 120, -1, T + 1));
  const face = box(-0.3, 0, -120, 120, -1, T + 1);
  out.push({
    id: `${s.label.toLowerCase()}-cut`,
    title: `${head} · cut across the diagonal members`,
    caption,
    legend: [
      ['the cut face', COLOURS.orange],
      ['the board beyond the cut', COLOURS.grey],
    ],
    camera: { position: [200, 0, 2.5], target: [0, 0, 2.5], fov: 5 },
    labels: [],
    meshes: [mesh(half.subtract(face), COLOURS.grey), mesh(half.intersect(face), COLOURS.orange)],
  });
  return out;
}

export async function build() {
  const only = process.env.BH_ONLY?.toLowerCase().split(',');
  const scenes = [];
  const numbers = {};
  const state = async (s) => {
    const kit = await makeKit(join(root, s.tree));
    scenes.push(...viewsOf(s, kit));
    const big = { widthMm: 200, heightMm: 200 };
    const [solid, board] = [kit.built('solid', big), kit.built(s.type, big)];
    numbers[s.label] = { solidMm3: solid.volume(), boardMm3: board.volume() };
    console.log(s.label, JSON.stringify(numbers[s.label]));
  };
  // one library build at a time, the scenes in the states' order
  await HISTORY.filter((s) => !only || only.includes(s.label.toLowerCase())).reduce(
    (done, s) => done.then(() => state(s)),
    Promise.resolve(),
  );
  writeFileSync(
    join(process.cwd(), '.check', 'figures', 'board-history', 'numbers.json'),
    JSON.stringify(numbers, null, 2),
  );
  return scenes;
}

// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the parts the physics runs load (D323, D324, Q327) as STL, each with a JSON of what the runs need: the
// part's own volume from Manifold (the meshes' volume control), its layers' normal, and its load cases, each a set of
// fixed surfaces and loads named by where they lie. Every part is written as it hangs: x across, y up the wall, the
// board's front toward +z, its back face on z = 0 (C42).
//
//   node scripts/physics/write-parts.mjs                      today's library (run `npm run build -w skadis-air` first)
//   node scripts/physics/write-parts.mjs --lib <dir> --version v0.2.1 --boards-only
//                                                            an older release's library, built in its own worktree
//
// Out: .check/physics/parts/<version>/<name>.stl and <name>.json; with --controls, the volume control's coupon in
// .check/physics/controls/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { values: args } = parseArgs({
  options: {
    lib: { type: 'string', default: join(root, 'packages', 'core', 'dist', 'index.js') },
    version: { type: 'string', default: 'today' },
    'boards-only': { type: 'boolean', default: false },
    types: { type: 'string' },
    controls: { type: 'boolean', default: false },
  },
});
const lib = await import(pathToFileURL(resolve(args.lib.endsWith('.js') ? args.lib : join(args.lib, 'index.js'))).href);
const { boardType, buildBoard, defaultValues, loadEngine, meshOf, toStl, screwPlaces, screwHole, keyhole } = lib;

// --- the loads (Q325): IKEA publishes no rating (docs/skadis-standard.md), so each case is run at a reference load
// and its results scale with it; the hook's geometry is IKEA's depth and the replica hook's tab (C332)
const REF_N = 10; // the reference load, N: one hook's, the spread load's total, or a connector's
const HOOK = {
  depthMm: 25, // IKEA's small hook, 203.208.02: "Depth 2.5 cm"; the load hangs at most this far in front of the board
  widthMm: 4.5, // the replica's back tab, 4.5 mm wide (docs/skadis-standard.md)
  dropMm: 8.25, // the tab reaches 8.25 mm below the slot's bottom end
  pegBelowMm: 40, // its second peg goes through the slot 40 mm below
};
const T = 5; // every board here is 5 mm thick, the starting value of each version
const STANDOFF_MM = 15; // one standoff height for every version, today's starting value (C335)
const CLOSED = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };

const out = join(root, '.check', 'physics', args['controls'] ? 'controls' : join('parts', args.version));
mkdirSync(out, { recursive: true });
const engine = await loadEngine();
const { Manifold } = engine;

/** A slot's half width and half height as the board cuts it, with its clearance. */
const slotHalf = (values) => [(5 + values.slotClearanceMm) / 2, (15 + values.slotClearanceMm) / 2];

/** A hook in the slot whose middle is (x, y), with its peg in the slot 40 mm below. */
const hook = (values, [x, y], w) => {
  const [hw, hh] = slotHalf(values);
  return { hook: { slot: [x, y], halfWidth: hw, halfHeight: hh, thickness: T, force: w, ...HOOK } };
};

/** Whole slots of a closed board of this many tiles, and those that take a hook: a whole slot 40 mm below them. */
function hookable(columns, rows) {
  const whole = [];
  for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) whole.push([40 * i + 20, 40 * j + 20]);
  for (let i = 1; i < columns; i++) for (let j = 1; j < rows; j++) whole.push([40 * i, 40 * j]);
  const has = (x, y) => whole.some(([a, b]) => Math.abs(a - x) < 1e-6 && Math.abs(b - y) < 1e-6);
  return whole.filter(([x, y]) => has(x, y - 40));
}

// --- what holds a part (C333): each mounting's bearing surface, fixed
const countersinks = (values, places) => {
  const { holeMm, countersinkMm } = screwHole(values.screwMm);
  const depth = (countersinkMm - holeMm) / 2;
  return places.map(([x, y]) => ({
    label: 'countersink',
    rho: { centre: [x, y], range: [holeMm / 2 - 0.02, countersinkMm / 2 + 0.02] },
    box: [
      [-1e9, -1e9, T - depth - 0.02],
      [1e9, 1e9, T + 0.02],
    ],
    normal: [0, 0, 1],
    minDot: 0.5,
  }));
};
const standoffFaces = (h) => [
  {
    label: 'standoff wall face',
    box: [
      [-1e9, -1e9, -h - 0.02],
      [1e9, 1e9, -h + 0.02],
    ],
    normal: [0, 0, -1],
    minDot: 0.99,
  },
];
/** The keyholes' lips, where the screw's head bears: today's are cut in the top standoffs' wall faces (D235), v0.2.1's
 * in the board's front, the head in a channel there; the head is 2 x the screw across (D157). */
function keyholeLips(values, board) {
  const k = keyhole(values.screwMm);
  const headR = values.screwMm;
  let rests;
  let lipZ;
  if (typeof lib.wallKeyholeCutter === 'function') {
    rests = lib.keyholePlaces(board, values.screwMm).map(([x, y]) => [x, y + k.slideMm / 2]);
    lipZ = -STANDOFF_MM + lib.KEYHOLE_LIPS_MM;
  } else {
    rests = screwPlaces(board).slice(2);
    lipZ = T - k.channelMm;
  }
  return rests.map(([x, y]) => ({
    label: 'keyhole lip',
    rho: { centre: [x, y], range: [0, headR + 0.02] },
    box: [
      [-1e9, -1e9, lipZ - 0.02],
      [1e9, 1e9, lipZ + 0.02],
    ],
    normal: [0, 0, 1],
    minDot: 0.99,
  }));
}

/** The cut faces of a window taken out of a board: fixed (C334). */
const windowCuts = ([[x0, y0], [x1, y1]], board) =>
  [
    [x0, [-1, 0, 0], 0],
    [x1, [1, 0, 0], 0],
    [y0, [0, -1, 0], 1],
    [y1, [0, 1, 0], 1],
  ]
    .filter(([v, , axis]) => v > 0.5 && v < (axis === 0 ? board[0] : board[1]) - 0.5)
    .map(([v, n, axis]) => {
      const lo = [-1e9, -1e9, -1e9];
      const hi = [1e9, 1e9, 1e9];
      lo[axis] = v - 0.02;
      hi[axis] = v + 0.02;
      return { label: 'window cut', box: [lo, hi], normal: n, minDot: 0.99 };
    });

const written = [];
function write(name, solid, meta) {
  const bb = solid.boundingBox();
  const parts = solid.decompose();
  const bodies = parts.length;
  for (const p of parts) p.delete();
  const json = { name, version: args.version, volume: solid.volume(), genus: solid.genus(), bodies, bbox: bb, ...meta };
  writeFileSync(join(out, `${name}.stl`), toStl(meshOf(solid), name));
  writeFileSync(join(out, `${name}.json`), JSON.stringify(json, null, 1));
  written.push(name);
  console.log(
    `${args.version}/${name}.stl  ${solid.volume().toFixed(1)} mm3  ${bodies} bod${bodies === 1 ? 'y' : 'ies'}`,
  );
}

function build(typeId, values) {
  const type = boardType(typeId);
  const built = buildBoard(engine, type, { ...defaultValues(type.settings), ...values });
  if (!built.ok) throw new Error(`${typeId}: ${built.problem}`);
  return built.solid;
}

const box = ([x0, y0, z0], [x1, y1, z1]) => Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);

if (args.controls) {
  // the volume control's coupon: a solid board with 45 degree chamfers round every slot and edge, and countersinks
  const values = { widthMm: 80, heightMm: 80, sides: CLOSED };
  write('coupon', build('solid', values), { type: 'solid', values });
  process.exit(0);
}

const boardTypes = (args.types ?? 'solid,lightened,skeleton').split(',');
for (const typeId of boardTypes) {
  const base = { ...defaultValues(boardType(typeId).settings), thicknessMm: T };
  const layer = { layerNormal: [0, 0, 1], prints: 'face down' }; // a board prints face down (D66)

  // 1. a hook in the board's middle and at its edge (Q325), in windows of the 160 mm board (C334)
  {
    const values = { ...base, widthMm: 160, heightMm: 160, sides: CLOSED };
    const board = build(typeId, values);
    const windows = {
      'hook-mid': {
        slot: [80, 80],
        window: [
          [50, 5],
          [110, 110],
        ],
      },
      'hook-edge': {
        slot: [20, 100],
        window: [
          [-1, 45],
          [50, 125],
        ],
      },
    };
    for (const [id, w] of Object.entries(windows)) {
      const cutter = box([w.window[0][0], w.window[0][1], -50], [w.window[1][0], w.window[1][1], 50]);
      // the window's largest body: a member's stub the cut leaves apart from it is left out (C334)
      const cut = board.intersect(cutter);
      const bodies = cut.decompose();
      bodies.sort((a, b) => b.volume() - a.volume());
      const part = bodies[0];
      for (const b of bodies.slice(1)) b.delete();
      cut.delete();
      const [x, y] = w.slot;
      write(`${typeId}-${id}`, part, {
        type: typeId,
        values,
        ...layer,
        cases: [
          {
            id,
            fixed: windowCuts(w.window, [160, 160]),
            loads: [hook(values, w.slot, REF_N)],
            refine: [
              { centre: [x, y, T / 2], radius: 12 },
              { centre: [x, y - HOOK.pegBelowMm, T / 2], radius: 9 },
            ],
          },
        ],
      });
      for (const m of [cutter, part]) m.delete();
    }
    // the whole board on its corner screws, the page's starting mounting: the hook cases as reported (C334)
    const screws = countersinks(values, screwPlaces({ columns: 4, rows: 4, sides: CLOSED }));
    write(`${typeId}-160`, board, {
      type: typeId,
      values,
      ...layer,
      cases: Object.entries(windows).map(([id, w]) => ({
        id,
        mesh: 'whole-160',
        fixed: screws,
        loads: [hook(values, w.slot, REF_N)],
        refine: [
          { centre: [w.slot[0], w.slot[1], T / 2], radius: 12 },
          { centre: [w.slot[0], w.slot[1] - HOOK.pegBelowMm, T / 2], radius: 9 },
          ...screwPlaces({ columns: 4, rows: 4, sides: CLOSED }).map(([x, y]) => ({
            centre: [x, y, T / 2],
            radius: 8,
          })),
        ],
      })),
    });
    board.delete();
  }

  // 2. the load spread over an 80 mm board, carried by each mounting (Q325, C335)
  const small = { ...base, widthMm: 80, heightMm: 80, sides: CLOSED };
  const grid = { columns: 2, rows: 2, sides: CLOSED };
  const hooks = hookable(2, 2);
  const spread = hooks.map((s) => hook(small, s, REF_N / hooks.length));
  const near = (places, r = 10) => places.map(([x, y]) => ({ centre: [x, y, T / 2], radius: r }));
  const hookRefine = hooks.flatMap(([x, y]) => [
    { centre: [x, y, T / 2], radius: 8 },
    { centre: [x, y - HOOK.pegBelowMm, T / 2], radius: 6 },
  ]);
  const mountings = {
    screws: { values: { screwHead: 'countersunk', standoffs: 'none' } },
    standoffs: { values: { screwHead: 'countersunk', standoffs: 'back', standoffHeightMm: STANDOFF_MM } },
    keyholes: { values: { screwHead: 'keyhole', standoffs: 'back', standoffHeightMm: STANDOFF_MM } },
  };
  for (const [id, m] of Object.entries(mountings)) {
    const values = { ...small, ...m.values };
    const solid = build(typeId, values);
    let fixed;
    let places;
    if (id === 'screws') {
      places = screwPlaces(grid);
      fixed = countersinks(values, places);
    } else if (id === 'standoffs') {
      places = screwPlaces(grid);
      fixed = standoffFaces(STANDOFF_MM);
    } else {
      fixed = keyholeLips(values, grid);
      places = fixed.map((f) => f.rho.centre);
    }
    write(`${typeId}-80-${id}`, solid, {
      type: typeId,
      values,
      ...layer,
      cases: [
        {
          id: `spread-${id}`,
          fixed,
          loads: spread,
          refine: [...near(places), ...hookRefine],
        },
      ],
    });
    solid.delete();
  }
}

if (!args['boards-only']) {
  // 3. the standoff: its wall face fixed, its board face carrying a board's share as a shear down the wall (C336)
  for (const boards of ['1', '4']) {
    const values = { boards, heightMm: STANDOFF_MM, screwMm: 4 };
    const solid = build('standoff', values);
    const bb = solid.boundingBox();
    // the posts over the corner screws: one ring for 1 board, four on a 20 mm square for 4 (D281)
    const posts =
      boards === '1'
        ? [[0, 0]]
        : [
            [-10, -10],
            [10, -10],
            [-10, 10],
            [10, 10],
          ];
    write(`standoff-${boards}`, solid, {
      type: 'standoff',
      values,
      layerNormal: [0, 0, 1],
      prints: 'as built, wall face down',
      cases: [
        {
          id: 'shear',
          fixed: [
            {
              label: 'wall face',
              box: [
                [-1e9, -1e9, -0.02],
                [1e9, 1e9, 0.02],
              ],
              normal: [0, 0, -1],
              minDot: 0.99,
            },
          ],
          loads: [
            {
              label: 'board face',
              select: {
                box: [
                  [-1e9, -1e9, bb.max[2] - 0.02],
                  [1e9, 1e9, bb.max[2] + 0.02],
                ],
                normal: [0, 0, 1],
                minDot: 0.99,
              },
              force: [0, -REF_N, 0],
            },
          ],
          // the posts' ends, where a cantilever's bending peaks: at the wall face and under the board
          refine: posts.flatMap(([x, y]) => [
            { centre: [x, y, 0], radius: 7 },
            { centre: [x, y, bb.max[2]], radius: 7 },
          ]),
        },
      ],
    });
    solid.delete();
  }

  // 4. the slot clip: one peg held in its board's slot, the other carrying the next board's share (C336)
  {
    const values = { boards: '2', fixing: 'none', pegClearanceMm: 0.4 };
    const solid = build('slot-clip', values);
    const depth = 15;
    const peg = (x) => [
      [x - 4, -9, depth - 0.02],
      [x + 4, 9, depth + T + 0.02],
    ];
    write('slot-clip-2', solid, {
      type: 'slot-clip',
      values,
      layerNormal: [0, 0, 1],
      prints: 'as built, wall face down',
      cases: [
        {
          id: 'shear',
          fixed: [{ label: 'peg in its slot', box: peg(-20), normal: [0, 0, 1], minDot: -1.01 }],
          loads: [
            {
              label: "peg's top, under the slot's end",
              select: { box: peg(20), normal: [0, 1, 0], minDot: 0.5 },
              force: [0, -REF_N, 0],
            },
          ],
          refine: [
            { centre: [-20, 0, depth], radius: 8 },
            { centre: [20, 0, depth], radius: 8 },
          ],
        },
      ],
    });
    solid.delete();
  }

  // 5. walls (Q327): two 80 x 120 mm panels side by side, one slot clip behind the seam, bonded (C337)
  for (const typeId of boardTypes) {
    const base = { ...defaultValues(boardType(typeId).settings), thicknessMm: T, widthMm: 80, heightMm: 120 };
    // the panels butt at x = 80 and the clip's pegs fill their slots, all one solid; then a 0.2 mm slit along the
    // seam through the boards alone, so the panels meet only through the clip (C337). The pegs, at no clearance, are
    // the 5.2 x 15.2 mm slot of the starting clearance; the panels' slots are cut at 0.1 mm clearance and the clip
    // stands 0.05 mm into the boards' backs, so the parts overlap rather than share faces, which left the union's
    // surface folded on itself where they met
    const panel = { ...base, slotClearanceMm: 0.1 };
    const left = build(typeId, { ...panel, sides: { ...CLOSED, right: 'open' } });
    const rightBoard = build(typeId, { ...panel, sides: { ...CLOSED, left: 'open' } });
    const right = rightBoard.translate([80, 0, 0]);
    const clipSolid = build('slot-clip', { boards: '2', fixing: 'none', pegClearanceMm: 0 });
    const clip = clipSolid.translate([80, 60, -15 + 0.05]);
    // where a peg fills its slot, the post seals the slot's back chamfer round its root into a closed void: filled
    const union = Manifold.union([left, right, clip]);
    const shells = union.decompose();
    const joined = Manifold.compose(shells.filter((m) => m.volume() > 0));
    for (const m of [union, ...shells]) m.delete();
    const slit = box([80 - 0.1, -1, -0.5], [80 + 0.1, 121, T + 0.5]);
    const wall = joined.subtract(slit);
    const values = {
      ...panel,
      wall: '2 panels 80 x 120 mm side by side',
      seamSlitMm: 0.2,
      clip: { boards: '2', pegClearanceMm: 0, at: [80, 60] },
    };
    const screws = [
      ...screwPlaces({ columns: 2, rows: 3, sides: CLOSED }),
      ...screwPlaces({ columns: 2, rows: 3, sides: CLOSED }).map(([x, y]) => [x + 80, y]),
    ];
    const outer = screws.filter(([x]) => x < 20 || x > 140);
    const seamHook = hook(panel, [80, 80], REF_N);
    const wallHooks = [
      [20, 60],
      [60, 60],
      [20, 100],
      [60, 100],
      [40, 80],
      [100, 60],
      [140, 60],
      [100, 100],
      [140, 100],
      [120, 80],
      [80, 80],
    ];
    const refine = [
      { centre: [80, 80, T / 2], radius: 12 },
      { centre: [80, 40, T / 2], radius: 9 },
      { centre: [60, 60, 0], radius: 8 },
      { centre: [100, 60, 0], radius: 8 },
    ];
    write(`${typeId}-wall-2`, wall, {
      type: typeId,
      values,
      layerNormal: [0, 0, 1],
      prints: 'face down (panels); the clip as built, its layers the same way',
      cases: [
        { id: 'wall-seam-hook', fixed: countersinks(base, screws), loads: [seamHook], refine },
        {
          id: 'wall-spread',
          fixed: countersinks(base, screws),
          loads: wallHooks.map((s) => hook(panel, s, REF_N / wallHooks.length)),
          refine,
        },
        { id: 'wall-seam-hook-outer-screws', fixed: countersinks(base, outer), loads: [seamHook], refine },
      ],
    });
    for (const m of [left, rightBoard, right, clipSolid, clip, joined, slit, wall]) m.delete();
  }
}
writeFileSync(join(out, 'index.json'), JSON.stringify(written, null, 1));

// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The figures that explain three open questions to the owner (24 Oct 2026): D437 (the reworked skeleton builds about
// twice as slowly), D439 (the keyhole boards' weak spot) and D370's consequence (lock screws of the same size as the
// rest). Each part is the library's own; the place a picture is about is orange. Run
//
//   SKADIS_R2B_REPO=<checkout of feat/skeleton-rework-r2b, built> node scripts/figures/shoot.mjs explain
//
// D437's pictures set the skeleton of that branch beside its D314 profile; D439 reads the saved physics runs
// (`SKADIS_PHYSICS_DIR`, a `.check/physics` folder: its `parts/` for the shape and the stress meshes the
// explain-stress.py script wrote). `EXPLAIN_ONLY=id,id` draws only those scenes.
import { existsSync, readFileSync } from 'node:fs';
import { makeKit } from './kit.mjs';

const only = process.env.EXPLAIN_ONLY?.split(',');
const wanted = (id) => only === undefined || only.includes(id);

export async function build(kit) {
  const scenes = [];
  const r2b = process.env.SKADIS_R2B_REPO;
  if (r2b && skeletonIds.some(wanted)) scenes.push(...(await skeletonScenes(r2b)));
  if (keyholeIds.some(wanted)) scenes.push(...keyholeScenes(kit));
  if (lockScrewIds.some(wanted)) scenes.push(...lockScrewScenes(kit));
  return scenes.filter((s) => wanted(s.id));
}

const skeletonIds = ['d437-a-member-profile', 'd437-b-web-meets-band', 'd437-c-fewer-facets'];
const keyholeIds = ['d439-a-room-cutaway', 'd439-b-stress', 'd439-c-option-a-shape', 'd439-d-option-b-sketch'];
const lockScrewIds = ['d370-a-slot-front', 'd370-b-slot-back'];

const CLOSED = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };

/** The lightened 80 x 80 mm board on keyholes and standoffs, as the page builds it. */
const lightenedKeyholes = (kit, given = {}) =>
  kit.built('lightened', {
    widthMm: 80,
    heightMm: 80,
    sides: CLOSED,
    screwHead: 'keyhole',
    standoffs: 'slots',
    ...given,
  });

/** A binary STL as a solid of the kit's engine (the physics tool's saved parts). */
function stlSolid(kit, file) {
  const bytes = readFileSync(file);
  const count = bytes.readUInt32LE(80);
  const points = new Float32Array(count * 9);
  for (let t = 0; t < count; t++) {
    for (let k = 0; k < 9; k++) points[t * 9 + k] = bytes.readFloatLE(84 + t * 50 + 12 + k * 4);
  }
  const { Manifold, Mesh } = kit.engine;
  const mesh = new Mesh({
    numProp: 3,
    vertProperties: points,
    triVerts: Uint32Array.from({ length: count * 3 }, (_, i) => i),
  });
  mesh.merge();
  return new Manifold(mesh);
}

/** The hook room of the keyhole board's slot at (20, 60), cut across its back tab: what D439 is about. */
function keyholeScenes(kit) {
  const { box, mesh, COLOURS, Manifold } = kit;
  const scenes = [];
  const physics = process.env.SKADIS_PHYSICS_DIR;
  const main = lightenedKeyholes(kit);
  // the room's walls beside the tab meet the board's back at x = 20 -/+ 4.25 (the tab's 4.5 mm and C99's 2 mm each
  // side), z = 0, from the room's mouth at y = 50 up the standoff
  const wallX = [15.75, 24.25];
  const edgeBoxes = () => wallX.map((x) => box(x - 0.9, x + 0.9, 49, 54, -0.9, 0.9));
  // the standoff from its mouth to y = 54, where it is cut across, and the room's width and depth in it
  const window = () => box(8, 32, 40, 54, -16, 6.5);
  const hook = () => box(17.75, 22.25, 44.25, 52.5, -6, 0); // the hook's back tab: 4.5 mm wide, 6 mm behind the back
  const view = { position: [34, 82, -16], target: [20, 51, -3], fov: 24 };
  const hookLabels = [
    { text: "the hook's back tab, 4.5 mm wide", at: [20, 50, -4], dx: -40, dy: 190 },
    { text: '2 mm of room each side (C99)', at: [23.2, 54, -4], dx: 70, dy: 120 },
    { text: 'the room: 8 mm deep (6 mm tab and 2 mm)', at: [20, 54, -8], dx: -30, dy: 200 },
  ];
  const legendHook = ['the hook (a block the size of its back tab)', COLOURS.blue];
  {
    const part = main.intersect(window());
    const edges = edgeBoxes();
    const rest = part.subtract(Manifold.union(edges));
    scenes.push({
      id: 'd439-a-room-cutaway',
      title: "D439 · the keyhole standoff's hook room, cut across the hook's back tab: where the weak spot is",
      caption: [
        "The lightened 80 x 80 mm board on keyholes as it is on main, cut at y = 54 mm across the room behind the hook's slot.",
        "Where the room's walls beside the tab meet the board's back is a sharp inner edge (orange): the room there is the hook's.",
      ],
      legend: [
        ['the sharp inner edge, along each wall', COLOURS.orange],
        legendHook,
        ['the board and its standoff', COLOURS.grey],
      ],
      camera: view,
      labels: [...hookLabels, { text: 'the sharp inner edge', at: [24.25, 54, 0], dx: 90, dy: -110 }],
      meshes: [
        mesh(rest, COLOURS.grey),
        ...edges.map((e) => mesh(part.intersect(e), COLOURS.orange)),
        mesh(hook(), COLOURS.blue, 0.55),
      ],
    });
  }
  const stressFile = process.env.EXPLAIN_STRESS ?? '.check/figures/explain-stress.json';
  if (existsSync(stressFile)) {
    // the model's stress (von Mises, MPa per 10 N), the saved runs' skin at mesh level 2, one scale for both, seen from
    // the room's mouth: as built (D411), and option (a)'s scratch build
    const data = JSON.parse(readFileSync(stressFile, 'utf8'));
    const shift = 26;
    const stress = (version, dx) => ({
      color: '#ffffff',
      opacity: 1,
      edges: false,
      colors: data.versions[version].colors,
      positions: data.versions[version].positions.map((v, i) => (i % 3 === 0 ? Math.round((v + dx) * 1000) / 1000 : v)),
      triangles: data.versions[version].triangles,
    });
    const [built, optionA] = [data.versions['d411'], data.versions['d411-tab-a']];
    scenes.push({
      id: 'd439-b-stress',
      title: "D439 · the model's stress where the weak spot is: as it is on main, and with option (a)",
      caption: [
        `Von Mises stress per 10 N, the saved level 2 runs of the lightened 80 x 80 mm board, seen from the room's mouth, one scale, topping out at ${data.top} MPa (a higher value stays yellow).`,
        `As built, the wall's inner edge reads ${built.peak} MPa (the colour is averaged over a vertex's elements); with option (a) the edges read ${optionA.peak} MPa at most. At a sharp edge the value is the mesh's as much as the part's.`,
      ],
      legend: [],
      bar: { stops: data.stops, from: '0 MPa', to: `${data.top} MPa and over` },
      camera: { position: [20 + shift / 2, 4, -24], target: [20 + shift / 2, 52, -2], fov: 46, up: [0, 0, 1] },
      labels: [
        { text: 'as built (main)', at: [24.25, 50.5, 0], dx: 40, dy: -150 },
        { text: 'option (a): the root added', at: [24.25 + shift, 50.5, 0], dx: 40, dy: -150 },
      ],
      meshes: [stress('d411', 0), stress('d411-tab-a', shift)],
    });
  }
  if (physics !== undefined) {
    const saved = (version) => stlSolid(kit, `${physics}/parts/${version}/lightened-80-keyholes.stl`);
    const [before, optionA] = [saved('d411'), saved('d411-tab-a')];
    const added = optionA.subtract(before).intersect(window());
    scenes.push({
      id: 'd439-c-option-a-shape',
      title: "D439 (a) · letting the root take the 2 mm near the back: the shape, from the model's scratch build",
      caption: [
        "Same cut. The room's walls beside the tab now meet the board's back through a rounded root (orange: the added plastic, 21.7 mm3",
        "a room's worth on this board). The tab keeps 0.5 mm of room at the back face, and C99's full 2 mm from 3 mm behind it.",
      ],
      legend: [['the plastic option (a) adds', COLOURS.orange], legendHook, ['the board as on main', COLOURS.grey]],
      camera: view,
      labels: [...hookLabels.slice(0, 1), { text: 'the added root', at: [24.25, 54, -0.6], dx: 90, dy: -110 }],
      meshes: [
        mesh(before.intersect(window()), COLOURS.grey),
        mesh(added, COLOURS.orange),
        mesh(hook(), COLOURS.blue, 0.55),
      ],
    });
  }
  {
    // (b) a sketch: a half-round relief groove, 0.8 mm across its radius, along the foot of each wall in the plate;
    // its size is only chosen to show it, not designed
    const along = (x) => Manifold.cylinder(5, 0.8, 0.8, 48).rotate([-90, 0, 0]).translate([x, 49.5, 0]);
    const grooves = wallX.map(along);
    const part = main.intersect(window());
    const cut = part.subtract(Manifold.union(grooves));
    const lining = wallX.map((x) =>
      cut.intersect(Manifold.cylinder(5, 0.85, 0.85, 48).rotate([-90, 0, 0]).translate([x, 49.5, 0])),
    );
    scenes.push({
      id: 'd439-d-option-b-sketch',
      title: 'D439 (b) · a relief cut into the plate under each wall: a sketch, not built',
      caption: [
        'A half-round groove, 0.8 mm in radius (a size chosen only to show it), cut into the plate along the foot of each wall.',
        "The hook's room stays whole; the cost is plate, and on the lattice boards rim, where the stress is.",
      ],
      legend: [['the relief groove', COLOURS.orange], legendHook, ['the board as on main', COLOURS.grey]],
      camera: view,
      labels: [{ text: 'a relief groove under the wall', at: [24.25, 54, 0], dx: 90, dy: -110 }, hookLabels[0]],
      meshes: [
        mesh(cut, COLOURS.grey),
        ...lining.map((l) => mesh(l, COLOURS.orange)),
        mesh(hook(), COLOURS.blue, 0.55),
      ],
    });
  }
  return scenes;
}

/**
 * D370's consequence: a lock screw through the bottom corner slot at (20, 20), today's 2.5 mm (a 5 mm head, which
 * passes the plain slot) and 4 mm (the owner's: an 8 mm head, which gets a groove cut in the slot's sides). The screw is
 * drawn as the library's pan head (twice its size across, 0.8 times it tall) in its recess, not as the owner's
 * countersunk one.
 */
function lockScrewScenes(kit) {
  const { box, cylinder, mesh, COLOURS, Manifold } = kit;
  const scenes = [];
  const plain = lightenedKeyholes(kit);
  const sizes = [2.5, 4];
  const dx = 28; // the 4 mm board's panel beside the 2.5 mm one
  const [x, y] = [20, 20];
  const parts = sizes.map((size) => lightenedKeyholes(kit, { lockScrews: 'bottom', lockScrewMm: size }));
  const screw = (size) => {
    const floor = -8 - (0.8 * size + 0.3); // the recess's floor: behind the hook's room, as the library cuts it
    const head = cylinder(x, y, size, floor, floor + 0.8 * size);
    const shank = cylinder(x, y, size / 2, -15.5, floor);
    return Manifold.union(head, shank);
  };
  const named = ['today: a 2.5 mm screw, a 5 mm head', 'a 4 mm screw, an 8 mm head'];
  {
    const window = box(6, 34, 4, 36, -16, 6.5);
    const place = (solid, i) => solid.intersect(window).translate([dx * i, 0, 0]);
    // only what is cut in the plate itself: the recess behind it is seen in the next picture
    const cuts = parts.map((part, i) => place(plain.subtract(part), i).intersect(box(-50, 100, -50, 100, -0.5, 6.5)));
    scenes.push({
      id: 'd370-a-slot-front',
      title: 'D370 · the lock screw in the bottom corner slot, from the front: 2.5 mm and 4 mm',
      caption: [
        'A 5 mm head passes the plain slot (left). An 8 mm head cannot, so the library cuts a round groove through the plate (orange, right):',
        "an 8.5 mm hole in the front, 1.65 mm wider than the slot on each side. The screw is drawn as the library's pan head.",
      ],
      legend: [
        ["what the lock screw's recess cuts away", COLOURS.orange],
        ['the screw', COLOURS.blue],
        ['the board', COLOURS.grey],
      ],
      camera: { position: [34, 20, 385], target: [34, 20, 0], fov: 6.2, up: [0, 1, 0] },
      labels: [
        { text: named[0], at: [20, 6, 5], dx: 30, dy: 55 },
        { text: named[1], at: [48, 6, 5], dx: 30, dy: 55 },
      ],
      meshes: parts.flatMap((part, i) => [
        mesh(place(part, i), COLOURS.grey),
        mesh(cuts[i], COLOURS.orange, 0.85),
        mesh(screw(sizes[i]).translate([dx * i, 0, 0]), COLOURS.blue, 0.7),
      ]),
    });
  }
  {
    // from the back, cut through the screw's axis (y = 20): the standoff's recess, and whether it reaches the front
    const window = box(6, 34, 20, 36, -16, 6.5);
    const place = (solid, i) => solid.intersect(window).translate([dx * i, 0, 0]);
    const cuts = parts.map((part, i) => place(plain.subtract(part), i));
    scenes.push({
      id: 'd370-b-slot-back',
      title: 'D370 · the lock screw, from the back, cut through its axis: where the groove is',
      caption: [
        "Cut at the screw's axis, seen from the back and below. A 2.5 mm head sits in a recess in the standoff, behind the hook's room, and never",
        'reaches the plate. An 8 mm head needs its recess carried up through the plate: the groove, open at the front (the top).',
      ],
      legend: [
        ["what the lock screw's recess cuts away", COLOURS.orange],
        ['the screw', COLOURS.blue],
        ['the board and its standoff', COLOURS.grey],
      ],
      camera: { position: [34, -30, -34], target: [34, 24, -2], fov: 38 },
      labels: [
        { text: named[0], at: [20, 20, -9], dx: 50, dy: 175 },
        { text: named[1], at: [48, 20, -9], dx: 50, dy: 175 },
      ],
      meshes: parts.flatMap((part, i) => [
        mesh(place(part, i), COLOURS.grey),
        mesh(cuts[i], COLOURS.orange, 0.6),
        mesh(
          screw(sizes[i])
            .intersect(window)
            .translate([dx * i, 0, 0]),
          COLOURS.blue,
          0.7,
        ),
      ]),
    });
  }
  return scenes;
}

/** The facets of a solid whose middle (x, y, z) passes `test`, moved by dx along x, as a mesh of their own. */
function picked(kit, solid, test, dx, color, wire) {
  const { positions, triangles } = kit.lib.meshOf(solid);
  const keep = [];
  for (let t = 0; t < triangles.length; t += 3) {
    const mid = [0, 1, 2].map((k) => [0, 1, 2].reduce((s, v) => s + positions[3 * triangles[t + v] + k], 0) / 3);
    if (test(mid)) keep.push(t);
  }
  const index = new Map();
  const out = { color, opacity: 1, edges: wire === undefined, wire, positions: [], triangles: [] };
  for (const t of keep) {
    for (let v = 0; v < 3; v++) {
      const at = triangles[t + v];
      if (!index.has(at)) {
        index.set(at, out.positions.length / 3);
        const [x, y, z] = [0, 1, 2].map((k) => positions[3 * at + k]);
        out.positions.push(
          Math.round((x + dx) * 1000) / 1000,
          Math.round(y * 1000) / 1000,
          Math.round(z * 1000) / 1000,
        );
      }
      out.triangles.push(index.get(at));
    }
  }
  return out;
}

/** A board type's part at its starting values and the given ones, as the page builds it. */
function builtOf(kit, type, given) {
  const { lib, engine } = kit;
  const values = { ...lib.defaultValues(type.settings), ...given };
  const made = lib.buildBoard(engine, type, values);
  if (!made.ok) throw new Error(made.problem);
  return made.solid;
}

/** An 80 x 80 mm skeleton of a build of the library, its profile the given changes to the branch's. */
const board = (k, profile) =>
  builtOf(k, k.lib.skeletonBoardType({ ...k.lib.SKELETON_PROFILE, ...profile }), { widthMm: 80, heightMm: 80 });

/** A mesh with its outline drawn through turns of 4 degrees, so a chord's corners show. */
const outlined = (shape) => Object.assign(shape, { edgeAngle: 4 });

/** The facets a pocket's junction window holds (D437 b), and the wider one drawn round it. */
const inWindow = ([x, y]) => x < 14 && y > 30 && y < 50;
const viewWindow = ([x, y]) => x < 14 && y > 20 && y < 60;

async function skeletonScenes(r2b) {
  const scenes = [];
  const kit = await makeKit(r2b);
  const { box, mesh, COLOURS } = kit;
  const sharp = { stepRadiusMm: 0, bandJunctionRadiusMm: 0 }; // D314's profile
  const old = board(kit, sharp);
  const now = board(kit, {});

  // (a) a web's cross-section: the board turned so that the web from slot to slot lies along x, and cut across it
  {
    const across = (solid, dy) =>
      solid
        .rotate([0, 0, -45])
        .intersect(box(42.4, 43.4, -3.5, 3.5, -1, 6))
        .translate([0, dy, 0]);
    const cutFace = (solid, dy) =>
      solid
        .rotate([0, 0, -45])
        .intersect(box(42.4, 42.44, -3.5, 3.5, -1, 6))
        .translate([0, dy, 0]);
    const [a, b] = [across(old, 0), across(now, -8)];
    const [fa, fb] = [cutFace(old, 0), cutFace(now, -8)];
    scenes.push({
      id: 'd437-a-member-profile',
      title: "D437 · a web's cross-section: D314's sharp step and the new profile's radius",
      caption: [
        "Cut across one web of an 80 x 80 mm skeleton, the front at the top (it prints on the bed). The front's flange,",
        'then a step to the 0.9 mm core, then the 45 degree taper at the back. The new profile rounds the step with a 0.5 mm radius.',
      ],
      legend: [
        ['the cut face', COLOURS.orange],
        ['the web beyond the cut', COLOURS.grey],
      ],
      camera: { position: [-15.6, -3.3, 2.5], target: [42.4, -3.1, 2.5], fov: 9 },
      labels: [
        { text: 'D314: a sharp step', at: [42.4, 0.45, 3.6], dx: 40, dy: -150 },
        { text: 'new: a 0.5 mm radius', at: [42.4, -7.55, 3.6], dx: 40, dy: -150 },
        { text: 'front flange, 0.4 mm', at: [42.4, 1.7, 4.8], dx: -40, dy: -50 },
        { text: 'core, 0.9 mm', at: [42.4, -0.45, 2.5], dx: 240, dy: 30 },
        { text: 'back: a 45 degree taper', at: [42.4, 1.2, 0.8], dx: -40, dy: 50 },
      ],
      meshes: [mesh(a, COLOURS.grey), mesh(fa, COLOURS.orange), mesh(b, COLOURS.grey), mesh(fb, COLOURS.orange)],
    });
  }
  // (b) where a web meets the edge band, the facets' edges drawn: the pocket's walls seen from inside the pocket
  {
    // the facets whose middle lies in the window are the orange ones, drawn with their edges; the rest of the
    // window's, grey: split by facet, so nothing is cut and no two surfaces lie on each other
    const count = (solid) => (picked(kit, solid, inWindow, 0, '').triangles.length / 3).toLocaleString('en');
    const near = (solid, dx) => picked(kit, solid, inWindow, dx, COLOURS.orange, '#5b2a05');
    const rest = (solid, dx) => picked(kit, solid, (p) => viewWindow(p) && !inWindow(p), dx, COLOURS.grey);
    scenes.push({
      id: 'd437-b-web-meets-band',
      title: 'D437 · a web meeting the edge band: where the facets come from',
      caption: [
        "The pocket's walls where a web meets the edge band, every facet's edge drawn (orange: the part's own surface here).",
        "D314's profile is on the left, the new one on the right: the arcs at the step and in plan are many short facets.",
      ],
      legend: [
        ["the part's facets near the junction", COLOURS.orange],
        ['the rest of the board', COLOURS.grey],
      ],
      camera: { position: [-1, 78, 24], target: [-1, 40, 3], fov: 27 },
      labels: [
        { text: `D314's profile: ${count(old)} facets here`, at: [3.4, 40, 4.5], dx: -30, dy: -170 },
        { text: `the new profile: ${count(now)} facets here`, at: [3.4 - 16, 40, 4.5], dx: -30, dy: -170 },
      ],
      meshes: [rest(old, 0), near(old, 0), rest(now, -16), near(now, -16)],
    });
  }
  // (c) the quick trial: the arc's loft runs (ARC_RUNS, 4 today) cut to 3 and to 2, the step's corner cut across a web
  {
    const kits = [kit, await makeKit(r2b, '.check/dist-trial3'), await makeKit(r2b, '.check/dist-trial')];
    const step = (k, dy) => {
      const solid = board(k, {}).rotate([0, 0, -45]);
      const [boxOf, meshOf] = [k.box, k.mesh]; // each build's own: solids of two engines do not mix
      return [
        outlined(meshOf(solid.intersect(boxOf(42.4, 42.43, -0.2, 2.6, -1, 6)).translate([0, dy, 0]), COLOURS.orange)),
      ];
    };
    scenes.push({
      id: 'd437-c-fewer-facets',
      title: "D437 · fewer facets round the radius: a quick trial, the arc's runs 4, 3 and 2",
      caption: [
        "The step's 0.5 mm radius cut across a web, its arc made of 4 straight runs (today), 3 and 2. Facets are for a 200 x 200 mm",
        "board (D314's sharp step: 134,800); the shape change is the most found against today's, on an 80 mm board. 3 runs keep within 0.05 mm, 2 do not.",
      ],
      legend: [['the cut face, its outline drawn', COLOURS.orange]],
      camera: { position: [42.4 - 36, 1.2 - 3.4, 2.7], target: [42.4, 1.2 - 3.4, 2.7], fov: 11.5 },
      labels: [
        { text: 'today: 4 runs, 209,620 facets', at: [42.4, 1.5, 4.0], dx: 20, dy: -150 },
        { text: '3 runs: 195,572 facets, up to 0.045 mm off', at: [42.4, 1.5 - 3.4, 4.0], dx: 20, dy: -150 },
        { text: '2 runs: 181,552 facets, up to 0.10 mm off', at: [42.4, 1.5 - 6.8, 4.0], dx: 20, dy: -150 },
      ],
      meshes: kits.flatMap((k, i) => step(k, -3.4 * i)),
    });
  }
  return scenes;
}

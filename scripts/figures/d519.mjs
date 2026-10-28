// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// D519's pictures (28 Oct 2026, the owner: "highlight the issues so i can understand better"): the Straight skeleton
// at its thinnest settings (rims and webs 1.2 mm, a 0.8 mm core), where the edge band and the webs meet near the faces
// but are parted through the middle of the board's depth (C538). The places are found from the geometry, never placed
// by hand: the board's section at mid-depth against the material it has at both faces. Two voids that are apart at
// both faces but one void at mid-depth meet through a passage, and the passage is where the two faces' voids, each
// grown 0.3 mm, overlap inside that mid-depth void; the parted bands are the mid-depth section's pieces other than the
// largest; the depths it parts between are where the section's outline count leaves the faces' count. Also writes what
// it found into .check/figures/d519/numbers.json.
//
//   node scripts/figures/shoot.mjs d519
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const T = 5; // the board's thickness at its starting value
const MID = T / 2;
const FACE = [0.3, T - 0.3]; // inside each face's 0.6 mm flange
const SIZE = { widthMm: 240, heightMm: 200 };
const THIN = { rimMm: 1.2, webMm: 1.2, coreMm: 0.8 };
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);
const round = (v) => Math.round(v * 100) / 100;

/** Where a board parts through its depth, from its sections alone. */
function partings(kit, board) {
  const { CrossSection } = kit;
  const bb = board.boundingBox();
  const all = CrossSection.square([bb.max[0] - bb.min[0] + 20, bb.max[1] - bb.min[1] + 20]).translate([
    bb.min[0] - 10,
    bb.min[1] - 10,
  ]);
  const both = board.slice(FACE[0]).intersect(board.slice(FACE[1])); // material at both faces
  const mid = board.slice(MID);
  const count = (z) => board.slice(z).toPolygons().length;
  const faceCount = count(FACE[0]);
  const midCount = mid.toPolygons().length;
  // the depth, between a face and the middle, at which the section's outline count leaves the face's
  const edge = (joined, parted) => {
    let [a, b] = [joined, parted];
    for (let k = 0; k < 30; k++) {
      const m = (a + b) / 2;
      if (count(m) === faceCount) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };
  const parts = midCount !== faceCount;
  const zLow = parts ? edge(0.6, MID) : undefined;
  const zHigh = parts ? edge(T - 0.6, MID) : undefined;
  const faceVoids = all.subtract(both).decompose();
  const places = [];
  for (const m of all.subtract(mid).decompose()) {
    const inside = faceVoids.filter((f) => f.intersect(m).area() > 1e-6);
    if (inside.length < 2) continue;
    const grown = inside.map((f) => f.offset(0.3, 'Square').intersect(m));
    for (let i = 0; i < grown.length; i++)
      for (let j = i + 1; j < grown.length; j++)
        for (const piece of grown[i].intersect(grown[j]).decompose()) {
          if (piece.area() < 1e-6) continue;
          const pb = piece.bounds();
          places.push([round((pb.min[0] + pb.max[0]) / 2), round((pb.min[1] + pb.max[1]) / 2)]);
        }
  }
  places.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
  const islands = mid
    .decompose()
    .sort((p, q) => q.area() - p.area())
    .slice(1);
  return { faceCount, midCount, genus: board.genus(), zLow, zHigh, places, islands, both, mid };
}

/** The nearest point to p on the segment from s to e. */
const toSegment = (p, s, e) => {
  const [dx, dy] = [e[0] - s[0], e[1] - s[1]];
  const l = dx * dx + dy * dy;
  const t = l === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / l));
  return [s[0] + t * dx, s[1] + t * dy];
};

/** What a board's partings come to, for numbers.json. */
const sideOf = (f) => ({
  outlinesAtFaces: f.faceCount,
  outlinesAtMiddle: f.midCount,
  genus: f.genus,
  places: f.places.length,
});

/** The shortest distance between two sets of rings, and where: point to segment, both ways. */
function closest(ringsA, ringsB) {
  let best = { d: Infinity, a: [0, 0], b: [0, 0] };
  const sweep = (from, to, swap) => {
    for (const ring of from)
      for (const p of ring)
        for (const other of to)
          for (let i = 0; i < other.length; i++) {
            const q = toSegment(p, other[i], other[(i + 1) % other.length]);
            const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
            if (d < best.d) best = swap ? { d, a: q, b: p } : { d, a: p, b: q };
          }
  };
  sweep(ringsA, ringsB, false);
  sweep(ringsB, ringsA, true);
  return best;
}

export function build(kit) {
  const { box, mesh, built, COLOURS, Manifold, CrossSection } = kit;
  const scenes = [];
  const thin = built('skeleton', { ...SIZE, look: 'straight', ...THIN });
  const curved = built('skeleton', { ...SIZE, look: 'curved', ...THIN });
  const start = built('skeleton', { ...SIZE, look: 'straight' });
  const found = partings(kit, thin);
  const others = { curved: partings(kit, curved), start: partings(kit, start) };
  const { places, islands, zLow, zHigh } = found;
  if (places.length === 0 || islands.length === 0 || zLow === undefined || zHigh === undefined)
    throw new Error('d519: the thin Straight skeleton does not part; C538 no longer holds');

  // the place the close-ups are drawn at: the left end of the bottom edge's first parted band
  const band = islands
    .map((p) => p.bounds())
    .filter((b) => b.max[1] < SIZE.heightMm / 2)
    .sort((a, b) => a.min[0] - b.min[0])[0];
  const at = places.find((p) => Math.abs(p[0] - band.min[0]) < 3 && p[1] < SIZE.heightMm / 2);
  if (at === undefined) throw new Error('d519: no place at the end of the first band');
  // the gap at mid-depth: from the band's end to the main piece, nearest across the passage
  const near = (r) => CrossSection.square([2 * r, 2 * r]).translate([at[0] - r, at[1] - r]);
  const bandHere = islands.find((p) => p.intersect(near(3)).area() > 0);
  const mainHere = found.mid.subtract(CrossSection.union(islands)).intersect(near(3));
  const gap = closest(bandHere.intersect(near(3)).toPolygons(), mainHere.toPolygons());
  // the passage as cut across the board at the place, x = at[0]: the hole in that section round the place
  const across = thin.rotate([0, -90, 0]).slice(at[0]); // its points are (-z, y)
  const hole = across.toPolygons().filter((r) => {
    const ys = r.map((p) => p[1]);
    const zs = r.map((p) => -p[0]);
    return Math.min(...ys) > 0.2 && Math.max(...ys) < 6 && Math.min(...zs) > 0.2 && Math.max(...zs) < T - 0.2;
  });
  if (hole.length !== 1) throw new Error(`d519: ${hole.length} holes in the cut across the place`);
  const holeY = hole[0].map((p) => p[1]);
  const holeZ = hole[0].map((p) => -p[0]);
  const cut = {
    yFrom: Math.min(...holeY),
    yTo: Math.max(...holeY),
    zFrom: Math.min(...holeZ),
    zTo: Math.max(...holeZ),
  };

  const numbers = {
    board: `skeleton, Straight, ${SIZE.widthMm} x ${SIZE.heightMm} mm, rims and webs 1.2 mm, core 0.8 mm`,
    ...sideOf(found),
    partedFromMm: round(zLow),
    partedToMm: round(zHigh),
    placesAt: places,
    partedBands: islands.map((p) => {
      const b = p.bounds();
      return [b.min.map(round), b.max.map(round)];
    }),
    closeUp: {
      at,
      gapAtMiddleMm: round(gap.d),
      gapFrom: gap.a.map(round),
      gapTo: gap.b.map(round),
      cutAcross: Object.fromEntries(Object.entries(cut).map(([k, v]) => [k, round(v)])),
    },
    curvedThin: sideOf(others.curved),
    straightStart: sideOf(others.start),
  };
  console.log(JSON.stringify(numbers));
  const figures = join(process.cwd(), '.check', 'figures', 'd519');
  mkdirSync(figures, { recursive: true });
  writeFileSync(join(figures, 'numbers.json'), `${JSON.stringify(numbers, null, 2)}\n`);

  const parted = `parted from ${f2(zLow)} to ${f2(zHigh)} mm deep`;
  const square = (p, r) => box(p[0] - r, p[0] + r, p[1] - r, p[1] + r, -1, T + 1);
  // what is there at both faces and missing at mid-depth, within r of a place: the junction the middle lacks
  const missing = (f, p, r) => f.both.subtract(f.mid).intersect(CrossSection.circle(r, 48).translate(p));

  // 1: the whole board, the places marked
  {
    const marks = Manifold.union(places.map((p) => square(p, 3)));
    const bands = Manifold.extrude(CrossSection.union(islands).offset(1.2, 'Square'), T + 2)
      .translate([0, 0, -1])
      .subtract(marks);
    const grey = thin.subtract(marks).subtract(bands);
    const bottom = places.filter((p) => p[1] < SIZE.heightMm / 2).length;
    const first = places[0];
    scenes.push({
      id: 'd519-1-where',
      title: 'D519 · where the thin Straight skeleton parts: either side of each half slot, top and bottom',
      caption: [
        `Skeleton, Straight, ${SIZE.widthMm} x ${SIZE.heightMm} mm, rims and webs 1.2 mm, core 0.8 mm. Found from the geometry: ${places.length} places, ${bottom} along the bottom`,
        `and ${places.length - bottom} along the top, where a pocket opens into a half slot at mid-depth (${parted}, of ${T}). The ${islands.length} lengths of edge band`,
        'between two half slots (pale) are held to the rest only near the faces. The left and right edges, and everything inside, stay joined.',
      ],
      legend: [
        ['a parting place', COLOURS.orange],
        ['an edge band held only near the faces', COLOURS.pale],
        ['the rest of the board', COLOURS.grey],
      ],
      camera: { position: [120, -120, 215], target: [120, 92, 0], fov: 40 },
      labels: [
        { text: 'parting places, either side of a half slot', at: [first[0], first[1], T], dx: 40, dy: 90 },
        { text: 'an edge band between two half slots', at: [(band.min[0] + band.max[0]) / 2, 0.5, T], dx: 200, dy: 80 },
      ],
      meshes: [
        mesh(grey, COLOURS.grey),
        mesh(thin.intersect(bands), COLOURS.pale),
        mesh(thin.intersect(marks), COLOURS.orange),
      ],
    });
  }

  // 2: a close-up, the front half taken away down to mid-depth
  {
    const win = box(at[0] - 9, at[0] + 13, -1, 14, -1, MID);
    const back = thin.intersect(win);
    const plug = Manifold.extrude(missing(found, at, 1.2), MID - zLow).translate([0, 0, zLow]);
    scenes.push({
      id: 'd519-2-cutaway',
      title: 'D519 · one place, close: the board cut open at mid-depth',
      caption: [
        `The board's front half taken away, down to ${MID} mm, at the left end of a band. At the faces the band, the half slot's rim and the web meet here;`,
        `at mid-depth they do not: the pocket opens into the half slot through a ${f1(gap.d)} mm gap (orange: the plastic the faces have and the middle lacks, ${parted}).`,
      ],
      legend: [
        ['where band and web do not meet', COLOURS.orange],
        ["the board's back half, its back face down", COLOURS.grey],
      ],
      camera: { position: [at[0] + 11, at[1] - 17, 20], target: [at[0] + 1, at[1] + 1, 1.5], fov: 30 },
      labels: [
        { text: 'the edge band', at: [at[0] + 8, 0.5, MID], dx: 80, dy: 40 },
        { text: 'the half slot', at: [at[0] - 4, 3, MID], dx: -80, dy: 40 },
        { text: `the ${f1(gap.d)} mm gap`, at: [at[0] - 0.5, at[1] - 0.6, MID], dx: -90, dy: -150 },
        { text: 'the pocket', at: [at[0] + 6, 4.5, 1], dx: 90, dy: -90 },
      ],
      meshes: [mesh(back, COLOURS.grey), mesh(plug.intersect(win), COLOURS.orange)],
    });
  }

  // 3: the mid-depth sections of the three boards at the same place, the front face's outline beneath
  {
    const [x0, x1] = [at[0] - 8, at[0] + 36];
    const win = CrossSection.square([x1 - x0, 14]).translate([x0, -1]);
    const rows = [
      ['the thin Straight skeleton', thin, found],
      ['the Curved skeleton, the same thin settings', curved, others.curved],
      ['the Straight skeleton at its starting values', start, others.start],
    ];
    const meshes = [];
    const labels = [];
    rows.forEach(([name, solid, f], i) => {
      const dy = -20 * i;
      const face = Manifold.extrude(solid.slice(FACE[1]).intersect(win), 0.1).translate([0, dy, 0]);
      const midSlab = Manifold.extrude(solid.slice(MID).intersect(win), 0.2).translate([0, dy, 0.1]);
      meshes.push(mesh(face, COLOURS.wall, 1, false), mesh(midSlab, COLOURS.grey));
      const here = f.places.filter((p) => p[0] > x0 && p[0] < x1 && p[1] < 14);
      if (here.length > 0) {
        const plan = CrossSection.union(here.map((p) => missing(f, p, 1.2)));
        meshes.push(mesh(Manifold.extrude(plan, 0.25).translate([0, dy, 0.1]), COLOURS.orange));
      }
      const tag =
        f.places.length === 0
          ? `joined: ${f.midCount} outlines at mid-depth, as at the faces`
          : `parted: ${f.midCount} outlines at mid-depth against ${f.faceCount} at the faces`;
      labels.push({ text: `${name} · ${tag}`, at: [x0, dy + 13, 0.3], dx: 0, dy: -18 });
    });
    scenes.push({
      id: 'd519-3-sections',
      title: `D519 · cut at mid-depth, ${MID} mm: the thin Straight skeleton beside two that hold`,
      caption: [
        `Each board's section ${MID} mm deep (grey) over its outline at the front face (pale), seen from the front, at the same half slot and band.`,
        `Only the thin Straight one parts: its band stops ${f1(gap.d)} mm short of the web and the half slot's rim at each end (orange), so in the middle it is a piece of its own.`,
      ],
      legend: [
        ['where band and web do not meet at mid-depth', COLOURS.orange],
        ['the section at mid-depth', COLOURS.grey],
        ['the outline at the front face', COLOURS.wall],
      ],
      camera: { position: [(x0 + x1) / 2, -16, 120], target: [(x0 + x1) / 2, -16, 0], fov: 31, up: [0, 1, 0] },
      labels,
      meshes,
    });
  }

  // 4: a cut across the joint, through the depth, at the place
  {
    const x = at[0];
    const slab = thin.intersect(box(x, x + 0.6, -1, 9, -1, T + 1));
    const face = thin.intersect(box(x, x + 0.02, -1, 9, -1, T + 1));
    // the hole, drawn in the cut's plane: back from the turned frame the cut was taken in
    const fill = Manifold.extrude(new CrossSection(hole, 'EvenOdd'), 0.04)
      .translate([0, 0, x - 0.03])
      .rotate([0, 90, 0]);
    const yMid = (cut.yFrom + cut.yTo) / 2;
    scenes.push({
      id: 'd519-4-through',
      title: 'D519 · cut through the depth at the place: held at the faces, open between',
      caption: [
        `Cut across the board at the place, x = ${f2(x)} mm, the front at the top, the board's edge on the right. The band (right) and the half slot's rim`,
        `and web (left) are one at each face, but between ${f2(cut.zFrom)} and ${f2(cut.zTo)} mm deep a hole runs through, from the half slot into the pocket.`,
      ],
      legend: [
        ['the hole: where band and web do not meet', COLOURS.orange],
        ['the cut face', COLOURS.pale],
        ['the board beyond the cut', COLOURS.grey],
      ],
      camera: { position: [x - 60, yMid + 1, MID], target: [x, yMid + 1, MID], fov: 9 },
      labels: [
        { text: 'the edge band', at: [x, 0.5, MID], dx: 120, dy: 140 },
        { text: "the half slot's rim and web", at: [x, 4.5, MID], dx: -100, dy: 140 },
        {
          text: `joined at the front face: ${f2(T - cut.zTo)} mm`,
          at: [x, yMid, T - (T - cut.zTo) / 2],
          dx: -120,
          dy: -110,
        },
        { text: `joined at the back face: ${f2(cut.zFrom)} mm`, at: [x, yMid, cut.zFrom / 2], dx: 70, dy: 120 },
        { text: 'the hole, from the half slot into the pocket', at: [x, yMid, MID], dx: 170, dy: -190 },
      ],
      meshes: [mesh(slab, COLOURS.grey), mesh(face, COLOURS.pale), mesh(fill, COLOURS.orange)],
    });
  }
  return scenes;
}

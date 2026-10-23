// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The keyhole printability pass's figures (23 Oct 2026; docs/research/2026-10-23-keyhole-printability.md): T151's
// board, the 80 x 80 mm lightened board on keyholes and 15 mm standoffs, as it prints, its standoffs' wall faces up,
// cut through a top standoff, with each keyhole seat and hook-room exit the library's prototypes offer (KeyholeSeat,
// RoomExit); and the slot clip's keyhole. Orange: every face that faces down more steeply than 45 degrees, which prints
// over air unless it is a bridge held at both ends; pale: faces at 45 degrees. Prints, for each board, the area of the
// faces past 45 degrees over the heads and where the rooms run out of the standoffs.

const T = 5; // the board's thickness
const STEEP = -0.7072; // a face's normal past 45 degrees down, as the library's tests take it
const AT_45 = -0.7065;
// T151's board as it prints is turned about y (D66): the top right standoff as it hangs, behind the slot at (60, 60),
// is at x 20 on the bed, y as it hangs; its keyhole's channel from y 51 to 69, the screw resting at 64.5
const [X, REST] = [20, 64.5];
/** Where a room runs out of a standoff, as the board prints: below its ramp's start, 9.5 mm under the slot's middle. */
const exits = (x, y) =>
  [20, 60].some((sx) => Math.abs(x - sx) < 4.3) && [20, 60].some((sy) => y < sy - 9.5 && y > sy - 20);

const { boardParamsOf } = await import(new URL('../../packages/core/dist/board-types/solid.js', import.meta.url).href);

export function build(kit) {
  const { lib, engine, box, cylinder, COLOURS, Manifold } = kit;
  const scenes = [];
  const least = (seat) => lib.keyholeSeat(4, seat).depthMm + lib.MIN_BEHIND_CHANNEL_MM + lib.MIN_KEYHOLE_STANDOFF_MM;
  const tall = (seat) => Math.max(15, Math.ceil(least(seat) - 1e-9));

  /** T151's board with a seat and an exit, as it prints. */
  const board = (seat, roomExit) => {
    const type = lib.boardType('lightened');
    const given = { widthMm: 80, heightMm: 80, screwHead: 'keyhole', standoffs: 'back', standoffHeightMm: tall(seat) };
    const read = lib.readValues(type.settings, { ...lib.defaultValues(type.settings), ...given });
    if (!read.ok) throw new Error(read.errors.map((e) => e.message).join('; '));
    const v = read.values;
    const mounting = { ...lib.mountingOf(v), keyholeSeat: seat, roomExit };
    const lattice = lib.latticeParams({ rimMm: v.rimMm, webMm: v.webMm });
    return lib.printedPart(type, lib.makeLightenedBoard(engine, boardParamsOf(v), lattice, mounting));
  };

  /** A part's faces in four meshes: past 45 degrees down (orange), at 45 (pale), the cut, in the plane where the
   * coordinate `cut[0]` is `cut[1]` (light), and the rest (grey); the bed face grey. */
  const faces = (solid, cut, shift = [0, 0, 0]) => {
    const m = lib.meshOf(solid);
    const sets = { [COLOURS.orange]: [], [COLOURS.pale]: [], [COLOURS.wall]: [], [COLOURS.grey]: [] };
    const p = (v, d) => m.positions[v * 3 + d];
    for (let t = 0; t < m.triangles.length; t += 3) {
      const [a, b, c] = [m.triangles[t], m.triangles[t + 1], m.triangles[t + 2]];
      const u = [0, 1, 2].map((d) => p(b, d) - p(a, d));
      const w = [0, 1, 2].map((d) => p(c, d) - p(a, d));
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const length = Math.hypot(...n);
      const nz = length > 0 ? n[2] / length : 0;
      const bed = Math.max(p(a, 2), p(b, 2), p(c, 2)) < 0.01;
      const [k, at] = cut;
      const onCut =
        length > 0 && Math.abs(n[k] / length) > 0.999 && [a, b, c].every((v) => Math.abs(p(v, k) - at) < 1e-3);
      const colour = onCut
        ? COLOURS.wall
        : bed
          ? COLOURS.grey
          : nz < STEEP
            ? COLOURS.orange
            : nz < AT_45
              ? COLOURS.pale
              : COLOURS.grey;
      sets[colour].push(a, b, c);
    }
    return Object.entries(sets)
      .filter(([, tris]) => tris.length > 0)
      .map(([color, tris]) => {
        const index = new Map();
        const positions = [];
        const triangles = tris.map((v) => {
          if (!index.has(v)) {
            index.set(v, positions.length / 3);
            for (let d = 0; d < 3; d++) positions.push(Math.round((p(v, d) + shift[d]) * 1000) / 1000);
          }
          return index.get(v);
        });
        return { color, opacity: 1, edges: true, positions, triangles };
      });
  };
  /** The area, mm2, of a part's faces past 45 degrees down whose middles `at` takes. */
  const steepArea = (solid, at) => {
    const m = lib.meshOf(solid);
    const p = (v, d) => m.positions[v * 3 + d];
    let area = 0;
    for (let t = 0; t < m.triangles.length; t += 3) {
      const [a, b, c] = [m.triangles[t], m.triangles[t + 1], m.triangles[t + 2]];
      const u = [0, 1, 2].map((d) => p(b, d) - p(a, d));
      const w = [0, 1, 2].map((d) => p(c, d) - p(a, d));
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const length = Math.hypot(...n);
      const middle = [0, 1, 2].map((d) => (p(a, d) + p(b, d) + p(c, d)) / 3);
      if (length > 0 && n[2] / length < STEEP && middle[2] > 0.01 && at(...middle)) area += length / 2;
    }
    return area;
  };
  const legend = [
    ['faces down past 45 degrees: over air unless a bridge held at both ends', COLOURS.orange],
    ['faces at 45 degrees', COLOURS.pale],
    ['the cut', COLOURS.wall],
    ['the rest', COLOURS.grey],
  ];

  // the areas, for the report (computed)
  const options = [
    ['flat', 'flat'],
    ['countersunk', 'flat'],
    ['either', 'flat'],
    ['ledge', 'flat'],
    ['flat', 'ramp'],
    ['countersunk', 'ramp'],
  ];
  const built = new Map();
  for (const [seat, exit] of options) {
    const b = board(seat, exit);
    built.set(`${seat}/${exit}`, b);
    const h = tall(seat);
    const lips = steepArea(b, (_x, _y, z) => z > T + 8.01 && z < T + h - 0.01);
    const exitArea = steepArea(b, (x, y, z) => z > T + 0.01 && exits(x, y));
    console.log(
      `  ${seat} seat, ${exit} exit, ${h} mm: past 45 degrees over the heads ${lips.toFixed(1)} mm2, ` +
        `where the rooms run out ${exitArea.toFixed(1)} mm2; ${b.volume().toFixed(0)} mm3`,
    );
  }

  /** Half the top standoff, cut along the keyhole's middle, as it prints: what is left of x = 20 on the bed. */
  const along = (solid, h) => solid.intersect(box(X - 9, X, 45, 74, -1, T + h + 1));
  const alongCamera = { position: [X + 52, 14, 4], target: [X - 3, 58, 12.5], fov: 27 };
  const seats = [
    {
      id: 'k1-flat-today',
      seat: 'flat',
      title: "Keyhole · today's flat lips: a ledge over the head's channel (T151)",
      caption: [
        "T151's board as it prints, cut along the keyhole in a top standoff, its wall face up. The 1.5 mm lips are a flat",
        "ledge 2.25 mm wide beside the slot, held from the channel's wall alone (orange, top), where the print sagged.",
      ],
      labels: [
        { text: 'the lips: a ledge held at one side', at: [X, 62, T + 13.5], dx: 70, dy: -70 },
        { text: "the hook room's ceiling", at: [X, 52, T + 8], dx: 90, dy: 40 },
        { text: 'its edge where the room runs out', at: [X, 48.6, T + 8], dx: -40, dy: 110 },
      ],
    },
    {
      id: 'k2-countersunk',
      seat: 'countersunk',
      title: 'Keyhole · a 45 degree seat for a countersunk head',
      caption: [
        'The slot widens at 45 degrees from the 1.5 mm lips out to the 9 mm channel (pale), a 90 degree countersunk head',
        'bearing on that cone. Nothing over the head faces down past 45 degrees; the channel is 4.03 mm deep, not 5.',
      ],
      labels: [
        { text: 'the 45 degree seat', at: [X, 63, T + 11.6], dx: 70, dy: -70 },
        { text: "the hook room's ceiling, as today", at: [X, 52, T + 8], dx: 90, dy: 40 },
      ],
    },
    {
      id: 'k3-either',
      seat: 'either',
      title: 'Keyhole · the 45 degree seat, deep enough for a pan head too (16 mm standoffs)',
      caption: [
        "The same seat, its channel 6.75 mm deep so a pan head's rim bears on the cone 1.75 mm in from the lips. Nothing",
        'over the head faces down past 45 degrees, but the standoff must be at least 15.95 mm, tried here at 16.',
      ],
      labels: [
        { text: 'the 45 degree seat', at: [X, 63, T + 12.6], dx: 70, dy: -70 },
        { text: 'the deeper channel', at: [X - 4.4, 57, T + 10], dx: 160, dy: 60 },
      ],
    },
    {
      id: 'k4-ledge',
      seat: 'ledge',
      title: 'Keyhole · a 1 mm ledge beside the slot, then 45 degrees',
      caption: [
        "A 1 mm flat ledge beside the slot (orange), the 45 degree seat beyond it (pale): a pan head's rim bears on the",
        "cone and a countersunk head on the ledge's edge, neither flat. The ledge is still over air, 1 mm wide.",
      ],
      labels: [
        { text: 'the 1 mm ledge', at: [X, 63, T + 13.5], dx: 70, dy: -70 },
        { text: 'the 45 degree seat', at: [X, 60.5, T + 12.4], dx: 120, dy: 60 },
      ],
    },
  ];
  for (const s of seats) {
    const h = tall(s.seat);
    scenes.push({
      id: s.id,
      title: s.title,
      caption: s.caption,
      legend,
      camera: alongCamera,
      labels: s.labels.map((l) => ({ ...l, at: [l.at[0], l.at[1], l.at[2] + (h - 15)] })),
      meshes: faces(along(built.get(`${s.seat}/flat`), h), [0, X]),
    });
  }

  // across the slot at the resting screw, every seat with its head, side by side
  {
    const heads = [
      ['flat', 'pan', 'today: flat lips, pan head'],
      ['countersunk', 'countersunk', 'countersunk seat'],
      ['either', 'pan', 'either: pan head'],
      ['either', 'countersunk', 'either: countersunk head'],
      ['ledge', 'pan', 'ledge: pan head'],
    ];
    const meshes = [];
    const labels = [];
    heads.forEach(([seat, head, text], i) => {
      const h = tall(seat);
      const dx = i * 24;
      const top = T + h; // the wall face, as it prints
      const cut = built.get(`${seat}/flat`).intersect(box(X - 8, X + 8, REST, 74, T + 6, top + 1));
      meshes.push(...faces(cut, [1, REST], [dx, 0, 15 - h]));
      const out = lib.keyholeSeat(4, seat).heads[head].outMm;
      const half = box(X - 6, X + 6, REST, REST + 6, 0, 40);
      const shank = cylinder(X, REST, 2, top - out + 0.1, top + 3).intersect(half);
      const solid =
        head === 'pan'
          ? cylinder(X, REST, 4, top - out, top - out + 3.2)
          : Manifold.union([
              cylinder(X, REST, 4, top - out, top - out + 0.48),
              cylinder(X, REST, 4, top - out + 0.48, top - out + 2.48, 2),
            ]);
      meshes.push(kit.mesh(Manifold.union([shank, solid.intersect(half)]).translate([dx, 0, 15 - h]), COLOURS.blue));
      labels.push({ text, at: [X + dx, REST, T + 15 + 3], dx: i === 4 ? -25 : 25, dy: i % 2 === 0 ? -60 : -95 });
    });
    scenes.push({
      id: 'k5-seats-across',
      title: 'Keyhole · each seat across the slot at the resting screw, its head in it',
      caption: [
        'Cut across the slot where the screw rests, the wall face up, each at the same height. A pan head needs the flat',
        'lips (orange) to bear flat; on a 45 degree seat (pale) it bears on its rim, deeper in; a countersunk head on its cone.',
      ],
      legend: [...legend.slice(0, 3), ['the screw, its head 8 mm across', COLOURS.blue]],
      camera: { position: [X + 48, REST - 420, T + 4], target: [X + 48, REST, T + 12.5], fov: 9.5 },
      labels,
      meshes,
    });
  }

  // the room's exit, today and on a ramp, side by side: cut along the slot as above
  {
    const flat = along(built.get('flat/flat'), 15);
    const ramp = along(built.get('flat/ramp'), 15);
    scenes.push({
      id: 'k6-room-exit',
      title: "Hook room · where it runs out of the standoff: today's free edge, and a 45 degree ramp",
      caption: [
        "Left, today: the room's flat ceiling runs on to the standoff's curved bottom face, an edge over the opening that",
        'nothing holds (orange, its near end). Right: the ceiling rises at 45 degrees to that face (pale), so no edge is free.',
      ],
      legend,
      camera: { position: [X + 80, -2, 3], target: [X + 14, 54, 12], fov: 25 },
      labels: [
        { text: "today's edge", at: [X, 48.7, T + 8], dx: -60, dy: 90 },
        { text: 'the ramp', at: [X + 30, 49.5, T + 9], dx: 70, dy: 90 },
      ],
      meshes: [...faces(flat, [0, X]), ...faces(ramp, [0, X], [30, 0, 0])],
    });
  }

  // the slot clip's keyhole as it prints, wall face down: today and the countersunk seat
  {
    const clip = (seat) =>
      lib.makeSlotClip(engine, lib.slotClipParams({ fixing: 'keyhole', keyholeSeat: seat, depthMm: tall(seat) }));
    const half = box(-7, 0, -12, 12, -1, 22);
    scenes.push({
      id: 'k7-clip',
      title: "Slot clip · its keyhole as it prints, wall face down: today's and the countersunk seat",
      caption: [
        'Cut along the keyhole, the wall face on the bed. The lips print first and the seat widens above them, so nothing',
        "faces down but the channel's roof, a bridge held all round (orange), with both seats; the seat's clip can be 0.97 mm shallower.",
      ],
      legend,
      camera: { position: [74, -42, 1], target: [-2, 15, 4.5], fov: 24 },
      labels: [
        { text: "today's flat lips", at: [0, 5, 1.5], dx: -80, dy: 90 },
        { text: 'the countersunk seat', at: [0, 5 + 30, 2.5], dx: 60, dy: 90 },
        { text: "the channel's roof", at: [0, 30 - 4, 4.03], dx: 60, dy: -80 },
      ],
      meshes: [
        ...faces(clip('flat').intersect(half), [0, 0]),
        ...faces(clip('countersunk').intersect(half), [0, 0], [0, 30, 0]),
      ],
    });
  }
  return scenes;
}

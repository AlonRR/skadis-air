// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The Printables page's pictures and animations (Q309, 22 Oct 2026; the set A356 approved, 23 Oct 2026, each picture
// about a section of the page): what each board type and feature looks like, each part the library's own at the
// page's starting values unless a scene says otherwise, the feature a picture is about in orange. Boards stand as
// they hang, y up and their front towards +z; a scene seen from the back says so. write-gallery.mjs draws them; a
// scene with `frames` is an animation, one with `insets` has close-ups drawn over it, and one with a `width` is for
// the page's text, drawn smaller and scaled to that width.

const T = 5; // the board's thickness
const COLOUR = { part: '#c3c9cf', feature: '#f76707', context: '#7b858f' };
const sides = (left, right, bottom, top) => ({ left, right, bottom, top });
const CLOSED = sides('closed', 'closed', 'closed', 'closed');
/** 0 to 1 and back to rest: an eased step, so a move starts and stops gently. */
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/**
 * A looping animation's frames, each given its share t: `hold` still at 0, `move` up to 1, `rest` still at 1, and
 * `move` back down to 0, so its last frame runs on into its first with no jump.
 */
const cycle = (hold, move, rest, frame) =>
  [
    ...Array(hold).fill(0),
    ...[...Array(move).keys()].map((k) => ease((k + 1) / move)),
    ...Array(rest).fill(1),
    ...[...Array(move).keys()].map((k) => ease(1 - (k + 1) / move)),
  ].map(frame);
/** A turn in this many frames: 80, three quarters of the speed of 60 at 15 frames a second (the owner's 75 %). */
const TURN_FRAMES = 80;
/** One part's plastic as a share of another's, in whole percent. */
const pct = (a, b) => Math.round((100 * a.volume()) / b.volume());
/** The board types' pictures side by side: the i-th moved right by `pitch`. */
const nth = (b, i, pitch) => b.translate([i * pitch, 0, 0]);
/** A close-up for the page's text (A356): drawn at 1120 x 840, its text at full size, and scaled to 560 wide, as the
 * text's GIFs are (C393). */
const TEXT_SIZED = { size: [1120, 840], compact: true, width: 560 };
/** A close-up of a screw hole cut through at (10, 10) of a board moved x along: looking at the cut, the front face up
 * and a little towards the camera, as a countersink is drawn. */
const holeCloseUp = (x) => ({ position: [x + 20, -42, 19], target: [x + 11, 10, 1.5], fov: 26, up: [0, 0, 1] });

export function build(kit) {
  const { box, cylinder, mesh, split, built } = kit;
  const part = (solid, group, view) => ({ ...mesh(solid, COLOUR.part), group, view });
  const feature = (solid, group, view) => ({ ...mesh(solid, COLOUR.feature), group, view });
  const context = (solid, view) => ({ ...mesh(solid, COLOUR.context), view });
  /** A part in grey with its feature, where it meets `region`, in orange. */
  const pair = (solid, region, view) => [
    part(solid.subtract(region), undefined, view),
    feature(solid.intersect(region), undefined, view),
  ];
  const scenes = [];

  // the cover as an animation (the owner, 22 Oct 2026: "have the main image have each of the boards rotating and give
  // each a different type of Screw holes"): the three board types, each turning on its own upright axis, so its back
  // shows: the solid board countersunk, the lightened on keyholes and the skeleton on lock screws, both on standoffs
  {
    const kinds = [
      ['solid', { screwHead: 'countersunk' }, 'Solid · countersunk'],
      ['lightened', { screwHead: 'keyhole', standoffs: 'back' }, 'Lightened · keyholes'],
      ['skeleton', { screwHead: 'lock', standoffs: 'back' }, 'Skeleton · lock screws'],
    ];
    const SPACING = 205;
    const meshes = kinds.map(([kind, mounting], i) => {
      const board = built(kind, { widthMm: 160, heightMm: 160, ...mounting });
      const b = board.boundingBox();
      // centred on its own axis, so it turns in place
      return feature(board.translate([-80, -80, -(b.min[2] + b.max[2]) / 2]), `b${i}`);
    });
    const at = (i) => [(i - 1) * SPACING, 0, 0];
    const frames = [...Array(TURN_FRAMES).keys()].map((k) => ({
      groups: Object.fromEntries(kinds.map((_, i) => [`b${i}`, { at: at(i), turn: (2 * Math.PI * k) / TURN_FRAMES }])),
    }));
    scenes.push({
      id: 'cover-turn',
      title: 'Skådis Air',
      hero: true,
      caption: [
        'Pegboards for IKEA SKÅDIS hooks, in any size: solid, lightened',
        'or skeleton, tiled into walls, made in your browser.',
      ],
      camera: { position: [0, 140, 680], target: [0, -8, 0], fov: 38, drop: 0.14 },
      labels: kinds.map(([, , text], i) => ({ text, at: [at(i)[0], -112, 0], tag: true })),
      frames,
      meshes,
    });
  }

  // the Board section: the board types face on, each one's plastic against the solid board's, measured at the
  // Printables files' size (model volume, as D313 is open)
  {
    const size = { widthMm: 240, heightMm: 200 };
    const [solid, lightened, skeleton] = ['solid', 'lightened', 'skeleton'].map((k) => built(k, size));
    scenes.push({
      id: 'board-types',
      title: 'Three kinds of board',
      caption: [
        'The same slots on the same 40 mm grid, in less plastic: open pockets',
        'between the slots, or every rim and web an I-beam (240 x 200 mm here).',
      ],
      camera: { position: [390, 30, 1040], target: [390, 88, 0], fov: 38, drop: 0.1 },
      labels: [
        { text: 'Solid · 100 %', at: [120, -28, T], tag: true },
        { text: `Lightened · ${pct(lightened, solid)} %`, at: [390, -28, T], tag: true },
        { text: `Skeleton · ${pct(skeleton, solid)} %`, at: [660, -28, T], tag: true },
      ],
      meshes: [part(nth(solid, 0, 270)), feature(nth(lightened, 1, 270)), feature(nth(skeleton, 2, 270))],
    });
  }

  // for the text, at the lightened board: the lightened board on keyholes, turning, so its front and the standoffs
  // behind show
  {
    const board = built('lightened', { widthMm: 160, heightMm: 160, screwHead: 'keyhole', standoffs: 'back' });
    const centred = board.translate([-80, -80, 5]);
    const behind = box(-90, 90, -90, 90, -40, -0.01 + 5);
    const R = 430;
    // a whole turn, its last frame one step short of its first, so it loops with no jump
    const frames = [...Array(TURN_FRAMES).keys()].map((k) => {
      const a = (2 * Math.PI * k) / TURN_FRAMES;
      return { camera: { position: [R * Math.sin(a), 70, R * Math.cos(a)], target: [0, -2, 0], fov: 38, drop: 0.08 } };
    });
    scenes.push({
      id: 'turntable',
      ...TEXT_SIZED,
      title: 'Lightened, on keyholes',
      caption: [
        'Pockets between the slots, a rim round each slot; behind,',
        'standoffs with keyholes, and room for a hook at each.',
      ],
      camera: frames[0].camera,
      frames,
      meshes: split(centred, behind),
    });
  }

  // for the text, at the skeleton board: cut open, its members are I-beams, full width at both faces and thin
  // through the middle
  {
    const board = built('skeleton', { widthMm: 120, heightMm: 120 });
    const kept = board.subtract(box(-1, 121, 50, 121, -1, T + 1));
    const cut = box(-1, 121, 49.6, 50.01, -1, T + 1);
    scenes.push({
      id: 'skeleton-ibeam',
      ...TEXT_SIZED,
      title: 'Skeleton: every member an I-beam',
      caption: [
        'Full width at both faces, thin through the middle, as the',
        "ultralight boards are: about a third of the solid's plastic.",
      ],
      camera: { position: [92, 190, 70], target: [62, 40, 0], fov: 30, up: [0, 0, 1], drop: 0.18 },
      labels: [{ text: 'a web, cut: an I-beam', at: [50, 50, T / 2], dx: -60, dy: -110 }],
      meshes: split(kept, cut),
    });
  }

  // the Size and panels section: a wall of six panels, three across and two up, closed round the outside and open at
  // the seams, coming together and opening again
  {
    const columns = [
      ['closed', 'open'],
      ['open', 'open'],
      ['open', 'closed'],
    ];
    const rows = [
      ['closed', 'open'],
      ['open', 'closed'],
    ];
    const panels = columns.flatMap(([left, right], i) =>
      rows.map(([bottom, top], j) => {
        const p = built('solid', { widthMm: 160, heightMm: 160, sides: sides(left, right, bottom, top) });
        return [`p${i}${j}`, p, [160 * i, 160 * j], [i - 1, 2 * j - 1]];
      }),
    );
    const meshes = panels.map(([g, p, [x, y]], i) => (i === 0 ? feature : part)(p.translate([x, y, 0]), g));
    const apart = (gap) => Object.fromEntries(panels.map(([g, , , [dx, dy]]) => [g, [dx * gap, (dy * gap) / 2, 0]]));
    scenes.push({
      id: 'wall-together',
      title: 'Walls of any size',
      caption: [
        "A wall is split into panels that fit your printer's bed, closed round",
        'the outside; at the seams, half a slot on each side makes a whole one.',
      ],
      camera: { position: [150, -170, 980], target: [240, 158, 0], fov: 40 },
      frames: cycle(10, 24, 14, (t) => ({ groups: apart(36 * (1 - t)) })),
      meshes,
    });
  }

  // the Sides section: a board closed all round, and four boards meeting at seams through the slots, half a slot
  // each side, and between the slots, every slot whole; the closed edge and the seams in orange, on the front face
  {
    const PITCH = 215;
    const none = { screwHead: 'none' };
    const four = (seams) =>
      [
        [0, 0, sides('closed', 'open', 'closed', 'open')],
        [80, 0, sides('open', 'closed', 'closed', 'open')],
        [0, 80, sides('closed', 'open', 'open', 'closed')],
        [80, 80, sides('open', 'closed', 'open', 'closed')],
      ].map(([x, y, s]) =>
        built('solid', { ...none, seams, widthMm: 80, heightMm: 80, sides: s }).translate([x, y, 0]),
      );
    const front = (x0, x1, y0, y1) => box(x0, x1, y0, y1, T - 1.05, T + 0.1);
    const cross = (at) => front(at - 1.2, at + 1.2, -1, 161).add(front(-1, 161, at - 1.2, at + 1.2));
    const one = built('solid', { ...none, widthMm: 160, heightMm: 160, sides: CLOSED });
    const rim = front(-1, 161, -1, 161).subtract(box(3, 157, 3, 157, -2, T + 2));
    const moved = (b, i) => b.translate([i * PITCH, 0, 0]);
    scenes.push({
      id: 'sides',
      title: 'Sides: closed or open',
      caption: [
        "Closed round a wall's outside; open at its seams, through the slots,",
        'half a slot each side, or between them, every slot whole.',
      ],
      camera: { position: [PITCH + 40, -150, 640], target: [PITCH + 80, 74, 0], fov: 40, drop: 0.1 },
      labels: [
        { text: 'Closed', at: [80, -22, T], tag: true },
        { text: 'Open, through the slots', at: [PITCH + 80, -22, T], tag: true },
        { text: 'Open, between the slots', at: [2 * PITCH + 80, -22, T], tag: true },
      ],
      meshes: [
        ...pair(one, rim),
        ...four('through').flatMap((b) => pair(moved(b, 1), moved(cross(80), 1))),
        ...four('between').flatMap((b) => pair(moved(b, 2), moved(cross(90), 2))),
      ],
    });
  }

  // the Mounting section: from the back, keyholes on standoffs and lock screws through the corner slots; at the
  // front, close-ups of a countersunk and a round-head screw hole, each cut through the hole with its screw in it
  {
    const keyholes = built('solid', { widthMm: 120, heightMm: 120, screwHead: 'keyhole', standoffs: 'back' });
    const locks = built('solid', { widthMm: 120, heightMm: 120, screwHead: 'lock', standoffs: 'back' }).translate([
      -170, 0, 0,
    ]);
    const behind = box(-300, 300, -10, 130, -40, -0.01);
    // a closed board's corner, cut through its screw hole at (10, 10), the hole and its head's seat in orange, and a
    // 4 mm screw seated in it, for context
    const corner = (screwHead, view, x, screw) => {
      const board = built('solid', { widthMm: 80, heightMm: 80, screwHead, sides: CLOSED });
      const piece = board.intersect(box(-1, 30, 10, 30, -1, T + 1));
      const seat = cylinder(10, 10, 5.2, -1, T + 1);
      return [
        ...pair(piece.translate([x, 0, 0]), seat.translate([x, 0, 0]), view),
        context(screw.translate([x, 0, 0]), view),
      ];
    };
    const shank = cylinder(10, 10, 2, -9, T - 2);
    const countersunk = shank.add(cylinder(10, 10, 2, T - 2.3, T - 0.05, 4.4));
    const round = shank.add(cylinder(10, 10, 4, T - 3.4, T - 0.6)).add(cylinder(10, 10, 4, T - 0.6, T - 0.2, 3.5));
    scenes.push({
      id: 'mounting',
      title: 'Mount it your way',
      caption: [
        'From the back: keyholes on standoffs, so the board lifts off its screws,',
        'or lock screws through the corner slots; at the front, a flush screw head.',
      ],
      camera: { position: [-60, -60, -560], target: [-25, 40, 0], fov: 34, drop: 0.024 },
      labels: [
        { text: 'keyhole', at: [20, 100, -15], dx: -90, dy: -70 },
        { text: 'lock screw', at: [-150, 20, -15], dx: 90, dy: -60 },
      ],
      insets: [
        {
          id: 'countersunk',
          title: 'Countersunk, at the front',
          rect: [150, 800, 620, 320],
          camera: holeCloseUp(1000),
        },
        {
          id: 'round',
          title: 'Round head, at the front',
          rect: [830, 800, 620, 320],
          camera: holeCloseUp(1100),
        },
      ],
      meshes: [
        ...split(keyholes, behind),
        ...split(locks, behind),
        ...corner('countersunk', 'countersunk', 1000, countersunk),
        ...corner('round', 'round', 1100, round),
      ],
    });
  }

  // the Connectors section: the standoffs for 1, 2 and 4 boards and the slot clip, with close-ups of what they hide:
  // the ribs on the clip's pegs, and the room a shared standoff leaves a hook, between its posts above its ring
  {
    const X = [-80, -50, -5, 55];
    const parts = [
      ...['1', '2', '4'].map((boards, i) => built('standoff', { boards }).translate([X[i], 0, 0])),
      built('slot-clip', {}).translate([X[3], 0, 0]),
    ];
    // the ribs: what stands proud of the long sides of the peg at (20, 0), 4.8 mm across; the clip's half with that
    // peg, so the other peg is not seen behind it
    const clip = built('slot-clip', {})
      .translate([2000, 0, 0])
      .intersect(box(2001, 2040, -20, 20, -1, 30));
    const ribs = box(2022.41, 2023, -8, 8, 15.9, 21).add(box(2017, 2017.59, -8, 8, 15.9, 21));
    // four board corners on a standoff for 4 boards, meeting at a whole slot, and a hook in it, its back tab hanging
    // between the two lower posts, above the ring: seen along the wall through the opening it hangs in, lying as the
    // parts above it do
    const at4 = [3000, 0, 0];
    const corners = [
      [sides('closed', 'open', 'closed', 'open'), [-80, -80]],
      [sides('open', 'closed', 'closed', 'open'), [0, -80]],
      [sides('closed', 'open', 'open', 'closed'), [-80, 0]],
      [sides('open', 'closed', 'open', 'closed'), [0, 0]],
    ].map(([s, [x, y]]) =>
      built('solid', { widthMm: 80, heightMm: 80, sides: s })
        .translate([x, y, 15])
        .intersect(box(-26, 26, -19, 26, 14, 21))
        .translate(at4),
    );
    const hook = box(-2.25, 2.25, -15.75, -3.5, 9, 11)
      .add(box(-2.25, 2.25, -7.4, -3.5, 9, 26))
      .add(box(-2.25, 2.25, -7.4, 6, 23.5, 26))
      .translate(at4);
    const four = built('standoff', { boards: '4' }).translate(at4);
    scenes.push({
      id: 'connectors',
      title: 'Connectors',
      caption: [
        'Standoffs hold boards 15 mm off the wall, for 1, 2 or 4 boards;',
        'the slot clip joins boards behind a seam by pegs in their slots.',
      ],
      camera: { position: [0, -290, 200], target: [0, 2, 6], fov: 26, up: [0, 0, 1], drop: -0.03 },
      labels: [
        { text: '1 board', at: [X[0], -26, 0], tag: true },
        { text: '2 boards', at: [X[1], -26, 0], tag: true },
        { text: '4 boards', at: [X[2], -26, 0], tag: true },
        { text: 'Slot clip', at: [X[3], -26, 0], tag: true },
      ],
      insets: [
        {
          id: 'room',
          title: "A hook's room, between the posts",
          rect: [150, 790, 620, 330],
          from: [X[2], -15, 11],
          camera: { position: [3016, -64, 17], target: [3000, -6, 11.5], fov: 28, up: [0, 0, 1] },
          labels: [{ text: "a hook's back tab", at: [3000, -15.5, 10], dx: 70, dy: 66 }],
        },
        {
          id: 'ribs',
          title: 'Ribs on the pegs',
          rect: [830, 790, 620, 330],
          from: [X[3] + 20, -6, 20],
          camera: { position: [2050, -8, 31], target: [2020, 0, 18], fov: 24, up: [0, 0, 1] },
        },
      ],
      meshes: [
        ...parts.map((s) => feature(s)),
        ...pair(clip, ribs, 'ribs'),
        feature(four, undefined, 'room'),
        ...corners.map((c) => part(c, undefined, 'room')),
        context(hook, 'room'),
      ],
    });
  }

  // the slot clip behind a seam, from the back, going into the slots and out again, on boards with no screw holes, as
  // it needs none (the owner, 23 Oct 2026: "the board connector clip gif should be on a board without screw holes")
  {
    const plain = { widthMm: 80, heightMm: 80, screwHead: 'none' };
    const left = built('solid', { ...plain, sides: sides('closed', 'open', 'closed', 'closed') });
    const right = built('solid', { ...plain, sides: sides('open', 'closed', 'closed', 'closed') });
    const clip = built('slot-clip', { boards: '2', depthMm: 15 }).translate([80, 60, -15]);
    scenes.push({
      id: 'slot-clip-in',
      title: 'Slot clips join boards',
      caption: [
        'Pegs in the slots either side of a seam hold two boards from behind:',
        'no screw holes, and the wall holds the clip on; for 2 or 4 boards.',
      ],
      camera: { position: [150, -20, -230], target: [80, 45, -4], fov: 38 },
      frames: cycle(8, 20, 14, (t) => ({ groups: { clip: [0, 0, -45 * (1 - t)] } })),
      meshes: [part(left), part(right.translate([80, 0, 0])), feature(clip, 'clip')],
    });
  }
  return scenes;
}

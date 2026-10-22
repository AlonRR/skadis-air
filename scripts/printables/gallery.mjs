// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The Printables page's pictures and animations (Q309, 22 Oct 2026): what each board type and feature looks like,
// each part the library's own at the page's starting values unless a scene says otherwise, the feature a picture is
// about in orange. Boards stand as they hang, y up and their front towards +z; a scene seen from the back says so.
// write-gallery.mjs draws them; a scene with `frames` is an animation.

const T = 5; // the board's thickness
const COLOUR = { part: '#c3c9cf', feature: '#f76707' };
const sides = (left, right, bottom, top) => ({ left, right, bottom, top });
/** 0 to 1 and back to rest: an eased step, so a move starts and stops gently. */
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** An animation's frames: `hold` still, `move` from 0 to 1, `rest` still at 1, each frame given its share t. */
const timeline = (hold, move, rest, frame) =>
  [...Array(hold + move + rest).keys()].map((k) => frame(ease((k - hold) / (move - 1))));
/** One part's plastic as a share of another's, in whole percent. */
const pct = (a, b) => Math.round((100 * a.volume()) / b.volume());
/** The board types' pictures side by side: the i-th moved right by `pitch`. */
const nth = (b, i, pitch) => b.translate([i * pitch, 0, 0]);

export function build(kit) {
  const { box, mesh, split, built } = kit;
  const part = (solid, group) => ({ ...mesh(solid, COLOUR.part), group });
  const feature = (solid, group) => ({ ...mesh(solid, COLOUR.feature), group });
  const scenes = [];

  // the cover: the three board types side by side, as they hang
  {
    const kinds = ['solid', 'lightened', 'skeleton'];
    const meshes = kinds.map((k, i) => feature(nth(built(k, { widthMm: 160, heightMm: 160 }), i, 190)));
    scenes.push({
      id: 'cover',
      title: 'Skådis Air',
      hero: true,
      caption: [
        'Pegboards for IKEA SKÅDIS hooks, in any size: solid, lightened',
        'or skeleton, tiled into walls, made in your browser.',
      ],
      camera: { position: [120, -60, 600], target: [272, 72, 0], fov: 40, drop: 0.13 },
      labels: [
        { text: 'Solid', at: [80, -22, T], tag: true },
        { text: 'Lightened', at: [270, -22, T], tag: true },
        { text: 'Skeleton', at: [460, -22, T], tag: true },
      ],
      meshes,
    });
  }

  // the board types face on, each one's plastic against the solid board's, measured at the Printables files' size
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

  // the lightened board on keyholes, turning, so its front and the standoffs behind show
  {
    const board = built('lightened', { widthMm: 160, heightMm: 160, screwHead: 'keyhole', standoffs: 'back' });
    const centred = board.translate([-80, -80, 5]);
    const behind = box(-90, 90, -90, 90, -40, -0.01 + 5);
    const R = 480;
    const frames = [...Array(60).keys()].map((k) => {
      const a = (2 * Math.PI * k) / 60;
      return { camera: { position: [R * Math.sin(a), 70, R * Math.cos(a)], target: [0, -2, 0], fov: 38, drop: 0.11 } };
    });
    scenes.push({
      id: 'turntable',
      title: 'Lightened, on keyholes',
      caption: [
        'Pockets between the slots, a rim round each; behind it, standoffs',
        "with keyholes, and a hook's room behind every corner slot.",
      ],
      camera: frames[0].camera,
      frames,
      meshes: split(centred, behind),
    });
  }

  // the skeleton board cut open: its members are I-beams, full width at both faces and thin through the middle
  {
    const board = built('skeleton', { widthMm: 120, heightMm: 120 });
    const kept = board.subtract(box(-1, 121, 50, 121, -1, T + 1));
    const cut = box(-1, 121, 49.6, 50.01, -1, T + 1);
    scenes.push({
      id: 'skeleton-ibeam',
      title: 'Skeleton: every member an I-beam',
      caption: [
        'Full width at both faces, thin through the middle, as the ultralight',
        "boards are: about a third of the solid board's plastic.",
      ],
      camera: { position: [92, 190, 70], target: [62, 40, 0], fov: 30, up: [0, 0, 1], drop: 0.1 },
      labels: [{ text: 'a web, cut: an I-beam', at: [50, 50, T / 2], dx: -120, dy: -150 }],
      meshes: split(kept, cut),
    });
  }

  // a wall of four panels, closed round the outside and open at the seams; as a still, a little apart, and as an
  // animation, coming together
  {
    const panel = (s) => built('solid', { widthMm: 160, heightMm: 160, sides: s });
    const panels = [
      ['p00', panel(sides('closed', 'open', 'closed', 'open')), [0, 0], [-1, -1]],
      ['p10', panel(sides('open', 'closed', 'closed', 'open')), [160, 0], [1, -1]],
      ['p01', panel(sides('closed', 'open', 'open', 'closed')), [0, 160], [-1, 1]],
      ['p11', panel(sides('open', 'closed', 'open', 'closed')), [160, 160], [1, 1]],
    ];
    const meshes = panels.map(([g, p, [x, y]], i) => (i === 0 ? feature : part)(p.translate([x, y, 0]), g));
    const apart = (gap) =>
      Object.fromEntries(panels.map(([g, , , [dx, dy]]) => [g, [(dx * gap) / 2, (dy * gap) / 2, 0]]));
    const camera = { position: [90, -110, 640], target: [162, 158, 0], fov: 40 };
    const caption = [
      "A wall is split into panels that fit your printer's bed, closed round",
      'the outside; at the seams, half a slot on each side makes a whole one.',
    ];
    // the still: the panels 14 mm apart, so the seams show
    scenes.push({
      id: 'wall',
      title: 'Walls of any size',
      caption,
      camera,
      labels: [{ text: 'one panel', at: [73, 73, T], dx: -170, dy: 40 }],
      meshes: panels.map(([g, p, [x, y], [dx, dy]], i) =>
        (i === 0 ? feature : part)(p.translate([x + dx * 7, y + dy * 7, 0]), g),
      ),
    });
    scenes.push({
      id: 'wall-together',
      title: 'Walls of any size',
      caption,
      camera: { ...camera, position: [90, -140, 760] },
      frames: timeline(8, 26, 16, (t) => ({ groups: apart(44 * (1 - t)) })),
      meshes,
    });
  }

  // open sides between the slots: four boards meeting between the slots, every slot whole
  {
    const between = { seams: 'between', screwHead: 'none' };
    const at = (x, y, s) => built('solid', { ...between, widthMm: 80, heightMm: 80, sides: s }).translate([x, y, 0]);
    const boards = [
      at(0, 0, sides('closed', 'open', 'closed', 'open')),
      at(80, 0, sides('open', 'closed', 'closed', 'open')),
      at(0, 80, sides('closed', 'open', 'open', 'closed')),
      at(80, 80, sides('open', 'closed', 'open', 'closed')),
    ];
    const seam = box(88.8, 91.2, -1, 161, T - 1.05, T + 0.1).add(box(-1, 161, 88.8, 91.2, T - 1.05, T + 0.1));
    scenes.push({
      id: 'between-slots',
      title: 'Open sides between the slots',
      caption: [
        "A board's open sides can run midway between the slots,",
        'so every slot at a seam stays whole (the seams in orange).',
      ],
      camera: { position: [20, -120, 380], target: [82, 78, 0], fov: 40 },
      labels: [{ text: 'a seam between two slots', at: [90, 130, T], dx: 150, dy: -40 }],
      meshes: boards.flatMap((b) => split(b, seam)),
    });
  }

  // mounting, from the back: keyholes on standoffs, or lock screws through the corner slots
  {
    const keyholes = built('solid', { widthMm: 120, heightMm: 120, screwHead: 'keyhole', standoffs: 'back' });
    const locks = built('solid', { widthMm: 120, heightMm: 120, screwHead: 'lock', standoffs: 'back' }).translate([
      -170, 0, 0,
    ]);
    const behind = box(-300, 300, -10, 130, -40, -0.01);
    scenes.push({
      id: 'mounting',
      title: 'Mount it your way',
      caption: [
        'From the back: keyholes on standoffs, so the board lifts off its screws,',
        'or lock screws through the corner slots; every slot still takes a hook.',
      ],
      camera: { position: [-60, -90, -470], target: [-25, 52, 0], fov: 38, drop: 0.12 },
      labels: [
        { text: 'keyhole', at: [20, 100, -15], dx: -90, dy: -80 },
        { text: 'lock screw', at: [-150, 20, -15], dx: 90, dy: 80 },
      ],
      meshes: [...split(keyholes, behind), ...split(locks, behind)],
    });
  }

  // the slot clip behind a seam, from the back; as an animation, going into the slots
  {
    const left = built('solid', { widthMm: 80, heightMm: 80, sides: sides('closed', 'open', 'closed', 'closed') });
    const right = built('solid', { widthMm: 80, heightMm: 80, sides: sides('open', 'closed', 'closed', 'closed') });
    const clip = built('slot-clip', { boards: '2', depthMm: 15 }).translate([80, 60, -15]);
    const meshes = [part(left), part(right.translate([80, 0, 0])), feature(clip, 'clip')];
    const camera = { position: [150, -20, -230], target: [80, 45, -4], fov: 38 };
    const caption = [
      'Pegs in the slots either side of a seam hold two boards from behind:',
      'no screw holes, and the wall holds the clip on; for 2 or 4 boards.',
    ];
    scenes.push({ id: 'slot-clip', title: 'Slot clips join boards', caption, camera, meshes, labels: [] });
    scenes.push({
      id: 'slot-clip-in',
      title: 'Slot clips join boards',
      caption,
      camera,
      frames: timeline(8, 22, 18, (t) => ({ groups: { clip: [0, 0, -45 * (1 - t)] } })),
      meshes,
    });
  }

  // the standoffs, for 1, 2 and 4 boards
  {
    const stand = ['1', '2', '4'].map((boards, i) => built('standoff', { boards }).translate([i * 50 - 50, 0, 0]));
    scenes.push({
      id: 'standoffs',
      title: 'Standoffs for 1, 2 or 4 boards',
      caption: [
        '15 mm between the boards and the wall, so hooks have room; the shared',
        'ones are a post at each screw, joined only at the wall.',
      ],
      camera: { position: [0, -250, 175], target: [0, 2, 4], fov: 24, up: [0, 0, 1], drop: 0.08 },
      labels: [
        { text: '1 board', at: [-50, -28, 0], tag: true },
        { text: '2 boards', at: [0, -28, 0], tag: true },
        { text: '4 boards', at: [50, -28, 0], tag: true },
      ],
      meshes: stand.map((s) => feature(s)),
    });
  }

  // the fit coupon
  {
    const coupon = built('fit-coupon', {});
    scenes.push({
      id: 'fit-coupon',
      title: 'Print the fit coupon first',
      caption: [
        'Four slots at four clearances, told apart by dots: try a hook in each,',
        'and give the page the one that fits as "Slot clearance".',
      ],
      camera: { position: [80, -95, 150], target: [80, 20, 0], fov: 38, up: [0, 0, 1], drop: 0.1 },
      labels: [],
      meshes: [feature(coupon)],
    });
  }
  return scenes;
}

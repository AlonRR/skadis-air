// The standoff connector (backlog item conn-standoff; D92 to D94, D97, D281): a hollow spacer that goes between
// boards and the wall at their corner screw holes, the screw through both (D93). It is the size of the
// built-in standoffs (D94, C83), so it keeps the same room round the slots: for 1 board a ring; for 2
// boards, at a seam, a post over each of their two corner holes, 20 mm apart, side by side or one above the other;
// for 4, where their corners meet, a post over each of four holes on a 20 mm square. Built as it hangs: its wall face
// on z = 0, its board face toward +z, centred where the boards' corners meet.
//
// Or held by nuts and taped to the wall (D592 a, D593): each post holds a nut of the screw size under a roof, slid in
// from the side, so a countersunk machine screw through the board's corner hole and the roof clamps the board to it;
// its wall face a flat square pad for double-sided tape, the tape's width a side, with no hole through it. Or held by
// the nuts and screwed to the wall (D600): a foot at the wall face round its posts, two screws of the screw size through
// it, countersunk from the board side and driven before the boards go on.
//
// Across a seam runs a column of slots (D15), and a hook hangs its back tab below its slot behind the
// board. So a shared spacer has the slot clip's shape (D281): next to the boards only its posts reach them, for as
// far as a hook takes behind the board and a margin, and they are joined by a bar as wide as they are on the wall
// side, behind that room (D97, C99); for 4 boards the bars make a square ring.
import type { CrossSection, Manifold } from 'manifold-3d';
import { SOLID_BOARD_DEFAULTS } from './board-solid.js';
import type { Engine } from './engine.js';
import { SCREW_INSET_MM, screwHole, STANDOFF_DEFAULT_MM } from './mounting.js';
import { chamferedExtrusion, EDGE_CHAMFER_MM, HOLE_MOUTH_MM as MOUTH_MM } from './chamfer.js';
import { circle, ringedSolid } from './rings.js';
import { SettingsProblem } from './settings.js';
import { HOOK_DEPTH_MM } from './skadis.js';
import { TAPE_LENGTH_MM, TAPE_MM } from './tape.js';

/** The boards it serves: 1, 2 side by side, 2 one above the other, or 4, as the slot clip's choices (D281). */
export type StandoffBoards = '1' | '2' | '2-stacked' | '4';

export interface StandoffParams {
  boards: StandoffBoards; // how many boards' corners it serves (D92)
  heightMm: number; // how far it holds the boards off the wall (D94)
  screwMm: number; // the screw's diameter (D76)
  /** For the trial only (D267): the top 2 mm of each hole this wide, so the screw pushed through the board cuts into
   * it and carries the standoff; none unless given. */
  pilotMm?: number;
  /** A screw through to the wall, as it starts; or a nut in each post and a tape pad at the wall (D592 a), or a foot
   * screwed to the wall (D600). */
  fixing?: 'screw' | 'nut' | 'nut-screwed';
  /** With the nut: the tape's width, the pad's side across; TAPE_MM unless given (Q594). */
  tapeMm?: number;
  /** With the nut: the piece's length, the pad's side along x; TAPE_LENGTH_MM unless given (C601). */
  tapeLengthMm?: number;
}

/** ISO 4032 hex nuts (regular, style 1), the largest each may be, mm: across the flats (s) and tall (m), for the screw
 * sizes the page offers that have one. M3: 5.5 x 2.4, M4: 7 x 3.2, M5: 8 x 4.7, as the standard's table gives them
 * (https://www.wermac.org/bolts/dimensions_hex-nuts_across-flats-and-heights_din-iso.html; T599, 30 Oct 2026: "Look it
 * up use standard sizes"). DIN 934's are the same across the flats and no taller (M5 4 mm), so they fit too. */
export const ISO_4032_NUTS: Readonly<Record<number, { acrossMm: number; tallMm: number }>> = {
  3: { acrossMm: 5.5, tallMm: 2.4 },
  4: { acrossMm: 7, tallMm: 3.2 },
  5: { acrossMm: 8, tallMm: 4.7 },
};
/** What a nut's pocket gives round it: across its flats, and over its height (C597). */
const NUT_ROOM_MM = 0.3;
/** The roof over a nut's pocket, up to the board face: what the screw clamps the board to, through it (C597). */
const NUT_ROOF_MM = 1.5;
/** The flat at the top of a pocket's 45 degree gable, which prints over air: a 1 mm bridge (C597). */
const GABLE_FLAT_MM = 1;
/** The tape pad's thickness at the wall, and the solid left under the screw's hole above it (D592 a). */
const TAPE_PAD_MM = 2;
const UNDER_HOLE_MM = 1;
/** Below a nut, the hole goes on at least this far, for the screw's end (C597). */
const PAST_NUT_MM = 1;

/** A nut's pocket: its width across, its height to the gable, and the gable's rise, mm. */
function nutPocket(screwMm: number) {
  const nut = ISO_4032_NUTS[screwMm];
  if (nut === undefined) {
    throw new SettingsProblem('A nut standoff takes an M3, M4 or M5 nut: choose a screw size of 3, 4 or 5 mm', [
      'screwMm',
    ]);
  }
  const acrossMm = nut.acrossMm + NUT_ROOM_MM;
  return {
    acrossMm,
    cornersMm: (2 * acrossMm) / Math.sqrt(3), // across its corners, along the way in
    tallMm: nut.tallMm + NUT_ROOM_MM,
    gableMm: (acrossMm - GABLE_FLAT_MM) / 2,
  };
}

/** Where a nut's pocket starts, from the wall face: under its gable and the roof. */
const pocketFloorMm = (p: Pick<StandoffParams, 'heightMm' | 'screwMm'>) => {
  const pocket = nutPocket(p.screwMm);
  return p.heightMm - NUT_ROOF_MM - pocket.gableMm - pocket.tallMm;
};
/** Where the screw's hole ends, above the tape pad; screwed to the wall, it goes on through (D600). */
const HOLE_FLOOR_MM = TAPE_PAD_MM + UNDER_HOLE_MM;
const holeFloorMm = (p: Pick<StandoffParams, 'fixing'>) => (p.fixing === 'nut-screwed' ? 0 : HOLE_FLOOR_MM);

/** The screwed nut standoff's foot (D600): thick enough for its screws' countersinks and a plain 1.75 mm under them,
 * 4 mm for a 4 mm screw; each screw's boss 2.5 mm round its countersink. */
const footMm = (screwMm: number) => {
  const { holeMm, countersinkMm } = screwHole(screwMm);
  return (countersinkMm - holeMm) / 2 + 1.75;
};
const footBossMm = (screwMm: number) => screwHole(screwMm).countersinkMm / 2 + 2.5;

/** Where the screwed nut standoff's foot screws go, round where the boards' corners meet (D600): two, each clear of
 * the posts and the bars, under the boards, so they are driven before the boards go on and the boards cover them. */
export function footScrewPlaces(boards: StandoffBoards): [number, number][] {
  if (boards === '1') {
    return [
      [14, 0],
      [0, 14],
    ];
  }
  if (boards === '2') {
    return [
      [0, 14],
      [0, -14],
    ];
  }
  if (boards === '2-stacked') {
    return [
      [14, 0],
      [-14, 0],
    ];
  }
  return [
    [0, 24],
    [0, -24],
  ];
}

export const STANDOFF_DEFAULTS: StandoffParams = { boards: '1', heightMm: STANDOFF_DEFAULT_MM, screwMm: 4 };

/** The room kept round a slot and a hook, beyond what each takes: the margin of C83. */
const ROOM_MARGIN_MM = 2;
/** The hooks' room next to the boards, which only the posts reach into: as deep as a hook's back tab sits behind the
 * board, and a margin (C83, C99). */
export const TUNNEL_DEPTH_MM = HOOK_DEPTH_MM + ROOM_MARGIN_MM;
/** The least bar behind the hooks' room, on the wall side (C99). */
const MIN_BRIDGE_MM = 4;
/** The chamfer on the wall-side edge, which prints on the bed (C463): two 0.2 mm layers, so it still reads as a chamfer
 * and keeps the first layer's squish off the edge, and leaves a 1-board standoff 76 % of its outline's area to hold the
 * bed with, 47.3 of 62.5 mm2, where the parts' 1 mm left 49 %. */
export const BED_CHAMFER_MM = 0.4;
/** How far inside the bar the posts rise from, where nothing of the bar's chamfer is, as the slot clip's (D270). */
const POST_ROOT_MM = 1.5;
/** How far down from the board face a tight section reaches (D267). */
const PILOT_MM = 2;

/** A standoff's settings, with the starting values filled in, refused when they cannot make one. */
export function standoffParams(given: Partial<StandoffParams>): StandoffParams {
  const p: StandoffParams = { ...STANDOFF_DEFAULTS, ...given };
  if (!['1', '2', '2-stacked', '4'].includes(p.boards)) {
    throw new RangeError('A standoff serves 1 board, 2 side by side or one above the other, or 4');
  }
  if (!(p.heightMm > 0)) throw new RangeError('The standoff must be more than 0 mm tall');
  if (!(p.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  if (p.pilotMm !== undefined && !(p.pilotMm > 0 && p.pilotMm < screwHole(p.screwMm).holeMm)) {
    throw new RangeError("A standoff's tight section must be narrower than its hole");
  }
  if (p.fixing !== undefined && !['screw', 'nut', 'nut-screwed'].includes(p.fixing)) {
    throw new RangeError('A standoff is fixed by a screw through it, or by a nut and tape or screws');
  }
  if (p.fixing === 'nut') {
    p.tapeMm ??= TAPE_MM;
    p.tapeLengthMm ??= TAPE_LENGTH_MM;
    if (!(p.tapeMm > 0)) throw new RangeError('The tape must be more than 0 mm wide');
    if (!(p.tapeLengthMm > 0)) throw new RangeError('A piece of tape must be more than 0 mm long');
    // the hole under the nut, the pocket, its gable and roof; and for one board, its pad behind the hooks' room
    const room = HOLE_FLOOR_MM + PAST_NUT_MM + p.heightMm - pocketFloorMm(p);
    const nutLeast = Math.max(room, p.boards === '1' ? TUNNEL_DEPTH_MM + TAPE_PAD_MM : 0);
    if (p.heightMm < nutLeast - 1e-9) {
      throw new SettingsProblem(
        `A nut standoff for an M${p.screwMm} nut needs to be at least ${nice(nutLeast)} mm tall: its tape pad, the ` +
          'nut under its roof and room for the screw below it',
        ['heightMm'],
      );
    }
  }
  if (p.fixing === 'nut-screwed') {
    // the nut under its roof and the screw's end below it; the foot behind the hooks' room (D600)
    const room = PAST_NUT_MM + p.heightMm - pocketFloorMm(p);
    const nutLeast = Math.max(room, footMm(p.screwMm) + TUNNEL_DEPTH_MM);
    if (p.heightMm < nutLeast - 1e-9) {
      throw new SettingsProblem(
        `A nut standoff screwed to the wall for an M${p.screwMm} nut needs to be at least ${nice(nutLeast)} mm ` +
          "tall: its foot behind the hooks' room, and the nut under its roof",
        ['heightMm'],
      );
    }
  }
  const least = TUNNEL_DEPTH_MM + MIN_BRIDGE_MM;
  if (p.boards !== '1' && p.heightMm < least) {
    throw new RangeError(
      `A standoff for ${p.boards === '4' ? 4 : 2} boards needs to be at least ${least} mm tall: ${TUNNEL_DEPTH_MM} mm ` +
        `of room for hooks next to the boards and ${MIN_BRIDGE_MM} mm of bar behind it`,
    );
  }
  return p;
}

/** What each screw passes (D264): a board at its starting thickness and this standoff. */
export function standoffScrews(p: StandoffParams): string {
  const board = SOLID_BOARD_DEFAULTS.thicknessMm;
  if (p.fixing === 'nut' || p.fixing === 'nut-screwed') {
    // from the board's face: through the nut at least, and no further than the hole goes
    const [shortest, longest] = [board + p.heightMm - pocketFloorMm(p), board + p.heightMm - holeFloorMm(p)];
    const machine =
      `Each board's corner screw is a countersunk M${nice(p.screwMm)} machine screw, ${nice(shortest)} to ` +
      `${nice(longest)} mm long for a ${nice(board)} mm board, into the nut`;
    if (p.fixing === 'nut-screwed') {
      return (
        `First screw the foot to the wall: two countersunk ${nice(p.screwMm)} mm screws, each passing the ` +
        `${nice(footMm(p.screwMm))} mm foot, plus your wall plug. ${machine}.`
      );
    }
    const piece = `${nice(p.tapeMm ?? TAPE_MM)} x ${nice(p.tapeLengthMm ?? TAPE_LENGTH_MM)} mm`;
    return `${machine}; stick the pad to the wall with a ${piece} piece of double-sided tape at each post.`;
  }
  return (
    `Each screw passes ${nice(board + p.heightMm)} mm of board and standoff, a ${nice(board)} mm board on this ` +
    `${nice(p.heightMm)} mm standoff, plus your wall plug.`
  );
}

const nice = (n: number) => String(Math.round(n * 100) / 100);

/** Which way each post's nut goes in: out from where the boards' corners meet, along the seam's line (D592 a). */
function wayIn(boards: StandoffBoards, [x, y]: readonly [number, number]): [number, number] {
  if (boards === '1') return [1, 0];
  if (boards === '2-stacked') return [0, Math.sign(y)];
  return [Math.sign(x), 0];
}

/** A nut's pocket in the post at (x, y), from its floor at z: a strip the nut's width across from behind the hole out
 * past the post's side, the nut's height and its room tall, then a 45 degree gable in to a 1 mm flat, so nothing over
 * the nut prints over air but that flat. The nut slides in along the strip to its closed end, which centres it. */
function nutPocketCutter(
  engine: Engine,
  [x, y]: readonly [number, number],
  [dx, dy]: readonly [number, number],
  screwMm: number,
  z: number,
  reachMm: number,
) {
  const pocket = nutPocket(screwMm);
  const [back, out, half] = [pocket.cornersMm / 2, reachMm, pocket.acrossMm / 2];
  // a point `a` along its way in and `c` to the left of it
  const along = (a: number, c: number): [number, number] => [x + a * dx - c * dy, y + a * dy + c * dx];
  // the strip along its way in, from behind the hole to `out` past it, `half` either side; counter-clockwise
  const strip = (grow: number): [number, number][] => {
    const [a0, a1, b] = [-back - grow, out + grow, half + grow];
    return [along(a0, -b), along(a1, -b), along(a1, b), along(a0, b)];
  };
  return ringedSolid(engine, strip, [
    [z, 0],
    [z + pocket.tallMm, 0],
    [z + pocket.tallMm + pocket.gableMm, -pocket.gableMm],
  ]);
}

/** Where its holes are, round the point where the boards' corners meet. */
function holeCentres(boards: StandoffBoards): [number, number][] {
  const i = SCREW_INSET_MM;
  if (boards === '1') return [[0, 0]];
  if (boards === '2') {
    return [
      [-i, 0],
      [i, 0],
    ];
  }
  if (boards === '2-stacked') {
    return [
      [0, -i],
      [0, i],
    ];
  }
  return [
    [-i, -i],
    [i, -i],
    [-i, i],
    [i, i],
  ];
}

export function makeStandoff(engine: Engine, params: StandoffParams): Manifold {
  const { CrossSection, Manifold } = engine;
  const p = standoffParams(params);
  const { holeMm, standoffDiameterMm } = screwHole(p.screwMm);
  const centres = holeCentres(p.boards);
  const sections: CrossSection[] = [];
  const keep = (s: CrossSection) => {
    sections.push(s);
    return s;
  };
  const posts = keep(
    CrossSection.union(centres.map(([x, y]) => keep(new CrossSection([circle(x, y, standoffDiameterMm)])))),
  );
  const h = p.heightMm;
  const edges = { bottomMm: BED_CHAMFER_MM, topMm: EDGE_CHAMFER_MM };
  let plain: Manifold;
  if (p.boards === '1') {
    plain = chamferedExtrusion(engine, posts, h, edges);
  } else {
    // The slot clip's shape (D281): a bar as wide as the posts from post to post on the wall side, for 4 boards a
    // square ring through them, up to the hooks' room; above it the posts alone, rising from inside the bar, their
    // outline the bar's own round them, chamfered at the board.
    const hull = keep(posts.hull());
    const inside = 2 * SCREW_INSET_MM - standoffDiameterMm;
    const band = p.boards === '4' ? keep(hull.subtract(keep(CrossSection.square([inside, inside], true)))) : hull;
    const bar = h - TUNNEL_DEPTH_MM;
    const rise = bar - POST_ROOT_MM;
    const barSolid = chamferedExtrusion(engine, band, bar, edges);
    const risen = chamferedExtrusion(engine, posts, h - rise, { bottomMm: 0, topMm: EDGE_CHAMFER_MM });
    const postSolid = risen.translate([0, 0, rise]);
    plain = Manifold.union(barSolid, postSolid);
    for (const m of [barSolid, risen, postSolid]) m.delete();
  }
  for (const s of sections) s.delete();
  if (p.fixing === 'nut' || p.fixing === 'nut-screwed') return nutted(engine, p, plain, centres);
  // each hole chamfered at both ends; a tight section at the board face for the trial (D267)
  const tight = Math.min(PILOT_MM, h);
  const holeCuts = centres.map(([x, y]) => {
    const bottom = ringedSolid(engine, (grow) => circle(x, y, holeMm, grow), [
      [-1, MOUTH_MM + 1],
      [MOUTH_MM, 0],
      ...(p.pilotMm === undefined
        ? ([
            [h - MOUTH_MM, 0],
            [h + 1, MOUTH_MM + 1],
          ] as [number, number][])
        : ([[h - tight, 0]] as [number, number][])),
    ]);
    if (p.pilotMm === undefined) return bottom;
    const pilot = ringedSolid(engine, (grow) => circle(x, y, p.pilotMm ?? holeMm, grow), [
      [h - tight - 0.5, 0],
      [h + 1, 0],
    ]);
    const both = Manifold.union(bottom, pilot);
    for (const m of [bottom, pilot]) m.delete();
    return both;
  });
  const holes = Manifold.union(holeCuts);
  const part = plain.subtract(holes);
  for (const m of [plain, ...holeCuts, holes]) m.delete();
  return part;
}

/** The nut standoff (D592 a): the shape as above from 0.5 mm into its tape pad up, the pad a square the tape's width a
 * side round each post, one plate round them all, 2 mm thick at the wall, its edges chamfered as the bed edge's, with no
 * hole through it; each post's hole from the board face down to 1 mm above the pad, and its nut's pocket under the roof.
 * Screwed to the wall (D600), the plate is a foot round the posts and two screws' bosses, the posts' holes go on
 * through it, and each foot screw's hole is countersunk at its top. */
function nutted(engine: Engine, p: StandoffParams, plain: Manifold, centres: [number, number][]): Manifold {
  const { CrossSection, Manifold } = engine;
  const [tape, length] = [p.tapeMm ?? TAPE_MM, p.tapeLengthMm ?? TAPE_LENGTH_MM];
  const { holeMm, countersinkMm, standoffDiameterMm } = screwHole(p.screwMm);
  const h = p.heightMm;
  const screwed = p.fixing === 'nut-screwed';
  // taped: a rectangle, the piece of tape, round each post (C601); screwed: each post and each foot screw's boss (D600)
  const feet = screwed ? footScrewPlaces(p.boards) : [];
  const shapes = screwed
    ? [
        ...centres.map(([x, y]) => new CrossSection([circle(x, y, standoffDiameterMm)])),
        ...feet.map(([x, y]) => new CrossSection([circle(x, y, 2 * footBossMm(p.screwMm))])),
      ]
    : centres.map(([x, y]) => CrossSection.square([length, tape], true).translate([x, y]));
  // one plate under all the posts, so nothing of the bar above spans a gap between their squares
  const joined = CrossSection.union(shapes);
  const footprint = joined.hull();
  const base = screwed ? footMm(p.screwMm) : TAPE_PAD_MM;
  const pad = chamferedExtrusion(engine, footprint, base, { bottomMm: BED_CHAMFER_MM, topMm: BED_CHAMFER_MM });
  const above = plain.trimByPlane([0, 0, 1], base - 0.5);
  const whole = Manifold.union(pad, above);
  const floor = pocketFloorMm(p);
  const sink = (countersinkMm - holeMm) / 2;
  const cuts = [
    ...centres.flatMap(([x, y]) => [
      ringedSolid(engine, (grow) => circle(x, y, holeMm, grow), [
        [screwed ? -1 : HOLE_FLOOR_MM, 0],
        [h - MOUTH_MM, 0],
        [h + 1, MOUTH_MM + 1],
      ]),
      nutPocketCutter(engine, [x, y], wayIn(p.boards, [x, y]), p.screwMm, floor, standoffDiameterMm / 2 + 2),
    ]),
    // each foot screw's hole, its countersink at the foot's top, and clear above it for the head and the driver
    ...feet.map(([x, y]) =>
      ringedSolid(engine, (grow) => circle(x, y, holeMm, grow), [
        [-1, 0],
        [base - sink, 0],
        [base, sink],
        [h + 1, sink],
      ]),
    ),
  ];
  const cut = Manifold.union(cuts);
  const part = whole.subtract(cut);
  for (const m of [plain, pad, above, whole, ...cuts, cut]) m.delete();
  for (const s of [...shapes, joined, footprint]) s.delete();
  return part;
}

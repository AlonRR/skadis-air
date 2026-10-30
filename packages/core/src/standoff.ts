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
   * screwed to the wall (D600); or the same two with a pilot hole in each post for a wood or PT screw (D611). */
  fixing?: StandoffFixing;
  /** With the nut: the tape's width, the pad's side across; TAPE_MM unless given (Q594). */
  tapeMm?: number;
  /** With the nut: the piece's length, the pad's side along x; TAPE_LENGTH_MM unless given (C601). */
  tapeLengthMm?: number;
  /** With the nut: how much wider than the nut its seat is across the flats; NUT_FIT_MM unless given (D607 a). */
  nutFitMm?: number;
  /** With a wood or PT screw: the pilot hole it cuts its thread in, across; pilotHoleFor(screwMm) unless given (D611). */
  pilotHoleMm?: number;
}

export type StandoffFixing = 'screw' | 'nut' | 'nut-screwed' | 'self-tap' | 'self-tap-screwed';
const FIXINGS: ReadonlySet<StandoffFixing> = new Set(['screw', 'nut', 'nut-screwed', 'self-tap', 'self-tap-screwed']);
/** Whether a fixing stands on tape, or on a foot screwed to the wall, rather than a screw through it. */
export const onTape = (fixing: unknown) => fixing === 'nut' || fixing === 'self-tap';
const onFoot = (fixing: unknown) => fixing === 'nut-screwed' || fixing === 'self-tap-screwed';
const byNut = (fixing: unknown) => fixing === 'nut' || fixing === 'nut-screwed';

/** A wood or PT screw's pilot hole unless set (D611): 0.85 times the screw, as the standoff trial's tight section (D267),
 * which T274 tries at 3.2, 3.4 and 3.6 mm for a 4 mm screw; on 0.05 mm steps. */
export const pilotHoleFor = (screwMm: number) => Math.round(0.85 * screwMm * 20) / 20;
/** How much of a wood or PT screw's length cuts thread in the post, at least: 2.5 times the screw, a little over the 2 to
 * 2.3 that moulded bosses take (`printed-part-engineering` §5), as a printed pilot comes out undersize. */
const THREAD_DIAMETERS = 2.5;

/** ISO 4032 hex nuts (regular, style 1), the largest each may be, mm: across the flats (s) and tall (m), for the screw
 * sizes the page offers that have one. M3: 5.5 x 2.4, M4: 7 x 3.2, M5: 8 x 4.7, as the standard's table gives them
 * (https://www.wermac.org/bolts/dimensions_hex-nuts_across-flats-and-heights_din-iso.html; T599, 30 Oct 2026: "Look it
 * up use standard sizes"). DIN 934's are the same across the flats and no taller (M5 4 mm), so they fit too. */
export const ISO_4032_NUTS: Readonly<Record<number, { acrossMm: number; tallMm: number }>> = {
  3: { acrossMm: 5.5, tallMm: 2.4 },
  4: { acrossMm: 7, tallMm: 3.2 },
  5: { acrossMm: 8, tallMm: 4.7 },
};
/** A pull nut's seat (D607 a, 30 Oct 2026: "607 a"): this much wider than the nut across its flats unless set, the
 * owner's coupon's "just right" for an M3 nut in ASA (printer-enclosure T189, 10 Oct 2026), and over its height. */
export const NUT_FIT_MM = 0.2;
const SEAT_ROOM_MM = 0.1;
/** The way in below the seat, from the wall face: this much looser than the seat, the coupon's +0.3 slot that let the
 * nut slide (T189's slot 7), so the screw's first turns pull the nut up into the tighter seat, where it stays. */
const WAY_IN_MM = 0.1;
/** Where the seat starts above the wall face: room for the screw's tip below the nut, so an M4 x 20 and an M4 x 22
 * both fit a 5 mm board on an 18 mm taped standoff (D607 a). */
const NUT_LIFT_MM = 3;
/** A screw's tip stops this far short of the wall face, or of the tape on it, at the longest the note gives. */
const TIP_CLEAR_MM = 0.5;
/** The two-bridge ceiling over the seat (`printed-part-design` §2): a slot the screw's hole wide across the seat, then a
 * square the hole's size, each a step this tall, so each layer bridges between solid edges and no hole is cut in a
 * bridge. */
const BRIDGE_STEP_MM = 0.3;
/** The post round the seat, behind the hooks' room: this much wall past the way in's corners, against the nut's turn
 * as the screw is tightened (the tape and nut pass, 30 Oct 2026: 0.9 mm turned it, by estimate). */
const NUT_WALL_MM = 2.5;
/** The chamfer on that boss's top edge, round onto the post. */
const BOSS_CHAMFER_MM = 0.5;
/** The tape pad's thickness at the wall (D592 a), and a pilot hole's floor above it, which leaves the pad whole (D611). */
const TAPE_PAD_MM = 2;
const HOLE_FLOOR_MM = TAPE_PAD_MM + 1;

/** A nut's seat and the boss round it, from the wall face, mm: across the seat's flats and the way in's, the seat's
 * bottom and top, the boss's top and its width across. */
function nutSeat(screwMm: number, fitMm = NUT_FIT_MM) {
  const nut = ISO_4032_NUTS[screwMm];
  if (nut === undefined) {
    throw new SettingsProblem('A nut standoff takes an M3, M4 or M5 nut: choose a screw size of 3, 4 or 5 mm', [
      'screwMm',
    ]);
  }
  const acrossMm = nut.acrossMm + fitMm;
  const wayMm = acrossMm + WAY_IN_MM;
  const topMm = NUT_LIFT_MM + nut.tallMm + SEAT_ROOM_MM;
  return {
    acrossMm,
    wayMm,
    bottomMm: NUT_LIFT_MM,
    topMm,
    // the nut pulled home: its bottom face, where the shortest screw's tip reaches
    nutBottomMm: topMm - nut.tallMm,
    bossTopMm: topMm + 2 * BRIDGE_STEP_MM,
    bossMm: (2 * wayMm) / Math.sqrt(3) + 2 * NUT_WALL_MM,
  };
}

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
  if (p.fixing !== undefined && !FIXINGS.has(p.fixing)) {
    throw new RangeError('A standoff is fixed by a screw through it, or by a nut or a wood screw and tape or screws');
  }
  if (onTape(p.fixing)) {
    p.tapeMm ??= TAPE_MM;
    p.tapeLengthMm ??= TAPE_LENGTH_MM;
    if (!(p.tapeMm > 0)) throw new RangeError('The tape must be more than 0 mm wide');
    if (!(p.tapeLengthMm > 0)) throw new RangeError('A piece of tape must be more than 0 mm long');
  }
  if (p.fixing === 'self-tap' || p.fixing === 'self-tap-screwed') {
    p.pilotHoleMm ??= pilotHoleFor(p.screwMm);
    if (!(p.pilotHoleMm >= p.screwMm / 2 && p.pilotHoleMm < p.screwMm)) {
      throw new SettingsProblem(
        `A pilot hole is narrower than its screw and at least half as wide: ${nice(p.screwMm / 2)} to under ` +
          `${nice(p.screwMm)} mm for a ${nice(p.screwMm)} mm screw`,
        ['pilotHoleMm'],
      );
    }
    // the screw's thread in the post above the pad, and the pad or the foot behind the hooks' room
    const thread = THREAD_DIAMETERS * p.screwMm;
    const least =
      p.fixing === 'self-tap'
        ? Math.max(HOLE_FLOOR_MM + thread, TAPE_PAD_MM + TUNNEL_DEPTH_MM)
        : Math.max(thread, footMm(p.screwMm) + TUNNEL_DEPTH_MM);
    if (p.heightMm < least - 1e-9) {
      throw new SettingsProblem(
        `A standoff for a ${nice(p.screwMm)} mm wood or PT screw needs to be at least ${nice(least)} mm tall: ` +
          `${nice(thread)} mm of thread in its post, and its ${p.fixing === 'self-tap' ? 'pad' : 'foot'} behind the hooks' room`,
        ['heightMm'],
      );
    }
  }
  if (byNut(p.fixing)) {
    p.nutFitMm ??= NUT_FIT_MM;
    if (!(p.nutFitMm >= 0 && p.nutFitMm <= 1)) throw new RangeError("A nut's fit must be 0 to 1 mm");
    // the nut's seat and the boss round it behind the hooks' room (D607 a); screwed, the foot too (D600)
    const seat = nutSeat(p.screwMm, p.nutFitMm);
    const base = onTape(p.fixing) ? TAPE_PAD_MM : footMm(p.screwMm);
    const nutLeast = Math.max(seat.bossTopMm, base) + TUNNEL_DEPTH_MM;
    if (p.heightMm < nutLeast - 1e-9) {
      throw new SettingsProblem(
        `A nut standoff for an M${p.screwMm} nut needs to be at least ${nice(nutLeast)} mm tall: the nut's seat, ` +
          `${nice(seat.bottomMm)} mm up for the screw's tip, and the post round it, behind the hooks' room`,
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
  if (p.fixing === 'self-tap' || p.fixing === 'self-tap-screwed') {
    // from the board's face: its thread's length into the post at least, and no further than the pilot goes
    const pilot = p.pilotHoleMm ?? pilotHoleFor(p.screwMm);
    const floor = p.fixing === 'self-tap' ? HOLE_FLOOR_MM : TIP_CLEAR_MM;
    const [shortest, longest] = [board + THREAD_DIAMETERS * p.screwMm, board + p.heightMm - floor];
    const wood =
      `Each board's corner screw is a countersunk ${nice(p.screwMm)} mm wood or PT screw, ${nice(shortest)} to ` +
      `${nice(longest)} mm long for a ${nice(board)} mm board, which cuts its own thread in the post's ` +
      `${nice(pilot)} mm pilot hole: drive it snug, no more`;
    if (p.fixing === 'self-tap-screwed') {
      return (
        `First screw the foot to the wall: two countersunk ${nice(p.screwMm)} mm screws, each passing the ` +
        `${nice(footMm(p.screwMm))} mm foot, plus your wall plug. ${wood}.`
      );
    }
    const piece = `${nice(p.tapeMm ?? TAPE_MM)} x ${nice(p.tapeLengthMm ?? TAPE_LENGTH_MM)} mm`;
    return (
      `Stick the pad to the wall with a ${piece} piece of double-sided tape at each post. ${wood}, as only the tape ` +
      'holds the standoff against its turn.'
    );
  }
  if (byNut(p.fixing)) {
    // from the board's face: through the nut pulled home at least, and its tip short of the wall
    const seat = nutSeat(p.screwMm, p.nutFitMm);
    const [shortest, longest] = [board + p.heightMm - seat.nutBottomMm, board + p.heightMm - TIP_CLEAR_MM];
    const pull = 'Before it goes up, pull each nut into its seat from the wall side with the screw, and take it out.';
    const machine =
      `Each board's corner screw is a countersunk M${nice(p.screwMm)} machine screw, ${nice(shortest)} to ` +
      `${nice(longest)} mm long for a ${nice(board)} mm board, into the nut: tighten it snug, no more`;
    if (p.fixing === 'nut-screwed') {
      return (
        `${pull} Then screw the foot to the wall: two countersunk ${nice(p.screwMm)} mm screws, each passing the ` +
        `${nice(footMm(p.screwMm))} mm foot, plus your wall plug. ${machine}.`
      );
    }
    const piece = `${nice(p.tapeMm ?? TAPE_MM)} x ${nice(p.tapeLengthMm ?? TAPE_LENGTH_MM)} mm`;
    return (
      `${pull} Then stick the pad to the wall with a ${piece} piece of double-sided tape at each post. ${machine}, ` +
      'as only the tape holds the standoff against its turn.'
    );
  }
  return (
    `Each screw passes ${nice(board + p.heightMm)} mm of board and standoff, a ${nice(board)} mm board on this ` +
    `${nice(p.heightMm)} mm standoff, plus your wall plug.`
  );
}

const nice = (n: number) => String(Math.round(n * 100) / 100);

/** The area a nut's way in opens through a taped standoff's pad, mm²: a hexagon the seat + 0.1 mm across (D607 a). */
export function nutWayInMm2(screwMm: number, fitMm = NUT_FIT_MM): number {
  const { wayMm } = nutSeat(screwMm, fitMm);
  return (Math.sqrt(3) / 2) * wayMm * wayMm;
}

/** A hexagon `across` its flats and grown by `grow` at (x, y), its corners along x; counter-clockwise. */
function hexagon(x: number, y: number, across: number, grow: number): [number, number][] {
  const r = (across / 2 + grow) / Math.cos(Math.PI / 6);
  return Array.from({ length: 6 }, (_, k): [number, number] => [
    x + r * Math.cos((k * Math.PI) / 3),
    y + r * Math.sin((k * Math.PI) / 3),
  ]);
}

/** A pull nut's pocket in the post at (x, y) (D607 a): on the screw's axis, open at the wall face, its mouth chamfered
 * as the bed edge is, a way in a little looser than the seat up to it, the seat, then the two-bridge ceiling's slot
 * across the seat's flats and its square, as wide as the screw's hole. */
function seatCutter(engine: Engine, [x, y]: readonly [number, number], screwMm: number, fitMm: number | undefined) {
  const { Manifold } = engine;
  const seat = nutSeat(screwMm, fitMm);
  const { holeMm } = screwHole(screwMm);
  const loose = WAY_IN_MM / 2;
  const pocket = ringedSolid(engine, (grow) => hexagon(x, y, seat.acrossMm, grow), [
    [-1, loose + BED_CHAMFER_MM + 1],
    [BED_CHAMFER_MM, loose],
    [seat.bottomMm - 2 * loose, loose],
    [seat.bottomMm, 0],
    [seat.topMm, 0],
  ]);
  const step = (w: number, d: number, z: number) =>
    Manifold.cube([w, d, BRIDGE_STEP_MM + 0.01]).translate([x - w / 2, y - d / 2, z - 0.005]);
  // the slot across the flats (along y, the hexagon's corners being along x), then the square on it
  const slot = step(holeMm, seat.acrossMm, seat.topMm);
  const square = step(holeMm, holeMm, seat.topMm + BRIDGE_STEP_MM);
  const all = Manifold.union([pocket, slot, square]);
  for (const m of [pocket, slot, square]) m.delete();
  return all;
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
  if (onTape(p.fixing) || onFoot(p.fixing)) return nutted(engine, p, plain, centres);
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

/** The standoff held to the wall by tape or by a foot (D592 a, D600, D611): the shape as above from 0.5 mm into its tape
 * pad up, the pad a square the tape's width a side round each post, one plate round them all, 2 mm thick at the wall, its
 * edges chamfered as the bed edge's. With a nut, each post holds it pulled into a seat from the wall side (D607 a), in a
 * boss round the post behind the hooks' room, and its hole goes on from the seat's ceiling to the board face; with a wood
 * or PT screw, each post is a pilot hole from the board face down, to 1 mm above the pad (D611). Screwed to the wall
 * (D600), the plate is a foot round the posts and two screws' bosses, and each foot screw's hole is countersunk at its
 * top. */
function nutted(engine: Engine, p: StandoffParams, plain: Manifold, centres: [number, number][]): Manifold {
  const { CrossSection, Manifold } = engine;
  const [tape, length] = [p.tapeMm ?? TAPE_MM, p.tapeLengthMm ?? TAPE_LENGTH_MM];
  const { holeMm, countersinkMm, standoffDiameterMm } = screwHole(p.screwMm);
  const nut = byNut(p.fixing);
  const seat = nut ? nutSeat(p.screwMm, p.nutFitMm) : undefined;
  const postMm = seat?.bossMm ?? standoffDiameterMm;
  const h = p.heightMm;
  const screwed = onFoot(p.fixing);
  // taped: a rectangle, the piece of tape, round each post (C601); screwed: each post and each foot screw's boss (D600)
  const feet = screwed ? footScrewPlaces(p.boards) : [];
  const shapes = screwed
    ? [
        ...centres.map(([x, y]) => new CrossSection([circle(x, y, postMm)])),
        ...feet.map(([x, y]) => new CrossSection([circle(x, y, 2 * footBossMm(p.screwMm))])),
      ]
    : centres.map(([x, y]) => CrossSection.square([length, tape], true).translate([x, y]));
  // one plate under all the posts, so nothing of the bar above spans a gap between their squares
  const joined = CrossSection.union(shapes);
  const footprint = joined.hull();
  const base = screwed ? footMm(p.screwMm) : TAPE_PAD_MM;
  const pad = chamferedExtrusion(engine, footprint, base, { bottomMm: BED_CHAMFER_MM, topMm: BED_CHAMFER_MM });
  const above = plain.trimByPlane([0, 0, 1], base - 0.5);
  // the boss round each nut's seat, behind the hooks' room (D607 a)
  const bossOutlines = seat === undefined ? [] : centres.map(([x, y]) => new CrossSection([circle(x, y, seat.bossMm)]));
  const bosses = bossOutlines.map((o) =>
    chamferedExtrusion(engine, o, seat?.bossTopMm ?? 0, { bottomMm: BED_CHAMFER_MM, topMm: BOSS_CHAMFER_MM }),
  );
  const whole = Manifold.union([pad, above, ...bosses]);
  const sink = (countersinkMm - holeMm) / 2;
  // a nut's hole from its seat's ceiling up; a wood screw's pilot from above the pad, or through the foot, up
  const [hole, from] =
    seat === undefined
      ? [p.pilotHoleMm ?? pilotHoleFor(p.screwMm), screwed ? -1 : HOLE_FLOOR_MM]
      : [holeMm, seat.topMm + BRIDGE_STEP_MM];
  const cuts = [
    ...centres.flatMap(([x, y]) => [
      ringedSolid(engine, (grow) => circle(x, y, hole, grow), [
        [from, 0],
        [h - MOUTH_MM, 0],
        [h + 1, MOUTH_MM + 1],
      ]),
      ...(seat === undefined ? [] : [seatCutter(engine, [x, y], p.screwMm, p.nutFitMm)]),
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
  for (const m of [plain, pad, above, ...bosses, whole, ...cuts, cut]) m.delete();
  for (const s of [...shapes, ...bossOutlines, joined, footprint]) s.delete();
  return part;
}

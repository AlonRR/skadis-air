// Double-sided tape (D593; Q594, 30 Oct 2026: "set a standard with a size option"): the width of the tape a part's pads
// are drawn for, one setting shared by the boards' tape standoffs and the nut standoff connector, so the parts of one
// wall take one tape. Each type that lists it says when it applies.
import type { NumberSetting } from './settings.js';

/** The tape a pad is drawn for unless set, mm: a 19 mm roll, a common width of foam mounting tape, cut into 19 mm
 * pieces (D603 b, 30 Oct 2026; pieces of a roll, C601: "The tape designs should be rectangular as tape comes on a roll
 * and is cut to rectangular pieces"). */
export const TAPE_MM = 19;
export const TAPE_LENGTH_MM = 19;

/** How far tape standoffs and a taped standoff stand off the wall unless set, mm (D603 b): a board's corner pad flares
 * out to a 19 x 19 mm piece's corners behind the hooks' room, which takes 17.94 mm for an M3 screw's post, the thinnest;
 * the taped standoff connector starts there too, so the parts of a taped wall match (C604). */
export const TAPE_STANDOFF_MM = 18;

/** The tape's width: each pad is a rectangle the piece of tape, this across, its length along the board's width. */
export const TAPE_WIDTH_SETTING = {
  kind: 'number',
  key: 'tapeWidthMm',
  label: 'Tape width',
  unit: 'mm',
  default: TAPE_MM,
  min: 10,
  max: 40,
  step: 1,
  help:
    'The double-sided tape the pads are drawn for: each pad is a rectangle as wide as the tape and as long as a ' +
    'piece cut from the roll, so one piece covers it. A larger piece holds more, and a board needs taller standoffs ' +
    'for it.',
} as const satisfies NumberSetting;

/** The length of each piece cut from the roll (C601): the pad's other side, along the board's width. */
export const TAPE_LENGTH_SETTING = {
  kind: 'number',
  key: 'tapeLengthMm',
  label: 'Tape length',
  unit: 'mm',
  default: TAPE_LENGTH_MM,
  min: 10,
  max: 60,
  step: 1,
  help: 'The length of each piece of tape you cut from the roll: the pad is that long, and the tape width wide.',
} as const satisfies NumberSetting;

/** 3M's rule for a static load on its VHB tapes: about four square inches of tape for each pound held still (relayed,
 * its datasheets: https://multimedia.3m.com/mws/media/2523038O/3m-vhb-tape-specialty-tape-4655.pdf), about 17.6 g a
 * square centimetre. */
const GRAMS_PER_CM2 = 453.6 / (4 * 6.4516);

const nice = (n: number) => String(Math.round(n * 100) / 100);

/** What the pieces of tape under a part hold (D609 a, 30 Oct 2026: "609 a"; Q608: "not carry a lot"), as the page says
 * beside the tape's settings: their area and about what they hold still by that rule, the part's own weight among it;
 * less where a hook levers the board off the wall; and the pads cleaned first, as tape came off bare PLA on one
 * Printables mount (model 536629, its comments, read 30 Oct 2026). */
export function tapeHolds(pieces: number, widthMm: number, lengthMm: number, part: 'board' | 'standoff'): string {
  const cm2 = (pieces * widthMm * lengthMm) / 100;
  const grams = Math.round((cm2 * GRAMS_PER_CM2) / 10) * 10;
  const count = pieces === 1 ? 'One piece' : `${pieces} pieces`;
  const own = part === 'board' ? "the board's own weight among it" : "the boards' share and the standoff's among it";
  return (
    `${count} of ${nice(widthMm)} x ${nice(lengthMm)} mm tape, ${nice(cm2)} cm², ${pieces === 1 ? 'holds' : 'hold'} ` +
    `about ${grams} g by 3M's rule for its VHB foam tapes, four square inches for each pound held still, ${own}; ` +
    'less where a hook levers the board off the wall, so hang light things. Wipe the pads and the wall with alcohol ' +
    'first: one maker reports tape coming off bare PLA twice.'
  );
}

// Double-sided tape (D593; Q594, 30 Oct 2026: "set a standard with a size option"): the width of the tape a part's pads
// are drawn for, one setting shared by the boards' tape standoffs and the nut standoff connector, so the parts of one
// wall take one tape. Each type that lists it says when it applies.
import type { NumberSetting } from './settings.js';

/** The tape a pad is drawn for unless set, mm: a 12 mm roll, a common width of foam mounting tape, cut into 18 mm
 * pieces (C601; the owner, 30 Oct 2026: "The tape designs should be rectangular as tape comes on a roll and is cut to
 * rectangular pieces"): the largest common piece whose corners a board's corner pad reaches on the 15 mm standoffs it
 * starts with, its flare kept behind the hooks' room. */
export const TAPE_MM = 12;
export const TAPE_LENGTH_MM = 18;

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

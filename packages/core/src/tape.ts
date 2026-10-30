// Double-sided tape (D593; Q594, 30 Oct 2026: "set a standard with a size option"): the width of the tape a part's pads
// are drawn for, one setting shared by the boards' tape standoffs and the nut standoff connector, so the parts of one
// wall take one tape. Each type that lists it says when it applies.
import type { NumberSetting } from './settings.js';

/** The tape a pad is drawn for unless set, mm: 19 mm, a common width of foam mounting tape (C595), and the widest a
 * board's corner pad takes on the 15 mm standoffs it starts with, its flare kept behind the hooks' room. */
export const TAPE_MM = 19;

/** The tape's width: a board's pads are round, this across; the connector's square, this a side. */
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
    'The double-sided tape the pads are drawn for: each pad is as wide as the tape, so a square of it covers the pad. ' +
    'Wider tape holds more, and a board needs taller standoffs for it.',
} as const satisfies NumberSetting;
